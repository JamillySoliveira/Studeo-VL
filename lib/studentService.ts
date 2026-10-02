/**
 * =======================================================================
 * SERVIÇO DO ALUNO E PROGRESSO NO CLOUD FIRESTORE - VL AUTOMAÇÕES
 * =======================================================================
 *
 * Este arquivo concentra todas as operações de banco de dados relacionadas ao aluno:
 * 1. Sincronização do perfil do aluno na coleção "users"
 * 2. Consulta do progresso (aulas e formulários concluídos) na coleção "progress"
 * 3. Alternância do status de conclusão das aulas e das atividades do Google Forms
 * 4. Verificação das regras de conclusão do curso (100% aulas + 100% atividades)
 * 5. Isolamento do progresso por curso (um curso nunca interfere no outro)
 *
 * Para garantir estabilidade e carregamento instantâneo, todas as funções
 * possuem fallback automático com o localStorage do navegador.
 */

import {
  db,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "./firebase";
import { UserProfile, UserProgress } from "./types";
import { INITIAL_COURSE_ID } from "./courseData";

// =======================================================================
// CACHE EM MEMÓRIA E DEDUPLICAÇÃO DE REQUISIÇÕES (ALTA PERFORMANCE)
// =======================================================================

// Cache de progresso do aluno por chave `{userId}_{courseId}`
const progressCache = new Map<
  string,
  { data: UserProgress; timestamp: number }
>();

// Mapa de promessas ativas para evitar chamadas simultâneas idênticas ao Firestore
const inFlightProgressPromises = new Map<string, Promise<UserProgress>>();

// TTL do cache em memória (60 segundos de acesso instantâneo sem rede)
const PROGRESS_CACHE_TTL = 60 * 1000;

// Cache do perfil de permissões do usuário
const profileCache = new Map<
  string,
  { data: UserProfile | null; timestamp: number }
>();
const inFlightProfilePromises = new Map<string, Promise<UserProfile | null>>();
const PROFILE_CACHE_TTL = 60 * 1000;

/**
 * Limpa o cache de progresso de um aluno ou de todos.
 */
export function clearProgressCache(userId?: string): void {
  if (userId) {
    for (const key of progressCache.keys()) {
      if (key.startsWith(`${userId}_`)) {
        progressCache.delete(key);
      }
    }
  } else {
    progressCache.clear();
  }
}

/**
 * Limpa o cache do perfil de um usuário.
 */
export function clearUserProfileCache(userId?: string): void {
  if (userId) {
    profileCache.delete(userId);
    inFlightProfilePromises.delete(userId);
  } else {
    profileCache.clear();
    inFlightProfilePromises.clear();
  }
}

/**
 * Salva ou atualiza os dados básicos do usuário no Firestore.
 * 
 * Chamado assim que o aluno faz login (via Google).
 * Se o usuário ainda não existir no Firestore, cria um registro inicial com:
 * - uid
 * - email
 * - displayName
 * - photoURL
 * - role: "student"
 * - accessEnabled: false (NÃO conceder acesso automaticamente)
 * - courseAccess: { "rockwell-controle-analogico-supervisorio": false }
 * - createdAt: data ISO
 * 
 * Se o usuário já existir, NÃO sobrescreve role, accessEnabled, courseAccess ou enrolledCourses.
 * Apenas sincroniza dados básicos do Google (displayName, email, photoURL).
 * 
 * Limpa qualquer profileCache existente antes de retornar.
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
      // 3. Novo aluno criado rigorosamente conforme os requisitos de segurança:
      // role: "student", accessEnabled: false, courseAccess: { "rockwell-controle-analogico-supervisorio": false }
      // NÃO adiciona automaticamente o curso em enrolledCourses e NÃO concede acesso.
      const newProfile: {
        uid: string;
        email: string | null;
        displayName: string | null;
        photoURL: string | null;
        role: "student" | "admin";
        accessEnabled: boolean;
        courseAccess: Record<string, boolean>;
        createdAt: string;
      } = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || (user.email ? user.email.split("@")[0] : "Aluno"),
        photoURL: user.photoURL || null,
        role: "student",
        accessEnabled: false,
        courseAccess: {
          "rockwell-controle-analogico-supervisorio": false,
        },
        createdAt: new Date().toISOString(),
      };

      await setDoc(userRef, newProfile);
    } else {
      // 6 & 7. Usuário existente: NÃO sobrescreve role, accessEnabled, courseAccess ou enrolledCourses.
      // Apenas sincroniza dados básicos do Google (displayName, email, photoURL) quando necessário.
      const existingData = existing.data() as UserProfile;
      const updates: Record<string, any> = {};

      const nextDisplayName = user.displayName || (user.email ? user.email.split("@")[0] : null);
      if (nextDisplayName && nextDisplayName !== existingData.displayName) {
        updates.displayName = nextDisplayName;
      }
      if (user.email && user.email !== existingData.email) {
        updates.email = user.email;
      }
      if (user.photoURL !== undefined && user.photoURL !== existingData.photoURL) {
        updates.photoURL = user.photoURL || null;
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date().toISOString();
        await updateDoc(userRef, updates);
      }
    }

    // 11. Limpa qualquer profileCache existente após a criação/atualização
    clearUserProfileCache(user.uid);
  } catch (error) {
    // 8. Não esconde erros do Firestore. Mostra o erro original completo com console.error().
    console.error("Erro ao sincronizar perfil do usuário no Firestore (syncUserProfile):", error);
    throw error;
  }
}

/**
 * Busca o progresso do aluno para um curso específico no Firestore.
 * 
 * O documento é armazenado na coleção "progress" com o ID: "{userId}_{courseId}".
 * Se o aluno estiver offline ou houver falha de rede, lê os dados do cache local (localStorage).
 * 
 * @param userId ID único do aluno no Firebase Auth
 * @param courseId ID do curso selecionado (ex: "rockwell-basico")
 * @returns Objeto com as aulas concluídas, formulários respondidos e status geral
 */
export async function getUserProgress(
  userId: string,
  courseId: string
): Promise<UserProgress> {
  const cacheKey = `${userId}_${courseId}`;

  // 1. Verifica cache em memória ultra-rápido (evita consulta de rede)
  const cached = progressCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < PROGRESS_CACHE_TTL) {
    return cached.data;
  }

  // 2. Se já existir uma requisição ativa idêntica em andamento, compartilha a mesma Promise
  if (inFlightProgressPromises.has(cacheKey)) {
    return inFlightProgressPromises.get(cacheKey)!;
  }

  const fetchPromise = (async (): Promise<UserProgress> => {
    const fallbackKey = `vl_progress_${userId}_${courseId}`;
    const fallbackFormsKey = `vl_progress_forms_${userId}_${courseId}`;

    // 1. Tenta ler o documento oficial salvo no Cloud Firestore
    try {
      const progressDocRef = doc(db, "progress", `${userId}_${courseId}`);
      let snapshot = await getDoc(progressDocRef);

      // Compatibilidade com dados legados para alunos que já utilizavam a plataforma
      if (!snapshot.exists() && courseId === "rockwell-basico") {
        const legacyDocRef = doc(
          db,
          "progress",
          `${userId}_rockwell-controle-analogico-supervisorio`
        );
        const legacySnapshot = await getDoc(legacyDocRef);
        if (legacySnapshot.exists()) {
          snapshot = legacySnapshot;
        }
      }

      if (snapshot.exists()) {
        const data = snapshot.data() as UserProgress;
        const result: UserProgress = {
          userId,
          courseId,
          completedLessons: data.completedLessons || [],
          completedForms: data.completedForms || [],
          isCompleted: !!data.isCompleted,
          completedAt: data.completedAt,
          lastLessonId: data.lastLessonId,
          updatedAt: data.updatedAt,
        };

        // Salva cópia no localStorage para offline
        if (typeof window !== "undefined") {
          localStorage.setItem(
            fallbackKey,
            JSON.stringify(result.completedLessons)
          );
          localStorage.setItem(
            fallbackFormsKey,
            JSON.stringify(result.completedForms)
          );
        }

        // Alimenta o cache em memória
        progressCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }
    } catch (error) {
      console.warn("Aviso ao buscar progresso do Firestore. Usando cache local:", error);
    }

    // 2. Fallback: se não encontrar no Firestore ou houver erro, carrega do localStorage
    let localCompleted: string[] = [];
    let localFormsCompleted: string[] = [];
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(fallbackKey);
        if (saved) {
          localCompleted = JSON.parse(saved);
        } else if (courseId === "rockwell-basico") {
          const legacySaved = localStorage.getItem(
            `vl_progress_${userId}_rockwell-controle-analogico-supervisorio`
          );
          if (legacySaved) localCompleted = JSON.parse(legacySaved);
        }

        const savedForms = localStorage.getItem(fallbackFormsKey);
        if (savedForms) {
          localFormsCompleted = JSON.parse(savedForms);
        }
      } catch (e) {
        console.error("Erro ao ler progresso do cache local:", e);
      }
    }

    const fallbackResult: UserProgress = {
      userId,
      courseId,
      completedLessons: localCompleted,
      completedForms: localFormsCompleted,
      isCompleted: false,
    };

    progressCache.set(cacheKey, { data: fallbackResult, timestamp: Date.now() });
    return fallbackResult;
  })().finally(() => {
    inFlightProgressPromises.delete(cacheKey);
  });

  inFlightProgressPromises.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * Avalia se o aluno cumpriu todos os critérios para a conclusão oficial do curso:
 * - 100% das aulas assistidas e marcadas como concluídas
 * - 100% dos formulários obrigatórios do Google Forms respondidos e confirmados
 */
export function checkCourseCompletionRequirements(
  completedLessonsCount: number,
  totalLessonsCount: number,
  completedFormsCount: number,
  totalFormsCount: number
): boolean {
  if (totalLessonsCount <= 0) return false;
  const lessonsDone = completedLessonsCount >= totalLessonsCount;
  // Se houver formulários cadastrados nas aulas do curso, todos devem estar concluídos
  const formsDone = totalFormsCount > 0 ? completedFormsCount >= totalFormsCount : true;
  return lessonsDone && formsDone;
}

/**
 * Alterna o status de conclusão de uma aula (marcar / desmarcar).
 * 
 * Salva a alteração imediatamente no localStorage (para a interface responder sem travamentos)
 * e envia para o Cloud Firestore, recalculando se o curso atingiu 100% de conclusão.
 * 
 * @returns Objeto com a lista atualizada de aulas concluídas e o booleano de conclusão do curso
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

  // Avalia se o aluno completou todas as aulas e atividades após esta alteração
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

  // Grava no localStorage para feedback visual instantâneo
  const fallbackKey = `vl_progress_${userId}_${courseId}`;
  if (typeof window !== "undefined") {
    localStorage.setItem(fallbackKey, JSON.stringify(updatedList));
  }

  // Atualiza cache em memória imediatamente
  const cacheKey = `${userId}_${courseId}`;
  progressCache.set(cacheKey, {
    data: {
      userId,
      courseId,
      completedLessons: updatedList,
      completedForms: currentFormsCompleted,
      lastLessonId: lessonId,
      isCompleted: isCourseCompleted,
      updatedAt: payload.updatedAt,
      completedAt: payload.completedAt,
    },
    timestamp: Date.now(),
  });

  // Grava no Cloud Firestore
  try {
    const progressDocRef = doc(db, "progress", `${userId}_${courseId}`);
    await setDoc(progressDocRef, payload, { merge: true });

    // Se for o curso básico, mantém sincronia com o ID legado
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
    console.warn("Aviso: Progresso salvo localmente, mas erro ao sincronizar no Firestore:", error);
  }

  return { updatedLessons: updatedList, isCourseCompleted };
}

/**
 * Alterna a conclusão do formulário Google Forms de uma aula.
 * 
 * Após preencher o formulário, o aluno clica em "Marcar atividade como concluída".
 * A função registra a atividade no Firestore e no cache local.
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

  // Salva no localStorage
  const fallbackFormsKey = `vl_progress_forms_${userId}_${courseId}`;
  if (typeof window !== "undefined") {
    localStorage.setItem(fallbackFormsKey, JSON.stringify(updatedFormsList));
  }

  // Atualiza cache em memória imediatamente
  const formCacheKey = `${userId}_${courseId}`;
  progressCache.set(formCacheKey, {
    data: {
      userId,
      courseId,
      completedLessons: currentLessonsCompleted,
      completedForms: updatedFormsList,
      isCompleted: isCourseCompleted,
      updatedAt: payload.updatedAt,
      completedAt: payload.completedAt,
    },
    timestamp: Date.now(),
  });

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
 * Busca o perfil cadastrado do usuário no Firestore para verificar permissões:
 * - Se a conta está ativa (accessEnabled)
 * - Quais cursos estão liberados para o aluno (enrolledCourses)
 * - Papel no sistema (student ou admin)
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const cached = profileCache.get(userId);
  if (cached && Date.now() - cached.timestamp < PROFILE_CACHE_TTL) {
    return cached.data;
  }

  if (inFlightProfilePromises.has(userId)) {
    return inFlightProfilePromises.get(userId)!;
  }

  const fetchPromise = (async () => {
    try {
      const userRef = doc(db, "users", userId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        profileCache.set(userId, { data, timestamp: Date.now() });
        return data;
      }
      profileCache.set(userId, { data: null, timestamp: Date.now() });
      return null;
    } catch (err) {
      console.warn("Aviso ao carregar perfil do Firestore:", err);
      return null;
    }
  })().finally(() => {
    inFlightProfilePromises.delete(userId);
  });

  inFlightProfilePromises.set(userId, fetchPromise);
  return fetchPromise;
}

/**
 * Carrega o mapa de progresso (aulas concluídas) de múltiplos cursos de forma independente.
 * Garante que o progresso de um curso nunca seja misturado com outro.
 * 
 * @param userId ID do aluno
 * @param courseIds Lista de IDs de cursos
 * @returns Dicionário contendo { [courseId]: string[] } com os IDs das aulas concluídas
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
 * Carrega o progresso completo e detalhado (aulas, formulários e status de conclusão)
 * para exibição detalhada na aba de Progresso e Certificados.
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
