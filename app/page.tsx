"use client";

/**
 * =======================================================================
 * ORQUESTRADOR PRINCIPAL DA PLATAFORMA VL AUTOMAÇÕES - ÁREA DO ALUNO
 * =======================================================================
 *
 * Este componente raiz (`StudentApp`) coordena todo o ecossistema da plataforma:
 * 
 * 1. Autenticação (Firebase Auth):
 *    - Monitora o estado de login do aluno em tempo real (`onAuthStateChanged`).
 *    - Se deslogado, exibe a tela de login (`LoginScreen`) com autenticação Google.
 *    - Se logado, sincroniza e consulta os dados de permissão no Cloud Firestore.
 * 
 * 2. Controle de Acesso:
 *    - Se `accessEnabled === false`, exibe tela amigável informando a suspensão do acesso.
 *    - Se `role === "admin"`, libera acesso irrestrito a todos os cursos e ao painel admin.
 *    - Se `role === "student"`, filtra rigorosamente os cursos a partir de `enrolledCourses`.
 * 
 * 3. Gestão de Cursos e Aulas:
 *    - Carrega os cursos disponíveis da VL Automações ("rockwell-basico", etc.).
 *    - Gerencia a aula selecionada no reprodutor (`LessonPlayer`).
 * 
 * 4. Sistema de Progresso:
 *    - Salva e consulta aulas e atividades de formulário concluídas no Firestore.
 *    - Mantém o progresso de cada curso 100% isolado (um curso não interfere no outro).
 * 
 * 5. Navegação entre Abas:
 *    - Início (Dashboard), Meus Cursos, Reprodutor, Avisos, Progresso, Certificado,
 *      Perfil, Ajuda (FAQ interativo) e Painel Administrativo.
 */

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
  toggleFormProgress,
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
  // =====================================================================
  // ESTADOS DO USUÁRIO E AUTENTICAÇÃO
  // =====================================================================
  
  // Perfil do aluno logado (dados do Google + permissões salvas no Firestore)
  const [user, setUser] = useState<UserProfile | null>(null);
  // Indicador de carregamento enquanto o Firebase verifica a sessão ativa
  const [authLoading, setAuthLoading] = useState(true);

  // =====================================================================
  // ESTADOS DE CURSOS E AULAS
  // =====================================================================

  // ID do curso que o aluno está visualizando no momento
  const [selectedCourseId, setSelectedCourseId] = useState<string>(INITIAL_COURSE_ID);
  // Objeto completo com dados e aulas do curso ativo
  const [course, setCourse] = useState<Course>(INITIAL_COURSE);
  // Lista com todos os cursos cadastrados na plataforma
  const [allCourses, setAllCourses] = useState<Course[]>([INITIAL_COURSE]);

  // Aula selecionada atualmente para assistir no reprodutor
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

  // =====================================================================
  // ESTADOS DE PROGRESSO DO ALUNO
  // =====================================================================

  // Lista com IDs das aulas concluídas no curso ativo
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  // Lista com IDs das atividades do Google Forms concluídas no curso ativo
  const [completedForms, setCompletedForms] = useState<string[]>([]);
  // Mapa de progresso independente por curso: { [courseId]: string[] }
  const [coursesProgressMap, setCoursesProgressMap] = useState<Record<string, string[]>>({});

  // =====================================================================
  // ESTADOS DE NAVEGAÇÃO E INTERFACE
  // =====================================================================

  // Aba ativa na tela do aluno
  const [currentTab, setCurrentTab] = useState<TabType>("dashboard");
  // Controle de abertura da gaveta/menu lateral no celular
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Mensagem temporária flutuante (Toast de notificação)
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // O useTransition evita congelamento da interface durante atualizações de estado
  const [, startTransition] = useTransition();

  /**
   * Exibe uma notificação rápida na parte inferior da tela
   */
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // =====================================================================
  // SINCRONIZAÇÃO DE DADOS COM O FIRESTORE
  // =====================================================================

  // 1. Carrega todos os cursos sempre que o curso selecionado for alterado
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

  // 2. Busca o progresso (aulas e formulários) do aluno para o curso ativo no Firestore
  useEffect(() => {
    if (!user?.uid) return;
    let isMounted = true;

    getUserProgress(user.uid, selectedCourseId).then((progressData) => {
      if (!isMounted) return;
      startTransition(() => {
        setCompletedLessons(progressData.completedLessons || []);
        setCompletedForms(progressData.completedForms || []);
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

  // 3. Carrega o mapa de progresso de todos os cursos para exibição no Dashboard
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

  // 4. Observa o estado de autenticação do Firebase em tempo real
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: User | null) => {
        if (firebaseUser) {
          // Identifica conta mestre oficial de administração
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

          // Salva/sincroniza o usuário na coleção "users"
          await syncUserProfile(studentProfile);

          // Lê permissões salvas no documento do usuário no Firestore
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

            // Garante que o curso ativo esteja entre os cursos liberados para o aluno
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

  // Recarrega todos os cursos após alterações administrativas
  const reloadAllCourses = async () => {
    const courses = await getAllCourses();
    startTransition(() => {
      setAllCourses(courses);
      const target =
        courses.find((c) => c.id === selectedCourseId) || courses[0];
      setCourse(target);
    });
  };

  // =====================================================================
  // AÇÕES DO USUÁRIO
  // =====================================================================

  // Login de Demonstração Rápida (para testes)
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
        setCompletedForms(progressData.completedForms || []);
      } else {
        const initialDemoProgress = [
          course.lessons[0]?.id || "aula-1-1",
          course.lessons[1]?.id || "aula-1-2",
        ];
        setCompletedLessons(initialDemoProgress);
      }
    } catch (e) {
      console.warn("Erro ao carregar progresso demo:", e);
    }
  };

  // Encerra a sessão do aluno no Firebase
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

  // Seleciona um curso ativo na plataforma
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
        setCompletedForms(progressData.completedForms || []);
      });
    }

    showToast("Curso selecionado!");
  };

  // Alterna o status da aula entre concluída e pendente, salvando no Firestore
  const handleToggleLessonComplete = async (lessonId: string) => {
    if (!user) return;

    const wasCompleted = completedLessons.includes(lessonId);
    try {
      const result = await toggleLessonProgress(
        user.uid,
        course.id,
        lessonId,
        completedLessons,
        completedForms,
        course.lessons.length,
        course.lessons.filter((l) => Boolean(l.formUrl)).length
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
      console.error("Erro ao atualizar progresso de aula:", error);
    }
  };

  // Alterna o status da atividade do Google Forms de uma aula no Firestore
  const handleToggleFormComplete = async (lessonId: string) => {
    if (!user) return;

    const wasCompleted = completedForms.includes(lessonId);
    try {
      const result = await toggleFormProgress(
        user.uid,
        course.id,
        lessonId,
        completedForms,
        completedLessons,
        course.lessons.length,
        course.lessons.filter((l) => Boolean(l.formUrl)).length
      );
      setCompletedForms(result.updatedForms);

      if (!wasCompleted) {
        showToast("Formulário marcado como respondido!");
      } else {
        showToast("Formulário desmarcado.");
      }
    } catch (error) {
      console.error("Erro ao atualizar status do formulário:", error);
    }
  };

  // Seleciona um curso e redireciona direto para a lista de aulas
  const handleSelectAndOpenCourse = async (courseId: string) => {
    await handleSelectCourse(courseId);
    setCurrentTab("course");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Permite ao administrador salvar um novo link de vídeo para a aula
  const handleUpdateLessonVideoUrl = async (lessonId: string, videoUrl: string) => {
    await saveLessonVideoUrl(lessonId, videoUrl, course.id);
    await reloadAllCourses();
    showToast("Link do vídeo atualizado com sucesso!");
  };

  // Abre uma aula específica no reprodutor de vídeo
  const handleSelectLesson = (lesson: Lesson) => {
    setCurrentLesson(lesson);
    setCurrentTab("lesson");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // =====================================================================
  // CÁLCULOS DE ACESSO E PROGRESSO
  // =====================================================================

  // Lista dos cursos liberados para o aluno visualizar no menu e no dashboard
  const accessibleCourseIds = getUserAccessibleCourseIds(user);
  const enrolledCoursesList =
    user?.role === "admin"
      ? allCourses
      : allCourses.filter((c) => accessibleCourseIds.includes(c.id));

  // Valida se o aluno possui acesso ao curso ativo
  const hasAccess = checkUserCourseAccess(user, course.id);

  // Métricas do curso atual
  const lessons = course.lessons || [];
  const totalLessons = lessons.length;
  const completedCount = completedLessons.length;
  const progressPercent =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // =====================================================================
  // RENDERIZAÇÃO: TELAS ESPECIAIS (LOADING, LOGIN E BLOQUEIO)
  // =====================================================================

  // 1. Tela de Carregamento Inicial do Firebase Auth
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

  // 2. Se o aluno não estiver autenticado, exibe a tela de login
  if (!user) {
    return (
      <LoginScreen
        onSuccess={() => setCurrentTab("dashboard")}
        onDemoLogin={handleDemoLogin}
      />
    );
  }

  // 3. Se o acesso geral do aluno estiver bloqueado (accessEnabled === false)
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

  // =====================================================================
  // RENDERIZAÇÃO: ÁREA DO ALUNO COMPLETA
  // =====================================================================
  return (
    <div id="vl-student-platform" className="min-h-screen bg-[#f8fafc] flex">
      {/* Menu Lateral de Navegação */}
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

      {/* Conteúdo Principal da Plataforma */}
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

        {/* Exibição Condicional de Abas */}
        <main id="vl-main-content" className="flex-1 p-4 sm:p-6 lg:p-8">
          {/* 1. Início / Dashboard */}
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

          {/* 2. Meus Cursos */}
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

          {/* 3. Avisos da Plataforma */}
          {currentTab === "notices" && (
            <NoticesView
              user={user}
              onGoToCourse={handleSelectAndOpenCourse}
            />
          )}

          {/* 4. Reprodutor de Aulas e Atividades */}
          {currentTab === "lesson" && (
            <LessonPlayer
              course={course}
              currentLesson={currentLesson}
              completedLessons={completedLessons}
              completedForms={completedForms}
              onToggleComplete={handleToggleLessonComplete}
              onToggleFormComplete={handleToggleFormComplete}
              onSelectLesson={(lesson) => setCurrentLesson(lesson)}
              onGoToCourse={() => setCurrentTab("course")}
              user={user}
              hasAccess={hasAccess}
              onUpdateLessonVideoUrl={handleUpdateLessonVideoUrl}
            />
          )}

          {/* 5. Acompanhamento de Progresso */}
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

          {/* 6. Certificado Oficial */}
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

          {/* 7. Perfil do Aluno */}
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

          {/* 8. Ajuda e FAQ Interativo */}
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

          {/* 9. Painel Administrativo */}
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
