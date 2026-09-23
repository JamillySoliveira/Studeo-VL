/**
 * =======================================================================
 * CONFIGURAÇÃO CENTRALIZADA DA PLATAFORMA VL AUTOMAÇÕES
 * =======================================================================
 * 
 * Este arquivo concentra parâmetros globais do sistema, como o número de WhatsApp
 * para atendimento e solicitação de acesso aos cursos, evitando duplicação
 * e dispersão de valores pelo código.
 */

// Número oficial do WhatsApp para contato, vendas e liberação manual de cursos.
// Formato internacional DDI + DDD + Número (apenas dígitos).
// Para alterar o número, basta modificar esta constante ou definir NEXT_PUBLIC_WHATSAPP_NUMBER no .env.
export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5511999999999";

/**
 * Obtém o número configurado do WhatsApp (com fallback para a constante padrão).
 */
export function getSavedWhatsAppNumber(): string {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("vl_whatsapp_number");
      if (saved && saved.trim()) return saved.trim();
    } catch {}
  }
  return WHATSAPP_NUMBER;
}

/**
 * Salva o número customizado do WhatsApp no cache local do navegador.
 */
export function saveCustomWhatsAppNumber(num: string): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("vl_whatsapp_number", num.trim());
    } catch {}
  }
}

// Mensagens padrão para abertura de contato via WhatsApp ao clicar em "OBTER ACESSO AO CURSO"
export const WHATSAPP_COURSE_MESSAGES: Record<string, string> = {
  "rockwell-basico": "Olá! Gostaria de obter acesso ao curso Programação Rockwell - Básico.",
  "rockwell-intermediario": "Olá! Gostaria de obter acesso ao curso Programação Rockwell - Intermediário.",
  "rockwell-avancado": "Olá! Gostaria de obter acesso ao curso Programação Rockwell - Avançado.",
};

/**
 * Gera a URL oficial do WhatsApp com a mensagem pré-formatada para o curso selecionado.
 * 
 * @param courseId Identificador do curso (ex: "rockwell-intermediario")
 * @returns Link https://wa.me/... com a mensagem codificada em URI
 */
export function getCourseWhatsAppUrl(courseId: string): string {
  const currentNumber = getSavedWhatsAppNumber();
  const message =
    WHATSAPP_COURSE_MESSAGES[courseId] ||
    "Olá! Gostaria de obter acesso ao curso da VL Automações.";
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${currentNumber}?text=${encodedText}`;
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

