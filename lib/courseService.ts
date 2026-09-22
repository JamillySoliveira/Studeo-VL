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
import { INITIAL_COURSE } from "./courseData";

const STORAGE_LESSONS_OVERRIDE_KEY = "vl_lessons_custom_urls";

/**
 * Lê alterações locais das aulas.
 * Esse cache ajuda a plataforma a continuar mostrando os links
 * mesmo quando o Firestore não estiver disponível temporariamente.
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
 * Busca o curso completo.
 *
 * Ordem utilizada:
 * 1. Começa com o curso padrão de courseData.ts.
 * 2. Procura a estrutura de módulos no Firestore.
 * 3. Procura as aulas no Firestore.
 * 4. Aplica os links/alterações locais das aulas.
 *
 * Dessa forma, novos módulos e novas aulas criados pelo administrador
 * continuam aparecendo depois de atualizar a página.
 */
export async function getCourseData(
  courseId: string = INITIAL_COURSE.id
): Promise<Course> {
  const baseCourse: Course = JSON.parse(JSON.stringify(INITIAL_COURSE));

  const localOverrides = getLocalLessonsOverrides();

  try {
    // ---------------------------------------------------------
    // 1. Busca os dados gerais do curso no Firestore
    // ---------------------------------------------------------
    let firestoreCourse: Partial<Course> = {};

    try {
      const courseRef = doc(db, "courses", courseId);
      const courseSnapshot = await getDoc(courseRef);

      if (courseSnapshot.exists()) {
        firestoreCourse = courseSnapshot.data() as Partial<Course>;
      }
    } catch (error) {
      console.warn(
        "Aviso ao buscar dados gerais do curso no Firestore:",
        error
      );
    }

    // ---------------------------------------------------------
    // 2. Busca os módulos
    // ---------------------------------------------------------
    let firestoreModules: Module[] = [];

    try {
      const modulesSnapshot = await getDocs(collection(db, "modules"));

      firestoreModules = modulesSnapshot.docs
        .map((item) => item.data() as Module)
        .filter((module) => module.courseId === courseId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    } catch (error) {
      console.warn(
        "Aviso ao buscar módulos no Firestore:",
        error
      );
    }

    // ---------------------------------------------------------
    // 3. Busca todas as aulas
    // ---------------------------------------------------------
    let firestoreLessons: Lesson[] = [];

    try {
      const lessonsSnapshot = await getDocs(collection(db, "lessons"));

      firestoreLessons = lessonsSnapshot.docs
        .map((item) => item.data() as Lesson)
        .filter((lesson) => lesson.courseId === courseId);
    } catch (error) {
      console.warn(
        "Aviso ao buscar aulas no Firestore:",
        error
      );
    }

    // ---------------------------------------------------------
    // 4. Monta o mapa das aulas do Firestore
    // ---------------------------------------------------------
    const firestoreLessonsMap: Record<string, Partial<Lesson>> = {};

    firestoreLessons.forEach((lesson) => {
      if (lesson.id) {
        firestoreLessonsMap[lesson.id] = lesson;
      }
    });

    // ---------------------------------------------------------
    // 5. Se existem módulos no Firestore, eles passam a ser
    //    a estrutura principal do curso.
    //
    //    Se ainda não existem módulos no Firestore, usamos
    //    os módulos originais de INITIAL_COURSE.
    // ---------------------------------------------------------
    const sourceModules =
      firestoreModules.length > 0
        ? firestoreModules
        : baseCourse.modules;

    const finalModules: Module[] = sourceModules
      .map((module) => {
        // Aulas padrão pertencentes a este módulo
        const defaultLessons = baseCourse.modules
          .flatMap((item) => item.lessons)
          .filter((lesson) => lesson.moduleId === module.id);

        // Aulas salvas no Firestore pertencentes a este módulo
        const savedLessons = firestoreLessons.filter(
          (lesson) => lesson.moduleId === module.id
        );

        // Junta aulas padrão + aulas novas do Firestore.
        const lessonsMap = new Map<string, Lesson>();

        defaultLessons.forEach((lesson) => {
          lessonsMap.set(lesson.id, lesson);
        });

        savedLessons.forEach((lesson) => {
          const original = lessonsMap.get(lesson.id);

          lessonsMap.set(lesson.id, {
            ...(original || {}),
            ...lesson,
          });
        });

        // Se o módulo veio do Firestore, suas aulas também
        // podem estar dentro do documento do módulo.
        if (module.lessons?.length) {
          module.lessons.forEach((lesson) => {
            const original = lessonsMap.get(lesson.id);

            lessonsMap.set(lesson.id, {
              ...(original || {}),
              ...lesson,
            });
          });
        }

        const lessons = Array.from(lessonsMap.values())
          .map((lesson) => {
            const fromFirestore =
              firestoreLessonsMap[lesson.id] || {};

            const fromLocal =
              localOverrides[lesson.id] || {};

            return {
              ...lesson,
              ...fromFirestore,
              ...fromLocal,
              courseId,
              moduleId: module.id,
              videoUrl:
                fromLocal.videoUrl ??
                fromFirestore.videoUrl ??
                lesson.videoUrl ??
                "",
            };
          })
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        return {
          ...module,
          courseId,
          lessons,
        };
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    // ---------------------------------------------------------
    // 6. Atualiza o curso final
    // ---------------------------------------------------------
    baseCourse.title =
      firestoreCourse.title || baseCourse.title;

    baseCourse.subtitle =
      firestoreCourse.subtitle || baseCourse.subtitle;

    baseCourse.description =
      firestoreCourse.description || baseCourse.description;

    baseCourse.category =
      firestoreCourse.category || baseCourse.category;

    baseCourse.instructor =
      firestoreCourse.instructor || baseCourse.instructor;

    baseCourse.badge =
      firestoreCourse.badge || baseCourse.badge;

    baseCourse.modules = finalModules;

    baseCourse.totalLessons = finalModules.reduce(
      (total, module) => total + module.lessons.length,
      0
    );

    return baseCourse;
  } catch (error) {
    console.warn(
      "Aviso ao carregar curso. Utilizando dados padrão e cache local:",
      error
    );

    // Mesmo que alguma leitura falhe, mantém as aulas padrão
    // com os links que estiverem no cache local.
    baseCourse.modules = baseCourse.modules.map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson) => {
        const local = localOverrides[lesson.id] || {};

        return {
          ...lesson,
          ...local,
          videoUrl: local.videoUrl ?? lesson.videoUrl ?? "",
        };
      }),
    }));

    baseCourse.totalLessons = baseCourse.modules.reduce(
      (total, module) => total + module.lessons.length,
      0
    );

    return baseCourse;
  }
}

/**
 * Nome usado pelo restante da aplicação.
 * Mantemos esse alias para não quebrar o page.tsx.
 */
export const getCourseWithOverrides = getCourseData;

/**
 * Salva somente o link do vídeo de uma aula.
 */
export async function saveLessonVideoUrl(
  lessonId: string,
  videoUrl: string,
  courseId: string = INITIAL_COURSE.id,
  moduleId?: string
): Promise<void> {
  const cleanUrl = videoUrl.trim();

  setLocalLessonsOverride(lessonId, {
    videoUrl: cleanUrl,
  });

  try {
    const lessonRef = doc(db, "lessons", lessonId);

    await setDoc(
      lessonRef,
      {
        id: lessonId,
        courseId,
        moduleId: moduleId || "",
        videoUrl: cleanUrl,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn(
      "Aviso: Link salvo localmente, mas não sincronizado com o Firestore:",
      error
    );
  }
}

/**
 * Atualiza os dados de uma aula existente.
 */
export async function updateLessonDetails(
  lessonId: string,
  data: Partial<Lesson>
): Promise<void> {
  setLocalLessonsOverride(lessonId, data);

  try {
    const lessonRef = doc(db, "lessons", lessonId);

    await setDoc(
      lessonRef,
      {
        ...data,
        id: lessonId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn(
      "Aviso ao salvar detalhes da aula no Firestore:",
      error
    );
  }
}

/**
 * Verifica se o usuário possui acesso ao curso.
 */
export function checkUserCourseAccess(
  user: UserProfile | null,
  courseId: string = INITIAL_COURSE.id
): boolean {
  if (!user) return false;

  // Administradores possuem acesso ao curso.
  if (user.role === "admin") {
    return true;
  }

  // Usuário bloqueado não possui acesso.
  if (user.accessEnabled === false) {
    return false;
  }

  // Se existe uma lista de cursos, verifica se o curso está nela.
  if (
    user.enrolledCourses &&
    user.enrolledCourses.length > 0
  ) {
    return user.enrolledCourses.includes(courseId);
  }

  // Mantém o comportamento anterior para usuários
  // que ainda não possuem enrolledCourses.
  return true;
}

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
    console.warn(
      "Aviso ao buscar usuários no Firestore:",
      error
    );

    return [];
  }
}

/**
 * Bloqueia ou libera o acesso de um usuário.
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
    console.error(
      "Erro ao atualizar status de acesso do usuário:",
      error
    );

    throw error;
  }
}

/* ============================================================
   CRUD DE MÓDULOS
   ============================================================ */

/**
 * Cria um novo módulo.
 */
export async function addModule(
  courseId: string,
  module: Module
): Promise<void> {
  const moduleRef = doc(db, "modules", module.id);

  await setDoc(moduleRef, {
    ...module,
    courseId,
    lessons: [],
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Atualiza um módulo existente.
 */
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

/**
 * Exclui um módulo e também todas as aulas pertencentes a ele.
 */
export async function deleteModule(
  moduleId: string
): Promise<void> {
  // Primeiro busca as aulas para excluir junto com o módulo.
  const lessonsSnapshot = await getDocs(
    collection(db, "lessons")
  );

  const moduleLessons = lessonsSnapshot.docs.filter((item) => {
    const lesson = item.data() as Lesson;
    return lesson.moduleId === moduleId;
  });

  for (const lessonDoc of moduleLessons) {
    await deleteDoc(lessonDoc.ref);
  }

  // Depois exclui o módulo.
  const moduleRef = doc(db, "modules", moduleId);
  await deleteDoc(moduleRef);
}

/* ============================================================
   CRUD DE AULAS
   ============================================================ */

/**
 * Cria uma nova aula.
 */
export async function addLesson(
  lesson: Lesson
): Promise<void> {
  const lessonRef = doc(db, "lessons", lesson.id);

  await setDoc(lessonRef, {
    ...lesson,
    updatedAt: new Date().toISOString(),
  });

  // Também salva no cache local para manter o link disponível.
  setLocalLessonsOverride(lesson.id, {
    videoUrl: lesson.videoUrl,
    title: lesson.title,
    duration: lesson.duration,
    formUrl: lesson.formUrl,
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

  await setDoc(
    lessonRef,
    {
      ...data,
      id: lessonId,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  setLocalLessonsOverride(lessonId, data);
}

/**
 * Exclui uma aula.
 */
export async function deleteLesson(
  lessonId: string
): Promise<void> {
  const lessonRef = doc(db, "lessons", lessonId);

  await deleteDoc(lessonRef);

  // Remove a aula do cache local.
  if (typeof window !== "undefined") {
    try {
      const current = getLocalLessonsOverrides();
      delete current[lessonId];

      localStorage.setItem(
        STORAGE_LESSONS_OVERRIDE_KEY,
        JSON.stringify(current)
      );
    } catch (error) {
      console.warn(
        "Erro ao remover aula do cache local:",
        error
      );
    }
  }
}

/**
 * Salva a estrutura completa do curso.
 *
 * Essa função é útil quando futuramente quisermos salvar
 * várias alterações de uma vez.
 */
export async function saveCourseStructure(
  course: Course
): Promise<void> {
  // Salva os dados gerais do curso.
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

  // Salva cada módulo.
  for (const module of course.modules) {
    const moduleRef = doc(db, "modules", module.id);

    await setDoc(
      moduleRef,
      {
        id: module.id,
        courseId: course.id,
        title: module.title,
        description: module.description || "",
        order: module.order,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Salva cada aula do módulo.
    for (const lesson of module.lessons) {
      const lessonRef = doc(db, "lessons", lesson.id);

      await setDoc(
        lessonRef,
        {
          ...lesson,
          courseId: course.id,
          moduleId: module.id,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  }
}
