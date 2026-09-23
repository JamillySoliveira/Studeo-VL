"use client";

import React from "react";
import {
  Play,
  ArrowRight,
  Lock,
  CheckCircle2,
  MessageCircle,
  BookOpen,
  Award,
  Bell,
  HelpCircle,
  CheckCheck,
} from "lucide-react";
import { Course, Lesson, UserProfile } from "@/lib/types";
import { checkUserCourseAccess, getUserAccessibleCourseIds } from "@/lib/courseService";
import { AVAILABLE_COURSES } from "@/lib/courseData";
import { getCourseWhatsAppUrl } from "@/lib/constants";

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
 * 2. Card de destaque "Continue de onde parou" + Acesso Rápido
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
  onGoToHelp,
  onGoToCertificates,
  onGoToNotices,
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

  return (
    <div id="vl-dashboard-view" className="max-w-5xl mx-auto py-3 sm:py-6 space-y-6 sm:space-y-8">
      {/* ================= 1. CABEÇALHO DE BOAS-VINDAS ================= */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Olá, {displayName} 👋
        </h1>
        <p className="text-sm sm:text-base text-slate-700 font-semibold leading-relaxed">
          Continue sua jornada de aprendizado em automação industrial.
        </p>
        <p className="text-xs sm:text-sm text-slate-500 font-normal leading-relaxed max-w-2xl">
          Aprenda no seu ritmo, acompanhe seu progresso e desenvolva novas habilidades profissionais.
        </p>
      </section>

      {/* ================= 2. BLOCO SUPERIOR: CONTINUIDADE & ACESSO RÁPIDO ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CARD DE CONTINUIDADE DOS ESTUDOS (Destaque Principal) */}
        <section
          aria-label="Continue de onde parou"
          className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-5"
        >
          {highlightedCourse ? (
            <>
              <div className="space-y-4">
                {/* Título da Seção e Curso */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[#ea580c] uppercase tracking-wider block">
                    Continue de onde parou
                  </span>
                  <h2 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                    {highlightedCourse.title}
                  </h2>
                </div>

                {/* Próxima Aula Não Concluída */}
                {nextIncompleteLesson ? (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      Próxima aula:
                    </span>
                    <p className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                      {nextIncompleteLesson.title}
                    </p>
                    {nextIncompleteLesson.duration && (
                      <span className="text-xs text-slate-500 block">
                        Duração: {nextIncompleteLesson.duration}
                      </span>
                    )}
                  </div>
                ) : isCourseAllCompleted ? (
                  <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-4 flex items-center gap-3 text-emerald-800">
                    <CheckCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-sm font-bold">Parabéns! Todas as aulas foram concluídas.</p>
                      <p className="text-xs text-emerald-700">Você já completou 100% da grade deste curso.</p>
                    </div>
                  </div>
                ) : null}

                {/* Informações de Progresso */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-semibold text-slate-700">
                      {highlightedCount} de {highlightedTotal} aulas concluídas
                    </span>
                    <span className="font-extrabold text-[#ea580c]">
                      {highlightedPercent}% concluído
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
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
                  className="py-3 px-5 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Ver todas as aulas</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
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
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Comece seu primeiro curso
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg">
                  Explore nossos cursos profissionais de automação industrial Rockwell e solicite seu acesso para começar a estudar agora mesmo.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleScrollToCourses}
                  className="py-3 px-6 bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
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

        {/* 6. ACESSO RÁPIDO */}
        <section
          aria-label="Acesso rápido"
          className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between space-y-4"
        >
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              Acesso rápido
            </h3>
            <p className="text-xs text-slate-500">
              Atalhos úteis para o seu dia a dia
            </p>
          </div>

          <div className="space-y-2.5">
            {/* Atalho Meus Cursos */}
            <button
              type="button"
              onClick={handleScrollToCourses}
              className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/70 text-left flex items-center justify-between transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs group-hover:text-[#ea580c] transition-colors">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 block group-hover:text-[#ea580c] transition-colors">
                    Meus Cursos
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Cursos disponíveis na conta
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* Atalho Certificado */}
            {onGoToCertificates && (
              <button
                type="button"
                onClick={onGoToCertificates}
                className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/70 text-left flex items-center justify-between transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs group-hover:text-[#ea580c] transition-colors">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 block group-hover:text-[#ea580c] transition-colors">
                      Certificados
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Status de conclusão
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
              </button>
            )}

            {/* Atalho Avisos */}
            {onGoToNotices && (
              <button
                type="button"
                onClick={onGoToNotices}
                className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/70 text-left flex items-center justify-between transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs group-hover:text-[#ea580c] transition-colors">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 block group-hover:text-[#ea580c] transition-colors">
                      Avisos da Turma
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Comunicados e atualizações
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
              </button>
            )}

            {/* Atalho Ajuda */}
            {onGoToHelp && (
              <button
                type="button"
                onClick={onGoToHelp}
                className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/70 text-left flex items-center justify-between transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs group-hover:text-[#ea580c] transition-colors">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 block group-hover:text-[#ea580c] transition-colors">
                      Ajuda & FAQ
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Como usar a plataforma
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
              </button>
            )}
          </div>
        </section>
      </div>

      {/* ================= 3. SEÇÃO MEUS CURSOS ================= */}
      <section id="section-meus-cursos" aria-labelledby="section-meus-cursos-title" className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2
              id="section-meus-cursos-title"
              className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight"
            >
              Meus Cursos
            </h2>
            <p className="text-xs text-slate-500 font-medium">
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
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all space-y-4"
                >
                  <div className="space-y-3">
                    {/* Topo do card: Título e Status Liberado */}
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                        {c.title}
                      </h3>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Acesso liberado</span>
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {c.subtitle || c.description}
                    </p>

                    {/* Informações de Progresso do Curso */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>
                          {totalCourseLessons > 0
                            ? `${completedCount} de ${totalCourseLessons} concluídas`
                            : "Aulas em preparação"}
                        </span>
                        <span className="font-bold text-[#ea580c]">
                          {coursePercent}%
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
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
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
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
                className="bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col justify-between shadow-xs space-y-4"
              >
                <div className="space-y-3">
                  {/* Topo do card: Título e Status Bloqueado */}
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm sm:text-base font-bold text-slate-800 leading-snug">
                      {c.title}
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 shrink-0">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>Acesso não liberado</span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    {c.subtitle || "Aprimore seus conhecimentos em automação industrial com a metodologia VL Automações."}
                  </p>
                </div>

                {/* Botão Oficial: Obter Acesso via WhatsApp */}
                <div className="pt-2 border-t border-slate-100">
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
    </div>
  );
}
