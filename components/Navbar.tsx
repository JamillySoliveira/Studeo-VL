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
import { Menu, LogOut, Sun, Moon } from "lucide-react";
import { UserProfile } from "@/lib/types";
import { TabType } from "./Sidebar";
import { useTheme } from "@/lib/themeContext";

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
  const { theme, toggleTheme } = useTheme();

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
      className="sticky top-0 z-30 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-xs border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between transition-colors duration-200"
    >
      {/* Botão de abrir menu no mobile e título da página */}
      <div className="flex items-center gap-3">
        <button
          id="btn-open-sidebar-mobile"
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
          {getTabTitle(currentTab)}
        </h1>
      </div>

      {/* Lado Direito: Alternância de Tema, Perfil e Sair */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Botão Global de Alternância de Tema (Modo Claro / Modo Escuro) */}
        <button
          id="btn-theme-toggle"
          type="button"
          onClick={toggleTheme}
          title={theme === "dark" ? "Alternar para modo claro" : "Alternar para modo escuro"}
          aria-label={theme === "dark" ? "Alternar para modo claro" : "Alternar para modo escuro"}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-amber-400 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        <div className="flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center border border-slate-200 dark:border-slate-700">
            {user?.displayName
              ? user.displayName.charAt(0).toUpperCase()
              : user?.email
              ? user.email.charAt(0).toUpperCase()
              : "A"}
          </div>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 hidden sm:inline">
            {user?.displayName || "Aluno"}
          </span>
        </div>

        <button
          id="btn-navbar-logout"
          type="button"
          onClick={onLogout}
          title="Sair"
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
