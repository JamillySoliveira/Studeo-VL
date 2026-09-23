"use client";

import React from "react";
import { Award, BookOpen, Clock, Download, CheckCircle2 } from "lucide-react";
import { Course, UserProfile } from "@/lib/types";

interface CertificateViewProps {
  user: UserProfile | null;
  course: Course;
  enrolledCourses?: Course[];
  onSelectCourse?: (courseId: string) => void;
  completedLessonsCount: number;
  totalLessonsCount: number;
  onGoToCourse: () => void;
}

/**
 * Aba de Certificado da Plataforma VL Automações
 *
 * Exibe o status de liberação do certificado de forma limpa e direta:
 * - Se o curso ainda não estiver concluído: "Certificado disponível após a conclusão do curso."
 * - Quando concluído (100%) e o certificado estiver cadastrado pelo administrador:
 *   Exibe "✓ Curso concluído", "Seu certificado está disponível." e o botão "🏆 BAIXAR CERTIFICADO".
 */
export function CertificateView({
  course,
  enrolledCourses = [],
  onSelectCourse,
  completedLessonsCount,
  totalLessonsCount,
  onGoToCourse,
}: CertificateViewProps) {
  // Verifica se o aluno completou todas as aulas
  const isCompleted =
    totalLessonsCount > 0 && completedLessonsCount >= totalLessonsCount;

  // Verifica se o administrador cadastrou o arquivo do certificado
  const hasCertificateFile = Boolean(course.certificateUrl);

  const handleDownload = () => {
    if (!course.certificateUrl) return;

    // Dispara a abertura ou download do arquivo cadastrado pelo administrador
    const link = document.createElement("a");
    link.href = course.certificateUrl;
    link.download =
      course.certificateFileName || `certificado-${course.id}.pdf`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="vl-certificate-page" className="max-w-2xl mx-auto space-y-6 py-4">
      {/* Seletor de Cursos Matriculados (quando o aluno tiver mais de um) */}
      {enrolledCourses.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">
            Selecione o Curso para o Certificado
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

      {/* Cartão Principal do Certificado */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-10 shadow-xs text-center space-y-6">
        {/* Ícone de Destaque */}
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border ${
            isCompleted
              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
              : "bg-orange-50 text-[#ea580c] border-orange-200"
          }`}
        >
          <Award className="w-8 h-8 stroke-[1.75]" />
        </div>

        {/* Título do Curso */}
        <div className="space-y-1 max-w-lg mx-auto">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {course.title}
          </span>
        </div>

        {/* CASO 1: Curso NÃO Concluído */}
        {!isCompleted && (
          <div className="space-y-5 max-w-md mx-auto">
            <p className="text-base sm:text-lg font-bold text-slate-800">
              Certificado disponível após a conclusão do curso.
            </p>

            <button
              type="button"
              onClick={onGoToCourse}
              className="inline-flex items-center justify-center gap-2 py-3 px-6 bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Clock className="w-4 h-4" />
              <span>Continuar aulas do curso</span>
            </button>
          </div>
        )}

        {/* CASO 2: Curso 100% Concluído e Certificado Cadastrado pelo Administrador */}
        {isCompleted && hasCertificateFile && (
          <div className="space-y-5 max-w-md mx-auto">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-emerald-700 font-bold text-base sm:text-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>✓ Curso concluído</span>
              </div>
              <p className="text-sm font-semibold text-slate-700">
                Seu certificado está disponível.
              </p>
            </div>

            <div>
              <button
                type="button"
                onClick={handleDownload}
                className="w-full sm:w-auto py-3.5 px-8 bg-[#ea580c] hover:bg-[#c2410c] text-white text-sm sm:text-base font-extrabold rounded-xl shadow-md flex items-center justify-center gap-2.5 transition-all cursor-pointer mx-auto"
              >
                <Download className="w-4 h-4" />
                <span>🏆 BAIXAR CERTIFICADO</span>
              </button>
            </div>
          </div>
        )}

        {/* CASO 3: Curso 100% Concluído, mas Administrador ainda não cadastrou o arquivo */}
        {isCompleted && !hasCertificateFile && (
          <div className="space-y-3 max-w-md mx-auto">
            <div className="inline-flex items-center gap-1.5 text-emerald-700 font-bold text-base sm:text-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>✓ Curso concluído</span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              O certificado estará disponível assim que o arquivo for disponibilizado pelo administrador.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
