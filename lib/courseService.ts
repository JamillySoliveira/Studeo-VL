/**
 * =======================================================================
 * SERVIÇO DE CURSOS, AULAS E ADMINISTRAÇÃO NO FIRESTORE - VL AUTOMAÇÕES
 * =======================================================================
 *
 * Este arquivo gerencia todas as operações de banco de dados sobre cursos e administração:
 * 1. Consulta dos cursos e suas respectivas aulas (com suporte a vídeos do YouTube e Google Drive)
 * 2. Controle de acesso por usuário:
 *    - accessEnabled: define se a conta do aluno está ativa ou bloqueada
 *    - enrolledCourses: define os cursos específicos liberados para aquele aluno
 *    - role: "admin" possui acesso irrestrito a todos os cursos e ao painel de controle
 * 3. Gestão de aulas pelo administrador (adicionar, editar links de vídeo, ordenar e excluir)
 * 4. Gestão de certificados por curso (anexo do PDF oficial disponibilizado pelo administrador)
 * 5. Gerenciamento de alunos e permissões na coleção "users"
 *
 * Utiliza o Cloud Firestore como banco principal e o localStorage como cache rápido.
 */

import {
  db,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
} from "./firebase";

import { Course, Lesson, Module, UserProfile } from "./types";
import {
  AVAILABLE_COURSES,
  INITIAL_COURSE_ID,
  INITIAL_COURSE,
} from "./courseData";

// Chaves utilizadas para cache no localStorage do navegador
const STORAGE_LESSONS_OVERRIDE_KEY = "vl_lessons_custom_urls";
const STORAGE_COURSE_CERT_PREFIX = "vl_course_cert_";

/**
 * Lê os dados do certificado salvos no cache local do navegador.
 * Evita tela em branco se houver instabilidade momentânea na conexão.
 */
function getLocalCourseCertificate(courseId: string): Partial<Course> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_COURSE_CERT_PREFIX}${courseId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Salva ou remove o certificado do cache local.
 */
function setLocalCourseCertificate(
  courseId: string,
  data: Partial<Course> | null
): void {
  if (typeof window === "undefined") return;
  try {
    if (!data) {
      localStorage.removeItem(`${STORAGE_COURSE_CERT_PREFIX}${courseId}`);
    } else {
      localStorage.setItem(
        `${STORAGE_COURSE_CERT_PREFIX}${courseId}`,
        JSON.stringify(data)
      );
    }
  } catch (error) {
    console.warn("Erro ao salvar cache de certificado:", error);
  }
}

/**
 * Lê do localStorage eventuais edições feitas nas aulas (URLs de vídeos, formulários, títulos).
 */
function getLocalLessonsOverrides(): Record<string, Partial<Lesson>> {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(STORAGE_LESSONS_OVERRIDE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Atualiza o cache local de uma aula para exibição instantânea.
 */
function setLocalLessonsOverride(
  lessonId: string,
  data: Partial<Lesson>
): void {
  if (typeof window === "undefined") return;

  try {
    const current = getLocalLessonsOverrides();

    current[lessonId] = {
      ...current[lessonId],
      ...data,
    };

    localStorage.setItem(
      STORAGE_LESSONS_OVERRIDE_KEY,
      JSON.stringify(current)
    );
  } catch (error) {
    console.warn("Erro ao salvar cache local de aula:", error);
  }
}

/**
 * Normaliza o ID do curso para manter total compatibilidade com dados legados.
 */
export function normalizeCourseId(courseId?: string): string {
  if (!courseId) return INITIAL_COURSE_ID;
  if (courseId === "rockwell-controle-analogico-supervisorio") {
    return "rockwell-basico";
  }
  return courseId;
}

/**
 * Determina quais cursos estão liberados para o aluno visualizar.
 * 
 * Regras de Acesso:
 * - Se accessEnabled === false, o usuário não acessa nenhum curso.
 * - Administradores (role === "admin") possuem acesso liberado a todos os cursos.
 * - Alunos regulares acessam apenas os cursos listados no array `enrolledCourses` do seu perfil no Firestore.
 */
export function getUserAccessibleCourseIds(user: UserProfile | null): string[] {
  if (!user) return [];

  // Se o aluno estiver inativado pelo administrador, bloqueia o acesso
  if (user.accessEnabled === false) return [];

  // Administrador tem acesso a todos os cursos cadastrados
  if (user.role === "admin") {
    return AVAILABLE_COURSES.map((c) => c.id);
  }

  const enrolled = Array.isArray(user.enrolledCourses) ? user.enrolledCourses : [];
  const accessible: string[] = [];

  // Verifica cada curso liberado no perfil do aluno
  if (
    enrolled.includes("rockwell-basico") ||
    enrolled.includes("rockwell-controle-analogico-supervisorio")
  ) {
    accessible.push("rockwell-basico");
  }

  if (enrolled.includes("rockwell-intermediario")) {
    accessible.push("rockwell-intermediario");
  }

  if (enrolled.includes("rockwell-avancado")) {
    accessible.push("rockwell-avancado");
  }

  return accessible;
}

/**
 * Verifica se um aluno específico possui permissão para acessar determinado curso.
 */
export function checkUserCourseAccess(
  user: UserProfile | null,
  courseId: string = INITIAL_COURSE_ID
): boolean {
  if (!user) return false;
  if (user.accessEnabled === false) return false;
  if (user.role === "admin") return true;

  const effectiveCourseId = normalizeCourseId(courseId);
  const accessibleIds = getUserAccessibleCourseIds(user);
  return accessibleIds.includes(effectiveCourseId);
}

/**
 * Carrega todas as informações de um curso específico:
 * - Informações gerais (título, descrição, instrutor, certificado anexado)
 * - Lista ordenada de todas as aulas vinculadas a ele no Firestore
 * - Aplica os links de vídeo e formulários salvos
 */
export async function getCourseData(
  courseId: string = INITIAL_COURSE_ID
): Promise<Course> {
  const effectiveCourseId = normalizeCourseId(courseId);

  // Localiza os dados estáticos base do curso
  const baseFound = AVAILABLE_COURSES.find((c) => c.id === effectiveCourseId);
  const baseCourse: Course = baseFound
    ? JSON.parse(JSON.stringify(baseFound))
    : JSON.parse(JSON.stringify(INITIAL_COURSE));

  const localOverrides = getLocalLessonsOverrides();

  try {
    // 1. Busca personalizações salvas no documento 'courses/{courseId}' no Firestore
    try {
      const courseRef = doc(db, "courses", effectiveCourseId);
      const courseSnapshot = await getDoc(courseRef);

      if (courseSnapshot.exists()) {
        const firestoreCourse = courseSnapshot.data() as Partial<Course>;
        if (firestoreCourse.title && firestoreCourse.title !== "Programação Rockwell - Básico") {
          baseCourse.title = firestoreCourse.title;
        }
        if (firestoreCourse.subtitle) {
          baseCourse.subtitle = firestoreCourse.subtitle;
        }
        if (firestoreCourse.description) {
          baseCourse.description = firestoreCourse.description;
        }
        if (firestoreCourse.category && firestoreCourse.category !== "Automação Industrial & CLPs") {
          baseCourse.category = firestoreCourse.category;
        }
        if (firestoreCourse.instructor) {
          baseCourse.instructor = firestoreCourse.instructor;
        }
        if (firestoreCourse.badge && !["Certificação Profissional", "Especialização Técnica", "Nível Especialista"].includes(firestoreCourse.badge)) {
          baseCourse.badge = firestoreCourse.badge;
        }
        baseCourse.certificateUrl = firestoreCourse.certificateUrl || undefined;
        baseCourse.certificateFileName = firestoreCourse.certificateFileName || undefined;
        baseCourse.certificateFileSize = firestoreCourse.certificateFileSize || undefined;
        baseCourse.certificateUploadedAt = firestoreCourse.certificateUploadedAt || undefined;
      }

      // Se não houver certificado no Firestore, busca do cache local
      if (!baseCourse.certificateUrl) {
        const localCert = getLocalCourseCertificate(effectiveCourseId);
        if (localCert?.certificateUrl) {
          baseCourse.certificateUrl = localCert.certificateUrl;
          baseCourse.certificateFileName = localCert.certificateFileName;
          baseCourse.certificateFileSize = localCert.certificateFileSize;
          baseCourse.certificateUploadedAt = localCert.certificateUploadedAt;
        }
      }
    } catch (error) {
      console.warn("Aviso ao buscar dados do curso no Firestore:", error);
      const localCert = getLocalCourseCertificate(effectiveCourseId);
      if (localCert?.certificateUrl) {
        baseCourse.certificateUrl = localCert.certificateUrl;
        baseCourse.certificateFileName = localCert.certificateFileName;
        baseCourse.certificateFileSize = localCert.certificateFileSize;
        baseCourse.certificateUploadedAt = localCert.certificateUploadedAt;
      }
    }

    // 2. Busca todas as aulas pertencentes a este curso na coleção "lessons"
    let firestoreLessons: Lesson[] = [];
    try {
      const lessonsSnapshot = await getDocs(collection(db, "lessons"));

      firestoreLessons = lessonsSnapshot.docs
        .map((item) => {
          const data = item.data() as Lesson;
          return {
            ...data,
            id: item.id || data.id,
            courseId: normalizeCourseId(data.courseId),
            videoUrl: data.videoUrl || data.youtubeUrl || "",
            youtubeUrl: data.youtubeUrl || data.videoUrl || "",
            formUrl: data.formUrl || "",
          };
        })
        .filter((lesson) => {
          const lesCourseId = normalizeCourseId(lesson.courseId);
          return lesCourseId === effectiveCourseId;
        });

      // Preserva aulas de eventuais módulos legados
      try {
        const modulesSnapshot = await getDocs(collection(db, "modules"));
        modulesSnapshot.docs.forEach((mDoc) => {
          const mData = mDoc.data();
          const mCourseId = normalizeCourseId(mData.courseId);
          if (mCourseId === effectiveCourseId && Array.isArray(mData.lessons)) {
            mData.lessons.forEach((l: Lesson) => {
              if (l && l.id) {
                firestoreLessons.push({
                  ...l,
                  courseId: effectiveCourseId,
                  videoUrl: l.videoUrl || l.youtubeUrl || "",
                  youtubeUrl: l.youtubeUrl || l.videoUrl || "",
                  formUrl: l.formUrl || "",
                });
              }
            });
          }
        });
      } catch {
        // Ignora caso a coleção legada de módulos não exista
      }
    } catch (error) {
      console.warn("Aviso ao buscar aulas no Firestore:", error);
    }

    // 3. Mescla as aulas base com as atualizações salvas no Firestore e no cache
    const lessonsMap = new Map<string, Lesson>();

    baseCourse.lessons.forEach((l) => {
      lessonsMap.set(l.id, {
        ...l,
        courseId: effectiveCourseId,
      });
    });

    firestoreLessons.forEach((l) => {
      if (
        effectiveCourseId === "rockwell-basico" &&
        (l.id.startsWith("aula-1-") ||
          l.id.startsWith("aula-2-") ||
          l.id.startsWith("aula-3-") ||
          l.id.startsWith("aula-4-"))
      ) {
        return;
      }
      const existing = lessonsMap.get(l.id);
      lessonsMap.set(l.id, {
        ...(existing || {}),
        ...l,
        courseId: effectiveCourseId,
      });
    });

    // Aplica alterações salvas no cache local
    const mergedLessons: Lesson[] = Array.from(lessonsMap.values())
      .map((lesson) => {
        const local = localOverrides[lesson.id] || {};
        return {
          ...lesson,
          ...local,
          courseId: effectiveCourseId,
          videoUrl: local.videoUrl ?? lesson.videoUrl ?? "",
          formUrl: local.formUrl ?? lesson.formUrl ?? "",
          title: local.title ?? lesson.title ?? "",
          duration: local.duration ?? lesson.duration ?? "",
        };
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    baseCourse.lessons = mergedLessons;
    baseCourse.totalLessons = mergedLessons.length;

    // Mantém modules para compatibilidade
    baseCourse.modules = [
      {
        id: "main",
        courseId: effectiveCourseId,
        title: "Aulas",
        order: 1,
        lessons: mergedLessons,
      },
    ];

    return baseCourse;
  } catch (error) {
    console.warn("Aviso ao carregar curso. Utilizando dados padrão:", error);

    baseCourse.lessons = baseCourse.lessons.map((lesson) => {
      const local = localOverrides[lesson.id] || {};
      return {
        ...lesson,
        ...local,
        courseId: effectiveCourseId,
        videoUrl: local.videoUrl ?? lesson.videoUrl ?? "",
      };
    });

    baseCourse.totalLessons = baseCourse.lessons.length;
    return baseCourse;
  }
}

/**
 * Retorna todos os cursos disponíveis com suas aulas atualizadas.
 */
export async function getAllCourses(): Promise<Course[]> {
  const promises = AVAILABLE_COURSES.map((c) => getCourseData(c.id));
  return Promise.all(promises);
}

/**
 * Salva ou atualiza a URL do vídeo de uma aula (suporta YouTube e Google Drive).
 * Chamado pelo administrador para disponibilizar a gravação da aula.
 */
export async function saveLessonVideoUrl(
  lessonId: string,
  videoUrl: string,
  courseId: string = INITIAL_COURSE_ID
): Promise<void> {
  const cleanUrl = videoUrl.trim();
  const effectiveCourseId = normalizeCourseId(courseId);

  setLocalLessonsOverride(lessonId, {
    videoUrl: cleanUrl,
    youtubeUrl: cleanUrl,
  });

  try {
    const lessonRef = doc(db, "lessons", lessonId);
    await setDoc(
      lessonRef,
      {
        id: lessonId,
        courseId: effectiveCourseId,
        videoUrl: cleanUrl,
        youtubeUrl: cleanUrl,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn("Aviso ao salvar link de vídeo no Firestore:", error);
  }
}

/**
 * Atualiza campos específicos de uma aula (título, descrição, formulário, etc.).
 */
export async function updateLessonDetails(
  lessonId: string,
  data: Partial<Lesson>
): Promise<void> {
  const syncedData = {
    ...data,
    ...(data.videoUrl ? { youtubeUrl: data.videoUrl } : {}),
    ...(data.youtubeUrl ? { videoUrl: data.youtubeUrl } : {}),
  };

  setLocalLessonsOverride(lessonId, syncedData);

  try {
    const lessonRef = doc(db, "lessons", lessonId);
    await setDoc(
      lessonRef,
      {
        ...syncedData,
        id: lessonId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn("Aviso ao salvar detalhes da aula no Firestore:", error);
  }
}

/* ============================================================
   OPERAÇÕES ADMINISTRATIVAS DE AULAS
   ============================================================ */

/**
 * Cria uma nova aula diretamente vinculada a um curso no Firestore.
 */
export async function addLesson(lesson: Lesson): Promise<void> {
  const effectiveCourseId = normalizeCourseId(lesson.courseId);
  const lessonRef = doc(db, "lessons", lesson.id);

  const cleanVideo = (lesson.videoUrl || lesson.youtubeUrl || "").trim();

  const payload: Lesson = {
    ...lesson,
    courseId: effectiveCourseId,
    videoUrl: cleanVideo,
    youtubeUrl: cleanVideo,
  };

  await setDoc(lessonRef, {
    ...payload,
    updatedAt: new Date().toISOString(),
  });

  setLocalLessonsOverride(lesson.id, {
    videoUrl: cleanVideo,
    youtubeUrl: cleanVideo,
    title: lesson.title,
    duration: lesson.duration,
    formUrl: lesson.formUrl,
    order: lesson.order,
  });
}

/**
 * Atualiza os dados de uma aula no Firestore.
 */
export async function updateLesson(
  lessonId: string,
  data: Partial<Lesson>
): Promise<void> {
  const lessonRef = doc(db, "lessons", lessonId);

  const syncedData = {
    ...data,
    ...(data.videoUrl ? { youtubeUrl: data.videoUrl } : {}),
    ...(data.youtubeUrl ? { videoUrl: data.youtubeUrl } : {}),
  };

  await setDoc(
    lessonRef,
    {
      ...syncedData,
      id: lessonId,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  setLocalLessonsOverride(lessonId, syncedData);
}

/**
 * Exclui uma aula do Firestore e do cache local.
 */
export async function deleteLesson(lessonId: string): Promise<void> {
  const lessonRef = doc(db, "lessons", lessonId);
  await deleteDoc(lessonRef);

  if (typeof window !== "undefined") {
    try {
      const current = getLocalLessonsOverrides();
      delete current[lessonId];
      localStorage.setItem(
        STORAGE_LESSONS_OVERRIDE_KEY,
        JSON.stringify(current)
      );
    } catch (error) {
      console.warn("Erro ao remover aula do cache local:", error);
    }
  }
}

/**
 * Atualiza a sequência/ordem numérica de exibição de uma lista de aulas.
 */
export async function updateLessonsOrder(
  orderedLessons: { id: string; order: number }[]
): Promise<void> {
  for (const item of orderedLessons) {
    await updateLesson(item.id, { order: item.order });
  }
}

/* ============================================================
   GESTÃO DE CERTIFICADOS PELO ADMINISTRADOR
   ============================================================ */

/**
 * Vincula o arquivo de certificado cadastrado pelo administrador ao curso.
 * Salva na coleção "courses" do Firestore e no cache local.
 */
export async function saveCourseCertificate(
  courseId: string,
  certData: {
    certificateUrl: string;
    certificateFileName: string;
    certificateFileSize?: string;
  }
): Promise<void> {
  const effectiveCourseId = normalizeCourseId(courseId);
  const payload = {
    certificateUrl: certData.certificateUrl,
    certificateFileName: certData.certificateFileName,
    certificateFileSize: certData.certificateFileSize || "",
    certificateUploadedAt: new Date().toISOString(),
  };

  setLocalCourseCertificate(effectiveCourseId, payload);

  try {
    const courseRef = doc(db, "courses", effectiveCourseId);
    await setDoc(courseRef, payload, { merge: true });
  } catch (error) {
    console.warn("Aviso ao salvar certificado no Firestore:", error);
  }
}

/**
 * Remove o arquivo de certificado associado ao curso.
 */
export async function removeCourseCertificate(courseId: string): Promise<void> {
  const effectiveCourseId = normalizeCourseId(courseId);

  setLocalCourseCertificate(effectiveCourseId, null);

  try {
    const courseRef = doc(db, "courses", effectiveCourseId);
    await setDoc(
      courseRef,
      {
        certificateUrl: "",
        certificateFileName: "",
        certificateFileSize: "",
        certificateUploadedAt: "",
      },
      { merge: true }
    );
  } catch (error) {
    console.warn("Aviso ao remover certificado do Firestore:", error);
  }
}

/* ============================================================
   GESTÃO DE ALUNOS E PERMISSÕES (PAINEL ADMINISTRATIVO)
   ============================================================ */

/**
 * Busca a lista de todos os usuários registrados no sistema.
 * Utilizado pelo administrador para gerenciar matrículas e acessos.
 */
export async function fetchAllUsers(): Promise<UserProfile[]> {
  try {
    const usersCol = collection(db, "users");
    const snapshot = await getDocs(usersCol);

    const users: UserProfile[] = [];
    snapshot.forEach((item) => {
      users.push(item.data() as UserProfile);
    });

    return users;
  } catch (error) {
    console.warn("Aviso ao buscar usuários no Firestore:", error);
    return [];
  }
}

/**
 * Ativa ou suspende o acesso de um aluno à plataforma (campo accessEnabled).
 */
export async function toggleUserAccess(
  userId: string,
  accessEnabled: boolean
): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      accessEnabled,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erro ao atualizar status de acesso do usuário:", error);
    throw error;
  }
}

/**
 * Atualiza a lista de cursos liberados para determinado aluno (campo enrolledCourses).
 */
export async function updateUserEnrolledCourses(
  userId: string,
  enrolledCourses: string[]
): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      enrolledCourses,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erro ao atualizar cursos matriculados do usuário:", error);
    throw error;
  }
}

/* ============================================================
   COMPATIBILIDADE RETROATIVA
   ============================================================ */

export async function addModule(courseId: string, module: Module): Promise<void> {
  const moduleRef = doc(db, "modules", module.id);
  await setDoc(moduleRef, {
    ...module,
    courseId,
    lessons: [],
    updatedAt: new Date().toISOString(),
  });
}

export async function updateModule(
  moduleId: string,
  data: Partial<Module>
): Promise<void> {
  const moduleRef = doc(db, "modules", moduleId);
  await setDoc(
    moduleRef,
    {
      ...data,
      id: moduleId,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function deleteModule(moduleId: string): Promise<void> {
  const moduleRef = doc(db, "modules", moduleId);
  await deleteDoc(moduleRef);
}

export async function saveCourseStructure(course: Course): Promise<void> {
  const courseRef = doc(db, "courses", course.id);
  await setDoc(
    courseRef,
    {
      id: course.id,
      title: course.title,
      subtitle: course.subtitle,
      description: course.description,
      category: course.category,
      instructor: course.instructor,
      badge: course.badge,
      totalLessons: course.totalLessons,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}
