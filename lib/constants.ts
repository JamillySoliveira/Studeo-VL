/**
 * =======================================================================
 * CONFIGURAÇÃO CENTRALIZADA DA PLATAFORMA VL AUTOMAÇÕES
 * =======================================================================
 * 
 * Este arquivo concentra as constantes globais da plataforma:
 * 1. Número oficial do WhatsApp para atendimento e liberação manual de acessos.
 * 2. Mensagens pré-formatadas para solicitação de acesso aos cursos.
 * 3. Função centralizada de geração de links do WhatsApp (`getCourseWhatsAppUrl`).
 * 4. Avisos gerais da plataforma destinados aos alunos.
 */

/**
 * NÚMERO DO WHATSAPP OFICIAL (CONFIGURAÇÃO ÚNICA NO CÓDIGO)
 * 
 * Todas as telas da plataforma que geram links para o WhatsApp (cards de cursos,
 * botões de compra, telas de curso bloqueado) consomem exclusivamente esta constante.
 * Para atualizar o número de contato da VL Automações no futuro, altere apenas esta linha.
 * Formato internacional: DDI + DDD + Número (apenas dígitos).
 */
export const WHATSAPP_NUMBER = "5512996092249";

/**
 * Mensagens padrão geradas para o aluno iniciar o contato via WhatsApp
 * de acordo com o curso que deseja adquirir.
 */
export const WHATSAPP_COURSE_MESSAGES: Record<string, string> = {
  "rockwell-basico": "Olá! Gostaria de obter acesso ao curso Programação Rockwell - Básico.",
  "rockwell-intermediario": "Olá! Gostaria de obter acesso ao curso Programação Rockwell - Intermediário.",
  "rockwell-avancado": "Olá! Gostaria de obter acesso ao curso Programação Rockwell - Avançado.",
};

/**
 * Gera a URL oficial da API do WhatsApp (`https://wa.me/...`)
 * com o número oficial configurado e o texto da mensagem codificado em URI.
 * 
 * @param courseId Identificador do curso (ex: "rockwell-intermediario")
 * @returns Link seguro para abertura direta no aplicativo do WhatsApp ou WhatsApp Web
 */
export function getCourseWhatsAppUrl(courseId: string): string {
  const message =
    WHATSAPP_COURSE_MESSAGES[courseId] ||
    "Olá! Gostaria de obter acesso ao curso da VL Automações.";
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedText}`;
}

export interface Notice {
  id: string;
  courseId: string;
  title: string;
  message: string;
  date: string;
  lessonOrder?: number;
}

/**
 * Lista de avisos oficiais da plataforma para os alunos.
 * Os avisos são filtrados para que o aluno visualize somente comunicados
 * dos cursos aos quais possui acesso (enrolledCourses).
 */
export const PLATFORM_NOTICES: Notice[] = [
  {
    id: "aviso-aula-08-basico",
    courseId: "rockwell-basico",
    title: "Nova aula disponível",
    message: "A aula 08 do curso Programação Rockwell - Básico já está disponível.",
    date: "Hoje",
    lessonOrder: 8,
  },
  {
    id: "aviso-material-basico",
    courseId: "rockwell-basico",
    title: "Atividades Práticas Atualizadas",
    message: "Os questionários do Google Forms foram revisados para aprofundamento técnico.",
    date: "Recentemente",
  },
  {
    id: "aviso-intermediario-preparacao",
    courseId: "rockwell-intermediario",
    title: "Conteúdo Técnico em Produção",
    message: "Novos módulos práticos de instruções AOI e parametrização PowerFlex sendo adicionados.",
    date: "Recentemente",
  },
  {
    id: "aviso-avancado-scada",
    courseId: "rockwell-avancado",
    title: "Módulos de Supervisório SCADA",
    message: "Telas de exemplo no FactoryTalk View SE/ME em fase final de testes práticos.",
    date: "Recentemente",
  },
];

const NOTICES_STORAGE_KEY = "vl_platform_notices";

export function getStoredNotices(): Notice[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(NOTICES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }
  return PLATFORM_NOTICES;
}

export function saveStoredNotice(notice: Notice): void {
  if (typeof window !== "undefined") {
    try {
      const current = getStoredNotices();
      const existsIndex = current.findIndex((n) => n.id === notice.id);
      let updated: Notice[];
      if (existsIndex >= 0) {
        updated = [...current];
        updated[existsIndex] = notice;
      } else {
        updated = [notice, ...current];
      }
      localStorage.setItem(NOTICES_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }
}

export function deleteStoredNotice(noticeId: string): void {
  if (typeof window !== "undefined") {
    try {
      const current = getStoredNotices();
      const updated = current.filter((n) => n.id !== noticeId);
      localStorage.setItem(NOTICES_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }
}
