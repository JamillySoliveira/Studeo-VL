"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Bell,
  Settings,
  Plus,
  Trash2,
  Edit3,
  ArrowUp,
  ArrowDown,
  Save,
  CheckCircle2,
  X,
  Search,
  ExternalLink,
  Video,
  FileSpreadsheet,
  Clock,
  MessageCircle,
  HelpCircle,
  Check,
  Award,
  Upload,
  FileText,
  Eye,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Course, Lesson, UserProfile } from "@/lib/types";
import {
  getCourseData,
  fetchAllUsers,
  toggleUserAccess,
  updateUserEnrolledCourses,
  addLesson,
  updateLesson,
  deleteLesson,
  saveCourseCertificate,
  removeCourseCertificate,
} from "@/lib/courseService";
import { AVAILABLE_COURSES, getVideoEmbedUrl } from "@/lib/courseData";
import {
  getSavedWhatsAppNumber,
  saveCustomWhatsAppNumber,
  getStoredNotices,
  saveStoredNotice,
  deleteStoredNotice,
  Notice,
  getCourseWhatsAppUrl,
} from "@/lib/constants";

interface AdminViewProps {
  course: Course;
  onRefreshCourse: () => void;
  onSelectCourseId?: (courseId: string) => void;
}

// 5 Abas solicitadas no Painel Administrativo: Dashboard, Cursos, Alunos, Avisos, Configurações
type AdminTab = "dashboard" | "courses" | "students" | "notices" | "settings";

/**
 * Subcomponente isolado para o Formulário de Cadastro e Edição Direta de Aula (sem módulos)
 */
function LessonFormModal({
  lesson,
  isNew,
  courseTitle,
  courseId,
  suggestedOrder,
  onSave,
  onClose,
}: {
  lesson?: Lesson;
  isNew: boolean;
  courseTitle: string;
  courseId: string;
  suggestedOrder: number;
  onSave: (data: {
    title: string;
    description: string;
    videoUrl: string;
    formUrl: string;
    duration: string;
    order: number;
  }) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(lesson?.title || "");
  const [description, setDescription] = useState(lesson?.description || "");
  const [videoUrl, setVideoUrl] = useState(lesson?.videoUrl || "");
  const [formUrl, setFormUrl] = useState(lesson?.formUrl || "");
  const [duration, setDuration] = useState(lesson?.duration || "");
  const [order, setOrder] = useState<number>(lesson?.order || suggestedOrder);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSaving(true);
      setFeedback(null);
      await onSave({
        title: title.trim(),
        description: description.trim(),
        videoUrl: videoUrl.trim(),
        formUrl: formUrl.trim(),
        duration: duration.trim(),
        order: Number(order) || 1,
      });
      setFeedback(isNew ? "Aula cadastrada com sucesso!" : "Aula atualizada com sucesso!");
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar aula.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 my-8 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#ea580c] bg-orange-50 px-2 py-0.5 rounded-md">
              {courseTitle}
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mt-1">
              {isNew ? "+ Nova Aula" : "Editar Aula"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {feedback && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          {/* Título da Aula */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Título da Aula: *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Introdução ao Studio 5000 Logix Designer"
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
            />
          </div>

          {/* Ordem e Duração */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ordem na Grade:
              </label>
              <input
                type="number"
                min={1}
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Duração Estimada:
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Ex: 24 min"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
              />
            </div>
          </div>

          {/* Vídeo do Google Drive ou YouTube */}
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Vídeo do Google Drive (ou YouTube):
            </label>
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Cole o link do Google Drive ou YouTube"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Cole o link de compartilhamento do Google Drive ou o link de um vídeo do YouTube.
            </p>
          </div>

          {/* Google Forms */}
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Formulário Google Forms (Atividade Prática):
            </label>
            <input
              type="text"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="https://docs.google.com/forms/d/e/.../viewform"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Link de resposta do questionário Google Forms para fixação dos conhecimentos.
            </p>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Descrição / Objetivos da Aula:
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Descreva o conteúdo técnico que o aluno aprenderá nesta aula..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ea580c] resize-none"
            />
          </div>

          {/* Botões de Ação */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="py-2.5 px-5 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Salvando..." : isNew ? "Cadastrar Aula" : "Salvar Alterações"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * PAINEL ADMINISTRATIVO DA VL AUTOMAÇÕES
 * Estrutura:
 * - Navegação simples: Dashboard, Cursos, Alunos, Avisos, Configurações
 * - Cursos: Lista direta de aulas sem módulos, edição de aulas e certificado do curso
 * - Alunos: Controle de accessEnabled separado de enrolledCourses com checkboxes
 */
export function AdminView({
  course,
  onRefreshCourse,
  onSelectCourseId,
}: AdminViewProps) {
  // Navegação do Admin: Dashboard, Cursos, Alunos, Avisos, Configurações
  const [adminTab, setAdminTab] = useState<AdminTab>("courses");

  // Curso atualmente selecionado na aba Cursos
  const [selectedCourseId, setSelectedCourseId] = useState<string>(course.id || "rockwell-basico");
  const [activeCourseData, setActiveCourseData] = useState<Course>(course);
  const [loadingCourse, setLoadingCourse] = useState(false);

  // Modal de edição / criação de aula
  const [editingLesson, setEditingLesson] = useState<{
    lesson?: Lesson;
    isNew: boolean;
  } | null>(null);

  // Estados de gestão do Certificado do Curso
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement | null>(null);
  const [certUploading, setCertUploading] = useState(false);
  const [certFeedback, setCertFeedback] = useState<string | null>(null);
  const [certError, setCertError] = useState<string | null>(null);

  // Estados de gestão de alunos
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [updatingAccessUserId, setUpdatingAccessUserId] = useState<string | null>(null);
  const [savingEnrolledUserId, setSavingEnrolledUserId] = useState<string | null>(null);
  const [userFeedback, setUserFeedback] = useState<string | null>(null);

  // Mapa local do rascunho de enrolledCourses por aluno: { [uid]: string[] }
  const [enrolledDrafts, setEnrolledDrafts] = useState<Record<string, string[]>>({});

  // Estados de gestão de avisos
  const [noticesList, setNoticesList] = useState<Notice[]>(() => getStoredNotices());
  const [newNoticeTitle, setNewNoticeTitle] = useState("");
  const [newNoticeMessage, setNewNoticeMessage] = useState("");
  const [newNoticeCourseId, setNewNoticeCourseId] = useState<string>("rockwell-basico");

  // Estados de configurações
  const [customWhatsAppNumber, setCustomWhatsAppNumber] = useState<string>(() =>
    getSavedWhatsAppNumber()
  );
  const [settingsSavedFeedback, setSettingsSavedFeedback] = useState(false);

  const [, startTransition] = useTransition();

  // Recarrega os dados do curso quando o selectedCourseId mudar
  useEffect(() => {
    let isMounted = true;
    getCourseData(selectedCourseId).then((data) => {
      if (isMounted) {
        startTransition(() => {
          setActiveCourseData(data);
          setLoadingCourse(false);
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedCourseId]);

  // Recarrega lista de usuários cadastrados
  useEffect(() => {
    if (adminTab !== "students" && adminTab !== "dashboard") return;
    let isMounted = true;

    fetchAllUsers()
      .then((data) => {
        if (!isMounted) return;
        startTransition(() => {
          setUsers(data);
          const drafts: Record<string, string[]> = {};
          data.forEach((u) => {
            drafts[u.uid] = u.enrolledCourses || ["rockwell-basico"];
          });
          setEnrolledDrafts(drafts);
          setLoadingUsers(false);
        });
      })
      .catch((err) => {
        console.warn("Erro ao buscar usuários:", err);
        if (isMounted) setLoadingUsers(false);
      });

    return () => {
      isMounted = false;
    };
  }, [adminTab]);

  // Alterna o curso na aba Cursos
  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    if (onSelectCourseId) {
      onSelectCourseId(courseId);
    }
  };

  // Salva ou atualiza aula diretamente no Firestore
  const handleSaveLesson = async (data: {
    title: string;
    description: string;
    videoUrl: string;
    formUrl: string;
    duration: string;
    order: number;
  }) => {
    if (!editingLesson) return;

    if (editingLesson.isNew) {
      const newLessonId = `aula-${selectedCourseId}-${Date.now()}`;
      const newLesson: Lesson = {
        id: newLessonId,
        courseId: selectedCourseId,
        title: data.title,
        description: data.description,
        videoUrl: data.videoUrl,
        formUrl: data.formUrl,
        duration: data.duration,
        order: data.order,
      };
      await addLesson(newLesson);
    } else if (editingLesson.lesson) {
      await updateLesson(editingLesson.lesson.id, {
        title: data.title,
        description: data.description,
        videoUrl: data.videoUrl,
        formUrl: data.formUrl,
        duration: data.duration,
        order: data.order,
      });
    }

    const updatedCourse = await getCourseData(selectedCourseId);
    setActiveCourseData(updatedCourse);
    onRefreshCourse();
  };

  // Exclui uma aula
  const handleDeleteLesson = async (lessonId: string, title: string) => {
    const confirmed = window.confirm(`Deseja realmente excluir a aula "${title}"?`);
    if (!confirmed) return;

    try {
      await deleteLesson(lessonId);
      const updatedCourse = await getCourseData(selectedCourseId);
      setActiveCourseData(updatedCourse);
      onRefreshCourse();
    } catch (err) {
      console.error("Erro ao excluir aula:", err);
      alert("Não foi possível excluir a aula.");
    }
  };

  // Altera a ordem de uma aula (Subir ou Descer)
  const handleMoveOrder = async (lessonIndex: number, direction: "up" | "down") => {
    const lessons = [...activeCourseData.lessons];
    const targetIndex = direction === "up" ? lessonIndex - 1 : lessonIndex + 1;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;

    const currentLesson = lessons[lessonIndex];
    const swapLesson = lessons[targetIndex];

    const currentOrder = currentLesson.order || lessonIndex + 1;
    const swapOrder = swapLesson.order || targetIndex + 1;

    try {
      await updateLesson(currentLesson.id, { order: swapOrder });
      await updateLesson(swapLesson.id, { order: currentOrder });
      const updated = await getCourseData(selectedCourseId);
      setActiveCourseData(updated);
      onRefreshCourse();
    } catch (err) {
      console.error("Erro ao reordenar aulas:", err);
    }
  };

  /* ============================================================
     GESTÃO DO CERTIFICADO DO CURSO (ADMINISTRADOR)
     ============================================================ */

  // Upload ou substituição de arquivo de certificado (preferencialmente PDF)
  const handleCertificateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limite de segurança razoável para documento PDF (até 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setCertError("O arquivo do certificado deve ter até 5MB.");
      setTimeout(() => setCertError(null), 4000);
      e.target.value = "";
      return;
    }

    setCertUploading(true);
    setCertFeedback(null);
    setCertError(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Url = reader.result as string;
          await saveCourseCertificate(selectedCourseId, {
            certificateUrl: base64Url,
            certificateFileName: file.name,
            certificateFileSize: formatBytes(file.size),
          });

          const updated = await getCourseData(selectedCourseId);
          startTransition(() => {
            setActiveCourseData(updated);
          });
          onRefreshCourse();

          setCertFeedback(`Certificado "${file.name}" vinculado ao curso com sucesso!`);
          setTimeout(() => setCertFeedback(null), 4500);
        } catch (err) {
          console.error("Erro ao salvar certificado:", err);
          setCertError("Erro ao salvar o arquivo de certificado. Tente novamente.");
        } finally {
          setCertUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
          if (replaceFileInputRef.current) replaceFileInputRef.current.value = "";
        }
      };

      reader.onerror = () => {
        setCertError("Erro ao processar a leitura do arquivo.");
        setCertUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setCertError("Erro inesperado ao fazer upload do certificado.");
      setCertUploading(false);
    }
  };

  // Remoção do certificado cadastrado para o curso
  const handleRemoveCertificate = async () => {
    const confirmed = window.confirm(
      `Deseja realmente remover o arquivo de certificado do curso "${activeCourseData.title}"?\nOs alunos que concluírem o curso verão o aviso de certificado não disponibilizado.`
    );
    if (!confirmed) return;

    setCertUploading(true);
    setCertFeedback(null);
    setCertError(null);

    try {
      await removeCourseCertificate(selectedCourseId);
      const updated = await getCourseData(selectedCourseId);
      startTransition(() => {
        setActiveCourseData(updated);
      });
      onRefreshCourse();

      setCertFeedback("Arquivo de certificado removido com sucesso.");
      setTimeout(() => setCertFeedback(null), 4000);
    } catch (err) {
      console.error(err);
      setCertError("Erro ao remover certificado.");
    } finally {
      setCertUploading(false);
    }
  };

  // Visualização do certificado enviado pelo administrador
  const handleViewCertificate = () => {
    if (!activeCourseData.certificateUrl) return;

    if (activeCourseData.certificateUrl.startsWith("data:")) {
      const win = window.open();
      if (win) {
        win.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Certificado - ${activeCourseData.title}</title>
              <style>
                body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; background: #0f172a; }
                iframe { width: 100%; height: 100%; border: none; }
              </style>
            </head>
            <body>
              <iframe src="${activeCourseData.certificateUrl}"></iframe>
            </body>
          </html>
        `);
        win.document.close();
      }
    } else {
      window.open(activeCourseData.certificateUrl, "_blank");
    }
  };

  // Ativa/Desativa o acesso geral do usuário à plataforma (accessEnabled)
  const handleToggleAccessEnabled = async (targetUser: UserProfile) => {
    try {
      setUpdatingAccessUserId(targetUser.uid);
      setUserFeedback(null);

      const nextAccess = targetUser.accessEnabled === false;
      await toggleUserAccess(targetUser.uid, nextAccess);

      setUsers((prev) =>
        prev.map((u) => (u.uid === targetUser.uid ? { ...u, accessEnabled: nextAccess } : u))
      );

      setUserFeedback(
        nextAccess
          ? `Acesso à plataforma ativado para ${targetUser.displayName || targetUser.email}.`
          : `Acesso à plataforma bloqueado para ${targetUser.displayName || targetUser.email}.`
      );
      setTimeout(() => setUserFeedback(null), 4000);
    } catch (err) {
      console.error(err);
      setUserFeedback("Erro ao atualizar status de acesso do aluno.");
    } finally {
      setUpdatingAccessUserId(null);
    }
  };

  // Alterna checkbox de curso no draft do aluno (enrolledCourses)
  const handleToggleCourseCheckbox = (userId: string, courseId: string) => {
    setEnrolledDrafts((prev) => {
      const current = prev[userId] || [];
      const updated = current.includes(courseId)
        ? current.filter((id) => id !== courseId)
        : [...current, courseId];
      return { ...prev, [userId]: updated };
    });
  };

  // Salva exclusivamente o array enrolledCourses do aluno no Firestore
  const handleSaveEnrolledCourses = async (userId: string, userName: string) => {
    try {
      setSavingEnrolledUserId(userId);
      setUserFeedback(null);

      const targetEnrolled = enrolledDrafts[userId] || [];
      await updateUserEnrolledCourses(userId, targetEnrolled);

      setUsers((prev) =>
        prev.map((u) => (u.uid === userId ? { ...u, enrolledCourses: targetEnrolled } : u))
      );

      setUserFeedback(`Cursos liberados de ${userName} salvos com sucesso no Firestore!`);
      setTimeout(() => setUserFeedback(null), 4000);
    } catch (err) {
      console.error(err);
      setUserFeedback("Erro ao salvar cursos matriculados do aluno.");
    } finally {
      setSavingEnrolledUserId(null);
    }
  };

  // Adiciona novo aviso na aba Avisos
  const handleCreateNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoticeTitle.trim() || !newNoticeMessage.trim()) return;

    const newNotice: Notice = {
      id: `aviso-${Date.now()}`,
      courseId: newNoticeCourseId,
      title: newNoticeTitle.trim(),
      message: newNoticeMessage.trim(),
      date: "Hoje",
    };

    saveStoredNotice(newNotice);
    setNoticesList(getStoredNotices());
    setNewNoticeTitle("");
    setNewNoticeMessage("");
  };

  // Exclui aviso
  const handleDeleteNotice = (noticeId: string) => {
    deleteStoredNotice(noticeId);
    setNoticesList(getStoredNotices());
  };

  // Salva número do WhatsApp nas Configurações
  const handleSaveWhatsAppConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveCustomWhatsAppNumber(customWhatsAppNumber);
    setSettingsSavedFeedback(true);
    setTimeout(() => setSettingsSavedFeedback(false), 3000);
  };

  // Estatísticas para o Dashboard do Admin
  const totalStudents = users.length;
  const activeStudents = users.filter((u) => u.accessEnabled !== false).length;
  const blockedStudents = users.filter((u) => u.accessEnabled === false).length;

  const countBasico = users.filter((u) =>
    (u.enrolledCourses || []).includes("rockwell-basico")
  ).length;
  const countIntermediario = users.filter((u) =>
    (u.enrolledCourses || []).includes("rockwell-intermediario")
  ).length;
  const countAvancado = users.filter((u) =>
    (u.enrolledCourses || []).includes("rockwell-avancado")
  ).length;

  const filteredUsers = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.displayName?.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div id="vl-admin-panel" className="max-w-5xl mx-auto space-y-6">
      {/* Topo do Painel Administrativo */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#ea580c] bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200 inline-block mb-1.5">
            Área do Administrador
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Painel Administrativo
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gerencie diretamente os 3 cursos, suas aulas e as matrículas dos alunos através de <code className="bg-slate-100 text-slate-700 px-1 rounded font-mono text-xs">enrolledCourses</code>.
          </p>
        </div>

        {/* 5 Abas de Navegação Solicitadas */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setAdminTab("dashboard")}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              adminTab === "dashboard"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-[#ea580c]" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setAdminTab("courses")}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              adminTab === "courses"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-[#ea580c]" />
            <span>Cursos</span>
          </button>

          <button
            type="button"
            onClick={() => setAdminTab("students")}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              adminTab === "students"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#ea580c]" />
            <span>Alunos</span>
          </button>

          <button
            type="button"
            onClick={() => setAdminTab("notices")}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              adminTab === "notices"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-[#ea580c]" />
            <span>Avisos</span>
          </button>

          <button
            type="button"
            onClick={() => setAdminTab("settings")}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              adminTab === "settings"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-[#ea580c]" />
            <span>Configurações</span>
          </button>
        </div>
      </div>

      {/* ============================================================
          1. ABA: DASHBOARD ADMINISTRATIVO
          ============================================================ */}
      {adminTab === "dashboard" && (
        <div className="space-y-6">
          {/* Métricas Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Total de Alunos
              </span>
              <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {totalStudents}
              </p>
              <p className="text-xs text-slate-500">
                Alunos registrados na plataforma
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-1">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">
                Acesso Ativo (accessEnabled)
              </span>
              <p className="text-3xl font-extrabold text-emerald-700 tracking-tight">
                {activeStudents}
              </p>
              <p className="text-xs text-slate-500">
                Alunos com acesso geral permitido
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-1">
              <span className="text-xs font-bold text-red-500 uppercase tracking-wider block">
                Acesso Bloqueado
              </span>
              <p className="text-3xl font-extrabold text-red-600 tracking-tight">
                {blockedStudents}
              </p>
              <p className="text-xs text-slate-500">
                Alunos desativados pelo administrador
              </p>
            </div>
          </div>

          {/* Matrículas por Curso Oficial */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Matrículas Concedidas por Curso (enrolledCourses)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quantidade de alunos com liberação ativa para cada nível de automação Rockwell.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdminTab("students")}
                className="py-1.5 px-3 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Gerenciar Matrículas
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">
                  Básico
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Programação Rockwell - Básico
                </h3>
                <p className="text-2xl font-extrabold text-slate-900">
                  {countBasico}{" "}
                  <span className="text-xs font-normal text-slate-500">alunos matriculados</span>
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase">
                  Intermediário
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Programação Rockwell - Intermediário
                </h3>
                <p className="text-2xl font-extrabold text-slate-900">
                  {countIntermediario}{" "}
                  <span className="text-xs font-normal text-slate-500">alunos matriculados</span>
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">
                  Avançado
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Programação Rockwell - Avançado
                </h3>
                <p className="text-2xl font-extrabold text-slate-900">
                  {countAvancado}{" "}
                  <span className="text-xs font-normal text-slate-500">alunos matriculados</span>
                </p>
              </div>
            </div>
          </div>

          {/* Guia Rápido do Fluxo de Compra e Liberação */}
          <div className="bg-amber-50/70 rounded-2xl border border-amber-200 p-5 shadow-xs space-y-2">
            <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-700" />
              <span>Como funciona o Fluxo de Matrícula Manual</span>
            </h3>
            <ol className="text-xs text-amber-900/90 list-decimal list-inside space-y-1 leading-relaxed">
              <li>O aluno visualiza um curso bloqueado e clica em <strong>[ OBTER ACESSO AO CURSO ]</strong>.</li>
              <li>O aluno é direcionado ao WhatsApp da VL Automações com mensagem pronta.</li>
              <li>Após o pagamento fora da plataforma, você acessa a aba <strong>Alunos</strong>.</li>
              <li>Localize o aluno, marque a caixa do curso (☑ Básico, ☑ Intermediário, ☑ Avançado) e clique em <strong>Salvar Cursos</strong>.</li>
              <li>O curso é liberado imediatamente para o aluno em tempo real!</li>
            </ol>
          </div>
        </div>
      )}

      {/* ============================================================
          2. ABA: CURSOS E GESTÃO DIRETA DE AULAS (SEM MÓDULOS)
          ============================================================ */}
      {adminTab === "courses" && (
        <div className="space-y-6">
          {/* Seletor dos 3 Cursos Oficiais */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Selecione o Curso para Visualizar e Editar as Aulas
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {AVAILABLE_COURSES.map((c) => {
                const isSelected = c.id === selectedCourseId;
                const lessonsCount =
                  c.id === selectedCourseId
                    ? activeCourseData.lessons.length
                    : c.id === "rockwell-basico"
                    ? 10
                    : 0;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectCourse(c.id)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#ea580c] bg-orange-50/50 shadow-xs ring-2 ring-orange-200"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3
                        className={`text-sm font-bold tracking-tight ${
                          isSelected ? "text-[#ea580c]" : "text-slate-900"
                        }`}
                      >
                        {c.title}
                      </h3>
                      <span className="text-xs font-bold text-slate-500 shrink-0">
                        {lessonsCount} {lessonsCount === 1 ? "aula" : "aulas"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lista Direta de Aulas do Curso Selecionado */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Grade de Aulas do Curso (Estrutura Direta: Curso → Aulas)
                </span>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                  {activeCourseData.title}
                </h2>
                <span className="text-xs font-semibold text-slate-500">
                  {activeCourseData.lessons.length} {activeCourseData.lessons.length === 1 ? "aula cadastrada" : "aulas cadastradas"}
                </span>
              </div>

              {/* Botão em destaque: [ + NOVA AULA ] */}
              <button
                type="button"
                onClick={() =>
                  setEditingLesson({
                    isNew: true,
                  })
                }
                className="py-2.5 px-5 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>+ NOVA AULA</span>
              </button>
            </div>

            {loadingCourse ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Carregando grade de aulas...
              </div>
            ) : activeCourseData.lessons.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <Video className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-700">
                  Nenhuma aula cadastrada neste curso ainda.
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Utilize o botão acima para adicionar a primeira aula com título, duração, vídeo do Google Drive e formulário Google Forms.
                </p>
                <button
                  type="button"
                  onClick={() => setEditingLesson({ isNew: true })}
                  className="py-2 px-4 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cadastrar Aula 01</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeCourseData.lessons.map((les, idx) => {
                  const hasVideo = !!les.videoUrl;
                  const hasForm = !!les.formUrl;
                  const formattedOrder = String(les.order || idx + 1).padStart(2, "0");

                  return (
                    <div
                      key={les.id}
                      className="p-3.5 sm:p-4 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        {/* Botões de Alterar Ordem (Subir / Descer) */}
                        <div className="flex flex-col items-center justify-center shrink-0 pr-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveOrder(idx, "up")}
                            title="Subir ordem"
                            className="p-0.5 text-slate-400 hover:text-slate-800 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-extrabold text-[#ea580c] font-mono">
                            {formattedOrder}
                          </span>
                          <button
                            type="button"
                            disabled={idx === activeCourseData.lessons.length - 1}
                            onClick={() => handleMoveOrder(idx, "down")}
                            title="Descer ordem"
                            className="p-0.5 text-slate-400 hover:text-slate-800 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Detalhes da Aula */}
                        <div className="min-w-0 space-y-1">
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {formattedOrder} - {les.title}
                          </h3>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                            {les.duration && (
                              <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                                <Clock className="w-3 h-3" />
                                {les.duration}
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center gap-1 font-semibold ${
                                hasVideo ? "text-emerald-600" : "text-slate-400"
                              }`}
                            >
                              <Video className="w-3 h-3" />
                              {hasVideo ? "Vídeo configurado" : "Sem vídeo"}
                            </span>
                            {hasForm && (
                              <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                                <FileSpreadsheet className="w-3 h-3 text-slate-500" />
                                Google Forms
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Ações: Editar e Excluir */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {hasVideo && (
                          <a
                            href={getVideoEmbedUrl(les.videoUrl || "")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Testar vídeo"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => setEditingLesson({ lesson: les, isNew: false })}
                          className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteLesson(les.id, les.title)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Excluir aula"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ============================================================
              SEÇÃO: CERTIFICADO DO CURSO
              Permite ao administrador fazer upload, visualizar, substituir
              ou remover o certificado em PDF que será disponibilizado aos alunos.
              ============================================================ */}
          <div
            id="admin-course-certificate-section"
            className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5"
          >
            {/* Cabeçalho da Seção */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#ea580c]" />
                  <span className="text-[11px] font-bold text-[#ea580c] uppercase tracking-wider">
                    Certificação Oficial
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mt-0.5 flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#ea580c]" />
                  <span>CERTIFICADO DO CURSO: {activeCourseData.title}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                  Envie o arquivo oficial de certificado (preferencialmente PDF) para este curso. O documento será disponibilizado para download exclusivamente aos alunos que atingirem <strong>100% das aulas</strong> e <strong>100% dos formulários obrigatórios</strong>.
                </p>
              </div>

              {activeCourseData.certificateUrl && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold shrink-0 self-start">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Certificado Vinculado</span>
                </span>
              )}
            </div>

            {/* Feedbacks de Operação */}
            {certFeedback && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{certFeedback}</span>
              </div>
            )}

            {certError && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{certError}</span>
              </div>
            )}

            {/* Conteúdo: Certificado Já Cadastrado vs. Upload de Novo Certificado */}
            {activeCourseData.certificateUrl ? (
              /* CARD DO CERTIFICADO CADASTRADO */
              <div className="p-5 rounded-2xl border border-slate-200/90 bg-slate-50/70 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 text-[#ea580c] border border-orange-200 flex items-center justify-center shrink-0 shadow-xs">
                      <FileText className="w-6 h-6 stroke-[1.75]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-900 truncate">
                          {activeCourseData.certificateFileName || `Certificado_${activeCourseData.id}.pdf`}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                          PDF Oficial
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                        {activeCourseData.certificateFileSize && (
                          <span>Tamanho: {activeCourseData.certificateFileSize}</span>
                        )}
                        {activeCourseData.certificateUploadedAt && (
                          <span>
                            • Enviado em: {new Date(activeCourseData.certificateUploadedAt).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ações: Visualizar, Substituir e Remover */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Botão Visualizar */}
                    <button
                      type="button"
                      onClick={handleViewCertificate}
                      className="py-2 px-3.5 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-600" />
                      <span>Visualizar Certificado</span>
                    </button>

                    {/* Botão Substituir Arquivo */}
                    <button
                      type="button"
                      disabled={certUploading}
                      onClick={() => replaceFileInputRef.current?.click()}
                      className="py-2 px-3.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${certUploading ? "animate-spin" : ""}`} />
                      <span>{certUploading ? "Substituindo..." : "Substituir Arquivo"}</span>
                    </button>
                    <input
                      ref={replaceFileInputRef}
                      type="file"
                      accept=".pdf,application/pdf,image/*"
                      onChange={handleCertificateUpload}
                      className="hidden"
                    />

                    {/* Botão Remover Certificado */}
                    <button
                      type="button"
                      disabled={certUploading}
                      onClick={handleRemoveCertificate}
                      className="py-2 px-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-red-200"
                      title="Remover certificado deste curso"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-[11px] text-slate-500 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Este arquivo está vinculado exclusivamente a este curso. Ele será entregue automaticamente no painel do aluno assim que aulas e formulários forem 100% concluídos.
                  </span>
                </div>
              </div>
            ) : (
              /* CARD DE UPLOAD DO CERTIFICADO (QUANDO AINDA NÃO HÁ ARQUIVO) */
              <div className="space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-[#ea580c] bg-slate-50/50 hover:bg-orange-50/20 rounded-2xl p-8 text-center cursor-pointer transition-all space-y-3 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#ea580c] flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                    <Upload className="w-6 h-6 stroke-[2]" />
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800">
                      {certUploading
                        ? "Processando arquivo de certificado..."
                        : "Clique aqui para fazer upload do Certificado (PDF)"}
                    </p>
                    <p className="text-xs text-slate-500">
                      Formatos aceitos: <strong>PDF (.pdf)</strong> ou imagem em alta resolução (até 5MB)
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={certUploading}
                    className="py-2 px-4 bg-[#ea580c] group-hover:bg-[#c2410c] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{certUploading ? "Enviando arquivo..." : "Selecionar Arquivo PDF"}</span>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf,image/*"
                  onChange={handleCertificateUpload}
                  className="hidden"
                />

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900/90 flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <p>
                    <strong>Atenção:</strong> A plataforma <em>não gera o certificado automaticamente</em>. O instrutor/administrador fornece o arquivo de certificado pronto para que os alunos possam baixá-lo ao concluírem o curso.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          3. ABA: ALUNOS E MATRÍCULAS (enrolledCourses)
          ============================================================ */}
      {adminTab === "students" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Alunos Cadastrados
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Controle o status do aluno (accessEnabled) e marque os cursos liberados (enrolledCourses).
              </p>
            </div>

            {/* Campo de Busca de Aluno */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Buscar por nome ou e-mail..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
              />
            </div>
          </div>

          {userFeedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{userFeedback}</span>
            </div>
          )}

          {loadingUsers ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Carregando lista de alunos...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Nenhum aluno encontrado para a busca.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((u) => {
                const isBlocked = u.accessEnabled === false;
                const isUserAdmin = u.role === "admin";
                const isUpdatingAccess = updatingAccessUserId === u.uid;
                const isSavingEnrolled = savingEnrolledUserId === u.uid;

                const currentDraft = enrolledDrafts[u.uid] || [];

                return (
                  <div
                    key={u.uid}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-slate-50/50 space-y-4 shadow-xs"
                  >
                    {/* Linha 1: Nome, E-mail e Status (accessEnabled) */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/70 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            {u.displayName || "Aluno"}
                          </span>
                          {isUserAdmin && (
                            <span className="text-[10px] font-bold text-[#ea580c] bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-md">
                              Admin
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 block">
                          {u.email}
                        </span>
                      </div>

                      {/* Status e Ação de Ativar / Bloquear (accessEnabled) */}
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                            isBlocked
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          Status: {isBlocked ? "Bloqueado" : "Ativo"}
                        </span>

                        {!isUserAdmin && (
                          <button
                            type="button"
                            disabled={isUpdatingAccess}
                            onClick={() => handleToggleAccessEnabled(u)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors cursor-pointer disabled:opacity-50 ${
                              isBlocked
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                                : "bg-white hover:bg-red-50 text-slate-700 hover:text-red-700 border-slate-200"
                            }`}
                          >
                            {isUpdatingAccess
                              ? "Salvando..."
                              : isBlocked
                              ? "Liberar Acesso"
                              : "Bloquear"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Linha 2: Cursos (Checkboxes do enrolledCourses) */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Cursos Liberados (enrolledCourses):
                        </span>

                        <div className="flex flex-wrap items-center gap-5">
                          <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={currentDraft.includes("rockwell-basico")}
                              onChange={() =>
                                handleToggleCourseCheckbox(u.uid, "rockwell-basico")
                              }
                              className="w-4 h-4 text-[#ea580c] rounded-sm focus:ring-[#ea580c] border-slate-300"
                            />
                            <span>Básico</span>
                          </label>

                          <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={currentDraft.includes("rockwell-intermediario")}
                              onChange={() =>
                                handleToggleCourseCheckbox(u.uid, "rockwell-intermediario")
                              }
                              className="w-4 h-4 text-[#ea580c] rounded-sm focus:ring-[#ea580c] border-slate-300"
                            />
                            <span>Intermediário</span>
                          </label>

                          <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={currentDraft.includes("rockwell-avancado")}
                              onChange={() =>
                                handleToggleCourseCheckbox(u.uid, "rockwell-avancado")
                              }
                              className="w-4 h-4 text-[#ea580c] rounded-sm focus:ring-[#ea580c] border-slate-300"
                            />
                            <span>Avançado</span>
                          </label>
                        </div>
                      </div>

                      {/* Botão de Salvar apenas o enrolledCourses do aluno */}
                      <button
                        type="button"
                        disabled={isSavingEnrolled}
                        onClick={() =>
                          handleSaveEnrolledCourses(
                            u.uid,
                            u.displayName || u.email || "aluno"
                          )
                        }
                        className="self-start md:self-center py-2 px-4 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSavingEnrolled ? "Salvando..." : "Salvar Cursos"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          4. ABA: AVISOS DA PLATAFORMA
          ============================================================ */}
      {adminTab === "notices" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Formulário para Adicionar Novo Aviso */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Publicar Novo Aviso
            </h2>
            <p className="text-xs text-slate-500">
              O aviso aparecerá na aba &quot;Avisos&quot; apenas dos alunos que possuem acesso ao curso selecionado.
            </p>

            <form onSubmit={handleCreateNotice} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Curso Vinculado:
                </label>
                <select
                  value={newNoticeCourseId}
                  onChange={(e) => setNewNoticeCourseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                >
                  <option value="rockwell-basico">Programação Rockwell - Básico</option>
                  <option value="rockwell-intermediario">Programação Rockwell - Intermediário</option>
                  <option value="rockwell-avancado">Programação Rockwell - Avançado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Título do Aviso:
                </label>
                <input
                  type="text"
                  value={newNoticeTitle}
                  onChange={(e) => setNewNoticeTitle(e.target.value)}
                  placeholder="Ex: Nova aula prática adicionada"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mensagem:
                </label>
                <textarea
                  value={newNoticeMessage}
                  onChange={(e) => setNewNoticeMessage(e.target.value)}
                  rows={3}
                  placeholder="Escreva o comunicado para os alunos..."
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#ea580c] resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Publicar Aviso</span>
              </button>
            </form>
          </div>

          {/* Lista de Avisos Atuais */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Avisos Ativos ({noticesList.length})
            </h2>

            {noticesList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Nenhum aviso cadastrado.
              </div>
            ) : (
              <div className="space-y-3">
                {noticesList.map((notice) => (
                  <div
                    key={notice.id}
                    className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1.5 relative group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-[#ea580c] bg-orange-50 px-2 py-0.5 rounded border border-orange-200 uppercase">
                          {notice.title}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {notice.courseId === "rockwell-basico"
                            ? "Básico"
                            : notice.courseId === "rockwell-intermediario"
                            ? "Intermediário"
                            : "Avançado"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteNotice(notice.id)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded cursor-pointer"
                        title="Remover aviso"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-800 font-medium">
                      {notice.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          5. ABA: CONFIGURAÇÕES DA PLATAFORMA
          ============================================================ */}
      {adminTab === "settings" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Configurações da Plataforma
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ajuste o número de atendimento do WhatsApp e visualize o fluxo de compra oficial.
            </p>
          </div>

          {settingsSavedFeedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Configurações do WhatsApp salvas com sucesso!</span>
            </div>
          )}

          <form onSubmit={handleSaveWhatsAppConfig} className="max-w-md space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Número do WhatsApp Oficial para Vendas / Acessos:
              </label>
              <input
                type="text"
                value={customWhatsAppNumber}
                onChange={(e) => setCustomWhatsAppNumber(e.target.value)}
                placeholder="Ex: 5511999999999"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Informe no formato internacional DDI + DDD + Número sem espaços ou traços (Ex: 5511999999999).
              </p>
            </div>

            <button
              type="submit"
              className="py-2.5 px-5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Número do WhatsApp</span>
            </button>
          </form>

          {/* Pré-visualização dos Links do WhatsApp para cada Curso */}
          <div className="border-t border-slate-100 pt-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Links de Compra Automáticos Gerados para o WhatsApp:
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-900 block">Básico:</span>
                  <span className="text-slate-500 text-[11px]">
                    &quot;Olá! Gostaria de obter acesso ao curso Programação Rockwell - Básico.&quot;
                  </span>
                </div>
                <a
                  href={getCourseWhatsAppUrl("rockwell-basico")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-700 font-bold hover:underline shrink-0"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Testar Link</span>
                </a>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-900 block">Intermediário:</span>
                  <span className="text-slate-500 text-[11px]">
                    &quot;Olá! Gostaria de obter acesso ao curso Programação Rockwell - Intermediário.&quot;
                  </span>
                </div>
                <a
                  href={getCourseWhatsAppUrl("rockwell-intermediario")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-700 font-bold hover:underline shrink-0"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Testar Link</span>
                </a>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-900 block">Avançado:</span>
                  <span className="text-slate-500 text-[11px]">
                    &quot;Olá! Gostaria de obter acesso ao curso Programação Rockwell - Avançado.&quot;
                  </span>
                </div>
                <a
                  href={getCourseWhatsAppUrl("rockwell-avancado")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-700 font-bold hover:underline shrink-0"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Testar Link</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação / Edição de Aula */}
      {editingLesson && (
        <LessonFormModal
          lesson={editingLesson.lesson}
          isNew={editingLesson.isNew}
          courseTitle={activeCourseData.title}
          courseId={selectedCourseId}
          suggestedOrder={activeCourseData.lessons.length + 1}
          onSave={handleSaveLesson}
          onClose={() => setEditingLesson(null)}
        />
      )}
    </div>
  );
}
