"use client";

import React, { useState } from "react";
import {
  Play,
  ArrowRight,
  Lock,
  CheckCircle2,
  MessageCircle,
  BookOpen,
  CheckCheck,
  Video,
  HelpCircle,
  X,
} from "lucide-react";
import { Course, Lesson, UserProfile } from "@/lib/types";
import { checkUserCourseAccess, getUserAccessibleCourseIds } from "@/lib/courseService";
import { AVAILABLE_COURSES, getVideoEmbedUrl } from "@/lib/courseData";
import { getCourseWhatsAppUrl } from "@/lib/constants";

/**
 * =======================================================================
 * CONFIGURAÇÃO DO VÍDEO DE SUPORTE / GUIA DA PLATAFORMA (GOOGLE DRIVE)
 * =======================================================================
 * Cole aqui o link do vídeo explicativo armazenado no Google Drive.
 * Exemplo: "https://drive.google.com/file/d/SEU_ID_DO_ARQUIVO/view"
 */
export const SUPPORT_VIDEO_URL: string = "COLE_AQUI_O_LINK_DO_GOOGLE_DRIVE";

interface DashboardViewProps {
  user: UserProfile | null;
  course: Course;
  allCourses?: Course[];
  coursesProgressMap?: Record<string, string[]>;
  completedLessons?: string[];
  onSelectCourse?: (courseId: string) => void;
  onStartLesson: (lesson: Lesson) => void;
  onGoToCourse: (courseId?: string) => void;
  onGoToProgress?: () => void;
  onGoToHelp?: () => void;
  onGoToCertificates?: () => void;
  onGoToNotices?: () => void;
}

/**
 * Dashboard Principal do Aluno - VL AUTOMAÇÕES
 *
 * Estrutura moderna, limpa e funcional:
 * 1. Cabeçalho de Boas-vindas personalizado
 * 2. Card de destaque "Continue de onde parou"
 * 3. Grade dos cursos da plataforma (Meus Cursos com acessos e solicitações via WhatsApp)
 */
export function DashboardView({
  user,
  course,
  allCourses = AVAILABLE_COURSES,
  coursesProgressMap = {},
  completedLessons = [],
  onSelectCourse,
  onStartLesson,
  onGoToCourse,
}: DashboardViewProps) {
  // Nome amigável do aluno para saudação dinâmica
  const displayName =
    user?.displayName ||
    (user?.email ? user.email.split("@")[0] : "Aluno");

  // Lista dos IDs de cursos aos quais o aluno possui acesso oficial (enrolledCourses)
  const accessibleCourseIds = getUserAccessibleCourseIds(user);

  // Identifica o curso em andamento (deve ser um curso com acesso)
  const highlightedCourse =
    accessibleCourseIds.includes(course.id)
      ? course
      : allCourses.find((c) => accessibleCourseIds.includes(c.id)) || null;

  // Lista de aulas concluídas do curso em andamento
  const highlightedCompleted = highlightedCourse
    ? coursesProgressMap[highlightedCourse.id] ||
      (highlightedCourse.id === course.id ? completedLessons : [])
    : [];

  const highlightedLessons = highlightedCourse?.lessons || [];
  const highlightedTotal = highlightedLessons.length;
  const highlightedCount = highlightedCompleted.length;
  const highlightedPercent =
    highlightedTotal > 0
      ? Math.round((highlightedCount / highlightedTotal) * 100)
      : 0;

  // Próxima aula não concluída do curso
  const nextIncompleteLesson =
    highlightedLessons.find((l) => !highlightedCompleted.includes(l.id)) ||
    null;

  // Verifica se todas as aulas do curso já foram concluídas
  const isCourseAllCompleted =
    highlightedTotal > 0 && highlightedCount >= highlightedTotal;

  // Ação ao clicar em "Acessar curso"
  const handleOpenCourse = (targetCourseId: string) => {
    if (onSelectCourse) {
      onSelectCourse(targetCourseId);
    }
    onGoToCourse(targetCourseId);
  };

  // Ação ao clicar em "Continuar estudando"
  const handleContinueCourse = () => {
    if (!highlightedCourse) return;
    if (onSelectCourse && highlightedCourse.id !== course.id) {
      onSelectCourse(highlightedCourse.id);
    }
    if (nextIncompleteLesson) {
      onStartLesson(nextIncompleteLesson);
    } else if (highlightedLessons.length > 0) {
      onStartLesson(highlightedLessons[0]);
    } else {
      onGoToCourse(highlightedCourse.id);
    }
  };

  // Rolagem suave até a grade de cursos
  const handleScrollToCourses = () => {
    const el = document.getElementById("section-meus-cursos");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      onGoToCourse();
    }
  };

  // Estado para controlar a exibição do modal "Como usar a plataforma"
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  // Converte o link configurado do Google Drive para URL de embed
  const isVideoConfigured =
    SUPPORT_VIDEO_URL &&
    SUPPORT_VIDEO_URL !== "COLE_AQUI_O_LINK_DO_GOOGLE_DRIVE" &&
    SUPPORT_VIDEO_URL.trim() !== "";
  const guideEmbedUrl = isVideoConfigured ? getVideoEmbedUrl(SUPPORT_VIDEO_URL) : "";

  return (
    <div id="vl-dashboard-view" className="max-w-5xl mx-auto py-3 sm:py-6 space-y-6 sm:space-y-8">
      {/* ================= 1. CABEÇALHO DE BOAS-VINDAS ================= */}
      <section className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-2 transition-colors">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Olá, {displayName} <i className="text-orange-500">!</i>
        </h1>
        <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
          Continue sua jornada de aprendizado em automação industrial.
        </p>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal leading-relaxed max-w-2xl">
          Aprenda no seu ritmo, acompanhe seu progresso e desenvolva novas habilidades profissionais.
        </p>
      </section>

      {/* ================= 2. BLOCO SUPERIOR: CONTINUIDADE ================= */}
      <div>
        {/* CARD DE CONTINUIDADE DOS ESTUDOS (Destaque Principal) */}
        <section
          aria-label="Continue de onde parou"
          className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-5 transition-colors"
        >
          {highlightedCourse ? (
            <>
              <div className="space-y-4">
                {/* Título da Seção e Curso */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[#ea580c] uppercase tracking-wider block">
                    Continue de onde parou
                  </span>
                  <h2 className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {highlightedCourse.title}
                  </h2>
                </div>

                {/* Próxima Aula Não Concluída */}
                {nextIncompleteLesson ? (
                  <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-4 space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                      Próxima aula:
                    </span>
                    <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {nextIncompleteLesson.title}
                    </p>
                    {nextIncompleteLesson.duration && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 block">
                        Duração: {nextIncompleteLesson.duration}
                      </span>
                    )}
                  </div>
                ) : isCourseAllCompleted ? (
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 rounded-xl p-4 flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
                    <CheckCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-sm font-bold">Parabéns! Todas as aulas foram concluídas.</p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">Você já completou 100% da grade deste curso.</p>
                    </div>
                  </div>
                ) : null}

                {/* Informações de Progresso */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {highlightedCount} de {highlightedTotal} aulas concluídas
                    </span>
                    <span className="font-extrabold text-[#ea580c]">
                      {highlightedPercent}% concluído
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#ea580c] rounded-full transition-all duration-500"
                      style={{ width: `${highlightedPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  onClick={handleContinueCourse}
                  className="py-3 px-6 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Continuar estudando</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenCourse(highlightedCourse.id)}
                  className="py-3 px-5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Ver todas as aulas</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                </button>
              </div>
            </>
          ) : (
            /* Caso em que o aluno ainda não possui nenhum curso liberado */
            <div className="space-y-4 my-auto">
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Área do Aluno
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Comece seu primeiro curso
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-lg">
                  Explore nossos cursos profissionais de automação industrial Rockwell e solicite seu acesso para começar a estudar agora mesmo.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleScrollToCourses}
                  className="py-3 px-6 bg-slate-900 hover:bg-black dark:bg-[#ea580c] dark:hover:bg-[#c2410c] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Ver meus cursos</span>
                </button>

                <a
                  href={getCourseWhatsAppUrl("rockwell-basico")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 py-3 px-5 bg-[#059669] hover:bg-[#047857] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Falar no WhatsApp</span>
                </a>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ================= 3. SEÇÃO MEUS CURSOS ================= */}
      <section id="section-meus-cursos" aria-labelledby="section-meus-cursos-title" className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2
              id="section-meus-cursos-title"
              className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight"
            >
              Meus Cursos
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Cursos oficiais disponíveis na plataforma StudeoVL
            </p>
          </div>
        </div>

        {/* Grade dos 3 Cursos Oficiais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {allCourses.map((c) => {
            // Verifica o acesso estrito com base em enrolledCourses ou role de admin
            const isEnrolled = checkUserCourseAccess(user, c.id);

            // Progresso isolado para este curso específico (nunca misturado)
            const courseCompleted =
              coursesProgressMap[c.id] ||
              (c.id === course.id ? completedLessons : []);
            const totalCourseLessons = c.lessons?.length || 0;
            const completedCount = courseCompleted.length;
            const coursePercent =
              totalCourseLessons > 0
                ? Math.round((completedCount / totalCourseLessons) * 100)
                : 0;

            if (isEnrolled) {
              /* ================= CURSO COM ACESSO LIBERADO ================= */
              return (
                <div
                  key={c.id}
                  id={`course-card-enrolled-${c.id}`}
                  className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 flex flex-col justify-between shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-4"
                >
                  <div className="space-y-3">
                    {/* Topo do card: Título e Status Liberado */}
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                        {c.title}
                      </h3>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Acesso liberado</span>
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {c.subtitle || c.description}
                    </p>

                    {/* Informações de Progresso do Curso */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                        <span>
                          {totalCourseLessons > 0
                            ? `${completedCount} de ${totalCourseLessons} concluídas`
                            : "Aulas em preparação"}
                        </span>
                        <span className="font-bold text-[#ea580c]">
                          {coursePercent}%
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#ea580c] rounded-full transition-all duration-300"
                          style={{ width: `${coursePercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Botão de Ação: Abrir o curso liberado */}
                  <button
                    type="button"
                    onClick={() => handleOpenCourse(c.id)}
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-black dark:bg-[#ea580c] dark:hover:bg-[#c2410c] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                  >
                    <span>Acessar curso</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            }

            /* ================= CURSO SEM ACESSO (BLOQUEADO) ================= */
            return (
              <div
                key={c.id}
                id={`course-card-locked-${c.id}`}
                className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 flex flex-col justify-between shadow-xs space-y-4 transition-colors"
              >
                <div className="space-y-3">
                  {/* Topo do card: Título e Status Bloqueado */}
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 leading-snug">
                      {c.title}
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 shrink-0">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>Acesso não liberado</span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {c.subtitle || "Aprimore seus conhecimentos em automação industrial com a metodologia VL Automações."}
                  </p>
                </div>

                {/* Botão Oficial: Obter Acesso via WhatsApp */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <a
                    href={getCourseWhatsAppUrl(c.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 text-center"
                    title={`Solicitar liberação do ${c.title} no WhatsApp`}
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" />
                    <span>OBTER ACESSO AO CURSO</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= BOTÃO FLUTUANTE DISCRETO (SUPORTE / GUIA) ================= */}
      <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-40">
        <div className="relative group flex items-center justify-center">
          {/* Tooltip no desktop ao passar o mouse */}
          <span
            role="tooltip"
            className="absolute right-full mr-2.5 px-2.5 py-1 bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-xs text-white text-xs font-semibold rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none hidden sm:inline-block border border-transparent dark:border-slate-700"
          >
            Como usar a plataforma
          </span>

          {/* Botão Circular Flutuante */}
          <button
            type="button"
            onClick={() => setIsGuideModalOpen(true)}
            aria-label="Como usar a plataforma"
            title="Como usar a plataforma"
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#ea580c] hover:bg-[#c2410c] active:scale-95 text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50 focus:ring-offset-2"
          >
            <HelpCircle className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
          </button>
        </div>
      </div>

      {/* ================= MODAL: COMO USAR A PLATAFORMA ================= */}
      {isGuideModalOpen && (
        <div
          id="vl-guide-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsGuideModalOpen(false)}
        >
          <div
            id="vl-guide-modal-content"
            className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#ea580c] flex items-center justify-center border border-orange-100 dark:border-orange-900/40">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Como usar a plataforma
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Vídeo explicativo com instruções práticas
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsGuideModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo: Vídeo do Google Drive */}
            <div className="p-4 sm:p-6 bg-slate-950/5 dark:bg-black/40">
              {guideEmbedUrl ? (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-inner border border-slate-200 dark:border-slate-800">
                  <iframe
                    src={guideEmbedUrl}
                    title="Vídeo Tutorial da Plataforma"
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="w-full aspect-video rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center p-6 text-center space-y-2">
                  <Video className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    Vídeo explicativo da plataforma
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                    Configure o link do Google Drive na constante{" "}
                    <code className="text-[#ea580c] font-semibold bg-orange-50 dark:bg-orange-950/40 px-1 py-0.5 rounded">
                      SUPPORT_VIDEO_URL
                    </code>{" "}
                    no arquivo do Dashboard para visualizar o vídeo aqui.
                  </p>
                </div>
              )}
            </div>

            {/* Rodapé com botão Fechar */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end bg-white dark:bg-[#111827]">
              <button
                type="button"
                onClick={() => setIsGuideModalOpen(false)}
                className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
