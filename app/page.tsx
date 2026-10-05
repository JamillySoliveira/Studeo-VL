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

import React, { useEffect, useState, useTransition, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { UserProfile, Course, Lesson } from "@/lib/types";
import { INITIAL_COURSE, INITIAL_COURSE_ID, AVAILABLE_COURSES } from "@/lib/courseData";
import {
  getUserProgress,
  getUserCoursesProgressMap,
  syncUserProfile,
  clearUserProfileCache,
  toggleLessonProgress,
  toggleFormProgress,
  getUserProfile,
} from "@/lib/studentService";
import { Lock } from "lucide-react";
import {
  getCourseData,
  getAllCourses,
  saveLessonVideoUrl,
  checkUserCourseAccess,
  getUserAccessibleCourseIds,
  isDemoUser,
  sanitizeCourseForUser,
  sanitizeCoursesForUser,
} from "@/lib/courseService";

// Componentes da Aplicação de Carga Imediata
import { LoginScreen } from "@/components/LoginScreen";
import { Sidebar, TabType } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { DashboardView } from "@/components/DashboardView";

/**
 * Esqueleto sutil e leve para transição de abas sob demanda (Code Splitting)
 */
function TabLoadingSkeleton() {
  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-6 space-y-4 animate-pulse">
      <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded-xl w-48 mb-4" />
      <div className="h-36 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-28 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800" />
        <div className="h-28 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800" />
      </div>
    </div>
  );
}

// =======================================================================
// CARREGAMENTO SOB DEMANDA (DYNAMIC IMPORTS / DIVISÃO DE CÓDIGO)
// Abas secundárias são carregadas somente quando o aluno ou admin as acessa.
// =======================================================================
const CourseView = dynamic(
  () => import("@/components/CourseView").then((mod) => mod.CourseView),
  { loading: () => <TabLoadingSkeleton /> }
);
const LessonPlayer = dynamic(
  () => import("@/components/LessonPlayer").then((mod) => mod.LessonPlayer),
  { loading: () => <TabLoadingSkeleton /> }
);
const NoticesView = dynamic(
  () => import("@/components/NoticesView").then((mod) => mod.NoticesView),
  { loading: () => <TabLoadingSkeleton /> }
);
const ProgressView = dynamic(
  () => import("@/components/ProgressView").then((mod) => mod.ProgressView),
  { loading: () => <TabLoadingSkeleton /> }
);
const CertificateView = dynamic(
  () => import("@/components/CertificateView").then((mod) => mod.CertificateView),
  { loading: () => <TabLoadingSkeleton /> }
);
const ProfileView = dynamic(
  () => import("@/components/ProfileView").then((mod) => mod.ProfileView),
  { loading: () => <TabLoadingSkeleton /> }
);
const HelpView = dynamic(
  () => import("@/components/HelpView").then((mod) => mod.HelpView),
  { loading: () => <TabLoadingSkeleton /> }
);
const AdminView = dynamic(
  () => import("@/components/AdminView").then((mod) => mod.AdminView),
  { loading: () => <TabLoadingSkeleton /> }
);

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
  // Indicador de carregamento dos cursos do Firestore
  const [coursesLoading, setCoursesLoading] = useState(true);
  // Mensagem de erro caso a consulta de cursos ao Firestore falhe
  const [coursesError, setCoursesError] = useState<string | null>(null);
  // Lista com todos os cursos cadastrados na plataforma (iniciam sem aulas fictícias)
  const [allCourses, setAllCourses] = useState<Course[]>(() =>
    AVAILABLE_COURSES.map((c) => ({
      ...c,
      lessons: [],
      totalLessons: 0,
      modules: [],
    }))
  );

  // Higieniza em memória os cursos caso o usuário seja demo, sem consultas redundantes ao Firestore
  const sanitizedCourses = useMemo(() => {
    return sanitizeCoursesForUser(allCourses, user);
  }, [allCourses, user]);

  // Curso ativo derivado em memória (elimina renders em cascata e sincronizações redundantes)
  const course = useMemo<Course>(() => {
    const found = sanitizedCourses.find((c) => c.id === selectedCourseId);
    if (found) return found;
    const first = sanitizedCourses[0];
    if (first) return first;
    return {
      ...INITIAL_COURSE,
      lessons: [],
      totalLessons: 0,
      modules: [],
    };
  }, [sanitizedCourses, selectedCourseId]);

  // Aula selecionada atualmente para assistir no reprodutor
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  // Aula ativa garantindo pertinência ao curso ativo e vinda exclusivamente do Firestore
  const currentLesson = useMemo<Lesson | null>(() => {
    if (!course.lessons || course.lessons.length === 0) {
      return null;
    }
    if (selectedLesson) {
      const found = course.lessons.find((l) => l.id === selectedLesson.id);
      if (found) return found;
    }
    return course.lessons[0] || null;
  }, [course, selectedLesson]);

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
  // SINCRONIZAÇÃO DE DADOS COM O FIRESTORE (ALTA PERFORMANCE)
  // =====================================================================

  // 1. Carrega todos os cursos do Firestore SOMENTE DEPOIS que o Firebase Auth confirmar o usuário
  useEffect(() => {
    // Elimina a condição de corrida: NÃO executa getAllCourses() prematuramente se o usuário ainda não foi autenticado
    if (authLoading || !user?.uid) {
      return;
    }

    let isMounted = true;

    getAllCourses(user)
      .then((courses) => {
        if (!isMounted) return;
        startTransition(() => {
          setAllCourses(courses);
          setCoursesLoading(false);
          setCoursesError(null);
        });
      })
      .catch((err) => {
        console.error("Erro ao carregar cursos do Firestore:", err);
        if (!isMounted) return;
        startTransition(() => {
          setCoursesLoading(false);
          setCoursesError(err?.message || "Erro ao carregar cursos do Firestore.");
        });
      });

    return () => {
      isMounted = false;
    };
  }, [authLoading, user?.uid, user]);

  // 2. Busca o progresso detalhado do curso ativo em segundo plano (não bloqueia exibição das aulas)
  useEffect(() => {
    if (!user?.uid) return;
    let isMounted = true;

    // Busca detalhada para o curso ativo sem bloquear a interface
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

  // 3. Mapa geral de progresso para o Dashboard (executa uma única vez por login do usuário)
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

  // 3. Observa o estado de autenticação do Firebase em tempo real (montagem única)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: User | null) => {
        if (firebaseUser) {
          try {
            // Sincroniza obrigatoriamente o usuário com o Firestore antes de prosseguir
            await syncUserProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
            });
          } catch (syncErr) {
            console.error("Erro ao sincronizar perfil do usuário:", syncErr);
          }

          // Limpa o cache antes de carregar o perfil oficial do Firestore
          clearUserProfileCache(firebaseUser.uid);

          // Lê permissões e dados oficiais salvos no documento do usuário no Firestore
          let dbProfile: UserProfile | null = null;
          try {
            dbProfile = await getUserProfile(firebaseUser.uid);
          } catch (profileErr) {
            console.error("Erro ao carregar perfil do usuário:", profileErr);
          }

          const isAdminEmail = firebaseUser.email?.toLowerCase() === "adm.vlautomacao@gmail.com";

          const studentProfile: UserProfile = dbProfile || {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName:
              firebaseUser.displayName ||
              (firebaseUser.email ? firebaseUser.email.split("@")[0] : "Aluno"),
            photoURL: firebaseUser.photoURL,
            role: isAdminEmail ? "admin" : "student",
            accessEnabled: true,
            courseAccess: {
              "rockwell-controle-analogico-supervisorio": false,
            },
            enrolledCourses: [],
            createdAt: new Date().toISOString(),
          };

          if (isAdminEmail) {
            studentProfile.role = "admin";
          }

          // Aluno Demonstração nunca possui papel de administrador
          if (isDemoUser(studentProfile)) {
            studentProfile.role = "student";
          }

          startTransition(() => {
            setUser(studentProfile);

            // Garante que o curso ativo esteja entre os cursos liberados para o aluno
            const accessibleIds = getUserAccessibleCourseIds(studentProfile);
            if (accessibleIds.length > 0 && studentProfile.role !== "admin") {
              setSelectedCourseId((curr) =>
                accessibleIds.includes(curr) ? curr : accessibleIds[0]
              );
            }
          });
        } else {
          startTransition(() => {
            setUser(null);
            setCoursesLoading(false);
            setCoursesError(null);
          });
        }
        setAuthLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Recarrega todos os cursos após alterações administrativas
  const reloadAllCourses = async () => {
    setCoursesLoading(true);
    setCoursesError(null);
    try {
      const courses = await getAllCourses(user);
      startTransition(() => {
        setAllCourses(courses);
        setCoursesLoading(false);
        setCoursesError(null);
      });
    } catch (e: any) {
      console.error("Erro ao recarregar cursos do Firestore:", e);
      setCoursesLoading(false);
      setCoursesError(e?.message || "Erro ao recarregar cursos.");
    }
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
      courseAccess: {
        "rockwell-controle-analogico-supervisorio": false,
      },
      enrolledCourses: [],
    };

    // Higieniza imediatamente cursos e aulas em memória, removendo URLs de vídeo
    setAllCourses((prev) => sanitizeCoursesForUser(prev, demoUser));
    setSelectedLesson((prev) =>
      prev
        ? {
            ...prev,
            videoUrl: "",
            youtubeUrl: "",
          }
        : null
    );

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
        ].filter(Boolean);
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

  // Seleciona um curso ativo na plataforma de forma síncrona e instantânea
  const handleSelectCourse = useCallback((courseId: string) => {
    setSelectedCourseId(courseId);

    // Se já houver progresso carregado no mapa em memória, reflete imediatamente
    setCoursesProgressMap((prev) => {
      if (prev[courseId]) {
        setCompletedLessons(prev[courseId]);
      } else {
        setCompletedLessons([]);
      }
      return prev;
    });

    showToast("Curso selecionado!");
  }, []);

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

  // Seleciona um curso e redireciona direto para a lista de aulas de forma instantânea
  const handleSelectAndOpenCourse = useCallback((courseId: string) => {
    handleSelectCourse(courseId);
    setCurrentTab("course");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [handleSelectCourse]);

  // Permite ao administrador salvar um novo link de vídeo para a aula
  const handleUpdateLessonVideoUrl = async (lessonId: string, videoUrl: string) => {
    if (isDemoUser(user) || user?.role !== "admin") return;
    await saveLessonVideoUrl(lessonId, videoUrl, course.id);
    await reloadAllCourses();
    showToast("Link do vídeo atualizado com sucesso!");
  };

  // Abre uma aula específica no reprodutor de vídeo
  const handleSelectLesson = (lesson: Lesson) => {
    // Alunos sem acesso liberado às aulas são impedidos de abrir qualquer aula
    if (!hasAccess && !isAdmin) {
      showToast("Seu acesso às aulas ainda não foi liberado.");
      return;
    }

    if (isDemoUser(user)) {
      // Garante que o Aluno Demonstração nunca receba links de vídeo
      setSelectedLesson({
        ...lesson,
        videoUrl: "",
        youtubeUrl: "",
      });
    } else {
      setSelectedLesson(lesson);
    }
    setCurrentTab("lesson");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // =====================================================================
  // CÁLCULOS DE ACESSO E PROGRESSO (MEMOIZADOS PARA MÁXIMA PERFORMANCE)
  // =====================================================================

  // Validação estrita de administrador (Aluno Demonstração nunca é admin)
  const isAdmin =
    (user?.role === "admin" || user?.email?.toLowerCase() === "adm.vlautomacao@gmail.com") &&
    !isDemoUser(user);

  // Lista dos cursos liberados para o aluno visualizar no menu e no dashboard
  const accessibleCourseIds = useMemo(
    () => getUserAccessibleCourseIds(user),
    [user]
  );

  const enrolledCoursesList = useMemo(() => {
    const isUserAdmin =
      (user?.role === "admin" || user?.email?.toLowerCase() === "adm.vlautomacao@gmail.com") &&
      !isDemoUser(user);
    if (isUserAdmin) return sanitizedCourses;
    const filtered = sanitizedCourses.filter((c) => accessibleCourseIds.includes(c.id));
    if (filtered.length > 0) return filtered;
    // Para novos alunos que ainda não possuem cursos liberados em courseAccess,
    // exibe o curso na área "Meus Cursos" para visualização do card com status de acesso pendente
    return [course];
  }, [user, sanitizedCourses, accessibleCourseIds, course]);

  // Valida se o aluno possui acesso ao curso ativo
  const hasAccess = checkUserCourseAccess(user, course.id);

  // Métricas do curso atual
  const lessons = course.lessons || [];
  const totalLessons = lessons.length;
  const completedCount = completedLessons.length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // =====================================================================
  // RENDERIZAÇÃO: TELAS ESPECIAIS (LOADING, LOGIN E BLOQUEIO)
  // =====================================================================

  // 1. Tela de Carregamento Inicial do Firebase Auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b0f19] flex flex-col items-center justify-center p-4 transition-colors">
        <div className="w-12 h-12 bg-[#ea580c] rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/30 animate-bounce mb-4">
          <span className="text-white font-black text-xl">VL</span>
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Carregando plataforma VL AUTOMAÇÃO...
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Conectando ao Firebase</p>
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
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b0f19] flex flex-col items-center justify-center p-6 text-center transition-colors duration-200">
        <div className="max-w-md w-full bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto border border-red-200 dark:border-red-900/60">
            <span className="text-2xl font-black">!</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Acesso à plataforma bloqueado
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Seu acesso à plataforma VL Automações está temporariamente desativado. Entre em contato com a administração para regularizar o acesso.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-black dark:bg-[#ea580c] dark:hover:bg-[#c2410c] text-white text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer"
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
    <div id="vl-student-platform" className="min-h-screen bg-[#f8fafc] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex transition-colors duration-200">
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
            className="fixed bottom-6 right-6 z-50 bg-[#0f172a] dark:bg-slate-800 text-white text-xs sm:text-sm font-medium px-4 py-3 rounded-xl shadow-xl border border-slate-700 dark:border-slate-600 flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-5 duration-300"
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
              allCourses={sanitizedCourses.length >= 3 ? sanitizedCourses : AVAILABLE_COURSES}
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
              isLoadingCourses={coursesLoading}
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
              isLoadingCourses={coursesLoading}
              accessibleCourseIds={accessibleCourseIds}
              coursesError={coursesError}
              onRetryCourses={reloadAllCourses}
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
            hasAccess || isAdmin ? (
              <LessonPlayer
                course={course}
                currentLesson={currentLesson}
                completedLessons={completedLessons}
                completedForms={completedForms}
                onToggleComplete={handleToggleLessonComplete}
                onToggleFormComplete={handleToggleFormComplete}
                onSelectLesson={handleSelectLesson}
                onGoToCourse={() => setCurrentTab("course")}
                user={user}
                hasAccess={hasAccess}
                onUpdateLessonVideoUrl={handleUpdateLessonVideoUrl}
              />
            ) : (
              <div className="max-w-2xl mx-auto py-12 px-4 text-center">
                <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 sm:p-12 shadow-xs space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-100 dark:border-amber-900/50">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    Seu acesso às aulas ainda não foi liberado.
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Assim que o acesso for liberado pelo administrador, as aulas estarão disponíveis aqui.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCurrentTab("course")}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    <span>Voltar para Meus Cursos</span>
                  </button>
                </div>
              </div>
            )
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
          {currentTab === "admin" && isAdmin && (
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
