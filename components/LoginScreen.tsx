"use client";

/**
 * =======================================================================
 * TELA DE LOGIN - PLATAFORMA VL AUTOMAÇÕES
 * =======================================================================
 *
 * Responsável pela autenticação segura do aluno na plataforma:
 * - Utiliza exclusivamente o Firebase Authentication com login do Google (`signInWithPopup`).
 * - Fornece tratamento amigável de erros (janela pop-up fechada pelo usuário ou bloqueada).
 * - Disponibiliza opção de "Acesso Rápido de Demonstração" para testes da interface.
 */

import React, { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import {
  Lock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface LoginScreenProps {
  onSuccess?: () => void;
  onDemoLogin?: () => void;
}

export function LoginScreen({ onSuccess, onDemoLogin }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Trata erros da autenticação do Google
  const handleFirebaseError = (error: any) => {
    const code = error?.code || "";
    console.error("Erro na autenticação:", error);

    if (code === "auth/popup-closed-by-user") {
      setErrorMessage("O login com Google foi cancelado na janela pop-up.");
    } else if (code === "auth/popup-blocked") {
      setErrorMessage("A janela pop-up foi bloqueada pelo navegador. Permita pop-ups para fazer login.");
    } else {
      setErrorMessage(
        error?.message || "Ocorreu um erro ao autenticar com o Google. Tente novamente."
      );
    }
  };

  // Login com o Google (único método de autenticação da plataforma)
  const handleGoogleLogin = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
      setSuccessMessage("Autenticado com sucesso! Carregando seus cursos...");
      onSuccess?.();
    } catch (err: any) {
      handleFirebaseError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="vl-login-wrapper"
      className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4 sm:p-6 lg:p-8"
    >
      {/* Card principal com divisão em duas colunas idêntica à identidade visual */}
      <div
        id="vl-auth-card"
        className="w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 border border-slate-200/80"
      >
        {/* ================= COLUNA ESQUERDA: APRESENTAÇÃO INDUSTRIAL ================= */}
        <div
          id="vl-brand-panel"
          className="lg:col-span-5 bg-[#0f172a] text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden"
        >
          {/* Fundo decorativo sutil com grid de automação */}
          <div className="absolute inset-0 bg-[radial-gradient(#ea580c_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

          {/* Topo: Logo VL AUTOMAÇÃO */}
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div
                id="vl-logo-box"
                className="w-12 h-12 bg-[#ea580c] rounded-xl flex items-center justify-center shadow-md shadow-orange-600/30"
              >
                <span className="text-white font-extrabold text-xl tracking-tight">
                  VL
                </span>
              </div>
              <div className="leading-tight">
                <span className="text-white font-bold text-lg tracking-wider block">
                  AUTOMAÇÃO
                </span>
                <span className="text-slate-400 text-xs tracking-normal">
                  Engenharia & Treinamentos
                </span>
              </div>
            </div>

            {/* Tag / Badge: Plataforma de Ensino Online */}
            <div
              id="vl-badge-online"
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-slate-200"
            >
              <span className="w-2 h-2 rounded-full bg-[#ea580c] animate-pulse" />
              <span>Plataforma de Ensino Online</span>
            </div>

            {/* Título Principal */}
            <div className="space-y-3 pt-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-snug">
                Aprenda automação industrial na prática
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                Desenvolva projetos reais com simuladores industriais, programação de CLPs,
                sistemas SCADA e supervisórios das maiores tecnologias do mercado.
              </p>
            </div>

            {/* Lista de diferenciais com ícones em laranja */}
            <div className="space-y-4 pt-4 text-xs sm:text-sm">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#ea580c] shrink-0 mt-0.5" />
                <span className="text-slate-200 leading-snug">
                  Aulas 100% práticas com simuladores de ponta
                </span>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#ea580c] shrink-0 mt-0.5" />
                <span className="text-slate-200 leading-snug">
                  Certificado profissional reconhecido pelo mercado industrial
                </span>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#ea580c] shrink-0 mt-0.5" />
                <span className="text-slate-200 leading-snug">
                  Mentoria técnica direta e comunidade ativa de engenheiros
                </span>
              </div>
            </div>
          </div>

          {/* Rodapé do Painel Esquerdo */}
          <div className="relative z-10 pt-8 mt-6 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Tecnologia & Inovação Industrial</span>
            <span className="text-slate-500 font-mono">v1.0 EAD</span>
          </div>
        </div>

        {/* ================= COLUNA DIREITA: ACESSO COM GOOGLE ================= */}
        <div id="vl-form-panel" className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center">
          {/* Cabeçalho de Segurança */}
          <div className="flex items-center justify-end text-xs text-slate-500 gap-1.5 mb-6">
            <span>Ambiente Seguro & Criptografado</span>
            <Lock className="w-3.5 h-3.5 text-slate-400" />
          </div>

          {/* Mensagens de Alerta (Erro ou Sucesso) */}
          {errorMessage && (
            <div
              id="vl-alert-error"
              className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-lg flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div
              id="vl-alert-success"
              className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm rounded-lg flex items-start gap-2.5"
            >
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <div className="flex-1">{successMessage}</div>
            </div>
          )}

          {/* Títulos do Acesso */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Acessar Plataforma
            </h2>
            <p className="text-sm text-slate-500 mt-1.5">
              Utilize sua conta Google para acessar instantaneamente a área do aluno e continuar seus estudos.
            </p>
          </div>

          {/* Área do Botão Continuar com Google */}
          <div className="space-y-4">
            <button
              id="btn-google-auth"
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-3.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 text-slate-800 font-semibold rounded-xl text-sm sm:text-base flex items-center justify-center gap-3 transition-all shadow-xs cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {/* Ícone oficial Google SVG */}
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? "Conectando ao Google..." : "Continuar com Google"}</span>
            </button>

            {/* Acesso rápido para testes em ambiente de demonstração */}
            {onDemoLogin && (
              <button
                id="btn-demo-auth"
                type="button"
                onClick={onDemoLogin}
                className="w-full py-2.5 px-3 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-800 text-xs rounded-xl font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#ea580c]" />
                <span>Acesso Rápido de Teste (Demonstração do Aluno)</span>
              </button>
            )}
          </div>

          {/* Nota informativa de rodapé */}
          <div className="mt-8 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 leading-relaxed">
              O acesso aos cursos é liberado através do sistema de permissões da VL Automações.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
