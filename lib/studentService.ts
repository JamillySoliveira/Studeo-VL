/**
 * Serviço de Gerenciamento do Aluno e Progresso no Cloud Firestore
 *
 * Este arquivo concentra as operações que conversam com o banco de dados do Firebase:
 * 1. Salvar ou sincronizar o perfil do aluno na coleção "users"
 * 2. Buscar o progresso das aulas concluídas na coleção "progress"
 * 3. Alternar a conclusão de uma aula (marcar / desmarcar como concluída)
 *
 * Cada função possui tratamento de erros e fallback para localStorage,
 * garantindo que a aplicação nunca trave caso ocorra alguma oscilação de rede.
 */

import {
  db,
  doc,
  getDoc,
  setDoc,
} from "./firebase";
import { UserProfile, UserProgress } from "./types";

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
      const isAdminEmail =
        user.email === "adm.vlautomacao@gmail.com";

      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split("@")[0] || "Aluno",
        photoURL: user.photoURL || null,
        role: isAdminEmail ? "admin" : "student",
        accessEnabled: true, // Acesso liberado no sistema de usuários do Firebase
        enrolledCourses: ["rockwell-controle-analogico-supervisorio"],
        createdAt: new Date().toISOString(),
      };
      await setDoc(userRef, newProfile);
    }
  } catch (error) {
    console.warn("Aviso: Não foi possível sincronizar o perfil com o Firestore.", error);
  }
}

/**
 * Busca a lista de IDs de aulas concluídas pelo aluno para determinado curso
 */
export async function getUserProgress(
  userId: string,
  courseId: string
): Promise<UserProgress> {
  const fallbackKey = `vl_progress_${userId}_${courseId}`;
  
  // Tenta ler do Firestore
  try {
    const progressDocRef = doc(db, "progress", `${userId}_${courseId}`);
    const snapshot = await getDoc(progressDocRef);

    if (snapshot.exists()) {
      const data = snapshot.data() as UserProgress;
      // Sincroniza cópia local
      if (typeof window !== "undefined") {
        localStorage.setItem(fallbackKey, JSON.stringify(data.completedLessons || []));
      }
      return {
        userId,
        courseId,
        completedLessons: data.completedLessons || [],
        lastLessonId: data.lastLessonId,
        updatedAt: data.updatedAt,
      };
    }
  } catch (error) {
    console.warn("Aviso ao buscar progresso do Firestore. Usando cache local:", error);
  }

  // Se falhar ou documento não existir ainda, busca do localStorage
  let localCompleted: string[] = [];
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(fallbackKey);
      if (saved) localCompleted = JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
  }

  return {
    userId,
    courseId,
    completedLessons: localCompleted,
  };
}

/**
 * Marca ou desmarca uma aula como concluída e salva no Firestore
 */
export async function toggleLessonProgress(
  userId: string,
  courseId: string,
  lessonId: string,
  currentCompleted: string[]
): Promise<string[]> {
  const isCompleted = currentCompleted.includes(lessonId);
  const updatedList = isCompleted
    ? currentCompleted.filter((id) => id !== lessonId)
    : [...currentCompleted, lessonId];

  const payload: UserProgress = {
    userId,
    courseId,
    completedLessons: updatedList,
    lastLessonId: lessonId,
    updatedAt: new Date().toISOString(),
  };

  // Salva no localStorage imediatamente para resposta instantânea na interface
  const fallbackKey = `vl_progress_${userId}_${courseId}`;
  if (typeof window !== "undefined") {
    localStorage.setItem(fallbackKey, JSON.stringify(updatedList));
  }

  // Salva no Firestore
  try {
    const progressDocRef = doc(db, "progress", `${userId}_${courseId}`);
    await setDoc(progressDocRef, payload, { merge: true });
  } catch (error) {
    console.warn("Aviso: Progresso salvo localmente, mas não sincronizado com o Firestore:", error);
  }

  return updatedList;
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
