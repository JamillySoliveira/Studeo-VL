"use client";

import React, { useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { UserProfile, Course, Lesson } from "@/lib/types";
import { INITIAL_COURSE } from "@/lib/courseData";
import {
  getUserProgress,
  syncUserProfile,
  toggleLessonProgress,
  getUserProfile,
} from "@/lib/studentService";
import {
  getCourseWithOverrides,
  saveLessonVideoUrl,
  checkUserCourseAccess,
} from "@/lib/courseService";

// Componentes da Aplicação
import { LoginScreen } from "@/components/LoginScreen";
import { Sidebar, TabType } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { DashboardView } from "@/components/DashboardView";
import { CourseView } from "@/components/CourseView";
import { LessonPlayer } from "@/components/LessonPlayer";
import { ProgressView } from "@/components/ProgressView";
import { ProfileView } from "@/components/ProfileView";
import { CertificateView } from "@/components/CertificateView";
import { AdminView } from "@/components/AdminView";

export default function StudentApp() {
  // Estado do Aluno Autenticado
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Estado do Curso e Aula Atual (carregado com dados e links do Google Drive do Firestore)
  const [course, setCourse] = useState<Course>(INITIAL_COURSE);
  const [currentLesson, setCurrentLesson] = useState<Lesson>(
    INITIAL_COURSE.modules[0].lessons[0]
  );

  // Progresso do Aluno (IDs das aulas concluídas)
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [currentTab, setCurrentTab] = useState<TabType>("dashboard");

  // Controle do menu mobile lateral
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Toast de feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Carrega o curso com os links reais de vídeo do Google Drive salvos no Firestore
  const loadLiveCourse = useCallback(async () => {
    try {
      const liveCourse = await getCourseWithOverrides();
      setCourse(liveCourse);

      // Mantém a aula selecionada atualizada com o link mais recente
      setCurrentLesson((prev) => {
        for (const mod of liveCourse.modules) {
          const found = mod.lessons.find((l) => l.id === prev.id);
          if (found) return found;
        }
        return liveCourse.modules[0].lessons[0];
      });
    } catch (e) {
      console.warn("Aviso ao carregar curso com Firestore:", e);
    }
  }, []);

  // Carrega o curso no início de forma assíncrona
  useEffect(() => {
    let isMounted = true;
    getCourseWithOverrides()
      .then((liveCourse) => {
        if (isMounted) {
          setCourse(liveCourse);
        }
      })
      .catch((e) => console.warn(e));

    return () => {
      isMounted = false;
    };
  }, []);

  // Verifica se o aluno tem acesso liberado aos cursos pelo sistema de permissões do Firebase
  const hasAccess = checkUserCourseAccess(user, course.id);

  // Recarrega o perfil do usuário do Firestore para atualizar permissões de acesso
  const refreshUserAccess = useCallback(async (uid?: string) => {
    const targetUid = uid || user?.uid;
    if (!targetUid) return;

    try {
      const dbProfile = await getUserProfile(targetUid);
      if (dbProfile) {
        setUser((prev) => (prev ? { ...prev, ...dbProfile } : dbProfile));
      }
    } catch (e) {
      console.warn("Erro ao atualizar permissões do aluno:", e);
    }
  }, [user?.uid]);

  // Monitora o estado de login do Firebase Authentication em tempo real
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: User | null) => {
        if (firebaseUser) {
          const studentProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName:
              firebaseUser.displayName ||
              (firebaseUser.email ? firebaseUser.email.split("@")[0] : "Aluno"),
            photoURL: firebaseUser.photoURL,
            role:
              firebaseUser.email === "adm.vlautomacao@gmail.com" ||
              firebaseUser.email?.includes("admin")
                ? "admin"
                : "student",
            accessEnabled: true,
          };

          // 1. Sincroniza usuário na coleção "users" do Firestore
          await syncUserProfile(studentProfile);

          // 2. Carrega permissões salvas no Firestore
          const dbProfile = await getUserProfile(firebaseUser.uid);
          if (dbProfile) {
            studentProfile.accessEnabled = dbProfile.accessEnabled;
            studentProfile.role = dbProfile.role || studentProfile.role;
            studentProfile.enrolledCourses = dbProfile.enrolledCourses || [];
          }

          setUser(studentProfile);

          // 3. Carrega o progresso salvo na coleção "progress" do Firestore
          try {
            const progressData = await getUserProgress(
              firebaseUser.uid,
              course.id
            );
            setCompletedLessons(progressData.completedLessons || []);

            // Se houver última aula visitada, define-a
            if (progressData.lastLessonId) {
              for (const mod of course.modules) {
                const found = mod.lessons.find(
                  (l) => l.id === progressData.lastLessonId
                );
                if (found) {
                  setCurrentLesson(found);
                  break;
                }
              }
            }
          } catch (e) {
            console.error("Erro ao carregar progresso:", e);
          }
        } else {
          // Usuário deslogado
          setUser(null);
        }
        setAuthLoading(false);
      }
    );

    return () => unsubscribe();
  }, [course.id, course.modules]);

  // Login de Demonstração Rápida (para teste rápido em desenvolvimento)
  const handleDemoLogin = async () => {
    const demoUser: UserProfile = {
      uid: "demo-aluno-vl-001",
      email: "aluno.demo@vlautomacao.com.br",
      displayName: "Aluno Demonstração",
      role: "student",
      accessEnabled: true,
    };

    setUser(demoUser);

    try {
      const progressData = await getUserProgress(demoUser.uid, course.id);
      if (progressData.completedLessons.length > 0) {
        setCompletedLessons(progressData.completedLessons);
      } else {
        const initialDemoProgress = [
          course.modules[0].lessons[0].id,
          course.modules[0].lessons[1].id,
        ];
        setCompletedLessons(initialDemoProgress);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  // Logout do Aluno
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setCurrentTab("dashboard");
      showToast("Sessão encerrada com sucesso.");
    } catch (err) {
      console.error("Erro ao deslogar:", err);
      setUser(null);
    }
  };

  // Alterna o status da aula como concluída / pendente e salva no Firestore
  const handleToggleLessonComplete = async (lessonId: string) => {
    if (!user) return;

    const wasCompleted = completedLessons.includes(lessonId);
    try {
      const updatedList = await toggleLessonProgress(
        user.uid,
        course.id,
        lessonId,
        completedLessons
      );
      setCompletedLessons(updatedList);

      if (!wasCompleted) {
        showToast("Aula marcada como concluída! Progresso salvo.");
      } else {
        showToast("Aula desmarcada.");
      }
    } catch (error) {
      console.error("Erro ao atualizar progresso:", error);
    }
  };

  // Atualização direta do link do Google Drive pelo administrador
  const handleUpdateLessonVideoUrl = async (lessonId: string, videoUrl: string) => {
    await saveLessonVideoUrl(lessonId, videoUrl);
    await loadLiveCourse();
    showToast("Link do Google Drive atualizado!");
  };

  // Seleciona uma aula para assistir e abre o reprodutor
  const handleSelectLesson = (lesson: Lesson) => {
    setCurrentLesson(lesson);
    setCurrentTab("lesson");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Cálculos de métricas do curso
  const allLessons: Lesson[] = [];
  course.modules.forEach((m) => m.lessons.forEach((l) => allLessons.push(l)));
  const totalLessons = allLessons.length;
  const completedCount = completedLessons.length;
  const progressPercent =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // Tela de Carregamento Inicial do Firebase Auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 bg-[#ea580c] rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/30 animate-bounce mb-4">
          <span className="text-white font-black text-xl">VL</span>
        </div>
        <p className="text-sm font-semibold text-slate-700">
          Carregando plataforma VL AUTOMAÇÕES...
        </p>
        <p className="text-xs text-slate-400 mt-1">Conectando ao Firebase</p>
      </div>
    );
  }

  // Se o aluno NÃO estiver logado, exibe a Tela de Login (exclusivamente com Google)
  if (!user) {
    return (
      <LoginScreen
        onSuccess={() => setCurrentTab("dashboard")}
        onDemoLogin={handleDemoLogin}
      />
    );
  }

  // Se o aluno ESTIVER logado, exibe a Área do Aluno completa
  return (
    <div id="vl-student-platform" className="min-h-screen bg-[#f8fafc] flex">
      {/* Menu Lateral Responsivo */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        user={user}
        onLogout={handleLogout}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        progressPercent={progressPercent}
      />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra Superior (Navbar) */}
        <Navbar
          onOpenMobileSidebar={() => setIsMobileMenuOpen(true)}
          currentTab={currentTab}
          user={user}
          onLogout={handleLogout}
          progressPercent={progressPercent}
        />

        {/* Notificação Toast Flutuante */}
        {toastMessage && (
          <div
            id="vl-toast-notification"
            className="fixed bottom-6 right-6 z-50 bg-[#0f172a] text-white text-xs sm:text-sm font-medium px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-5 duration-300"
          >
            <span className="w-2 h-2 rounded-full bg-[#ea580c]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Renderização Condicional das Abas do Aluno */}
        <main id="vl-main-content" className="flex-1 p-4 sm:p-6 lg:p-8">
          {currentTab === "dashboard" && (
            <DashboardView
              user={user}
              course={course}
              completedLessons={completedLessons}
              onStartLesson={handleSelectLesson}
              onGoToCourse={() => setCurrentTab("course")}
              onGoToProgress={() => setCurrentTab("progress")}
              hasAccess={hasAccess}
            />
          )}

          {currentTab === "course" && (
            <CourseView
              course={course}
              completedLessons={completedLessons}
              onSelectLesson={handleSelectLesson}
              onToggleComplete={handleToggleLessonComplete}
              hasAccess={hasAccess}
            />
          )}

          {currentTab === "lesson" && (
            <LessonPlayer
              course={course}
              currentLesson={currentLesson}
              completedLessons={completedLessons}
              onToggleComplete={handleToggleLessonComplete}
              onSelectLesson={(lesson) => setCurrentLesson(lesson)}
              onGoToCourse={() => setCurrentTab("course")}
              user={user}
              hasAccess={hasAccess}
              onUpdateLessonVideoUrl={handleUpdateLessonVideoUrl}
            />
          )}

          {currentTab === "progress" && (
            <ProgressView
              user={user}
              course={course}
              completedLessons={completedLessons}
              onToggleComplete={handleToggleLessonComplete}
              onSelectLesson={handleSelectLesson}
            />
          )}

          {currentTab === "certificate" && (
            <CertificateView
              user={user}
              course={course}
              completedLessonsCount={completedCount}
              totalLessonsCount={totalLessons}
              onGoToCourse={() => setCurrentTab("course")}
            />
          )}

          {currentTab === "profile" && (
            <ProfileView
              user={user}
              course={course}
              completedLessonsCount={completedCount}
              onLogout={handleLogout}
              onProfileUpdated={(newName) => {
                setUser((prev) =>
                  prev ? { ...prev, displayName: newName } : prev
                );
                showToast("Perfil atualizado com sucesso!");
              }}
            />
          )}

          {currentTab === "admin" && (
            <AdminView
              course={course}
              onRefreshCourse={loadLiveCourse}
            />
          )}
        </main>
      </div>
    </div>
  );
}
