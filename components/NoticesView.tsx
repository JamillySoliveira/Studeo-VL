"use client";

/**
 * =======================================================================
 * CENTRAL DE AVISOS E COMUNICADOS - VL AUTOMAÇÕES
 * =======================================================================
 *
 * Responsável por exibir mensagens e novidades postadas pelos instrutores.
 * Filtra os avisos de modo que o aluno só veja comunicados pertinentes
 * aos cursos que ele possui liberados em seu perfil (`enrolledCourses`).
 */

import React, { useState } from "react";
import { Bell, ArrowRight } from "lucide-react";
import { getStoredNotices, Notice } from "@/lib/constants";
import { getUserAccessibleCourseIds } from "@/lib/courseService";
import { UserProfile } from "@/lib/types";

interface NoticesViewProps {
  user: UserProfile | null;
  onGoToCourse: (courseId: string) => void;
}

/**
 * Visualização da aba Avisos da plataforma StudeoVL.
 * Exibe apenas comunicados relacionados aos cursos que o aluno possui em enrolledCourses.
 */
export function NoticesView({ user, onGoToCourse }: NoticesViewProps) {
  const [allNotices] = useState<Notice[]>(() => getStoredNotices());

  const accessibleCourseIds = getUserAccessibleCourseIds(user);

  // Filtra apenas comunicados de cursos aos quais o aluno possui acesso oficial
  const studentNotices: Notice[] = allNotices.filter((notice) =>
    accessibleCourseIds.includes(notice.courseId)
  );

  return (
    <div id="vl-notices-view" className="max-w-3xl mx-auto py-4 sm:py-6 space-y-6">
      {/* Topo Limpo */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#ea580c]" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Avisos
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          Acompanhe novidades, materiais e novas aulas dos seus cursos liberados.
        </p>
      </div>

      {/* Lista de Avisos Filtrada */}
      {studentNotices.length > 0 ? (
        <div className="space-y-3">
          {studentNotices.map((notice) => (
            <div
              key={notice.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#ea580c] bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                    {notice.title}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {notice.date}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                  {notice.message}
                </p>
              </div>

              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => onGoToCourse(notice.courseId)}
                  className="w-full sm:w-auto py-2 px-4 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <span>Ver curso</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 text-center shadow-xs space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
            <Bell className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-800">
            Você não possui novos avisos.
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Quando houver novos comunicados ou aulas liberadas nos seus cursos matriculados, eles serão exibidos aqui.
          </p>
        </div>
      )}
    </div>
  );
}
