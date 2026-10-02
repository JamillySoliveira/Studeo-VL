"use client";

/**
 * =======================================================================
 * VISUALIZAÇÃO DA ABA "MEUS CURSOS" E GRADE DE AULAS - VL AUTOMAÇÕES
 * =======================================================================
 *
 * Responsável pela listagem dos cursos disponíveis para o aluno na aba "Meus Cursos":
 * - Exibe inicialmente apenas o CARD/TÍTULO de cada curso com o botão "VER AULAS →".
 * - As aulas não são exibidas inicialmente, mantendo a tela limpa e organizada.
 * - Ao clicar em "VER AULAS →", expande a área do curso mostrando progresso, módulos e aulas.
 * - O botão se transforma em "OCULTAR AULAS ↑", permitindo recolher a grade individualmente.
 * - Cada curso possui controle de abertura/fechamento independente.
 */

import React, { useState } from "react";
import {
  Check,
  Circle,
  Play,
  Clock,
  Lock,
  FileSpreadsheet,
  BookOpen,
  MessageCircle,
} from "lucide-react";
import { Course, Lesson } from "@/lib/types";
import { getCourseWhatsAppUrl } from "@/lib/constants";

interface CourseViewProps {
  course: Course;
  enrolledCourses?: Course[];
  onSelectCourse?: (courseId: string) => void;
  completedLessons: string[];
  onSelectLesson: (lesson: Lesson) => void;
  onToggleComplete: (lessonId: string) => void;
  hasAccess?: boolean;
}

export function CourseView({
  course,
  enrolledCourses = [],
  onSelectCourse,
  completedLessons,
  onSelectLesson,
  onToggleComplete,
  hasAccess = true,
}: CourseViewProps) {
  // Estado para controlar a exibição individual das aulas de cada curso (fechado inicialmente)
  const [expandedCourseIds, setExpandedCourseIds] = useState<Record<string, boolean>>({});

  // Alterna o estado de expansão de um curso específico
  const toggleCourse = (courseId: string) => {
    setExpandedCourseIds((prev) => {
      const willOpen = !prev[courseId];
      // Se estiver abrindo e o curso não for o atualmente selecionado no app, sincroniza o curso ativo
      if (willOpen && onSelectCourse && courseId !== course.id) {
        onSelectCourse(courseId);
      }
      return {
        ...prev,
        [courseId]: willOpen,
      };
    });
  };

  // Se o aluno NÃO possuir acesso a este curso, exibe a tela de bloqueio com botão para WhatsApp
  if (!hasAccess && (!enrolledCourses || enrolledCourses.length === 0)) {
    return (
      <div id="vl-course-locked-view" className="max-w-2xl mx-auto py-8 sm:py-12 px-4 text-center">
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-8 sm:p-10 shadow-xs space-y-6 transition-colors">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-100 dark:border-amber-900/50">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {course.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Você ainda não possui acesso liberado a este curso. Para adquirir seu acesso e iniciar as aulas, converse com o instrutor da VL Automação pelo WhatsApp oficial.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={getCourseWhatsAppUrl(course.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>OBTER ACESSO AO CURSO</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Lista dos cursos a serem exibidos na aba Meus Cursos
  const coursesToDisplay: Course[] =
    enrolledCourses && enrolledCourses.length > 0
      ? enrolledCourses
      : [course];

  return (
    <div id="vl-course-view" className="max-w-4xl mx-auto space-y-6">
      {coursesToDisplay.map((c) => {
        const isCurrentActive = c.id === course.id;
        const isExpanded = !!expandedCourseIds[c.id];
        const lessons = c.lessons || [];
        const totalCount = lessons.length;
        const currentCompleted = isCurrentActive ? completedLessons : [];
        const completedCount = currentCompleted.length;
        const progressPercent =
          totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        const nextLesson =
          lessons.find((l) => !currentCompleted.includes(l.id)) || lessons[0];

        return (
          <div
            key={c.id}
            id={`course-card-${c.id}`}
            className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-all duration-200"
          >
            {/* ================= CARD PRINCIPAL DO CURSO (SEMPRE VISÍVEL) ================= */}
            <div className="p-6 sm:p-7 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      {c.title}
                    </h2>
                    {c.badge && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#ea580c] bg-orange-50 dark:bg-orange-950/40 px-2.5 py-0.5 rounded-full border border-orange-200 dark:border-orange-800">
                        {c.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                    {c.subtitle || c.description}
                  </p>

                  {/* Informações adicionais do card */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {c.instructor && (
                      <span>
                        Instrutor: <strong className="text-slate-700 dark:text-slate-200">{c.instructor}</strong>
                      </span>
                    )}
                    {c.category && (
                      <span>
                        Categoria: <strong className="text-slate-700 dark:text-slate-200">{c.category}</strong>
                      </span>
                    )}
                    <span>
                      Total: <strong className="text-slate-700 dark:text-slate-200">{c.totalLessons || totalCount} aulas</strong>
                    </span>
                    {totalCount > 0 && isCurrentActive && (
                      <span className="text-[#ea580c] font-bold">
                        {completedCount} de {totalCount} concluídas ({progressPercent}%)
                      </span>
                    )}
                  </div>
                </div>

                {/* Botão VER AULAS → / OCULTAR AULAS ↑ */}
                <div className="shrink-0 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => toggleCourse(c.id)}
                    className={`w-full sm:w-auto py-2.5 px-5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                      isExpanded
                        ? "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700"
                        : "bg-[#ea580c] hover:bg-[#c2410c] text-white"
                    }`}
                  >
                    <span>{isExpanded ? "OCULTAR AULAS ↑" : "VER AULAS →"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ================= ÁREA EXPANSÍVEL: PROGRESSO E AULAS DO CURSO ================= */}
            {isExpanded && (
              <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 p-6 sm:p-7 space-y-6">
                {/* Progresso detalhado do curso */}
                <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">
                      Progresso do curso
                    </span>
                    <span className="font-extrabold text-[#ea580c]">
                      {completedCount} de {totalCount} aulas ({progressPercent}%)
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#ea580c] rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Grade de Aulas */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                      Grade de Aulas ({totalCount})
                    </h3>

                    {nextLesson && hasAccess && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectCourse && c.id !== course.id) {
                            onSelectCourse(c.id);
                          }
                          onSelectLesson(nextLesson);
                        }}
                        className="text-xs font-bold text-[#ea580c] hover:text-[#c2410c] flex items-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>
                          {completedCount > 0 ? "Continuar de onde parou" : "Começar pela Aula 01"}
                        </span>
                      </button>
                    )}
                  </div>

                  {lessons.length === 0 ? (
                    <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/80 dark:border-slate-800 p-8 text-center space-y-2 shadow-2xs">
                      <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Aulas em preparação
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                        As aulas deste curso estão sendo preparadas e serão disponibilizadas em breve pelo instrutor da VL Automação.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-2xs overflow-hidden">
                      {lessons.map((les, index) => {
                        const isCompleted = currentCompleted.includes(les.id);
                        const lessonNumber = String(les.order || index + 1).padStart(2, "0");

                        return (
                          <div
                            key={les.id}
                            id={`lesson-item-${les.id}`}
                            className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                              isCompleted ? "bg-slate-50/50 dark:bg-slate-800/30" : "hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                            }`}
                          >
                            {/* Lado Esquerdo: Checkbox de Conclusão e Título da Aula */}
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              {/* Botão de Marcar como Concluída */}
                              <button
                                type="button"
                                disabled={!hasAccess}
                                onClick={() => {
                                  if (onSelectCourse && c.id !== course.id) {
                                    onSelectCourse(c.id);
                                  }
                                  onToggleComplete(les.id);
                                }}
                                className="mt-0.5 shrink-0 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                                title={
                                  isCompleted
                                    ? "Aula concluída. Clique para desmarcar"
                                    : "Marcar aula como concluída"
                                }
                              >
                                {isCompleted ? (
                                  <div className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  </div>
                                ) : (
                                  <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 hover:text-slate-400 dark:hover:text-slate-500" />
                                )}
                              </button>

                              {/* Informações da Aula */}
                              <div
                                onClick={() => {
                                  if (hasAccess) {
                                    if (onSelectCourse && c.id !== course.id) {
                                      onSelectCourse(c.id);
                                    }
                                    onSelectLesson(les);
                                  }
                                }}
                                className={`min-w-0 flex-1 ${
                                  hasAccess ? "cursor-pointer group" : "cursor-not-allowed"
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-[11px] font-extrabold text-[#ea580c] uppercase tracking-wider">
                                    Aula {lessonNumber}
                                  </span>

                                  {isCompleted && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.2 rounded-md border border-emerald-200 dark:border-emerald-800">
                                      Concluída
                                    </span>
                                  )}
                                </div>

                                <h4
                                  className={`text-sm sm:text-base font-bold tracking-tight transition-colors ${
                                    hasAccess
                                      ? "text-slate-900 dark:text-slate-100 group-hover:text-[#ea580c]"
                                      : "text-slate-400 dark:text-slate-500"
                                  }`}
                                >
                                  {les.title}
                                </h4>

                                {les.description && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                    {les.description}
                                  </p>
                                )}

                                {/* Metadados: Duração e Formulário */}
                                <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                                  {les.duration && (
                                    <span className="inline-flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {les.duration}
                                    </span>
                                  )}

                                  {les.formUrl && (
                                    <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                                      <FileSpreadsheet className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                                      Atividade Google Forms
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Lado Direito: Botão de Assistir Aula */}
                            <div className="flex items-center justify-end gap-2 shrink-0 sm:self-center">
                              {hasAccess ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onSelectCourse && c.id !== course.id) {
                                      onSelectCourse(c.id);
                                    }
                                    onSelectLesson(les);
                                  }}
                                  className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs ${
                                    isCompleted
                                      ? "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                                      : "bg-[#ea580c] hover:bg-[#c2410c] text-white"
                                  }`}
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                  <span>{isCompleted ? "Rever aula" : "Assistir"}</span>
                                </button>
                              ) : (
                                <div className="py-1.5 px-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  <span>Bloqueada</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
