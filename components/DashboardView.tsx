"use client";

import React from "react";
import {
  Play,
  ArrowRight,
  Lock,
  CheckCircle2,
  MessageCircle,
  Lightbulb,
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
}

/**
 * Dashboard Principal do Aluno - StudeoVL (VL Automações)
 *
 * Estrutura visual:
 * 1. Topo: Olá, [Nome do aluno] 👋 + Continue seu aprendizado
 * 2. Curso em destaque (curso ativo com barra de progresso e botão de continuar de onde parou)
 * 3. Seção "MEUS CURSOS": os 3 cursos oficiais (Básico, Intermediário e Avançado)
 *    - Cursos com acesso: ✓ Acesso liberado + Progresso individual + [ Acessar curso → ]
 *    - Cursos sem acesso: 🔒 Acesso não liberado + Descrição + [ OBTER ACESSO AO CURSO ] (WhatsApp)
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
}: DashboardViewProps) {
  // Nome amigável do aluno para saudação
  const displayName =
    user?.displayName ||
    (user?.email ? user.email.split("@")[0] : "Aluno");

  // Lista dos IDs de cursos aos quais o aluno possui acesso oficial (enrolledCourses)
  const accessibleCourseIds = getUserAccessibleCourseIds(user);

  // Identifica o curso em destaque atual (deve ser um curso com acesso)
  const highlightedCourse =
    accessibleCourseIds.includes(course.id)
      ? course
      : allCourses.find((c) => accessibleCourseIds.includes(c.id)) || null;

  // Lista de aulas concluídas do curso em destaque
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

  // Próxima aula não concluída do curso em destaque
  const nextIncompleteLesson =
    highlightedLessons.find((l) => !highlightedCompleted.includes(l.id)) ||
    highlightedLessons[0];

  // Ação ao clicar em "Acessar curso" em um card liberado
  const handleOpenCourse = (targetCourseId: string) => {
    if (onSelectCourse) {
      onSelectCourse(targetCourseId);
    }
    onGoToCourse(targetCourseId);
  };

  // Ação ao clicar em "Continuar curso" no destaque
  const handleContinueCourse = () => {
    if (!highlightedCourse) return;
    if (onSelectCourse && highlightedCourse.id !== course.id) {
      onSelectCourse(highlightedCourse.id);
    }
    if (nextIncompleteLesson) {
      onStartLesson(nextIncompleteLesson);
    } else {
      onGoToCourse(highlightedCourse.id);
    }
  };

  return (
    <div id="vl-dashboard-view" className="max-w-4xl mx-auto py-3 sm:py-6 space-y-8">
      {/* ================= 1. SAUDAÇÃO INICIAL ================= */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Olá, {displayName} 👋
        </h1>
        <p className="text-sm sm:text-base text-slate-500 font-medium">
          Continue seu aprendizado
        </p>
      </div>

      {/* ================= 2. CURSO EM DESTAQUE ================= */}
      {highlightedCourse ? (
        <section
          id="vl-highlighted-course-card"
          aria-label="Curso em andamento"
          className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-5"
        >
          {/* Cabeçalho do Destaque */}
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {highlightedCourse.title}
            </h2>

            <p className="text-xs sm:text-sm text-slate-500">
              {highlightedCount > 0
                ? "Continue de onde você parou"
                : "Comece seu aprendizado"}
            </p>
          </div>

          {/* Barra de Progresso Horizontal */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="font-semibold text-slate-700">
                {highlightedCount} de {highlightedTotal} aulas concluídas
              </span>
              <span className="font-bold text-[#ea580c]">
                {highlightedPercent}%
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#ea580c] rounded-full transition-all duration-500"
                style={{ width: `${highlightedPercent}%` }}
              />
            </div>
          </div>

          {/* Botão de Ação do Destaque */}
          <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              id="btn-continue-highlighted-course"
              type="button"
              onClick={handleContinueCourse}
              className="py-3 px-6 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {highlightedCount > 0 ? "Continuar curso →" : "Acessar curso →"}
              </span>
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
        </section>
      ) : (
        /* Caso especial: aluno com cadastro mas sem cursos liberados em enrolledCourses */
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">
              Comece seu aprendizado
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Você ainda não possui nenhum curso liberado. Escolha um dos cursos abaixo e solicite seu acesso via WhatsApp.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={getCourseWhatsAppUrl("rockwell-basico")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 py-2.5 px-5 bg-[#059669] hover:bg-[#047857] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Falar com instrutor no WhatsApp</span>
            </a>

            {onGoToHelp && (
              <button
                type="button"
                onClick={onGoToHelp}
                className="inline-flex items-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer"
              >
                <Lightbulb className="w-4 h-4 text-[#ea580c]" />
                <span>Como usar a plataforma</span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* ================= 3. SEÇÃO MEUS CURSOS ================= */}
      <section aria-labelledby="section-meus-cursos-title" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2
              id="section-meus-cursos-title"
              className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight"
            >
              Meus Cursos
            </h2>
            <p className="text-xs text-slate-400 font-medium">
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
