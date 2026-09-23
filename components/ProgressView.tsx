"use client";

/**
 * =======================================================================
 * PAINEL DE PROGRESSO INDIVIDUAL DO ALUNO - VL AUTOMAÇÕES
 * =======================================================================
 *
 * Responsável pela exibição do progresso detalhado no curso ativo:
 * - Calcula a porcentagem concluída com base nas aulas finalizadas.
 * - Permite alternar entre os cursos matriculados do aluno através do seletor superior.
 * - Exibe a lista completa de aulas com marcadores interativos de status.
 * - Fornece atalhos diretos para continuar estudando a aula no reprodutor.
 */

import React from "react";
import { Check, Circle, Play, BookOpen } from "lucide-react";
import { Course, Lesson, UserProfile } from "@/lib/types";

interface ProgressViewProps {
  user: UserProfile | null;
  course: Course;
  enrolledCourses?: Course[];
  onSelectCourse?: (courseId: string) => void;
  completedLessons: string[];
  onToggleComplete: (lessonId: string) => void;
  onSelectLesson: (lesson: Lesson) => void;
}

export function ProgressView({
  course,
  enrolledCourses = [],
  onSelectCourse,
  completedLessons,
  onToggleComplete,
  onSelectLesson,
}: ProgressViewProps) {
  const lessons = course.lessons || [];
  const totalLessons = lessons.length;
  const completedCount = completedLessons.length;
  const progressPercent =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div id="vl-progress-page" className="max-w-3xl mx-auto space-y-6">
      {/* Seletor de Cursos Matriculados (se mais de 1) */}
      {enrolledCourses.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">
            Selecione o Curso para Ver o Progresso
          </span>
          <div className="flex flex-wrap gap-2">
            {enrolledCourses.map((c) => {
              const isSelected = c.id === course.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectCourse && onSelectCourse(c.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? "bg-[#ea580c] text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{c.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= RESUMO SIMPLES DE PROGRESSO ================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Seu Desempenho em {course.title}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {progressPercent}% concluído
          </h1>
        </div>

        {/* Barra horizontal de progresso */}
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#ea580c] rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p className="text-xs sm:text-sm text-slate-500">
          {completedCount} de {totalLessons} aulas concluídas
        </p>
      </div>

      {/* ================= LISTA DIRETA DE AULAS (SEM MÓDULOS) ================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-sm sm:text-base font-bold text-slate-900">
            Aulas de {course.title}
          </h2>
          <p className="text-xs text-slate-400">
            Acompanhe ou atualize as aulas concluídas
          </p>
        </div>

        {lessons.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Nenhuma aula cadastrada neste curso ainda.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {lessons.map((lesson, idx) => {
              const isDone = completedLessons.includes(lesson.id);
              const lessonNum = String(lesson.order || idx + 1).padStart(2, "0");

              return (
                <div
                  key={lesson.id}
                  className="p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onToggleComplete(lesson.id)}
                      className="shrink-0 cursor-pointer text-slate-400 hover:text-emerald-600 transition-colors"
                      title={
                        isDone
                          ? "Aula concluída. Clique para desmarcar"
                          : "Marcar como concluída"
                      }
                    >
                      {isDone ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-300 flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300" />
                      )}
                    </button>

                    <div
                      onClick={() => onSelectLesson(lesson)}
                      className="cursor-pointer min-w-0 flex-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold text-[#ea580c]">
                          Aula {lessonNum}
                        </span>
                        {isDone && (
                          <span className="text-[10px] text-emerald-600 font-bold">
                            (Concluída)
                          </span>
                        )}
                      </div>

                      <span
                        className={`text-xs sm:text-sm font-semibold truncate block ${
                          isDone ? "text-slate-400 line-through" : "text-slate-800"
                        }`}
                      >
                        {lesson.title}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectLesson(lesson)}
                    className="p-2 text-slate-400 hover:text-[#ea580c] hover:bg-orange-50 rounded-xl transition-colors cursor-pointer shrink-0"
                    title="Assistir aula"
                  >
                    <Play className="w-4 h-4 fill-current" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
