/**
 * Tipos e interfaces TypeScript para a plataforma VL AUTOMAÇÕES.
 *
 * Estes modelos representam a estrutura das coleções do Firestore:
 * - users: dados do aluno e permissões de acesso
 * - courses: informações do curso
 * - modules: módulos organizados em ordem
 * - lessons: aulas de cada módulo com links do Google Drive e Google Forms
 * - progress: registro das aulas concluídas pelo aluno
 */

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  role?: "student" | "admin";
  createdAt?: string;
  accessEnabled?: boolean;
  enrolledCourses?: string[];
}

export interface Lesson {
  id: string;
  courseId: string;
  moduleId: string;
  title: string;
  description: string;
  videoUrl: string;  // Link do vídeo no Google Drive
  youtubeUrl?: string; // Opcional para retrocompatibilidade
  formUrl: string;   // Link do Google Forms para atividade
  order: number;
  duration?: string; // Ex: "18 min"
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  instructor: string;
  modules: Module[];
  totalLessons: number;
  badge: string;
}

export interface UserProgress {
  userId: string;
  courseId: string;
  completedLessons: string[]; // IDs das aulas concluídas
  lastLessonId?: string;       // Última aula acessada
  updatedAt?: string;
}

