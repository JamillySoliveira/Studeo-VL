"use client";

import React, { useState } from "react";
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

interface LessonPlayerProps {
  course: Course;
  currentLesson: Lesson;
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
      className="p-4 sm:p-5 bg-orange-50/70 border border-orange-200 rounded-2xl space-y-3"
    >
      <div>
        <label
          htmlFor={`input-drive-url-${lessonId}`}
          className="block text-xs font-bold text-slate-800 mb-1"
        >
          Link do vídeo (YouTube ou Google Drive):
        </label>
        <input
          id={`input-drive-url-${lessonId}`}
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=... ou link do Google Drive"
          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ea580c] shadow-xs"
        />
        <p className="text-[11px] text-slate-500 mt-1">
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
  completedForms = [],
  onToggleComplete,
  onToggleFormComplete,
  onSelectLesson,
  onGoToCourse,
  user,
  hasAccess = true,
  onUpdateLessonVideoUrl,
}: LessonPlayerProps) {
  const isAdmin = user?.role === "admin";
  const [isAdminEditing, setIsAdminEditing] = useState(false);

  // Lista direta das aulas do curso (sem módulos)
  const lessons = course.lessons || [];

  const currentIndex = lessons.findIndex((l) => l.id === currentLesson.id);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  const isCompleted = completedLessons.includes(currentLesson.id);
  const isFormCompleted = completedForms.includes(currentLesson.id);

  // URL do vídeo (YouTube ou Google Drive) para embed em iframe
  const videoSource = currentLesson.videoUrl || currentLesson.youtubeUrl || "";
  const embedUrl = getVideoEmbedUrl(videoSource);
  const currentNumber = String(currentLesson.order || currentIndex + 1).padStart(2, "0");

  return (
    <div id="vl-lesson-player-page" className="max-w-4xl mx-auto space-y-5">
      {/* Botão de Voltar para a Grade do Curso e Gestão de Aula (Admin) */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onGoToCourse}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer py-1 px-2 -ml-2 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para as aulas de {course.title}</span>
        </button>

        {isAdmin && onUpdateLessonVideoUrl && (
          <button
            type="button"
            onClick={() => setIsAdminEditing(!isAdminEditing)}
            className="text-xs font-semibold text-[#ea580c] hover:text-[#c2410c] flex items-center gap-1.5 py-1 px-2.5 rounded-lg border border-orange-200 bg-orange-50/60 cursor-pointer"
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
        {!hasAccess ? (
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
          <iframe
            key={embedUrl}
            src={embedUrl}
            title={currentLesson.title}
            className="w-full h-full border-0"
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
          />
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
      </div>

      {/* ================= INFORMAÇÕES DA AULA ================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 space-y-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold text-[#ea580c] uppercase tracking-wider">
                Aula {currentNumber} • {course.title}
              </span>
              {currentLesson.duration && (
                <span className="text-[11px] text-slate-400 font-medium">
                  • {currentLesson.duration}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
              {currentLesson.title}
            </h1>
          </div>

          {/* Botão de Conclusão da Aula */}
          <button
            type="button"
            onClick={() => onToggleComplete(currentLesson.id)}
            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 shadow-xs ${
              isCompleted
                ? "bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100"
                : "bg-slate-900 hover:bg-black text-white"
            }`}
          >
            {isCompleted ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
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
          <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <FileSpreadsheet className="w-5 h-5 text-slate-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                      Atividade Prática desta Aula (Google Forms)
                    </h4>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isFormCompleted
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}
                    >
                      {isFormCompleted ? "Formulário Concluído" : "Pendente"}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-600 mt-1 leading-relaxed">
                    Responda às questões práticas do Google Forms para fixar o aprendizado. <strong>Requisito obrigatório para atingir 100% de conclusão e liberar o Certificado Oficial.</strong>
                  </p>
                </div>
              </div>

              {/* Botão de Abrir Formulário */}
              <a
                href={currentLesson.formUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-4 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
              >
                <span>Abrir Formulário</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Ação Confiável de Confirmação de Envio */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-200 text-xs">
              <span className="text-[11px] text-slate-600">
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
                      : "bg-white hover:bg-slate-100 text-slate-800 border border-slate-300"
                  }`}
                >
                  {isFormCompleted ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Formulário Concluído</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 text-slate-600" />
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
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Sobre esta aula
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              {currentLesson.description}
            </p>
          </div>
        )}

        {/* Navegação entre Aulas (Anterior / Próxima) */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          {prevLesson ? (
            <button
              type="button"
              onClick={() => onSelectLesson(prevLesson)}
              className="py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
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
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
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
                    ? "bg-orange-50 border border-orange-200 text-slate-900"
                    : "hover:bg-slate-50 border border-transparent text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className={`text-[11px] font-extrabold shrink-0 ${
                      isCurrent ? "text-[#ea580c]" : "text-slate-400"
                    }`}
                  >
                    {num}
                  </span>
                  <span
                    className={`text-xs sm:text-sm truncate ${
                      isCurrent ? "font-bold text-[#ea580c]" : "font-medium"
                    }`}
                  >
                    {les.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {les.duration && (
                    <span className="text-[11px] text-slate-400">
                      {les.duration}
                    </span>
                  )}
                  {isDone ? (
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />
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
