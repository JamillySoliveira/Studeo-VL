"use client";

import React, { useState } from "react";
import {
  User,
  Mail,
  LogOut,
  Save,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { UserProfile, Course } from "@/lib/types";
import { auth, updateProfile, db, doc, updateDoc } from "@/lib/firebase";

interface ProfileViewProps {
  user: UserProfile | null;
  course: Course;
  completedLessonsCount: number;
  onLogout: () => void;
  onProfileUpdated: (newName: string) => void;
}

export function ProfileView({
  user,
  course,
  onLogout,
  onProfileUpdated,
}: ProfileViewProps) {
  const [name, setName] = useState(user?.displayName || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSaving(true);
      setMessage(null);

      // Atualiza no Firebase Authentication
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: name.trim(),
        });
      }

      // Atualiza no Cloud Firestore
      if (user?.uid) {
        try {
          const userRef = doc(db, "users", user.uid);
          await updateDoc(userRef, {
            displayName: name.trim(),
          });
        } catch (e) {
          console.warn("Aviso ao atualizar Firestore:", e);
        }
      }

      onProfileUpdated(name.trim());
      setMessage({
        type: "success",
        text: "Nome atualizado com sucesso!",
      });
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err?.message || "Erro ao atualizar o nome.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="vl-profile-page" className="max-w-xl mx-auto space-y-6">
      {/* Topo do Perfil */}
      <div className="space-y-1 text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Perfil
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Gerencie suas informações de acesso e certificação.
        </p>
      </div>

      {/* Card de Dados Pessoais */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center text-lg font-bold">
            {user?.displayName
              ? user.displayName.charAt(0).toUpperCase()
              : user?.email
              ? user.email.charAt(0).toUpperCase()
              : "A"}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {user?.displayName || "Aluno"}
            </h2>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>
        </div>

        {message && (
          <div
            className={`p-3 rounded-xl text-xs sm:text-sm flex items-center gap-2 ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleUpdateName} className="space-y-4">
          <div>
            <label
              htmlFor="profile-name-input"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Nome Completo
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="profile-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ea580c] transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Utilizado para emissão do certificado de conclusão.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              E-mail
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                disabled
                value={user?.email || ""}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              id="btn-save-profile"
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Salvando..." : "Salvar alterações"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Sair da Conta */}
      <div className="pt-2">
        <button
          id="btn-profile-logout"
          type="button"
          onClick={onLogout}
          className="w-full py-3 px-4 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair da conta</span>
        </button>
      </div>
    </div>
  );
}
