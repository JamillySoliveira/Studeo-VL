"use client";

import React, { useEffect, useState, useTransition } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { UserProfile, Course, Lesson } from "@/lib/types";
import { INITIAL_COURSE, INITIAL_COURSE_ID, AVAILABLE_COURSES } from "@/lib/courseData";
import {
  getUserProgress,
  getUserCoursesProgressMap,
  syncUserProfile,
  toggleLessonProgress,
  getUserProfile,
} from "@/lib/studentService";
import {
  getCourseData,
  getAllCourses,
  saveLessonVideoUrl,
  checkUserCourseAccess,
  getUserAccessibleCourseIds,
} from "@/lib/courseService";

// Componentes da Aplicação
import { LoginScreen } from "@/components/LoginScreen";
import { Sidebar, TabType } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { DashboardView } from "@/components/DashboardView";
import { CourseView } from "@/components/CourseView";
import { LessonPlayer } from "@/components/LessonPlayer";
import { NoticesView } from "@/components/NoticesView";
import { ProgressView } from "@/components/ProgressView";
import { ProfileView } from "@/components/ProfileView";
import { CertificateView } from "@/components/CertificateView";
import { HelpView } from "@/components/HelpView";
import { AdminView } from "@/components/AdminView";

export default function StudentApp() {
  // Estado do Aluno Autenticado
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Curso atualmente selecionado
  const [selectedCourseId, setSelectedCourseId] = useState<string>(INITIAL_COURSE_ID);
  const [course, setCourse] = useState<Course>(INITIAL_COURSE);
  const [allCourses, setAllCourses] = useState<Course[]>([INITIAL_COURSE]);

  // Aula selecionada atualmente para assistir
  const [currentLesson, setCurrentLesson] = useState<Lesson>(
    INITIAL_COURSE.lessons[0] || {
      id: "aula-1-1",
      courseId: "rockwell-basico",
      title: "Introdução",
      description: "",
      videoUrl: "",
      formUrl: "",
      order: 1,
    }
  );

  // Progresso do Aluno (IDs das aulas concluídas do curso selecionado)
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  // Mapa de progresso independente por curso (nunca misturado entre cursos)
  const [coursesProgressMap, setCoursesProgressMap] = useState<Record<string, string[]>>({});
  const [currentTab, setCurrentTab] = useState<TabType>("dashboard");

  // Controle do menu mobile lateral
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Toast de feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [, startTransition] = useTransition();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Carrega os 3 cursos sempre que o selectedCourseId mudar
  useEffect(() => {
    let isMounted = true;
    getAllCourses().then((courses) => {
      if (!isMounted) return;
      startTransition(() => {
        setAllCourses(courses);
        const target =
          courses.find((c) => c.id === selectedCourseId) || courses[0];
        setCourse(target);
        if (target.lessons.length > 0) {
          setCurrentLesson((prev) => {
            const exists = target.lessons.find((l) => l.id === prev.id);
            return exists || target.lessons[0];
          });
        }
      });
    });

    return () => {
      isMounted = false;
    };
  }, [selectedCourseId]);

  // Carrega o progresso do usuário para o curso ativo
  useEffect(() => {
    if (!user?.uid) return;
    let isMounted = true;

    getUserProgress(user.uid, selectedCourseId).then((progressData) => {
      if (!isMounted) return;
      startTransition(() => {
        setCompletedLessons(progressData.completedLessons || []);
        setCoursesProgressMap((prev) => ({
          ...prev,
          [selectedCourseId]: progressData.completedLessons || [],
        }));
      });
    });

    return () => {
      isMounted = false;
    };
  }, [user?.uid, selectedCourseId]);

  // Carrega o progresso independente de todos os cursos oficiais disponíveis
  useEffect(() => {
    if (!user?.uid) return;
    let isMounted = true;

    getUserCoursesProgressMap(
      user.uid,
      AVAILABLE_COURSES.map((c) => c.id)
    ).then((map) => {
      if (!isMounted) return;
      startTransition(() => {
        setCoursesProgressMap((prev) => ({
          ...prev,
          ...map,
        }));
      });
    });

    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  // Monitora o estado de login do Firebase Authentication em tempo real
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: User | null) => {
        if (firebaseUser) {
          // O role de admin é mantido pelo documento do usuário no Firestore ou pela conta mestre oficial
          const isAdminEmail =
            firebaseUser.email === "adm.vlautomacao@gmail.com";

          const studentProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName:
              firebaseUser.displayName ||
              (firebaseUser.email ? firebaseUser.email.split("@")[0] : "Aluno"),
            photoURL: firebaseUser.photoURL,
            role: isAdminEmail ? "admin" : "student",
            accessEnabled: true,
            enrolledCourses: [INITIAL_COURSE_ID],
          };

          // 1. Sincroniza usuário na coleção "users" do Firestore
          await syncUserProfile(studentProfile);

          // 2. Carrega permissões e enrolledCourses salvos no Firestore
          const dbProfile = await getUserProfile(firebaseUser.uid);
          if (dbProfile) {
            studentProfile.accessEnabled = dbProfile.accessEnabled;
            studentProfile.role = dbProfile.role || studentProfile.role;
            studentProfile.enrolledCourses = dbProfile.enrolledCourses || [
              INITIAL_COURSE_ID,
            ];
          }

          startTransition(() => {
            setUser(studentProfile);

            // Se o usuário não for admin e não tiver acesso ao curso padrão selecionado,
            // seleciona o primeiro curso disponível em seus enrolledCourses
            const accessibleIds = getUserAccessibleCourseIds(studentProfile);
            if (
              accessibleIds.length > 0 &&
              !accessibleIds.includes(selectedCourseId) &&
              studentProfile.role !== "admin"
            ) {
              setSelectedCourseId(accessibleIds[0]);
            }
          });
        } else {
          startTransition(() => {
            setUser(null);
          });
        }
        setAuthLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedCourseId]);

  // Recarrega todos os cursos
  const reloadAllCourses = async () => {
    const courses = await getAllCourses();
    startTransition(() => {
      setAllCourses(courses);
      const target =
        courses.find((c) => c.id === selectedCourseId) || courses[0];
      setCourse(target);
    });
  };

  // Login de Demonstração Rápida
  const handleDemoLogin = async () => {
    const demoUser: UserProfile = {
      uid: "demo-aluno-vl-001",
      email: "aluno.demo@vlautomacao.com.br",
      displayName: "Aluno Demonstração",
      role: "student",
      accessEnabled: true,
      enrolledCourses: ["rockwell-basico"],
    };

    setUser(demoUser);

    try {
      const progressData = await getUserProgress(demoUser.uid, selectedCourseId);
      if (progressData.completedLessons.length > 0) {
        setCompletedLessons(progressData.completedLessons);
      } else {
        const initialDemoProgress = [
          course.lessons[0]?.id || "aula-1-1",
          course.lessons[1]?.id || "aula-1-2",
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

  // Seleciona um curso ativo
  const handleSelectCourse = async (courseId: string) => {
    setSelectedCourseId(courseId);
    const targetCourse = await getCourseData(courseId);
    startTransition(() => {
      setCourse(targetCourse);
      if (targetCourse.lessons.length > 0) {
        setCurrentLesson(targetCourse.lessons[0]);
      }
    });

    if (user?.uid) {
      const progressData = await getUserProgress(user.uid, courseId);
      startTransition(() => {
        setCompletedLessons(progressData.completedLessons || []);
      });
    }

    showToast("Curso selecionado!");
  };

  // Alterna o status da aula como concluída / pendente e salva no Firestore
  const handleToggleLessonComplete = async (lessonId: string) => {
    if (!user) return;

    const wasCompleted = completedLessons.includes(lessonId);
    try {
      const result = await toggleLessonProgress(
        user.uid,
        course.id,
        lessonId,
        completedLessons
      );
      setCompletedLessons(result.updatedLessons);
      setCoursesProgressMap((prev) => ({
        ...prev,
        [course.id]: result.updatedLessons,
      }));

      if (!wasCompleted) {
        showToast("Aula concluída! Progresso salvo.");
      } else {
        showToast("Aula desmarcada.");
      }
    } catch (error) {
      console.error("Erro ao atualizar progresso:", error);
    }
  };

  // Seleciona um curso e navega diretamente para a grade de aulas
  const handleSelectAndOpenCourse = async (courseId: string) => {
    await handleSelectCourse(courseId);
    setCurrentTab("course");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Atualização direta do link do Google Drive pelo administrador
  const handleUpdateLessonVideoUrl = async (lessonId: string, videoUrl: string) => {
    await saveLessonVideoUrl(lessonId, videoUrl, course.id);
    await reloadAllCourses();
    showToast("Link do vídeo atualizado com sucesso!");
  };

  // Seleciona uma aula para assistir e abre o reprodutor
  const handleSelectLesson = (lesson: Lesson) => {
    setCurrentLesson(lesson);
    setCurrentTab("lesson");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Lista dos cursos acessíveis pelo aluno a partir de enrolledCourses
  const accessibleCourseIds = getUserAccessibleCourseIds(user);
  const enrolledCoursesList =
    user?.role === "admin"
      ? allCourses
      : allCourses.filter((c) => accessibleCourseIds.includes(c.id));

  // Permissão de acesso ao curso ativo
  const hasAccess = checkUserCourseAccess(user, course.id);

  // Cálculos de métricas do curso atual
  const lessons = course.lessons || [];
  const totalLessons = lessons.length;
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

  // Se o aluno ESTIVER logado, mas o acesso geral à plataforma estiver bloqueado (accessEnabled === false)
  if (user.accessEnabled === false && user.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <span className="text-2xl font-black">!</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Acesso à plataforma bloqueado
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Seu acesso à plataforma VL Automações está temporariamente desativado. Entre em contato com a administração para regularizar o acesso.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer"
            >
              Sair da conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Se o aluno ESTIVER logado e liberado, exibe a Área do Aluno completa
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
              allCourses={allCourses.length >= 3 ? allCourses : AVAILABLE_COURSES}
              coursesProgressMap={coursesProgressMap}
              completedLessons={completedLessons}
              onSelectCourse={handleSelectCourse}
              onStartLesson={handleSelectLesson}
              onGoToCourse={(targetId) => {
                if (targetId && targetId !== course.id) {
                  handleSelectCourse(targetId);
                }
                setCurrentTab("course");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onGoToProgress={() => setCurrentTab("progress")}
              onGoToHelp={() => {
                setCurrentTab("help");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          )}

          {currentTab === "course" && (
            <CourseView
              course={course}
              enrolledCourses={enrolledCoursesList}
              onSelectCourse={handleSelectCourse}
              completedLessons={completedLessons}
              onSelectLesson={handleSelectLesson}
              onToggleComplete={handleToggleLessonComplete}
              hasAccess={hasAccess}
            />
          )}

          {currentTab === "notices" && (
            <NoticesView
              user={user}
              onGoToCourse={handleSelectAndOpenCourse}
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
              enrolledCourses={enrolledCoursesList}
              onSelectCourse={handleSelectCourse}
              completedLessons={completedLessons}
              onToggleComplete={handleToggleLessonComplete}
              onSelectLesson={handleSelectLesson}
            />
          )}

          {currentTab === "certificate" && (
            <CertificateView
              user={user}
              course={course}
              enrolledCourses={enrolledCoursesList}
              onSelectCourse={handleSelectCourse}
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

          {currentTab === "help" && (
            <HelpView
              onGoToCourses={() => {
                setCurrentTab("course");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onGoToCertificates={() => {
                setCurrentTab("certificate");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          )}

          {currentTab === "admin" && (
            <AdminView
              course={course}
              onRefreshCourse={reloadAllCourses}
              onSelectCourseId={handleSelectCourse}
            />
          )}
        </main>
      </div>
    </div>
  );
}
