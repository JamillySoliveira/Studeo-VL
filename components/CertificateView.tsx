"use client";

import React, { useState } from "react";
import { Award, Download, CheckCircle2, Clock, Lock, FileText, Check } from "lucide-react";
import { Course, UserProfile } from "@/lib/types";

interface CertificateViewProps {
  user: UserProfile | null;
  course: Course;
  completedLessonsCount: number;
  totalLessonsCount: number;
  onGoToCourse: () => void;
}

export function CertificateView({
  user,
  course,
  completedLessonsCount,
  totalLessonsCount,
  onGoToCourse,
}: CertificateViewProps) {
  const [downloaded, setDownloaded] = useState(false);
  const isAvailable =
    totalLessonsCount > 0 && completedLessonsCount >= totalLessonsCount;

  const studentName =
    user?.displayName ||
    (user?.email ? user.email.split("@")[0] : "Aluno");

  const handleDownload = () => {
    setDownloaded(true);
    // Simula o download / impressão do certificado
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Certificado de Conclusão - ${course.title}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
            .cert-card { background: white; border: 8px double #ea580c; border-radius: 16px; padding: 48px; max-width: 800px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
            h1 { color: #0f172a; font-size: 28px; margin-bottom: 8px; }
            h2 { color: #ea580c; font-size: 20px; font-weight: 600; margin-top: 0; }
            p { color: #475569; font-size: 16px; line-height: 1.6; }
            .student-name { font-size: 24px; font-weight: bold; color: #0f172a; margin: 24px 0 8px; border-bottom: 2px solid #ea580c; display: inline-block; padding: 0 24px 4px; }
            .footer { margin-top: 40px; font-size: 13px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
          </style>
        </head>
        <body>
          <div class="cert-card">
            <h2>VL AUTOMAÇÕES • FORMAÇÃO INDUSTRIAL</h2>
            <h1>CERTIFICADO DE CONCLUSÃO</h1>
            <p>Certificamos com distinção que</p>
            <div class="student-name">${studentName}</div>
            <p>concluiu com êxito todas as etapas teórico-práticas do curso de</p>
            <h3 style="color: #0f172a; font-size: 18px; margin: 16px 0;">${course.title}</h3>
            <p style="font-size: 14px;">Instrutor Responsável: ${course.instructor} • Carga Horária: 40 horas</p>
            <div class="footer">
              Autenticação digital emitida pela plataforma de treinamentos VL AUTOMAÇÕES em ${new Date().toLocaleDateString("pt-BR")}.
            </div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div id="vl-certificate-view" className="max-w-2xl mx-auto space-y-6">
      {/* Topo do Certificado */}
      <div className="space-y-1 text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Seu certificado
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Certificação profissional emitida pela VL AUTOMAÇÕES após a conclusão do treinamento.
        </p>
      </div>

      {/* Card Principal */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
        {/* Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-1">
              Status do certificado
            </span>
            <div className="flex items-center gap-2">
              {isAvailable ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Disponível
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Em andamento
                </span>
              )}
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-slate-400 block mb-1">Progresso</span>
            <span className="text-sm font-bold text-slate-900">
              {completedLessonsCount}/{totalLessonsCount} aulas concluídas
            </span>
          </div>
        </div>

        {/* Informações do Aluno e Curso */}
        <div className="space-y-4 text-xs sm:text-sm text-slate-600">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Aluno
            </span>
            <p className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
              {studentName}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Curso
            </span>
            <p className="font-semibold text-slate-900 mt-0.5">
              {course.title}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Carga horária: 40 horas • Instrutor: {course.instructor}
            </p>
          </div>
        </div>

        {/* Ação: Botão BAIXAR CERTIFICADO ou Orientação de Conclusão */}
        <div className="pt-2">
          {isAvailable ? (
            <button
              id="btn-download-certificate"
              type="button"
              onClick={handleDownload}
              className="w-full py-3.5 px-6 bg-[#ea580c] hover:bg-[#c2410c] text-white text-sm font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>BAIXAR CERTIFICADO</span>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  Certificado bloqueado
                </p>
                <p className="text-slate-500 leading-relaxed">
                  Conclua todas as {totalLessonsCount} aulas e envie as atividades do curso para liberar a emissão do seu certificado oficial.
                </p>
              </div>

              <button
                type="button"
                onClick={onGoToCourse}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Continuar estudando
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
