"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface HelpViewProps {
  onGoToCourses?: () => void;
  onGoToCertificates?: () => void;
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: "como-acessar-curso",
    question: "Como acessar um curso?",
    answer:
      "Entre em Meus Cursos e escolha um curso que esteja liberado para você. Depois clique em Acessar curso para visualizar as aulas.",
  },
  {
    id: "como-assistir-aulas",
    question: "Como assistir às aulas?",
    answer:
      "Abra a aula desejada e assista ao conteúdo. Depois de concluir a aula, clique no botão 'Marcar aula como concluída' para registrar seu progresso.",
  },
  {
    id: "como-marcar-aula-concluida",
    question: "Como marcar uma aula como concluída?",
    answer:
      "Depois de assistir à aula, clique no botão 'Marcar aula como concluída'. O sistema salvará essa aula como concluída e atualizará seu progresso.",
  },
  {
    id: "como-realizar-atividade",
    question: "Como realizar uma atividade?",
    answer:
      "Quando uma aula possuir uma atividade, clique em 'Responder atividade'. O Google Forms será aberto para você responder. Depois de responder e enviar o Google Forms, volte para a plataforma e clique em 'Marcar atividade como concluída'.",
  },
  {
    id: "como-marcar-atividade-concluida",
    question: "Como marcar uma atividade como concluída?",
    answer:
      "Após enviar suas respostas no Google Forms, volte para a plataforma e clique em 'Marcar atividade como concluída' para registrar seu progresso.",
  },
  {
    id: "como-acompanhar-progresso",
    question: "Como acompanhar meu progresso?",
    answer:
      "Seu progresso é atualizado conforme você conclui as aulas e as atividades do curso.",
  },
  {
    id: "quando-curso-concluido",
    question: "Quando o curso é considerado concluído?",
    answer:
      "O curso será considerado concluído quando você completar 100% das aulas e 100% das atividades obrigatórias.",
  },
  {
    id: "como-acessar-certificado",
    question: "Como acessar meu certificado?",
    answer:
      "Depois que o curso estiver 100% concluído, o certificado ficará disponível quando o administrador disponibilizar o arquivo.",
  },
];

/**
 * Aba de Ajuda interativa em formato de Acordeão (FAQ)
 * Mantém o visual limpo, profissional e sem elementos pesados ou blocos de progresso.
 */
export function HelpView({}: HelpViewProps) {
  // Apenas uma dúvida aberta por vez; inicialmente todas fechadas
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div id="vl-help-view" className="max-w-3xl mx-auto py-4 sm:py-6 space-y-6">
      {/* Cabeçalho minimalista */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-[#ea580c] text-xs font-bold tracking-wide">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Dúvidas Frequentes</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Como usar a plataforma?
        </h1>

        <p className="text-sm text-slate-600 font-medium">
          Clique nas dúvidas abaixo para ver as orientações de uso da plataforma.
        </p>
      </div>

      {/* Lista de Acordeão / FAQ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 divide-y divide-slate-100 shadow-xs overflow-hidden">
        {FAQ_ITEMS.map((item) => {
          const isOpen = openId === item.id;

          return (
            <div key={item.id} className="transition-colors">
              <button
                type="button"
                onClick={() => toggleItem(item.id)}
                aria-expanded={isOpen}
                className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base select-none shrink-0" aria-hidden="true">
                    ❓
                  </span>
                  <span className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#ea580c] transition-colors leading-snug">
                    {item.question}
                  </span>
                </div>

                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 ${
                    isOpen
                      ? "rotate-180 bg-orange-50 text-[#ea580c]"
                      : "text-slate-400 group-hover:text-slate-600"
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 pt-1 pl-11 sm:pl-12 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal border-t border-slate-50">
                      <p className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                        {item.answer}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
