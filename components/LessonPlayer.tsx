"use client";

import React, { useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Lock,
  Video,
  FileSpreadsheet,
  ArrowLeft,
  Settings,
  Save,
} from "lucide-react";
import { Course, Lesson, UserProfile } from "@/lib/types";
import { getGoogleDriveEmbedUrl } from "@/lib/courseData";

interface LessonPlayerProps {
  course: Course;
  currentLesson: Lesson;
  completedLessons: string[];
  onToggleComplete: (lessonId: string) => void;
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
      setFeedback("Link do Google Drive salvo com sucesso!");
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
      className="p-4 sm:p-5 bg-orange-50/70 border border-orange-200 rounded-2xl space-y-3"
    >
      <div>
        <label
          htmlFor={`input-drive-url-${lessonId}`}
          className="block text-xs font-bold text-slate-800 mb-1"
        >
          Link do vídeo:
        </label>
        <input
          id={`input-drive-url-${lessonId}`}
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="[ cole aqui o link do Google Drive ]"
          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ea580c] shadow-xs"
        />
        <p className="text-[11px] text-slate-500 mt-1">
          Cole o link de visualização ou compartilhamento do arquivo de vídeo no Google Drive.
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
          className="py-2 px-3 bg-white hover:bg-slate-100 text-slate-600 text-xs font-medium rounded-xl border border-slate-200 transition-colors cursor-pointer"
        >
          Cancelar
        </button>
      </div>

      {feedback && (
        <p className="text-xs font-semibold text-emerald-700">{feedback}</p>
      )}
    </form>
  );
}

export function LessonPlayer({
  course,
  currentLesson,
  completedLessons,
  onToggleComplete,
  onSelectLesson,
  onGoToCourse,
  user,
  hasAccess = true,
  onUpdateLessonVideoUrl,
}: LessonPlayerProps) {
  const isAdmin = user?.role === "admin";
  const [isAdminEditing, setIsAdminEditing] = useState(false);

  // Lista linear de todas as aulas em ordem
  const allLessons: Lesson[] = [];
  course.modules.forEach((mod) => {
    mod.lessons.forEach((les) => allLessons.push(les));
  });

  const currentIndex = allLessons.findIndex((l) => l.id === currentLesson.id);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  const isCompleted = completedLessons.includes(currentLesson.id);

  // URL do Google Drive para embed em iframe
  const embedUrl = getGoogleDriveEmbedUrl(currentLesson.videoUrl);

  return (
    <div id="vl-lesson-player-page" className="max-w-4xl mx-auto space-y-5">
      {/* Botão sutil de Voltar aos Módulos e Gestão de Aula (Admin) */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onGoToCourse}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para lista de módulos</span>
        </button>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsAdminEditing(!isAdminEditing)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#ea580c] hover:text-[#c2410c] transition-colors cursor-pointer bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{isAdminEditing ? "Fechar edição" : "Editar link do vídeo"}</span>
            </button>
          )}

          {currentLesson.duration && (
            <span className="text-xs text-slate-400 font-medium">
              Duração: {currentLesson.duration}
            </span>
          )}
        </div>
      </div>

      {/* ================= TÍTULO DA AULA ================= */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          {currentLesson.title}
        </h1>
      </div>

      {/* ================= PAINEL DO ADMINISTRADOR: EDITAR LINK DO GOOGLE DRIVE ================= */}
      {isAdmin && isAdminEditing && (
        <AdminVideoEditor
          key={currentLesson.id}
          lessonId={currentLesson.id}
          initialUrl={currentLesson.videoUrl || ""}
          onSave={async (url) => {
            if (onUpdateLessonVideoUrl) {
              await onUpdateLessonVideoUrl(currentLesson.id, url);
            }
          }}
          onCancel={() => setIsAdminEditing(false)}
        />
      )}

      {/* ================= ÁREA PRINCIPAL DO VÍDEO NO GOOGLE DRIVE ================= */}
      <div
        id="vl-video-container"
        className="w-full bg-slate-950 rounded-2xl overflow-hidden shadow-xs border border-slate-200/80"
      >
        {!hasAccess ? (
          <div className="relative w-full aspect-video flex flex-col items-center justify-center p-6 text-center text-white bg-slate-900">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-[#ea580c]/30 text-[#ea580c] flex items-center justify-center mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white max-w-md">
              Acesso restrito ao curso
            </h3>
            <p className="text-xs text-slate-400 max-w-md mt-1 mb-2">
              Seu usuário não possui permissão ativa para este curso. Solicite a liberação ao administrador da VL Automações.
            </p>
          </div>
        ) : embedUrl ? (
          <div className="relative w-full aspect-video bg-black">
            <iframe
              id="vl-google-drive-iframe"
              src={embedUrl}
              title={currentLesson.title}
              className="absolute inset-0 w-full h-full border-0"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="w-full aspect-video flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-900">
            <Video className="w-10 h-10 text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-200">
              Vídeo no Google Drive aguardando link
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {isAdmin
                ? "Como administrador, clique em 'Editar link do vídeo' acima para inserir o link do Google Drive."
                : "O link do vídeo desta aula estará disponível em breve através do Google Drive."}
            </p>
            {isAdmin && !isAdminEditing && (
              <button
                type="button"
                onClick={() => setIsAdminEditing(true)}
                className="mt-4 px-3.5 py-1.5 bg-[#ea580c] text-white text-xs font-semibold rounded-lg hover:bg-[#c2410c] transition-colors cursor-pointer"
              >
                Inserir link do Google Drive
              </button>
            )}
          </div>
        )}
      </div>

      {/* ================= ABAIXO DO VÍDEO ================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 space-y-5 shadow-xs">
        {/* Descrição Curta */}
        {currentLesson.description && (
          <div className="space-y-1.5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Descrição
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {currentLesson.description}
            </p>
          </div>
        )}

        {/* Materiais da Aula: Google Forms */}
        {currentLesson.formUrl && (
          <div className="pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#ea580c] flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Atividade prática da aula
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Formulário de verificação no Google Forms
                  </p>
                </div>
              </div>

              {hasAccess ? (
                <a
                  href={currentLesson.formUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 transition-colors shrink-0"
                >
                  <span>Abrir formulário</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              ) : (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Requer liberação
                </span>
              )}
            </div>
          </div>
        )}

        {/* Botão Marcar como Concluída & Navegação */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Marcar como concluída */}
          {hasAccess ? (
            <button
              id="btn-toggle-completed"
              type="button"
              onClick={() => onToggleComplete(currentLesson.id)}
              className={`py-2.5 px-5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                isCompleted
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100/70"
                  : "bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-xs"
              }`}
            >
              {isCompleted ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Aula concluída</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Marcar como concluída</span>
                </>
              )}
            </button>
          ) : (
            <div />
          )}

          {/* Navegação: Aula anterior e Próxima aula */}
          <div className="flex items-center gap-2">
            {prevLesson && (
              <button
                type="button"
                onClick={() => onSelectLesson(prevLesson)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer flex-1 sm:flex-initial"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>
            )}

            {nextLesson ? (
              <button
                id="btn-next-lesson"
                type="button"
                onClick={() => onSelectLesson(nextLesson)}
                className="py-2.5 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer flex-1 sm:flex-initial"
              >
                <span>Próxima aula</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onGoToCourse}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex-1 sm:flex-initial"
              >
                Concluir curso
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
