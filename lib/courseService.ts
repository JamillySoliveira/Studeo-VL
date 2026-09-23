/**
 * Serviço de Cursos, Aulas e Permissões de Usuários no Cloud Firestore
 *
 * Arquitetura Simplificada:
 * Curso └── Aulas (cada aula associada diretamente através de courseId)
 *
 * Controle de Acesso:
 * - accessEnabled: controla se o usuário pode acessar a plataforma
 * - enrolledCourses: lista de IDs de cursos liberados para o aluno (ex: ["rockwell-basico"])
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

const STORAGE_LESSONS_OVERRIDE_KEY = "vl_lessons_custom_urls";
const STORAGE_COURSE_CERT_PREFIX = "vl_course_cert_";

/**
 * Lê certificado salvo localmente no cache.
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
 * Salva ou remove o certificado no cache local.
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
 * Lê alterações locais das aulas (cache para resiliência).
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
 * Salva uma alteração de aula no cache local.
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
 * Normaliza o ID de um curso para compatibilidade com dados legados.
 */
export function normalizeCourseId(courseId?: string): string {
  if (!courseId) return INITIAL_COURSE_ID;
  if (courseId === "rockwell-controle-analogico-supervisorio") {
    return "rockwell-basico";
  }
  return courseId;
}

/**
 * Retorna os IDs dos cursos aos quais o usuário tem acesso a partir de enrolledCourses.
 * 
 * Regra:
 * - accessEnabled: determina se o usuário pode utilizar a plataforma.
 * - enrolledCourses: determina quais cursos o usuário possui acesso (fonte da verdade).
 * - Administradores (role === "admin") possuem acesso administrativo e liberado a todos os cursos.
 */
export function getUserAccessibleCourseIds(user: UserProfile | null): string[] {
  if (!user) return [];

  // Se o usuário estiver bloqueado pelo accessEnabled, não acessa nenhum curso
  if (user.accessEnabled === false) return [];

  // Administradores possuem acesso total a todos os cursos através do role
  if (user.role === "admin") {
    return AVAILABLE_COURSES.map((c) => c.id);
  }

  const enrolled = Array.isArray(user.enrolledCourses) ? user.enrolledCourses : [];
  const accessible: string[] = [];

  // Validação estrita por curso em enrolledCourses (com compatibilidade para o ID legado)
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
 * Verifica se o usuário possui acesso ao curso específico através do seu role e de enrolledCourses.
 * 
 * - Se accessEnabled === false, o acesso a qualquer curso é negado.
 * - Se role === "admin", acesso concedido.
 * - Se role !== "admin", verifica se o courseId está estritamente presente nos cursos de enrolledCourses.
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
 * Busca os dados de um curso com suas aulas diretas (sem módulos na estrutura principal).
 */
export async function getCourseData(
  courseId: string = INITIAL_COURSE_ID
): Promise<Course> {
  const effectiveCourseId = normalizeCourseId(courseId);

  // Localiza a base estática do curso
  const baseFound = AVAILABLE_COURSES.find((c) => c.id === effectiveCourseId);
  const baseCourse: Course = baseFound
    ? JSON.parse(JSON.stringify(baseFound))
    : JSON.parse(JSON.stringify(INITIAL_COURSE));

  const localOverrides = getLocalLessonsOverrides();

  try {
    // 1. Busca dados do curso no Firestore (se houver customizações)
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

      // Se não veio do Firestore, tenta recuperar do cache local
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
      console.warn("Aviso ao buscar dados gerais do curso no Firestore:", error);
      const localCert = getLocalCourseCertificate(effectiveCourseId);
      if (localCert?.certificateUrl) {
        baseCourse.certificateUrl = localCert.certificateUrl;
        baseCourse.certificateFileName = localCert.certificateFileName;
        baseCourse.certificateFileSize = localCert.certificateFileSize;
        baseCourse.certificateUploadedAt = localCert.certificateUploadedAt;
      }
    }

    // 2. Busca as aulas no Firestore pertencentes ao courseId
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

      // Preserva aulas que possam ter sido salvas na estrutura legada de módulos no Firestore
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
        // Sem impacto se a coleção de módulos não estiver presente
      }
    } catch (error) {
      console.warn("Aviso ao buscar aulas no Firestore:", error);
    }

    // 3. Monta o mapa das aulas (Base + Firestore + Cache Local)
    const lessonsMap = new Map<string, Lesson>();

    // Aulas base padrão do curso
    baseCourse.lessons.forEach((l) => {
      lessonsMap.set(l.id, {
        ...l,
        courseId: effectiveCourseId,
      });
    });

    // Aulas salvas no Firestore (ignora IDs de seeds legadas como 'aula-1-1' no curso básico)
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

    // Aplica overrides locais e normaliza
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

    // Mantém modules preenchido para compatibilidade com código legado
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
 * Retorna todos os 3 cursos com suas respectivas aulas.
 */
export async function getAllCourses(): Promise<Course[]> {
  const promises = AVAILABLE_COURSES.map((c) => getCourseData(c.id));
  return Promise.all(promises);
}

/**
 * Alias mantido para compatibilidade.
 */
export const getCourseWithOverrides = getCourseData;

/**
 * Salva o link do vídeo de uma aula.
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
 * Atualiza os dados de uma aula existente.
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
   CRUD DE AULAS (Curso └── Aulas)
   ============================================================ */

/**
 * Cria uma nova aula diretamente associada a um curso.
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
 * Atualiza uma aula existente.
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
 * Exclui uma aula.
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
 * Atualiza a ordem de uma lista de aulas.
 */
export async function updateLessonsOrder(
  orderedLessons: { id: string; order: number }[]
): Promise<void> {
  for (const item of orderedLessons) {
    await updateLesson(item.id, { order: item.order });
  }
}

/* ============================================================
   GESTÃO DE CERTIFICADOS POR CURSO
   ============================================================ */

/**
 * Salva o arquivo de certificado cadastrado pelo administrador para determinado curso.
 * Persiste no Firestore na coleção 'courses' e no cache local.
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

  // Salva no cache local para resiliência imediata
  setLocalCourseCertificate(effectiveCourseId, payload);

  try {
    const courseRef = doc(db, "courses", effectiveCourseId);
    await setDoc(courseRef, payload, { merge: true });
  } catch (error) {
    console.warn("Aviso ao salvar certificado no Firestore:", error);
  }
}

/**
 * Remove o arquivo de certificado vinculado ao curso.
 */
export async function removeCourseCertificate(courseId: string): Promise<void> {
  const effectiveCourseId = normalizeCourseId(courseId);

  // Limpa cache local
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
   GESTÃO DE USUÁRIOS E PERMISSÕES
   ============================================================ */

/**
 * Busca todos os usuários cadastrados.
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
 * Bloqueia ou libera o acesso de um usuário à plataforma (accessEnabled).
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
 * Atualiza exclusivamente a lista de cursos matriculados do usuário (enrolledCourses).
 * Não mistura com accessEnabled.
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
   FUNÇÕES LEGADAS DE MÓDULOS (Mantidas para compatibilidade)
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
