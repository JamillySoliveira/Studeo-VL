"use client";

/**
 * =======================================================================
 * REPRODUTOR DE AULAS E ATIVIDADES (PLAYER) - VL AUTOMAÇÕES
 * =======================================================================
 *
 * Responsável pela experiência de estudo do aluno:
 * 1. Reprodução de Vídeos:
 *    - Carrega vídeos do YouTube ou Google Drive com conversão para formato iframe embed.
 * 2. Atividades no Google Forms:
 *    - Permite abrir a atividade em nova aba e registrar a confirmação manual do envio.
 * 3. Registro de Progresso:
 *    - Botões para o aluno marcar a aula e a atividade como concluídas após o estudo.
 * 4. Navegação:
 *    - Botões de "Aula Anterior" e "Próxima Aula", além da lista lateral de aulas do curso.
 * 5. Ferramenta de Administrador:
 *    - Se o usuário for administrador (`role === "admin"`), permite atualizar o link do vídeo
 *      diretamente no player, sem necessidade de sair da tela de estudo.
 */

import React, { useState, useEffect } from "react";
import {
  Check,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Lock,
  Video,
  FileSpreadsheet,
  ArrowLeft,
  Settings,
  Save,
  ExternalLink,
} from "lucide-react";
import { Course, Lesson, UserProfile } from "@/lib/types";
import { getVideoEmbedUrl } from "@/lib/courseData";
import { isDemoUser } from "@/lib/courseService";

/**
 * Mascara parcialmente o e-mail do aluno para a marca d'água de proteção.
 * Exemplo: joaosilva@gmail.com -> jo***@gmail.com
 */
function maskEmail(email?: string | null): string {
  if (!email) return "";
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) return "***";
  const userPart = email.slice(0, atIndex);
  const domainPart = email.slice(atIndex);
  if (userPart.length <= 2) {
    return `${userPart.charAt(0)}***${domainPart}`;
  }
  return `${userPart.slice(0, 2)}***${domainPart}`;
}

interface LessonPlayerProps {
  course: Course;
  currentLesson: Lesson | null;
  completedLessons: string[];
  completedForms?: string[];
  onToggleComplete: (lessonId: string) => void;
  onToggleFormComplete?: (lessonId: string) => void;
  onSelectLesson: (lesson: Lesson) => void;
  onGoToCourse: () => void;
  user?: UserProfile | null;
  hasAccess?: boolean;
  onUpdateLessonVideoUrl?: (lessonId: string, videoUrl: string) => Promise<void>;
}

// Subcomponente com key={currentLesson.id} para gerenciar o estado da edição sem useEffect
function AdminVideoEditor({
  initialUrl,
  lessonId,
  onSave,
  onCancel,
}: {
  initialUrl: string;
  lessonId: string;
  onSave: (url: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setFeedback(null);
      await onSave(url.trim());
      setFeedback("Link do vídeo salvo com sucesso!");
      setTimeout(() => {
        setFeedback(null);
        onCancel();
      }, 1500);
    } catch {
      setFeedback("Erro ao salvar o link. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 sm:p-5 bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 rounded-2xl space-y-3 transition-colors"
    >
      <div>
        <label
          htmlFor={`input-drive-url-${lessonId}`}
          className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1"
        >
          Link do vídeo (YouTube ou Google Drive):
        </label>
        <input
          id={`input-drive-url-${lessonId}`}
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=... ou link do Google Drive"
          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#ea580c] shadow-xs"
        />
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
          Cole o link do YouTube (watch, youtu.be, embed) ou o link de compartilhamento do Google Drive.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="py-2 px-4 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? "Salvando..." : "Salvar aula"}</span>
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="py-2 px-3 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
        >
          Cancelar
        </button>
      </div>

      {feedback && (
        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{feedback}</p>
      )}
    </form>
  );
}

export function LessonPlayer({
  course,
  currentLesson,
  completedLessons,
  completedForms = [],
  onToggleComplete,
  onToggleFormComplete,
  onSelectLesson,
  onGoToCourse,
  user,
  hasAccess = true,
  onUpdateLessonVideoUrl,
}: LessonPlayerProps) {
  const isDemo = isDemoUser(user);
  const isAdmin = user?.role === "admin" && !isDemo;
  const [isAdminEditing, setIsAdminEditing] = useState(false);

  // =======================================================================
  // CAMADA DE SEGURANÇA E PROTEÇÃO (MARCA D'ÁGUA E BLOQUEIO SEGURO)
  // =======================================================================
  // Estado para interrupção de reprodução caso haja sinal confiável de captura de tela
  const [isPlaybackInterrupted, setIsPlaybackInterrupted] = useState(false);
  // Posição alternada discreta da marca d'água sobre o vídeo
  const [watermarkPosIndex, setWatermarkPosIndex] = useState(0);

  // Alterna suavemente a posição da marca d'água a cada 25 segundos sem impacto de performance
  useEffect(() => {
    const timer = setInterval(() => {
      setWatermarkPosIndex((prev) => (prev + 1) % 4);
    }, 25000);

    return () => clearInterval(timer);
  }, []);

  const WATERMARK_POSITIONS = [
    "top-3.5 left-3.5 text-left",
    "top-3.5 right-3.5 text-right",
    "bottom-10 right-3.5 text-right",
    "bottom-10 left-3.5 text-left",
  ];
  const currentWatermarkPos = WATERMARK_POSITIONS[watermarkPosIndex] || WATERMARK_POSITIONS[0];

  // Lista direta das aulas do curso (sem módulos)
  const lessons = course.lessons || [];

  if (!currentLesson || !currentLesson.id || lessons.length === 0) {
    return (
      <div id="vl-lesson-player-empty" className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 sm:p-12 shadow-xs space-y-4">
          <Video className="w-12 h-12 text-slate-400 mx-auto" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Nenhuma aula cadastrada
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Este curso ainda não possui aulas cadastradas no momento.
          </p>
          <button
            type="button"
            onClick={onGoToCourse}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para as aulas de {course.title}</span>
          </button>
        </div>
      </div>
    );
  }

  const currentIndex = lessons.findIndex((l) => l.id === currentLesson.id);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  const isCompleted = completedLessons.includes(currentLesson.id);
  const isFormCompleted = completedForms.includes(currentLesson.id);

  // URL do vídeo (YouTube ou Google Drive) para embed em iframe (bloqueada para Aluno Demonstração)
  const videoSource = isDemo ? "" : (currentLesson.videoUrl || currentLesson.youtubeUrl || "");
  const embedUrl = isDemo ? "" : getVideoEmbedUrl(videoSource);
  const currentNumber = String(currentLesson.order || currentIndex + 1).padStart(2, "0");

  return (
    <div id="vl-lesson-player-page" className="max-w-4xl mx-auto space-y-5">
      {/* Botão de Voltar para a Grade do Curso e Gestão de Aula (Admin) */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onGoToCourse}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer py-1 px-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para as aulas de {course.title}</span>
        </button>

        {isAdmin && onUpdateLessonVideoUrl && (
          <button
            type="button"
            onClick={() => setIsAdminEditing(!isAdminEditing)}
            className="text-xs font-semibold text-[#ea580c] hover:text-[#c2410c] flex items-center gap-1.5 py-1 px-2.5 rounded-lg border border-orange-200 dark:border-orange-900/60 bg-orange-50/60 dark:bg-orange-950/40 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>
              {isAdminEditing ? "Fechar edição" : "Editar link do vídeo (Admin)"}
            </span>
          </button>
        )}
      </div>

      {/* Editor Rápido do Link do Google Drive para Administradores */}
      {isAdmin && isAdminEditing && onUpdateLessonVideoUrl && (
        <AdminVideoEditor
          key={currentLesson.id}
          initialUrl={currentLesson.videoUrl}
          lessonId={currentLesson.id}
          onSave={async (url) => {
            await onUpdateLessonVideoUrl(currentLesson.id, url);
          }}
          onCancel={() => setIsAdminEditing(false)}
        />
      )}

      {/* ================= REPRODUTOR DE VÍDEO (GOOGLE DRIVE) ================= */}
      <div
        id="vl-video-container"
        className="relative w-full aspect-video bg-slate-950 rounded-2xl overflow-hidden shadow-lg border border-slate-800"
      >
        {isDemo ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900/95 text-white space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-amber-400">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold">Conteúdo Restrito — Modo Demonstração</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Esta é uma conta de demonstração. O acesso aos vídeos das aulas é reservado exclusivamente para alunos matriculados nos cursos da VL Automações.
            </p>
            <p className="text-[11px] text-slate-500 max-w-xs">
              Para conhecer a plataforma, utilize o botão de suporte no canto inferior direito para assistir ao vídeo explicativo.
            </p>
          </div>
        ) : !hasAccess ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900/95 text-white space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-amber-400">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold">Conteúdo Restrito</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Você não possui permissão ativa para assistir a este curso. Entre em contato com a administração da VL Automações.
            </p>
          </div>
        ) : embedUrl ? (
          <>
            <iframe
              key={embedUrl}
              src={embedUrl}
              title={currentLesson.title}
              className="w-full h-full border-0"
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
            />

            {/* Marca d'água dinâmica do aluno com baixa opacidade e sem bloquear controles */}
            {user && !isDemo && hasAccess && !isPlaybackInterrupted && (
              <div
                id="vl-player-watermark"
                className={`absolute z-20 pointer-events-none select-none transition-all duration-1000 ease-in-out px-2.5 py-1 rounded-md bg-black/25 dark:bg-black/40 backdrop-blur-[0.5px] border border-white/5 text-[10px] sm:text-xs text-white/35 font-mono tracking-tight leading-tight shadow-xs ${currentWatermarkPos}`}
                style={{ userSelect: "none" }}
              >
                <div className="font-semibold text-white/45 truncate max-w-[200px] sm:max-w-[260px]">
                  Aluno: {user.displayName || "Aluno"}
                </div>
                {user.email && (
                  <div className="text-white/35 truncate max-w-[200px] sm:max-w-[260px]">
                    {maskEmail(user.email)}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900 text-slate-400 space-y-3">
            <Video className="w-12 h-12 text-slate-700 stroke-[1.5]" />
            <p className="text-sm font-semibold text-slate-300">
              Vídeo em processamento pelo instrutor
            </p>
            <p className="text-xs text-slate-500 max-w-sm">
              O link do vídeo (YouTube ou Google Drive) será configurado em breve. Você pode adiantar a leitura da descrição e a atividade prática.
            </p>
          </div>
        )}

        {/* ================= CAMADA DE SEGURANÇA: OVERLAY DE INTERRUPÇÃO ================= */}
        {isPlaybackInterrupted && (
          <div
            id="vl-security-overlay"
            className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center bg-slate-950/95 text-white space-y-4 backdrop-blur-xs animate-in fade-in duration-200"
          >
            <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Reprodução interrompida
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Por segurança, a reprodução desta aula foi interrompida.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPlaybackInterrupted(false)}
              className="py-2.5 px-5 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer shadow-md"
            >
              Voltar para a aula
            </button>
          </div>
        )}
      </div>

      {/* ================= INFORMAÇÕES DA AULA ================= */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 space-y-5 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold text-[#ea580c] uppercase tracking-wider">
                Aula {currentNumber} • {course.title}
              </span>
              {currentLesson.duration && (
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  • {currentLesson.duration}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
              {currentLesson.title}
            </h1>
          </div>

          {/* Botão de Conclusão da Aula */}
          <button
            type="button"
            onClick={() => onToggleComplete(currentLesson.id)}
            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 shadow-xs ${
              isCompleted
                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/70"
                : "bg-slate-900 hover:bg-black dark:bg-[#ea580c] dark:hover:bg-[#c2410c] text-white"
            }`}
          >
            {isCompleted ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Aula concluída</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Marcar como concluída</span>
              </>
            )}
          </button>
        </div>

        {/* Atividade Prática Obrigatória no Google Forms */}
        {currentLesson.formUrl && (
          <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3.5 shadow-xs transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <FileSpreadsheet className="w-5 h-5 text-slate-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                      Atividade Prática desta Aula (Google Forms)
                    </h4>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isFormCompleted
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                          : "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                      }`}
                    >
                      {isFormCompleted ? "Formulário Concluído" : "Pendente"}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Responda às questões práticas do Google Forms para fixar o aprendizado. <strong>Requisito obrigatório para atingir 100% de conclusão e liberar o Certificado Oficial.</strong>
                  </p>
                </div>
              </div>

              {/* Botão de Abrir Formulário */}
              <a
                href={currentLesson.formUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-4 bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 dark:border dark:border-slate-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
              >
                <span>Abrir Formulário</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Ação Confiável de Confirmação de Envio */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-[11px] text-slate-600 dark:text-slate-400">
                {isFormCompleted
                  ? "✓ Formulário registrado como respondido nesta aula."
                  : "Após enviar suas respostas no Google Forms, confirme abaixo para registrar seu progresso:"}
              </span>

              {onToggleFormComplete && (
                <button
                  type="button"
                  onClick={() => onToggleFormComplete(currentLesson.id)}
                  className={`py-2 px-3.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 shadow-xs flex items-center justify-center gap-1.5 text-xs ${
                    isFormCompleted
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700"
                  }`}
                >
                  {isFormCompleted ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Formulário Concluído</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                      <span>Confirmar Envio do Formulário</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Descrição e Objetivos da Aula */}
        {currentLesson.description && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Sobre esta aula
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {currentLesson.description}
            </p>
          </div>
        )}

        {/* Navegação entre Aulas (Anterior / Próxima) */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          {prevLesson ? (
            <button
              type="button"
              onClick={() => onSelectLesson(prevLesson)}
              className="py-2.5 px-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Aula anterior:</span>
              <span className="truncate max-w-[150px] sm:max-w-[200px]">
                {prevLesson.title}
              </span>
            </button>
          ) : (
            <div />
          )}

          {nextLesson ? (
            <button
              type="button"
              onClick={() => onSelectLesson(nextLesson)}
              className="py-2.5 px-4 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs sm:text-sm font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span className="hidden sm:inline">Próxima aula:</span>
              <span className="truncate max-w-[150px] sm:max-w-[200px]">
                {nextLesson.title}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onGoToCourse}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Ver conclusão do curso</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ================= GRADE LINEAR DE TODAS AS AULAS (SEM MÓDULOS) ================= */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4 transition-colors">
        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Todas as Aulas de {course.title} ({lessons.length})
        </h3>

        <div className="space-y-1.5">
          {lessons.map((les, idx) => {
            const isCurrent = les.id === currentLesson.id;
            const isDone = completedLessons.includes(les.id);
            const num = String(les.order || idx + 1).padStart(2, "0");

            return (
              <button
                key={les.id}
                type="button"
                onClick={() => onSelectLesson(les)}
                className={`w-full p-3 rounded-xl text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                  isCurrent
                    ? "bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60 text-slate-900 dark:text-white"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className={`text-[11px] font-extrabold shrink-0 ${
                      isCurrent ? "text-[#ea580c]" : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {num}
                  </span>
                  <span
                    className={`text-xs sm:text-sm truncate ${
                      isCurrent ? "font-bold text-[#ea580c] dark:text-orange-400" : "font-medium"
                    }`}
                  >
                    {les.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {les.duration && (
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      {les.duration}
                    </span>
                  )}
                  {isDone ? (
                    <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
