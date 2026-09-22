"use client";

import React from "react";
import { Check, Circle, Play } from "lucide-react";
import { Course, Lesson, UserProfile } from "@/lib/types";

interface ProgressViewProps {
  user: UserProfile | null;
  course: Course;
  completedLessons: string[];
  onToggleComplete: (lessonId: string) => void;
  onSelectLesson: (lesson: Lesson) => void;
}

export function ProgressView({
  course,
  completedLessons,
  onToggleComplete,
  onSelectLesson,
}: ProgressViewProps) {
  const allLessons: { lesson: Lesson; moduleTitle: string }[] = [];
  course.modules.forEach((mod) => {
    mod.lessons.forEach((les) => {
      allLessons.push({ lesson: les, moduleTitle: mod.title });
    });
  });

  const totalLessons = allLessons.length;
  const completedCount = completedLessons.length;
  const progressPercent =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div id="vl-progress-page" className="max-w-3xl mx-auto space-y-6">
      {/* ================= RESUMO SIMPLES DE PROGRESSO ================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Seu Desempenho
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

      {/* ================= LISTA SIMPLES DE AULAS ================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-sm sm:text-base font-bold text-slate-900">
            Aulas da Formação
          </h2>
          <p className="text-xs text-slate-400">
            Acompanhe ou atualize as aulas concluídas
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {allLessons.map(({ lesson, moduleTitle }) => {
            const isDone = completedLessons.includes(lesson.id);

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
                    className="min-w-0 flex-1 cursor-pointer"
                  >
                    <p
                      className={`text-xs sm:text-sm truncate transition-colors ${
                        isDone
                          ? "text-slate-600"
                          : "text-slate-900 font-medium hover:text-[#ea580c]"
                      }`}
                    >
                      {lesson.title}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {moduleTitle.replace(/^Módulo \d+:\s*/i, "")}
                      {lesson.duration ? ` • ${lesson.duration}` : ""}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectLesson(lesson)}
                  className="p-1.5 text-slate-400 hover:text-[#ea580c] rounded-lg transition-colors cursor-pointer shrink-0"
                  title="Assistir aula"
                >
                  <Play className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
