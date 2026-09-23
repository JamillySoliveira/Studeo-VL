"use client";

/**
 * =======================================================================
 * MENU LATERAL DE NAVEGAÇÃO (SIDEBAR) - VL AUTOMAÇÕES
 * =======================================================================
 *
 * Menu principal da área do aluno:
 * - Itens: Início, Meus cursos, Avisos, Certificado, Meu perfil, Ajuda.
 * - Exibe opção exclusiva de "Painel Admin" para usuários com `role === "admin"`.
 * - Compatível com versão desktop (fixa na lateral) e mobile (gaveta retrátil).
 */

import React from "react";
import {
  Home,
  BookOpen,
  Bell,
  FileCheck,
  User,
  LogOut,
  X,
  ShieldCheck,
  Lightbulb,
} from "lucide-react";
import { UserProfile } from "@/lib/types";
import { getUserAccessibleCourseIds } from "@/lib/courseService";
import { PLATFORM_NOTICES } from "@/lib/constants";

export type TabType =
  | "dashboard"
  | "course"
  | "lesson"
  | "notices"
  | "progress"
  | "certificate"
  | "profile"
  | "help"
  | "admin";

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  user: UserProfile | null;
  onLogout: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  progressPercent: number;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  user,
  onLogout,
  isOpenMobile,
  onCloseMobile,
}: SidebarProps) {
  // Quantidade de avisos disponíveis para os cursos aos quais o aluno possui acesso
  const accessibleCourseIds = getUserAccessibleCourseIds(user);
  const noticesCount = PLATFORM_NOTICES.filter((n) =>
    accessibleCourseIds.includes(n.courseId)
  ).length;

  // Navegação: Início, Meus cursos, Avisos, Certificado, Meu perfil, Ajuda
  const navItems: {
    id: TabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: "dashboard", label: "Início", icon: Home },
    { id: "course", label: "Meus cursos", icon: BookOpen },
    { id: "notices", label: "Avisos", icon: Bell },
    { id: "certificate", label: "Certificado", icon: FileCheck },
    { id: "profile", label: "Meu perfil", icon: User },
    { id: "help", label: "Ajuda", icon: Lightbulb },
  ];

  // Exibe o painel administrativo exclusivamente para usuários com role === "admin"
  const isAdmin = user?.role === "admin";
  if (isAdmin) {
    navItems.push({ id: "admin", label: "Painel Admin", icon: ShieldCheck });
  }

  const handleNavClick = (tab: TabType) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Backdrop para mobile */}
      {isOpenMobile && (
        <div
          id="vl-mobile-backdrop"
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Container da Barra Lateral: Visual Claro, Limpo e Moderno */}
      <aside
        id="vl-sidebar"
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white text-slate-800 flex flex-col justify-between border-r border-slate-200/80 transition-transform duration-200 ease-in-out ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div>
          {/* Topo com logotipo limpo */}
          <div className="p-5 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div
                id="vl-sidebar-logo-icon"
                className="w-8 h-8 bg-[#ea580c] rounded-lg flex items-center justify-center shrink-0"
              >
                <span className="text-white font-extrabold text-sm tracking-tight">
                  VL
                </span>
              </div>
              <div>
                <span className="text-slate-900 font-bold text-sm tracking-tight block">
                  VL AUTOMAÇÕES
                </span>
                <span className="text-[10px] text-slate-400 font-medium block">
                  Plataforma EAD
                </span>
              </div>
            </div>

            {/* Botão de Fechar no Mobile */}
            <button
              id="btn-close-sidebar-mobile"
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Menu de Navegação Simplificado */}
          <nav id="vl-nav-links" className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              // Se o aluno estiver assistindo aula ("lesson"), Meus Cursos permanece indicado de forma coerente
              const isActive =
                currentTab === item.id ||
                (item.id === "course" && currentTab === "lesson");

              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-orange-50 text-[#ea580c] font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? "text-[#ea580c]" : "text-slate-400"
                    }`}
                  />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.id === "notices" && noticesCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-[#ea580c]">
                      {noticesCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Rodapé: Perfil e Logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5 mb-3 px-1">
            <div
              id="vl-user-avatar-circle"
              className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0"
            >
              {user?.displayName
                ? user.displayName.charAt(0).toUpperCase()
                : user?.email
                ? user.email.charAt(0).toUpperCase()
                : "A"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 truncate">
                {user?.displayName || "Aluno"}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {user?.email || "aluno@vlautomacao.com"}
              </p>
            </div>
          </div>

          <button
            id="btn-sidebar-logout"
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
