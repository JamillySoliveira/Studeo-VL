"use client";

/**
 * =======================================================================
 * VISUALIZAÇÃO DO CURSO E GRADE DE AULAS - VL AUTOMAÇÕES
 * =======================================================================
 *
 * Responsável pela listagem das aulas de um curso selecionado:
 * - Valida se o aluno possui permissão de acesso (`hasAccess`). Se bloqueado, exibe tela de aquisição via WhatsApp.
 * - Exibe a lista de aulas ordenadas, duração estimada e status de conclusão (concluída / pendente).
 * - Identifica aulas que possuem atividade prática associada no Google Forms.
 * - Permite alternar diretamente a conclusão de cada aula clicando no marcador.
 */

import React from "react";
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
  // Se o aluno NÃO possuir acesso a este curso, exibe a tela de bloqueio com botão para WhatsApp
  // Conforme requisito: não mostrar as aulas do curso bloqueado nem permitir acessar sua página interna.
  if (!hasAccess) {
    return (
      <div id="vl-course-locked-view" className="max-w-2xl mx-auto py-8 sm:py-12 px-4 text-center">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-10 shadow-xs space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {course.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Você ainda não possui acesso liberado a este curso. Para adquirir seu acesso e iniciar as aulas, converse com o instrutor da VL Automações pelo WhatsApp oficial.
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

  const lessons = course.lessons || [];
  const completedCount = completedLessons.length;
  const totalCount = lessons.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Próxima aula não concluída
  const nextLesson = lessons.find((l) => !completedLessons.includes(l.id)) || lessons[0];

  return (
    <div id="vl-course-view" className="max-w-4xl mx-auto space-y-6">
      {/* Seletor de Cursos Matriculados (se o aluno tiver mais de 1 curso em enrolledCourses) */}
      {enrolledCourses.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">
            Seus Cursos Liberados
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

      {/* Topo do Curso: Título, Descrição e Progresso Geral */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 space-y-5 shadow-xs">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {course.title}
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
            {course.subtitle || course.description}
          </p>
        </div>

        {/* Progresso resumido */}
        <div className="space-y-2 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-600 font-semibold">
              Progresso do curso
            </span>
            <span className="font-bold text-[#ea580c]">
              {completedCount} de {totalCount} aulas ({progressPercent}%)
            </span>
          </div>

          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#ea580c] rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* ================= GRADE DE AULAS DIRETA (SEM MÓDULOS) ================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">
            Grade de Aulas ({totalCount})
          </h2>

          {nextLesson && hasAccess && (
            <button
              type="button"
              onClick={() => onSelectLesson(nextLesson)}
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
          <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center space-y-2 shadow-xs">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">
              Aulas em preparação
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              As aulas deste curso estão sendo preparadas e serão disponibilizadas em breve pelo instrutor da VL Automações.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 shadow-xs overflow-hidden">
            {lessons.map((les, index) => {
              const isCompleted = completedLessons.includes(les.id);
              const lessonNumber = String(les.order || index + 1).padStart(2, "0");

              return (
                <div
                  key={les.id}
                  id={`lesson-item-${les.id}`}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    isCompleted ? "bg-slate-50/50" : "hover:bg-slate-50/80"
                  }`}
                >
                  {/* Lado Esquerdo: Checkbox de Conclusão e Título da Aula */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Botão de Marcar como Concluída */}
                    <button
                      type="button"
                      disabled={!hasAccess}
                      onClick={() => onToggleComplete(les.id)}
                      className="mt-0.5 shrink-0 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                      title={
                        isCompleted
                          ? "Aula concluída. Clique para desmarcar"
                          : "Marcar aula como concluída"
                      }
                    >
                      {isCompleted ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-300 flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 hover:text-slate-400" />
                      )}
                    </button>

                    {/* Informações da Aula */}
                    <div
                      onClick={() => hasAccess && onSelectLesson(les)}
                      className={`min-w-0 flex-1 ${
                        hasAccess ? "cursor-pointer group" : "cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-extrabold text-[#ea580c] uppercase tracking-wider">
                          Aula {lessonNumber}
                        </span>

                        {isCompleted && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded-md border border-emerald-200">
                            Concluída
                          </span>
                        )}
                      </div>

                      <h3
                        className={`text-sm sm:text-base font-bold tracking-tight transition-colors ${
                          hasAccess
                            ? "text-slate-900 group-hover:text-[#ea580c]"
                            : "text-slate-400"
                        }`}
                      >
                        {les.title}
                      </h3>

                      {les.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {les.description}
                        </p>
                      )}

                      {/* Metadados: Duração e Formulário */}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-400">
                        {les.duration && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {les.duration}
                          </span>
                        )}

                        {les.formUrl && (
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            <FileSpreadsheet className="w-3 h-3 text-slate-500" />
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
                        onClick={() => onSelectLesson(les)}
                        className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs ${
                          isCompleted
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            : "bg-[#ea580c] hover:bg-[#c2410c] text-white"
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{isCompleted ? "Rever aula" : "Assistir"}</span>
                      </button>
                    ) : (
                      <div className="py-1.5 px-2.5 bg-slate-100 rounded-lg text-[11px] text-slate-400 flex items-center gap-1">
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
  );
}
