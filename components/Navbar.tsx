"use client";

/**
 * =======================================================================
 * BARRA SUPERIOR (NAVBAR) - PLATAFORMA VL AUTOMAÇÕES
 * =======================================================================
 *
 * Exibe o título da aba atual, botão para abrir o menu no celular,
 * dados rápidos do usuário e botão de logout.
 */

import React from "react";
import { Menu, LogOut } from "lucide-react";
import { UserProfile } from "@/lib/types";
import { TabType } from "./Sidebar";

interface NavbarProps {
  onOpenMobileSidebar: () => void;
  currentTab: TabType;
  user: UserProfile | null;
  onLogout: () => void;
  progressPercent: number;
}

export function Navbar({
  onOpenMobileSidebar,
  currentTab,
  user,
  onLogout,
}: NavbarProps) {
  const getTabTitle = (tab: TabType) => {
    switch (tab) {
      case "dashboard":
        return "Início";
      case "course":
        return "Meus Cursos";
      case "notices":
        return "Avisos";
      case "lesson":
        return "Aula";
      case "progress":
        return "Progresso";
      case "certificate":
        return "Certificado";
      case "profile":
        return "Meu Perfil";
      case "help":
        return "Ajuda";
      case "admin":
        return "Painel Admin";
      default:
        return "Plataforma";
    }
  };

  return (
    <header
      id="vl-navbar"
      className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200/80 px-4 sm:px-6 py-3.5 flex items-center justify-between"
    >
      {/* Botão de abrir menu no mobile e título da página */}
      <div className="flex items-center gap-3">
        <button
          id="btn-open-sidebar-mobile"
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
          {getTabTitle(currentTab)}
        </h1>
      </div>

      {/* Lado Direito: Perfil e Sair */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200">
            {user?.displayName
              ? user.displayName.charAt(0).toUpperCase()
              : user?.email
              ? user.email.charAt(0).toUpperCase()
              : "A"}
          </div>
          <span className="text-xs font-semibold text-slate-700 hidden sm:inline">
            {user?.displayName || "Aluno"}
          </span>
        </div>

        <button
          id="btn-navbar-logout"
          type="button"
          onClick={onLogout}
          title="Sair"
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
