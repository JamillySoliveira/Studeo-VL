"use client";

import React from "react";
import { Play, ArrowRight, Lock } from "lucide-react";
import { Course, Lesson, UserProfile } from "@/lib/types";

interface DashboardViewProps {
  user: UserProfile | null;
  course: Course;
  completedLessons: string[];
  onStartLesson: (lesson: Lesson) => void;
  onGoToCourse: () => void;
  onGoToProgress: () => void;
  hasAccess?: boolean;
}

export function DashboardView({
  user,
  course,
  completedLessons,
  onStartLesson,
  onGoToCourse,
  hasAccess = true,
}: DashboardViewProps) {
  // Nome amigável do aluno
  const displayName =
    user?.displayName ||
    (user?.email ? user.email.split("@")[0] : "Aluno");

  // Lista de todas as aulas em ordem linear
  const allLessons: Lesson[] = [];
  course.modules.forEach((m) => {
    m.lessons.forEach((l) => allLessons.push(l));
  });

  const totalLessons = allLessons.length;
  const completedCount = completedLessons.length;
  const progressPercent =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // Próxima aula não concluída
  const nextIncompleteLesson =
    allLessons.find((l) => !completedLessons.includes(l.id)) || allLessons[0];

  return (
    <div id="vl-dashboard-view" className="max-w-3xl mx-auto py-4 sm:py-6 space-y-8">
      {/* ================= TOPO MINIMALISTA ================= */}
      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Olá, {displayName}
        </h1>
        <p className="text-sm sm:text-base text-slate-500 font-normal">
          Continue seus estudos de onde parou.
        </p>
      </div>

      {/* ================= CARD PRINCIPAL DO CURSO ================= */}
      <div
        id="vl-main-course-card"
        className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-xs"
      >
        {/* Nome do Curso */}
        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            {course.category}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
            {course.title}
          </h2>
        </div>

        {/* Informações de Progresso */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="font-semibold text-slate-700">
              {completedCount} de {totalLessons} aulas concluídas
            </span>
            <span className="font-bold text-[#ea580c]">
              {progressPercent}% concluído
            </span>
          </div>

          {/* Barra de Progresso Horizontal Laranja */}
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#ea580c] rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Botões Principais de Ação */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {hasAccess ? (
            <button
              id="btn-continue-studying"
              type="button"
              onClick={() => onStartLesson(nextIncompleteLesson)}
              className="py-3 px-6 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{completedCount > 0 ? "Continuar estudando" : "Iniciar curso"}</span>
            </button>
          ) : (
            <div className="py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Acesso restrito. Solicite a liberação ao administrador da VL Automações.</span>
            </div>
          )}

          <button
            type="button"
            onClick={onGoToCourse}
            className="py-3 px-5 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Ver grade de aulas</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
