/**
 * Tipos e interfaces TypeScript para a plataforma VL AUTOMAÇÕES.
 *
 * Arquitetura Direta:
 * CURSO → AULAS
 *
 * Coleções do Firestore:
 * - users: dados do aluno, permissões e cursos liberados (enrolledCourses)
 * - courses: informações dos cursos cadastrados
 * - lessons: aulas pertencentes diretamente ao curso através de courseId
 * - progress: registro das aulas concluídas pelo aluno por curso
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
  title: string;
  description: string;
  videoUrl: string;  // Link do vídeo no YouTube ou Google Drive
  formUrl: string;   // Link do Google Forms para atividade prática
  order: number;
  duration?: string; // Ex: "18 min"
  youtubeUrl?: string; // Suporte e compatibilidade retroativa
  moduleId?: string;   // Compatibilidade com dados legados
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
  lessons: Lesson[];
  totalLessons: number;
  badge: string;
  modules?: Module[]; // Compatibilidade retroativa
  certificateUrl?: string;        // Arquivo de certificado (PDF ou link fornecido pelo admin)
  certificateFileName?: string;   // Nome original do arquivo (ex: "certificado_rockwell.pdf")
  certificateFileSize?: string;   // Tamanho formatado (ex: "320 KB")
  certificateUploadedAt?: string; // Data ISO do envio do certificado
}

export interface UserProgress {
  userId: string;
  courseId: string;
  completedLessons: string[]; // IDs das aulas concluídas
  completedForms?: string[];  // IDs das aulas cujos formulários Google Forms foram concluídos
  lastLessonId?: string;       // Última aula acessada
  isCompleted?: boolean;       // Status de conclusão do curso (100% aulas E 100% formulários)
  completedAt?: string;        // Data ISO em que os requisitos foram 100% atingidos
  updatedAt?: string;
}

