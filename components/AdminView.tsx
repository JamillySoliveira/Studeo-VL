"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Video,
  Users,
  Save,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Search,
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Course, Lesson, UserProfile } from "@/lib/types";
import {
  updateLessonDetails,
  fetchAllUsers,
  toggleUserAccess,
  addModule,
  updateModule,
  deleteModule,
  addLesson,
  updateLesson,
  deleteLesson,
} from "@/lib/courseService";
import { getGoogleDriveEmbedUrl } from "@/lib/courseData";

interface AdminViewProps {
  course: Course;
  onRefreshCourse: () => void;
}

// Subcomponente com key={lesson.id} que inicializa o estado do formulário diretamente
function AdminLessonForm({
  lesson,
  onSave,
}: {
  lesson: Lesson;
  onSave: (details: {
    videoUrl: string;
    formUrl: string;
    title: string;
    duration: string;
  }) => Promise<void>;
}) {
  const [videoUrlInput, setVideoUrlInput] = useState(lesson.videoUrl || "");
  const [formUrlInput, setFormUrlInput] = useState(lesson.formUrl || "");
  const [titleInput, setTitleInput] = useState(lesson.title || "");
  const [durationInput, setDurationInput] = useState(lesson.duration || "");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setFeedback(null);
      await onSave({
        videoUrl: videoUrlInput.trim(),
        formUrl: formUrlInput.trim(),
        title: titleInput.trim(),
        duration: durationInput.trim(),
      });
      setFeedback("Aula e link do Google Drive salvos com sucesso no Firestore!");
      setTimeout(() => setFeedback(null), 4000);
    } catch {
      setFeedback("Erro ao salvar aula. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="border-b border-slate-100 pb-4">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
          Editando Aula
        </span>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          {lesson.title}
        </h2>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Título da Aula */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Título da Aula:
          </label>
          <input
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
          />
        </div>

        {/* CAMPO ESPECÍFICO DO GOOGLE DRIVE: Link do vídeo */}
        <div>
          <label
            htmlFor="admin-video-url-input"
            className="block text-xs font-bold text-slate-900 mb-1"
          >
            Link do vídeo:
          </label>
          <input
            id="admin-video-url-input"
            type="text"
            value={videoUrlInput}
            onChange={(e) => setVideoUrlInput(e.target.value)}
            placeholder="[ cole aqui o link do Google Drive ]"
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ea580c] shadow-xs"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Insira o link de visualização ou compartilhamento do vídeo no Google Drive.
          </p>
        </div>

        {/* Duração & Formulário do Google Forms */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Duração estimada:
            </label>
            <input
              type="text"
              value={durationInput}
              onChange={(e) => setDurationInput(e.target.value)}
              placeholder="Ex: 24 min"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Link do Google Forms (Atividade):
            </label>
            <input
              type="text"
              value={formUrlInput}
              onChange={(e) => setFormUrlInput(e.target.value)}
              placeholder="https://docs.google.com/forms/..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
            />
          </div>
        </div>

        {/* Botão Salvar Aula */}
        <div className="pt-2 flex items-center justify-between">
          <button
            type="submit"
            disabled={saving}
            className="py-2.5 px-5 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Salvando..." : "Salvar aula"}</span>
          </button>

          {videoUrlInput && (
            <a
              href={getGoogleDriveEmbedUrl(videoUrlInput)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
            >
              <span>Testar visualização</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </form>
    </div>
  );
}

export function AdminView({ course, onRefreshCourse }: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<"lessons" | "users">("lessons");

  // Estados de gestão de aulas
  const [selectedLessonId, setSelectedLessonId] = useState<string>(
    course.modules[0]?.lessons[0]?.id || ""
  );

  // Estados de criação e edição de módulos
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");
  const [savingModule, setSavingModule] = useState(false);

  // Estados de criação de aulas
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [newLessonModuleId, setNewLessonModuleId] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonDuration, setNewLessonDuration] = useState("");
  const [newLessonVideoUrl, setNewLessonVideoUrl] = useState("");
  const [newLessonFormUrl, setNewLessonFormUrl] = useState("");
  const [savingLesson, setSavingLesson] = useState(false);

  // Estados de gestão de usuários
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [userFeedback, setUserFeedback] = useState<string | null>(null);

  // Localiza a aula selecionada
  const currentLesson: Lesson | undefined = React.useMemo(() => {
    for (const mod of course.modules) {
      const found = mod.lessons.find((l) => l.id === selectedLessonId);
      if (found) return found;
    }
    return course.modules[0]?.lessons[0];
  }, [course, selectedLessonId]);

  // Carrega a lista de usuários ao abrir a aba
  useEffect(() => {
    if (activeTab !== "users") return;
    let isMounted = true;
    setLoadingUsers(true);

    fetchAllUsers()
      .then((data) => {
        if (isMounted) {
          setUsers(data);
          setLoadingUsers(false);
        }
      })
      .catch((err) => {
        console.warn("Erro ao buscar usuários:", err);
        if (isMounted) setLoadingUsers(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  // Salva os dados da aula no Firestore
  const handleSaveLesson = async (details: {
    videoUrl: string;
    formUrl: string;
    title: string;
    duration: string;
  }) => {
    if (!currentLesson) return;
    await updateLessonDetails(currentLesson.id, details);
    onRefreshCourse();
  };

  // Abre o formulário para criar um novo módulo
  const handleNewModule = () => {
    setEditingModuleId(null);
    setModuleTitle("");
    setModuleDescription("");
    setShowModuleForm(true);
  };

  // Abre o formulário para editar um módulo existente
  const handleEditModule = (moduleId: string) => {
    const module = course.modules.find((mod) => mod.id === moduleId);
    if (!module) return;

    setEditingModuleId(module.id);
    setModuleTitle(module.title);
    setModuleDescription(module.description || "");
    setShowModuleForm(true);
  };

  // Fecha o formulário de módulo e limpa os campos
  const handleCloseModuleForm = () => {
    setShowModuleForm(false);
    setEditingModuleId(null);
    setModuleTitle("");
    setModuleDescription("");
  };

  // Salva ou atualiza um módulo
  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!moduleTitle.trim()) return;

    try {
      setSavingModule(true);

      if (editingModuleId) {
        await updateModule(editingModuleId, {
          title: moduleTitle.trim(),
          description: moduleDescription.trim(),
        });
      } else {
        const newModuleId = `mod-${Date.now()}`;

        await addModule(course.id, {
          id: newModuleId,
          courseId: course.id,
          title: moduleTitle.trim(),
          description: moduleDescription.trim(),
          order: course.modules.length + 1,
          lessons: [],
        });
      }

      handleCloseModuleForm();
      onRefreshCourse();
    } catch (error) {
      console.error("Erro ao salvar módulo:", error);
      alert("Não foi possível salvar o módulo.");
    } finally {
      setSavingModule(false);
    }
  };

  // Exclui um módulo
  const handleDeleteModule = async (moduleId: string) => {
    const module = course.modules.find((mod) => mod.id === moduleId);
    if (!module) return;

    const confirmed = window.confirm(
      `Excluir o módulo "${module.title}"?\n\nAs aulas desse módulo também serão removidas.`
    );

    if (!confirmed) return;

    try {
      await deleteModule(moduleId);

      if (selectedLessonId && module.lessons.some((lesson) => lesson.id === selectedLessonId)) {
        setSelectedLessonId("");
      }

      onRefreshCourse();
    } catch (error) {
      console.error("Erro ao excluir módulo:", error);
      alert("Não foi possível excluir o módulo.");
    }
  };

  // Abre o formulário para criar uma nova aula
  const handleNewLesson = (moduleId: string) => {
    setNewLessonModuleId(moduleId);
    setNewLessonTitle("");
    setNewLessonDuration("");
    setNewLessonVideoUrl("");
    setNewLessonFormUrl("");
    setShowLessonForm(true);
  };

  // Fecha o formulário de nova aula
  const handleCloseLessonForm = () => {
    setShowLessonForm(false);
    setNewLessonModuleId(null);
    setNewLessonTitle("");
    setNewLessonDuration("");
    setNewLessonVideoUrl("");
    setNewLessonFormUrl("");
  };

  // Salva uma nova aula
  const handleSaveNewLesson = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newLessonModuleId || !newLessonTitle.trim()) return;

    const module = course.modules.find((mod) => mod.id === newLessonModuleId);
    if (!module) return;

    try {
      setSavingLesson(true);

      const newLessonId = `lesson-${Date.now()}`;

      await addLesson({
        id: newLessonId,
        courseId: course.id,
        moduleId: newLessonModuleId,
        title: newLessonTitle.trim(),
        description: "",
        videoUrl: newLessonVideoUrl.trim(),
        formUrl: newLessonFormUrl.trim(),
        duration: newLessonDuration.trim(),
        order: module.lessons.length + 1,
      });

      setSelectedLessonId(newLessonId);
      handleCloseLessonForm();
      onRefreshCourse();
    } catch (error) {
      console.error("Erro ao criar aula:", error);
      alert("Não foi possível criar a aula.");
    } finally {
      setSavingLesson(false);
    }
  };

  // Exclui uma aula
  const handleDeleteLesson = async (lessonId: string) => {
    const confirmed = window.confirm(
      "Tem certeza que deseja excluir esta aula?"
    );

    if (!confirmed) return;

    try {
      await deleteLesson(lessonId);
      setSelectedLessonId("");
      onRefreshCourse();
    } catch (error) {
      console.error("Erro ao excluir aula:", error);
      alert("Não foi possível excluir a aula.");
    }
  };
  // Bloqueia ou libera o acesso de um aluno
const handleToggleAccess = async (user: UserProfile) => {
  try {
    setUpdatingUserId(user.uid);
    setUserFeedback(null);

    const newAccessEnabled = user.accessEnabled === false;

    await toggleUserAccess(user.uid, newAccessEnabled);

    // Atualiza a lista local imediatamente
    setUsers((currentUsers) =>
      currentUsers.map((item) =>
        item.uid === user.uid
          ? {
              ...item,
              accessEnabled: newAccessEnabled,
            }
          : item
      )
    );

    setUserFeedback(
      newAccessEnabled
        ? `Acesso de ${user.displayName || user.email || "aluno"} liberado com sucesso.`
        : `Acesso de ${user.displayName || user.email || "aluno"} bloqueado com sucesso.`
    );

    setTimeout(() => setUserFeedback(null), 4000);
  } catch (error) {
    console.error("Erro ao alterar acesso do usuário:", error);
    setUserFeedback("Não foi possível alterar o acesso do aluno.");
  } finally {
    setUpdatingUserId(null);
  }
};

  // Filtra usuários pela busca
  const filteredUsers = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.displayName?.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div id="vl-admin-view" className="max-w-4xl mx-auto space-y-6">
      {/* Topo do Painel Administrativo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-[#ea580c] uppercase tracking-wider block mb-0.5">
            Administração • VL Automações
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Painel Administrativo
          </h1>
        </div>

        {/* Abas de Navegação do Painel */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("lessons")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "lessons"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Video className="w-3.5 h-3.5 text-[#ea580c]" />
            <span>Vídeos no Google Drive</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "users"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>Controle de Acessos</span>
          </button>
        </div>
      </div>

      {/* ================= ABA 1: VÍDEOS NO GOOGLE DRIVE E AULAS ================= */}
      {activeTab === "lessons" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna Esquerda: Seletor de Módulos e Aulas */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Grade de Aulas
              </h2>

              <button
                type="button"
                onClick={handleNewModule}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#ea580c] hover:bg-[#c2410c] text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo módulo
              </button>
            </div>

            {/* Formulário de módulo */}
            {showModuleForm && (
              <form
                onSubmit={handleSaveModule}
                className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingModuleId ? "Editar módulo" : "Novo módulo"}
                  </h3>

                  <button
                    type="button"
                    onClick={handleCloseModuleForm}
                    className="p-1 text-slate-400 hover:text-slate-900 cursor-pointer"
                    title="Fechar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nome do módulo:
                  </label>
                  <input
                    type="text"
                    value={moduleTitle}
                    onChange={(e) => setModuleTitle(e.target.value)}
                    placeholder="Ex: Fundamentos de CLP"
                    required
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Descrição:
                  </label>
                  <textarea
                    value={moduleDescription}
                    onChange={(e) => setModuleDescription(e.target.value)}
                    placeholder="Descrição do conteúdo do módulo"
                    rows={3}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ea580c] resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCloseModuleForm}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={savingModule}
                    className="px-3 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold rounded-lg disabled:opacity-60 cursor-pointer"
                  >
                    {savingModule ? "Salvando..." : "Salvar módulo"}
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {course.modules.length === 0 ? (
                <div className="py-8 text-center">
                  <FolderOpen className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">
                    Nenhum módulo cadastrado.
                  </p>
                  <button
                    type="button"
                    onClick={handleNewModule}
                    className="mt-3 text-xs font-bold text-[#ea580c] hover:text-[#c2410c] cursor-pointer"
                  >
                    Criar primeiro módulo
                  </button>
                </div>
              ) : (
                course.modules.map((mod, modIdx) => (
                  <div key={mod.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1 min-w-0">
                        <FolderOpen className="w-3 h-3 text-[#ea580c] shrink-0" />
                        <span className="truncate">
                          Módulo {modIdx + 1}: {mod.title}
                        </span>
                      </span>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditModule(mod.id)}
                          title="Editar módulo"
                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteModule(mod.id)}
                          title="Excluir módulo"
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      {mod.lessons.map((les) => {
                        const isSelected = les.id === selectedLessonId;
                        const hasVideo = !!les.videoUrl;

                        return (
                          <div
                            key={les.id}
                            className={`w-full rounded-xl text-left text-xs transition-all flex items-center gap-1.5 ${
                              isSelected
                                ? "bg-orange-50 border border-orange-200"
                                : "hover:bg-slate-50 border border-transparent"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedLessonId(les.id)}
                              className="min-w-0 flex-1 p-2.5 text-left flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <span
                                className={`truncate flex-1 ${
                                  isSelected
                                    ? "font-bold text-slate-900"
                                    : "text-slate-700"
                                }`}
                              >
                                {les.title}
                              </span>

                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  hasVideo ? "bg-emerald-500" : "bg-slate-300"
                                }`}
                                title={
                                  hasVideo
                                    ? "Vídeo configurado"
                                    : "Sem link do Drive"
                                }
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteLesson(les.id)}
                              title="Excluir aula"
                              className="p-2 mr-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleNewLesson(mod.id)}
                      className="w-full mt-2 py-2 border border-dashed border-slate-300 hover:border-orange-300 hover:bg-orange-50 text-slate-500 hover:text-[#ea580c] text-[11px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Nova aula
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Coluna Direita: Formulário de Edição da Aula com key={currentLesson.id} */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-xs">
            {showLessonForm ? (
              <form
                onSubmit={handleSaveNewLesson}
                className="space-y-5"
              >
                <div className="border-b border-slate-100 pb-4 flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Nova Aula
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                      Criar nova aula
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={handleCloseLessonForm}
                    className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                    title="Cancelar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-500">
                  Módulo selecionado:{" "}
                  <strong className="text-slate-700">
                    {course.modules.find((m) => m.id === newLessonModuleId)?.title ||
                      "Módulo"}
                  </strong>
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Título da Aula:
                  </label>
                  <input
                    type="text"
                    value={newLessonTitle}
                    onChange={(e) => setNewLessonTitle(e.target.value)}
                    placeholder="Ex: Introdução ao Studio 5000"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">
                    Link do vídeo:
                  </label>
                  <input
                    type="text"
                    value={newLessonVideoUrl}
                    onChange={(e) => setNewLessonVideoUrl(e.target.value)}
                    placeholder="[ cole aqui o link do Google Drive ]"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ea580c] shadow-xs"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Insira o link de visualização ou compartilhamento do vídeo no Google Drive.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Duração estimada:
                    </label>
                    <input
                      type="text"
                      value={newLessonDuration}
                      onChange={(e) => setNewLessonDuration(e.target.value)}
                      placeholder="Ex: 24 min"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Link do Google Forms (Atividade):
                    </label>
                    <input
                      type="text"
                      value={newLessonFormUrl}
                      onChange={(e) => setNewLessonFormUrl(e.target.value)}
                      placeholder="https://docs.google.com/forms/..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCloseLessonForm}
                    className="py-2.5 px-4 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={savingLesson}
                    className="py-2.5 px-5 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingLesson ? "Salvando..." : "Criar aula"}</span>
                  </button>
                </div>
              </form>
            ) : currentLesson ? (
              <AdminLessonForm
                key={currentLesson.id}
                lesson={currentLesson}
                onSave={handleSaveLesson}
              />
            ) : (
              <div className="py-12 text-center">
                <Video className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-xs text-slate-400">
                  Selecione uma aula para editar ou crie uma nova aula.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= ABA 2: CONTROLE DE ACESSO DOS USUÁRIOS ================= */}
      {activeTab === "users" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Controle de Acessos dos Alunos
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Gerencie quem pode acessar os cursos e aulas na plataforma.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Buscar por nome ou e-mail..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
              />
            </div>
          </div>

          {userFeedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{userFeedback}</span>
            </div>
          )}

          {loadingUsers ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Carregando lista de alunos...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Nenhum aluno encontrado. Novos alunos cadastrados com Google aparecerão aqui automaticamente.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredUsers.map((u) => {
                const isBlocked = u.accessEnabled === false;
                const isUserAdmin = u.role === "admin";
                const isUpdating = updatingUserId === u.uid;

                return (
                  <div
                    key={u.uid}
                    className="py-3.5 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {u.displayName || "Aluno"}
                        </span>
                        {isUserAdmin && (
                          <span className="text-[10px] font-bold text-[#ea580c] bg-orange-50 border border-orange-200 px-1.5 py-0.2 rounded-md">
                            Admin
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 truncate block">
                        {u.email}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                          isBlocked
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {isBlocked ? "Bloqueado" : "Acesso Ativo"}
                      </span>

                      {!isUserAdmin && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleToggleAccess(u)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer disabled:opacity-50 ${
                            isBlocked
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                              : "bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 border-slate-200"
                          }`}
                        >
                          {isUpdating
                            ? "Alterando..."
                            : isBlocked
                            ? "Liberar Acesso"
                            : "Bloquear"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
