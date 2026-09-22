"use client";

import React, { useState } from "react";
import {
  Check,
  Circle,
  Play,
  Clock,
  ChevronDown,
  ChevronUp,
  Lock,
} from "lucide-react";
import { Course, Lesson } from "@/lib/types";

interface CourseViewProps {
  course: Course;
  completedLessons: string[];
  onSelectLesson: (lesson: Lesson) => void;
  onToggleComplete: (lessonId: string) => void;
  hasAccess?: boolean;
}

export function CourseView({
  course,
  completedLessons,
  onSelectLesson,
  onToggleComplete,
  hasAccess = true,
}: CourseViewProps) {
  // Identifica todas as aulas em ordem linear
  const allLessons: Lesson[] = [];
  course.modules.forEach((m) => m.lessons.forEach((l) => allLessons.push(l)));

  // Identifica a próxima aula que o aluno deve assistir (primeira ainda não concluída)
  const nextLesson = allLessons.find((l) => !completedLessons.includes(l.id)) || allLessons[0];
  const nextLessonId = nextLesson?.id;

  // Descobre qual módulo contém a próxima aula para abri-lo por padrão
  const activeModuleId =
    course.modules.find((m) => m.lessons.some((l) => l.id === nextLessonId))?.id ||
    course.modules[0]?.id;

  // Estado dos módulos abertos (por padrão, o módulo com a próxima aula fica aberto)
  const [openModules, setOpenModules] = useState<Record<string, boolean>>(() => {
    return activeModuleId ? { [activeModuleId]: true } : { [course.modules[0]?.id]: true };
  });

  const toggleModule = (modId: string) => {
    setOpenModules((prev) => ({
      ...prev,
      [modId]: !prev[modId],
    }));
  };

  const completedCount = completedLessons.length;
  const totalCount = allLessons.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div id="vl-course-view" className="max-w-4xl mx-auto space-y-6">
      {/* Aviso de Acesso Restrito caso desativado no Firebase */}
      {!hasAccess && (
        <div
          id="vl-course-restricted-banner"
          className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Acesso pendente de liberação
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Seu usuário não possui liberação ativa no sistema de usuários da VL Automações.
            </p>
          </div>
        </div>
      )}

      {/* Topo do Curso: Título e Progresso Geral */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
              {course.category}
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {course.title}
            </h1>
          </div>
        </div>

        {/* Progresso resumido */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              Progresso do curso
            </span>
            <span className="font-semibold text-slate-800">
              {completedCount}/{totalCount} aulas ({progressPercent}%)
            </span>
          </div>

          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#ea580c] rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* ================= LISTA DE MÓDULOS ================= */}
      <div className="space-y-3">
        {course.modules.map((mod, index) => {
          const modLessons = mod.lessons;
          const modCompleted = modLessons.filter((l) =>
            completedLessons.includes(l.id)
          ).length;
          const isOpen = !!openModules[mod.id];
          const hasActiveNextLesson = modLessons.some((l) => l.id === nextLessonId);

          return (
            <div
              key={mod.id}
              id={`module-card-${mod.id}`}
              className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                hasActiveNextLesson && !isOpen
                  ? "border-orange-300 shadow-xs"
                  : "border-slate-200/80 shadow-xs"
              }`}
            >
              {/* Header do Módulo (Clicável para expandir) */}
              <button
                type="button"
                onClick={() => toggleModule(mod.id)}
                className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors cursor-pointer"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Módulo {index + 1}
                    </span>
                    {modCompleted === modLessons.length && modLessons.length > 0 && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Concluído
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                    {mod.title.replace(/^Módulo\s*\d+:\s*/i, "")}
                  </h3>
                </div>

                {/* Progresso do Módulo e Ícone Expandir */}
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xs font-semibold text-slate-500">
                    {modCompleted}/{modLessons.length} aulas
                  </span>

                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </button>

              {/* Lista de Aulas ao abrir o Módulo */}
              {isOpen && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-3 sm:p-4 space-y-1.5">
                  {modLessons.map((les) => {
                    const isDone = completedLessons.includes(les.id);
                    const isNext = les.id === nextLessonId && !isDone;

                    return (
                      <div
                        key={les.id}
                        id={`lesson-item-${les.id}`}
                        className={`px-4 py-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                          isNext
                            ? "bg-white border-[#ea580c] shadow-xs"
                            : isDone
                            ? "bg-white/80 border-slate-200/80 text-slate-600"
                            : "bg-white border-slate-200/80 hover:border-slate-300 text-slate-800"
                        }`}
                      >
                        {/* Indicador de Status: ✓ Concluída | ○ Disponível | ▶ Próxima aula */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {hasAccess ? (
                            <button
                              type="button"
                              onClick={() => onToggleComplete(les.id)}
                              title={
                                isDone
                                  ? "Aula concluída. Clique para desmarcar"
                                  : "Marcar como concluída"
                              }
                              className="shrink-0 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                            >
                              {isDone ? (
                                <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-300 flex items-center justify-center">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </div>
                              ) : isNext ? (
                                <div className="w-5 h-5 rounded-full bg-orange-50 text-[#ea580c] border border-orange-300 flex items-center justify-center">
                                  <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                                </div>
                              ) : (
                                <Circle className="w-5 h-5 text-slate-300" />
                              )}
                            </button>
                          ) : (
                            <div className="shrink-0 text-slate-400">
                              <Lock className="w-4 h-4" />
                            </div>
                          )}

                          {/* Nome da Aula e Destaque da Próxima */}
                          <div
                            onClick={() => {
                              if (hasAccess) {
                                onSelectLesson(les);
                              }
                            }}
                            className="min-w-0 flex-1 cursor-pointer"
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-xs sm:text-sm font-medium transition-colors truncate ${
                                  isNext
                                    ? "font-bold text-slate-900"
                                    : isDone
                                    ? "text-slate-600"
                                    : "text-slate-800 hover:text-[#ea580c]"
                                }`}
                              >
                                {les.title}
                              </span>

                              {/* Destaque principal da Próxima Aula */}
                              {isNext && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#ea580c] bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                                  Próxima aula
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Lado Direito: Duração discreta e Ação */}
                        <div className="flex items-center gap-3 shrink-0">
                          {les.duration && (
                            <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{les.duration}</span>
                            </div>
                          )}

                          {hasAccess && (
                            <button
                              type="button"
                              onClick={() => onSelectLesson(les)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                isNext
                                  ? "bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-xs"
                                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                              }`}
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span className="hidden sm:inline">Assistir</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
