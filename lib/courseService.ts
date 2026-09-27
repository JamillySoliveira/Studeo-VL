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
  BASIC_ROCKWELL_LESSONS,
} from "./courseData";
import { clearUserProfileCache } from "./studentService";

// =======================================================================
// CACHE EM MEMÓRIA E DEDUPLICAÇÃO DE REQUISIÇÕES (ALTA PERFORMANCE)
// =======================================================================
const courseCache = new Map<string, { data: Course; timestamp: number }>();
const inFlightCoursePromises = new Map<string, Promise<Course>>();
let inFlightAllCourses: Promise<Course[]> | null = null;
const COURSE_CACHE_TTL = 60 * 1000; // 60 segundos de permanência ultra-rápida em memória

/**
 * Limpa o cache em memória dos cursos.
 * Chamado automaticamente em qualquer alteração feita pelo administrador.
 */
export function clearCourseCache(): void {
  courseCache.clear();
  inFlightCoursePromises.clear();
  inFlightAllCourses = null;
}

// Chaves utilizadas para cache no localStorage do navegador
const STORAGE_LESSONS_OVERRIDE_KEY = "vl_lessons_custom_urls";
const STORAGE_COURSE_CERT_PREFIX = "vl_course_cert_";
const STORAGE_DELETED_LESSONS_KEY = "vl_deleted_lessons";

/**
 * Lê do cache local as aulas que foram excluídas pelo administrador.
 */
function getLocalDeletedLessons(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_DELETED_LESSONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Registra o ID da aula excluída no cache local.
 */
function setLocalDeletedLesson(lessonId: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getLocalDeletedLessons();
    if (!current.includes(lessonId)) {
      current.push(lessonId);
      localStorage.setItem(STORAGE_DELETED_LESSONS_KEY, JSON.stringify(current));
    }
  } catch (error) {
    console.warn("Erro ao salvar aula excluída no cache local:", error);
  }
}

/**
 * Remove o ID da aula do cache local de exclusões (se for recriada).
 */
function removeLocalDeletedLesson(lessonId: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getLocalDeletedLessons().filter((id) => id !== lessonId);
    localStorage.setItem(STORAGE_DELETED_LESSONS_KEY, JSON.stringify(current));
  } catch (error) {
    console.warn("Erro ao atualizar cache local de aulas excluídas:", error);
  }
}

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
 * Identifica se o usuário atual é uma conta de "Aluno Demonstração".
 * O Aluno Demonstração é uma conta com acesso limitado para conhecer a plataforma
 * e assistir ao vídeo de suporte, sem qualquer acesso aos vídeos das aulas dos cursos.
 */
export function isDemoUser(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  if (user.uid === "demo-aluno-vl-001") return true;
  const email = (user.email || "").toLowerCase().trim();
  if (email === "aluno.demo@vlautomacao.com.br" || email.startsWith("aluno.demo@")) return true;
  const name = (user.displayName || "").toLowerCase().trim();
  if (name === "aluno demonstração" || name === "aluno demonstracao") return true;
  if ((user as { isDemo?: boolean }).isDemo === true) return true;
  return false;
}

/**
 * Higieniza os dados do curso para o usuário de demonstração.
 * Garante segurança na fonte de dados: remove completamente todas as URLs
 * de vídeo (videoUrl e youtubeUrl) das aulas para que o Aluno Demonstração
 * não receba nem consiga inspecionar os links protegidos.
 */
export function sanitizeCourseForUser(
  course: Course,
  user: UserProfile | null | undefined
): Course {
  if (!isDemoUser(user)) {
    return course;
  }

  // Remove URLs dos vídeos das aulas para o Aluno Demonstração
  const sanitizedLessons = (course.lessons || []).map((lesson) => ({
    ...lesson,
    videoUrl: "",
    youtubeUrl: "",
  }));

  const sanitizedModules = (course.modules || []).map((m) => ({
    ...m,
    lessons: (m.lessons || []).map((lesson) => ({
      ...lesson,
      videoUrl: "",
      youtubeUrl: "",
    })),
  }));

  return {
    ...course,
    lessons: sanitizedLessons,
    modules: sanitizedModules,
  };
}

/**
 * Higieniza uma lista de cursos para o Aluno Demonstração.
 */
export function sanitizeCoursesForUser(
  courses: Course[],
  user: UserProfile | null | undefined
): Course[] {
  if (!isDemoUser(user)) {
    return courses;
  }
  return courses.map((course) => sanitizeCourseForUser(course, user));
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
  // Aluno Demonstração nunca possui papel de administrador
  if (user.role === "admin" && !isDemoUser(user)) return true;

  const effectiveCourseId = normalizeCourseId(courseId);
  const accessibleIds = getUserAccessibleCourseIds(user);
  return accessibleIds.includes(effectiveCourseId);
}

/**
 * Monta o objeto final do curso combinando dados base, personalizações do Firestore,
 * aulas adicionadas/atualizadas, exclusões e overrides locais.
 */
function assembleCourse(
  effectiveCourseId: string,
  baseCourse: Course,
  firestoreCourseData: Partial<Course> | null,
  firestoreLessons: Lesson[],
  deletedLessonIds: Set<string>,
  localOverrides: Record<string, Partial<Lesson>>
): Course {
  const result: Course = JSON.parse(JSON.stringify(baseCourse));
  result.id = effectiveCourseId;

  if (firestoreCourseData) {
    if (
      firestoreCourseData.title &&
      firestoreCourseData.title !== "Programação Rockwell - Básico"
    ) {
      result.title = firestoreCourseData.title;
    }
    if (firestoreCourseData.subtitle) {
      result.subtitle = firestoreCourseData.subtitle;
    }
    if (firestoreCourseData.description) {
      result.description = firestoreCourseData.description;
    }
    if (
      firestoreCourseData.category &&
      firestoreCourseData.category !== "Automação Industrial & CLPs"
    ) {
      result.category = firestoreCourseData.category;
    }
    if (firestoreCourseData.instructor) {
      result.instructor = firestoreCourseData.instructor;
    }
    if (
      firestoreCourseData.badge &&
      ![
        "Certificação Profissional",
        "Especialização Técnica",
        "Nível Especialista",
      ].includes(firestoreCourseData.badge)
    ) {
      result.badge = firestoreCourseData.badge;
    }
    result.certificateUrl = firestoreCourseData.certificateUrl || undefined;
    result.certificateFileName =
      firestoreCourseData.certificateFileName || undefined;
    result.certificateFileSize =
      firestoreCourseData.certificateFileSize || undefined;
    result.certificateUploadedAt =
      firestoreCourseData.certificateUploadedAt || undefined;
  }

  // Se não houver certificado no Firestore, busca do cache local
  if (!result.certificateUrl) {
    const localCert = getLocalCourseCertificate(effectiveCourseId);
    if (localCert?.certificateUrl) {
      result.certificateUrl = localCert.certificateUrl;
      result.certificateFileName = localCert.certificateFileName;
      result.certificateFileSize = localCert.certificateFileSize;
      result.certificateUploadedAt = localCert.certificateUploadedAt;
    }
  }

  // Mescla as aulas base com as atualizações salvas no Firestore e no cache
  const lessonsMap = new Map<string, Lesson>();

  // NÃO adiciona ao resultado as aulas padrão do INITIAL_COURSE que estejam marcadas como excluídas
  (baseCourse.lessons || []).forEach((l) => {
    if (deletedLessonIds.has(l.id)) {
      return;
    }
    lessonsMap.set(l.id, {
      ...l,
      courseId: effectiveCourseId,
    });
  });

  // Continua incorporando normalmente as aulas existentes no Firestore
  firestoreLessons.forEach((l) => {
    if (deletedLessonIds.has(l.id)) {
      return;
    }
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
    .filter((lesson) => !deletedLessonIds.has(lesson.id))
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

  result.lessons = mergedLessons;
  result.totalLessons = mergedLessons.length;

  result.modules = [
    {
      id: "main",
      courseId: effectiveCourseId,
      title: "Aulas",
      order: 1,
      lessons: mergedLessons,
    },
  ];

  return result;
}

/**
 * Carrega todas as informações de um curso específico:
 * - Informações gerais (título, descrição, instrutor, certificado anexado)
 * - Lista ordenada de todas as aulas vinculadas a ele no Firestore
 * - Aplica os links de vídeo e formulários salvos
 * - Higieniza as URLs de vídeo se o usuário for Aluno Demonstração
 */
export async function getCourseData(
  courseId: string = INITIAL_COURSE_ID,
  user?: UserProfile | null
): Promise<Course> {
  const effectiveCourseId = normalizeCourseId(courseId);

  // 1. Verifica cache em memória ultra-rápido (0ms latency)
  const cached = courseCache.get(effectiveCourseId);
  if (cached && Date.now() - cached.timestamp < COURSE_CACHE_TTL) {
    return isDemoUser(user)
      ? sanitizeCourseForUser(cached.data, user)
      : cached.data;
  }

  // 2. Se já houver promessa em andamento para este curso, reutiliza
  if (inFlightCoursePromises.has(effectiveCourseId)) {
    const active = await inFlightCoursePromises.get(effectiveCourseId)!;
    return isDemoUser(user) ? sanitizeCourseForUser(active, user) : active;
  }

  // 3. Executa a busca otimizada
  const fetchPromise = (async (): Promise<Course> => {
    // Localiza os dados estáticos base do curso
    const baseFound = AVAILABLE_COURSES.find((c) => c.id === effectiveCourseId);
    const baseCourse: Course = baseFound
      ? JSON.parse(JSON.stringify(baseFound))
      : JSON.parse(JSON.stringify(INITIAL_COURSE));

    const localOverrides = getLocalLessonsOverrides();
    const localDeleted = getLocalDeletedLessons();
    const deletedLessonIds = new Set<string>(localDeleted);

    try {
      // Executa buscas em paralelo
      const [deletedSnapshot, courseSnapshot, lessonsSnapshot, modulesSnapshot] =
        await Promise.all([
          getDocs(collection(db, "deletedLessons")).catch(() => null),
          getDoc(doc(db, "courses", effectiveCourseId)).catch(() => null),
          getDocs(collection(db, "lessons")).catch(() => null),
          getDocs(collection(db, "modules")).catch(() => null),
        ]);

      if (deletedSnapshot) {
        deletedSnapshot.docs.forEach((dDoc) => {
          const data = dDoc.data();
          const dId = dDoc.id || data.id;
          const dCourseId = data.courseId ? normalizeCourseId(data.courseId) : "";
          if (!dCourseId || dCourseId === effectiveCourseId) {
            deletedLessonIds.add(dId);
            setLocalDeletedLesson(dId);
          }
        });
      }

      const firestoreCourse =
        courseSnapshot && courseSnapshot.exists()
          ? (courseSnapshot.data() as Partial<Course>)
          : null;

      let firestoreLessons: Lesson[] = [];
      if (lessonsSnapshot) {
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
            if (deletedLessonIds.has(lesson.id)) return false;
            return normalizeCourseId(lesson.courseId) === effectiveCourseId;
          });
      }

      if (modulesSnapshot) {
        modulesSnapshot.docs.forEach((mDoc) => {
          const mData = mDoc.data();
          const mCourseId = normalizeCourseId(mData.courseId);
          if (mCourseId === effectiveCourseId && Array.isArray(mData.lessons)) {
            mData.lessons.forEach((l: Lesson) => {
              if (l && l.id && !deletedLessonIds.has(l.id)) {
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
      }

      const built = assembleCourse(
        effectiveCourseId,
        baseCourse,
        firestoreCourse,
        firestoreLessons,
        deletedLessonIds,
        localOverrides
      );

      courseCache.set(effectiveCourseId, {
        data: built,
        timestamp: Date.now(),
      });
      return built;
    } catch (error) {
      console.warn("Aviso ao carregar curso. Utilizando dados padrão:", error);

      baseCourse.lessons = (baseCourse.lessons || [])
        .filter((lesson) => !deletedLessonIds.has(lesson.id))
        .map((lesson) => {
          const local = localOverrides[lesson.id] || {};
          return {
            ...lesson,
            ...local,
            courseId: effectiveCourseId,
            videoUrl: local.videoUrl ?? lesson.videoUrl ?? "",
          };
        });

      baseCourse.totalLessons = baseCourse.lessons.length;
      courseCache.set(effectiveCourseId, {
        data: baseCourse,
        timestamp: Date.now(),
      });
      return baseCourse;
    }
  })().finally(() => {
    inFlightCoursePromises.delete(effectiveCourseId);
  });

  inFlightCoursePromises.set(effectiveCourseId, fetchPromise);
  const result = await fetchPromise;
  return isDemoUser(user) ? sanitizeCourseForUser(result, user) : result;
}

/**
 * Retorna todos os cursos disponíveis com suas aulas atualizadas.
 * Executa uma ÚNICA consulta em lote (batch fetch) às coleções do Firestore,
 * alimentando o cache de todos os cursos de uma só vez para velocidade máxima.
 */
export async function getAllCourses(
  user?: UserProfile | null
): Promise<Course[]> {
  // 1. Verifica se todos os cursos disponíveis já estão no cache em memória
  const now = Date.now();
  const allCached = AVAILABLE_COURSES.every((c) => {
    const cached = courseCache.get(c.id);
    return cached && now - cached.timestamp < COURSE_CACHE_TTL;
  });

  if (allCached) {
    const list = AVAILABLE_COURSES.map((c) => courseCache.get(c.id)!.data);
    return isDemoUser(user) ? sanitizeCoursesForUser(list, user) : list;
  }

  // 2. Se já houver uma busca global em lote em andamento, compartilha
  if (inFlightAllCourses) {
    const res = await inFlightAllCourses;
    return isDemoUser(user) ? sanitizeCoursesForUser(res, user) : res;
  }

  // 3. Busca consolidada em lote (1 única varredura para todos os cursos)
  inFlightAllCourses = (async (): Promise<Course[]> => {
    const localOverrides = getLocalLessonsOverrides();
    const localDeleted = getLocalDeletedLessons();
    const deletedLessonIds = new Set<string>(localDeleted);

    try {
      const [deletedSnapshot, lessonsSnapshot, modulesSnapshot, ...courseSnapshots] =
        await Promise.all([
          getDocs(collection(db, "deletedLessons")).catch(() => null),
          getDocs(collection(db, "lessons")).catch(() => null),
          getDocs(collection(db, "modules")).catch(() => null),
          ...AVAILABLE_COURSES.map((c) =>
            getDoc(doc(db, "courses", c.id)).catch(() => null)
          ),
        ]);

      if (deletedSnapshot) {
        deletedSnapshot.docs.forEach((dDoc) => {
          const data = dDoc.data();
          const dId = dDoc.id || data.id;
          deletedLessonIds.add(dId);
          setLocalDeletedLesson(dId);
        });
      }

      // Mapeia todas as aulas de todos os cursos
      const allFirestoreLessons: Lesson[] = [];
      if (lessonsSnapshot) {
        lessonsSnapshot.docs.forEach((item) => {
          const data = item.data() as Lesson;
          allFirestoreLessons.push({
            ...data,
            id: item.id || data.id,
            courseId: normalizeCourseId(data.courseId),
            videoUrl: data.videoUrl || data.youtubeUrl || "",
            youtubeUrl: data.youtubeUrl || data.videoUrl || "",
            formUrl: data.formUrl || "",
          });
        });
      }

      if (modulesSnapshot) {
        modulesSnapshot.docs.forEach((mDoc) => {
          const mData = mDoc.data();
          const mCourseId = normalizeCourseId(mData.courseId);
          if (Array.isArray(mData.lessons)) {
            mData.lessons.forEach((l: Lesson) => {
              if (l && l.id && !deletedLessonIds.has(l.id)) {
                allFirestoreLessons.push({
                  ...l,
                  courseId: mCourseId,
                  videoUrl: l.videoUrl || l.youtubeUrl || "",
                  youtubeUrl: l.youtubeUrl || l.videoUrl || "",
                  formUrl: l.formUrl || "",
                });
              }
            });
          }
        });
      }

      const coursesMapData = new Map<string, Partial<Course>>();
      courseSnapshots.forEach((snap, idx) => {
        if (snap && snap.exists()) {
          const cId = AVAILABLE_COURSES[idx].id;
          coursesMapData.set(cId, snap.data() as Partial<Course>);
        }
      });

      const assembledCourses: Course[] = AVAILABLE_COURSES.map((c) => {
        const cCourseId = c.id;
        const firestoreCourseData = coursesMapData.get(cCourseId) || null;
        const relevantLessons = allFirestoreLessons.filter(
          (les) => normalizeCourseId(les.courseId) === cCourseId
        );

        const built = assembleCourse(
          cCourseId,
          c,
          firestoreCourseData,
          relevantLessons,
          deletedLessonIds,
          localOverrides
        );

        courseCache.set(cCourseId, {
          data: built,
          timestamp: Date.now(),
        });
        return built;
      });

      return assembledCourses;
    } catch (error) {
      console.warn("Aviso ao carregar todos os cursos em lote:", error);
      // Fallback para os dados estáticos locais
      return AVAILABLE_COURSES.map((c) => {
        const cached = courseCache.get(c.id);
        return cached ? cached.data : c;
      });
    }
  })().finally(() => {
    inFlightAllCourses = null;
  });

  const allResult = await inFlightAllCourses;
  return isDemoUser(user) ? sanitizeCoursesForUser(allResult, user) : allResult;
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

  clearCourseCache();

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
  clearCourseCache();

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

  clearCourseCache();

  await setDoc(lessonRef, {
    ...payload,
    updatedAt: new Date().toISOString(),
  });

  // Se a aula foi recriada, remove do registro de aulas excluídas caso estivesse lá
  try {
    const deletedRef = doc(db, "deletedLessons", lesson.id);
    await deleteDoc(deletedRef);
    removeLocalDeletedLesson(lesson.id);
  } catch {
    // Ignora se não existia em deletedLessons
  }

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

  clearCourseCache();

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
 * Exclui uma aula:
 * 1. Remove da coleção "lessons" do Firestore.
 * 2. Registra o ID da aula na coleção "deletedLessons" do Firestore (mantendo courseId e moduleId para identificação).
 * 3. Remove qualquer override local relacionado à aula.
 */
export async function deleteLesson(
  lessonId: string,
  courseId?: string,
  moduleId?: string
): Promise<void> {
  clearCourseCache();

  // 1. Identifica courseId e moduleId da aula a ser excluída
  let targetCourseId = courseId || "";
  let targetModuleId = moduleId || "";

  if (!targetCourseId || !targetModuleId) {
    const basicLesson = BASIC_ROCKWELL_LESSONS.find((l) => l.id === lessonId);
    if (basicLesson) {
      targetCourseId = targetCourseId || basicLesson.courseId;
      targetModuleId = targetModuleId || basicLesson.moduleId || "";
    }
  }

  // 2. Exclui a aula da coleção 'lessons' no Firestore
  try {
    const lessonRef = doc(db, "lessons", lessonId);
    await deleteDoc(lessonRef);
  } catch (error) {
    console.warn("Aviso ao remover da coleção lessons:", error);
  }

  // 3. Registra o ID da aula na coleção 'deletedLessons' do Firestore para persistência definitiva
  try {
    const deletedRef = doc(db, "deletedLessons", lessonId);
    await setDoc(
      deletedRef,
      {
        id: lessonId,
        courseId: targetCourseId ? normalizeCourseId(targetCourseId) : "",
        moduleId: targetModuleId || "",
        deletedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Erro ao registrar aula em deletedLessons:", error);
    throw error;
  }

  // 4. Remove qualquer override local relacionado à aula e atualiza cache local de exclusões
  if (typeof window !== "undefined") {
    try {
      const current = getLocalLessonsOverrides();
      delete current[lessonId];
      localStorage.setItem(
        STORAGE_LESSONS_OVERRIDE_KEY,
        JSON.stringify(current)
      );
    } catch (error) {
      console.warn("Erro ao remover aula do cache local de overrides:", error);
    }

    setLocalDeletedLesson(lessonId);
  }
}

/**
 * Atualiza a sequência/ordem numérica de exibição de uma lista de aulas.
 */
export async function updateLessonsOrder(
  orderedLessons: { id: string; order: number }[]
): Promise<void> {
  clearCourseCache();
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
  clearCourseCache();

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
  clearCourseCache();

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
  clearUserProfileCache(userId);
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
  clearUserProfileCache(userId);
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
  clearCourseCache();
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
  clearCourseCache();
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
  clearCourseCache();
  const moduleRef = doc(db, "modules", moduleId);
  await deleteDoc(moduleRef);
}

export async function saveCourseStructure(course: Course): Promise<void> {
  clearCourseCache();
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
