/**
 * Serviço de Gerenciamento do Aluno e Progresso no Cloud Firestore
 *
 * Este arquivo concentra as operações que conversam com o banco de dados do Firebase:
 * 1. Salvar ou sincronizar o perfil do aluno na coleção "users"
 * 2. Buscar o progresso das aulas concluídas na coleção "progress" (separado por courseId)
 * 3. Alternar a conclusão de uma aula (marcar / desmarcar como concluída)
 *
 * Cada função possui tratamento de erros e fallback para localStorage,
 * garantindo estabilidade e compatibilidade com dados existentes.
 */

import {
  db,
  doc,
  getDoc,
  setDoc,
} from "./firebase";
import { UserProfile, UserProgress } from "./types";
import { INITIAL_COURSE_ID } from "./courseData";

/**
 * Salva ou atualiza os dados básicos do usuário no Firestore
 */
export async function syncUserProfile(user: {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}): Promise<void> {
  try {
    const userRef = doc(db, "users", user.uid);
    const existing = await getDoc(userRef);

    if (!existing.exists()) {
      // Administradores são identificados pelo role no Firestore ou pela conta mestre oficial
      const isAdminEmail =
        user.email === "adm.vlautomacao@gmail.com";

      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split("@")[0] || "Aluno",
        photoURL: user.photoURL || null,
        role: isAdminEmail ? "admin" : "student",
        accessEnabled: true, // Acesso liberado à plataforma
        enrolledCourses: [INITIAL_COURSE_ID], // Curso inicial padrão: rockwell-basico
        createdAt: new Date().toISOString(),
      };
      await setDoc(userRef, newProfile);
    }
  } catch (error) {
    console.warn("Aviso: Não foi possível sincronizar o perfil com o Firestore.", error);
  }
}

/**
 * Busca o progresso do aluno para determinado curso (courseId), incluindo aulas e formulários.
 * Mantém compatibilidade com o ID antigo 'rockwell-controle-analogico-supervisorio'.
 */
export async function getUserProgress(
  userId: string,
  courseId: string
): Promise<UserProgress> {
  const fallbackKey = `vl_progress_${userId}_${courseId}`;
  const fallbackFormsKey = `vl_progress_forms_${userId}_${courseId}`;
  
  // Tenta ler do Firestore
  try {
    const progressDocRef = doc(db, "progress", `${userId}_${courseId}`);
    let snapshot = await getDoc(progressDocRef);

    // Compatibilidade com dados legados para o curso Básico
    if (!snapshot.exists() && courseId === "rockwell-basico") {
      const legacyDocRef = doc(db, "progress", `${userId}_rockwell-controle-analogico-supervisorio`);
      const legacySnapshot = await getDoc(legacyDocRef);
      if (legacySnapshot.exists()) {
        snapshot = legacySnapshot;
      }
    }

    if (snapshot.exists()) {
      const data = snapshot.data() as UserProgress;
      // Sincroniza cópia local
      if (typeof window !== "undefined") {
        localStorage.setItem(fallbackKey, JSON.stringify(data.completedLessons || []));
        localStorage.setItem(fallbackFormsKey, JSON.stringify(data.completedForms || []));
      }
      return {
        userId,
        courseId,
        completedLessons: data.completedLessons || [],
        completedForms: data.completedForms || [],
        isCompleted: !!data.isCompleted,
        completedAt: data.completedAt,
        lastLessonId: data.lastLessonId,
        updatedAt: data.updatedAt,
      };
    }
  } catch (error) {
    console.warn("Aviso ao buscar progresso do Firestore. Usando cache local:", error);
  }

  // Se falhar ou documento não existir ainda, busca do localStorage
  let localCompleted: string[] = [];
  let localFormsCompleted: string[] = [];
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(fallbackKey);
      if (saved) {
        localCompleted = JSON.parse(saved);
      } else if (courseId === "rockwell-basico") {
        const legacySaved = localStorage.getItem(`vl_progress_${userId}_rockwell-controle-analogico-supervisorio`);
        if (legacySaved) localCompleted = JSON.parse(legacySaved);
      }

      const savedForms = localStorage.getItem(fallbackFormsKey);
      if (savedForms) {
        localFormsCompleted = JSON.parse(savedForms);
      }
    } catch (e) {
      console.error(e);
    }
  }

  return {
    userId,
    courseId,
    completedLessons: localCompleted,
    completedForms: localFormsCompleted,
    isCompleted: false,
  };
}

/**
 * Avalia se o curso preenche todos os requisitos para ser marcado como "Concluído":
 * - 100% das aulas concluídas (completedLessonsCount === totalLessonsCount && totalLessonsCount > 0)
 * - 100% dos formulários obrigatórios concluídos (completedFormsCount === totalFormsCount)
 */
export function checkCourseCompletionRequirements(
  completedLessonsCount: number,
  totalLessonsCount: number,
  completedFormsCount: number,
  totalFormsCount: number
): boolean {
  if (totalLessonsCount <= 0) return false;
  const lessonsDone = completedLessonsCount >= totalLessonsCount;
  // Se o curso tem formulários obrigatórios cadastrados, todos devem estar concluídos
  const formsDone = totalFormsCount > 0 ? completedFormsCount >= totalFormsCount : true;
  return lessonsDone && formsDone;
}

/**
 * Marca ou desmarca uma aula como concluída e salva no Firestore,
 * avaliando e atualizando também o status de conclusão do curso.
 */
export async function toggleLessonProgress(
  userId: string,
  courseId: string,
  lessonId: string,
  currentCompleted: string[],
  currentFormsCompleted: string[] = [],
  totalLessonsCount: number = 0,
  totalFormsCount: number = 0
): Promise<{ updatedLessons: string[]; isCourseCompleted: boolean }> {
  const isCompleted = currentCompleted.includes(lessonId);
  const updatedList = isCompleted
    ? currentCompleted.filter((id) => id !== lessonId)
    : [...currentCompleted, lessonId];

  // Avalia se atingiu 100% de aulas e 100% de formulários
  const isCourseCompleted = checkCourseCompletionRequirements(
    updatedList.length,
    totalLessonsCount,
    currentFormsCompleted.length,
    totalFormsCount
  );

  const payload: Partial<UserProgress> = {
    userId,
    courseId,
    completedLessons: updatedList,
    completedForms: currentFormsCompleted,
    lastLessonId: lessonId,
    isCompleted: isCourseCompleted,
    updatedAt: new Date().toISOString(),
  };

  if (isCourseCompleted) {
    payload.completedAt = new Date().toISOString();
  }

  // Salva no localStorage imediatamente para resposta instantânea
  const fallbackKey = `vl_progress_${userId}_${courseId}`;
  if (typeof window !== "undefined") {
    localStorage.setItem(fallbackKey, JSON.stringify(updatedList));
  }

  // Salva no Firestore
  try {
    const progressDocRef = doc(db, "progress", `${userId}_${courseId}`);
    await setDoc(progressDocRef, payload, { merge: true });

    // Se for o curso básico, sincroniza também com o ID legado para total retrocompatibilidade
    if (courseId === "rockwell-basico") {
      const legacyDocRef = doc(
        db,
        "progress",
        `${userId}_rockwell-controle-analogico-supervisorio`
      );
      await setDoc(
        legacyDocRef,
        {
          ...payload,
          courseId: "rockwell-controle-analogico-supervisorio",
        },
        { merge: true }
      );
    }
  } catch (error) {
    console.warn("Aviso: Progresso de aula salvo localmente, mas erro ao sincronizar no Firestore:", error);
  }

  return { updatedLessons: updatedList, isCourseCompleted };
}

/**
 * Marca ou desmarca o formulário Google Forms de uma aula como respondido/concluído
 * e salva no Firestore, avaliando e atualizando também o status de conclusão do curso.
 */
export async function toggleFormProgress(
  userId: string,
  courseId: string,
  lessonId: string,
  currentFormsCompleted: string[],
  currentLessonsCompleted: string[] = [],
  totalLessonsCount: number = 0,
  totalFormsCount: number = 0
): Promise<{ updatedForms: string[]; isCourseCompleted: boolean }> {
  const isFormCompleted = currentFormsCompleted.includes(lessonId);
  const updatedFormsList = isFormCompleted
    ? currentFormsCompleted.filter((id) => id !== lessonId)
    : [...currentFormsCompleted, lessonId];

  // Avalia se atingiu 100% de aulas e 100% de formulários
  const isCourseCompleted = checkCourseCompletionRequirements(
    currentLessonsCompleted.length,
    totalLessonsCount,
    updatedFormsList.length,
    totalFormsCount
  );

  const payload: Partial<UserProgress> = {
    userId,
    courseId,
    completedLessons: currentLessonsCompleted,
    completedForms: updatedFormsList,
    isCompleted: isCourseCompleted,
    updatedAt: new Date().toISOString(),
  };

  if (isCourseCompleted) {
    payload.completedAt = new Date().toISOString();
  }

  // Salva no localStorage imediatamente
  const fallbackFormsKey = `vl_progress_forms_${userId}_${courseId}`;
  if (typeof window !== "undefined") {
    localStorage.setItem(fallbackFormsKey, JSON.stringify(updatedFormsList));
  }

  // Salva no Firestore
  try {
    const progressDocRef = doc(db, "progress", `${userId}_${courseId}`);
    await setDoc(progressDocRef, payload, { merge: true });

    if (courseId === "rockwell-basico") {
      const legacyDocRef = doc(
        db,
        "progress",
        `${userId}_rockwell-controle-analogico-supervisorio`
      );
      await setDoc(
        legacyDocRef,
        {
          ...payload,
          courseId: "rockwell-controle-analogico-supervisorio",
        },
        { merge: true }
      );
    }
  } catch (error) {
    console.warn("Aviso: Progresso de formulário salvo localmente, mas erro ao sincronizar no Firestore:", error);
  }

  return { updatedForms: updatedFormsList, isCourseCompleted };
}

/**
 * Carrega os dados atualizados do perfil e das permissões do usuário
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
  } catch (err) {
    console.warn("Aviso ao carregar perfil do Firestore:", err);
  }
  return null;
}

/**
 * Carrega o mapa de progresso (aulas concluídas) de múltiplos cursos de forma independente,
 * garantindo que o progresso nunca seja misturado entre cursos.
 * 
 * @param userId ID do aluno
 * @param courseIds Lista de IDs de cursos (ex: ["rockwell-basico", "rockwell-intermediario", "rockwell-avancado"])
 * @returns Objeto indexado por courseId contendo o array de IDs de aulas concluídas daquele curso
 */
export async function getUserCoursesProgressMap(
  userId: string,
  courseIds: string[]
): Promise<Record<string, string[]>> {
  const progressMap: Record<string, string[]> = {};

  await Promise.all(
    courseIds.map(async (cId) => {
      try {
        const progress = await getUserProgress(userId, cId);
        progressMap[cId] = progress.completedLessons || [];
      } catch {
        progressMap[cId] = [];
      }
    })
  );

  return progressMap;
}

/**
 * Carrega o mapa de formulários respondidos de múltiplos cursos de forma independente.
 */
export async function getUserCoursesFormsProgressMap(
  userId: string,
  courseIds: string[]
): Promise<Record<string, string[]>> {
  const formsMap: Record<string, string[]> = {};

  await Promise.all(
    courseIds.map(async (cId) => {
      try {
        const progress = await getUserProgress(userId, cId);
        formsMap[cId] = progress.completedForms || [];
      } catch {
        formsMap[cId] = [];
      }
    })
  );

  return formsMap;
}

/**
 * Carrega o progresso completo e detalhado (aulas, formulários, status de conclusão)
 * para uma lista de cursos.
 */
export async function getUserCoursesDetailedProgressMap(
  userId: string,
  courseIds: string[]
): Promise<Record<string, { completedLessons: string[]; completedForms: string[]; isCompleted: boolean }>> {
  const detailedMap: Record<string, { completedLessons: string[]; completedForms: string[]; isCompleted: boolean }> = {};

  await Promise.all(
    courseIds.map(async (cId) => {
      try {
        const progress = await getUserProgress(userId, cId);
        detailedMap[cId] = {
          completedLessons: progress.completedLessons || [],
          completedForms: progress.completedForms || [],
          isCompleted: !!progress.isCompleted,
        };
      } catch {
        detailedMap[cId] = {
          completedLessons: [],
          completedForms: [],
          isCompleted: false,
        };
      }
    })
  );

  return detailedMap;
}
