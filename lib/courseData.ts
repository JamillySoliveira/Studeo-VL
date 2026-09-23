/**
 * Dados dos Cursos para a plataforma VL AUTOMAÇÕES.
 *
 * Estrutura Simplificada:
 * Curso
 * └── Aulas (pertencentes diretamente a um curso através de courseId)
 *
 * Cursos Iniciais:
 * 1. Programação Rockwell - Básico (ID: rockwell-basico) -> possui as aulas atuais
 * 2. Programação Rockwell - Intermediário (ID: rockwell-intermediario) -> preparado para receber aulas
 * 3. Programação Rockwell - Avançado (ID: rockwell-avancado) -> preparado para receber aulas
 */

import { Course, Lesson } from "./types";

// Aulas atuais migradas para o curso Básico (courseId: "rockwell-basico")
export const BASIC_ROCKWELL_LESSONS: Lesson[] = [
  {
    id: "aula-1-1",
    courseId: "rockwell-basico",
    moduleId: "mod-1", // Mantido temporariamente para compatibilidade
    title: "Apresentação da Plataforma e Arquitetura Rockwell",
    description:
      "Visão geral dos controladores CompactLogix e ControlLogix, conceito de slots, chassi virtual, topologias de rede industrial e introdução ao ambiente de desenvolvimento Studio 5000 Logix Designer.",
    videoUrl: "",
    formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSc-demo-forms-vl-automacoes/viewform",
    order: 1,
    duration: "18 min",
  },
  {
    id: "aula-1-2",
    courseId: "rockwell-basico",
    moduleId: "mod-1",
    title: "Estrutura de Tags: Controller Tags vs Program Tags",
    description:
      "Compreenda a diferença fundamental entre escopo de controlador e escopo de rotina/programa, criação de tags base, alias, UDTs (User-Defined Data Types) e boas práticas de nomenclatura.",
    videoUrl: "",
    formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSc-demo-forms-vl-automacoes/viewform",
    order: 2,
    duration: "24 min",
  },
  {
    id: "aula-1-3",
    courseId: "rockwell-basico",
    moduleId: "mod-1",
    title: "Configuração de Rede Ethernet/IP e RSLinx Classic",
    description:
      "Driver Ethernet Devices versus Ethernet/IP no RSLinx, identificação de módulos remotos na rede, definição de IP estático com BootP/DHCP Tool e teste de ping industrial.",
    videoUrl: "",
    formUrl: "",
    order: 3,
    duration: "20 min",
  },
  {
    id: "aula-2-1",
    courseId: "rockwell-basico",
    moduleId: "mod-2",
    title: "Entradas e Saídas Analógicas (4-20mA e 0-10V) e Resolução",
    description:
      "Diferença entre sinais em tensão e corrente, imunidade a ruídos em cabos blindados, resolução de conversores A/D de 16 bits e configuração do cartão 1769-IF4 / 1756-IF8.",
    videoUrl: "",
    formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSc-demo-forms-vl-automacoes/viewform",
    order: 4,
    duration: "22 min",
  },
  {
    id: "aula-2-2",
    courseId: "rockwell-basico",
    moduleId: "mod-2",
    title: "Instruções SCL, SCP e Normalização de Variáveis de Processo",
    description:
      "Como transformar valores brutos (raw data: 0 a 32767) em unidades de engenharia reais (bar, °C, m³/h) utilizando instruções matemáticas e Add-On Instructions (AOI).",
    videoUrl: "",
    formUrl: "",
    order: 5,
    duration: "28 min",
  },
  {
    id: "aula-2-3",
    courseId: "rockwell-basico",
    moduleId: "mod-2",
    title: "Sintonia e Aplicação do Bloco de Controle PID",
    description:
      "Configuração da instrução PID no Studio 5000: Setpoint (SP), Process Variable (PV) e Control Variable (CV). Técnicas práticas de sintonia proporcional, integral e derivativa em bancada.",
    videoUrl: "",
    formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSc-demo-forms-vl-automacoes/viewform",
    order: 6,
    duration: "35 min",
  },
  {
    id: "aula-3-1",
    courseId: "rockwell-basico",
    moduleId: "mod-3",
    title: "Arquitetura de Acionamentos e Configuração do Inversor PowerFlex",
    description:
      "Adição do inversor PowerFlex 525 na árvore de I/O do Studio 5000. Configuração de parâmetros de placa do motor, tempos de aceleração e desaceleração, e proteção térmica.",
    videoUrl: "",
    formUrl: "",
    order: 7,
    duration: "26 min",
  },
  {
    id: "aula-3-2",
    courseId: "rockwell-basico",
    moduleId: "mod-3",
    title: "Comandos de Partida, Referência de Frequência e Leitura de Corrente",
    description:
      "Manipulação da Logic Command Word e Frequency Reference. Leitura em tempo real do status de rotação (RPM), corrente consumida (A) e código de falhas diretamente no ladder.",
    videoUrl: "",
    formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSc-demo-forms-vl-automacoes/viewform",
    order: 8,
    duration: "30 min",
  },
  {
    id: "aula-4-1",
    courseId: "rockwell-basico",
    moduleId: "mod-4",
    title: "Criação da Aplicação e Telas no FactoryTalk View",
    description:
      "Estruturação de telas de sinóptico, navegação por botões, animações de rotação de bombas e misturadores, e vínculos gráficos com as variáveis do controlador.",
    videoUrl: "",
    formUrl: "",
    order: 9,
    duration: "32 min",
  },
  {
    id: "aula-4-2",
    courseId: "rockwell-basico",
    moduleId: "mod-4",
    title: "Tags de Comunicação, Alarmes, Tendências (Trends) e Conclusão",
    description:
      "Configuração do FactoryTalk Linx, registro histórico de variáveis analógicas em gráficos de tendência (TrendX), gerenciamento de mensagens de alarme de processo e checklist de encerramento do curso.",
    videoUrl: "",
    formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSc-demo-forms-vl-automacoes/viewform",
    order: 10,
    duration: "40 min",
  },
];

export const AVAILABLE_COURSES: Course[] = [
  {
    id: "rockwell-basico",
    title: "Programação Rockwell - Básico",
    subtitle: "Fundamentos de ControlLogix, Studio 5000, comunicação RSLinx e lógica ladder",
    description:
      "Aprenda na prática a arquitetura ControlLogix e CompactLogix da Rockwell Automation com Studio 5000. Domine escalonamento analógico 4-20mA/0-10V, sintonia de malhas PID, parametrização de inversores PowerFlex via Ethernet/IP e criação de telas de supervisório no FactoryTalk View.",
    category: "Automação Industrial & CLPs",
    instructor: "Eng. Victor Lima - VL Automações",
    badge: "",
    totalLessons: BASIC_ROCKWELL_LESSONS.length,
    lessons: BASIC_ROCKWELL_LESSONS,
  },
  {
    id: "rockwell-intermediario",
    title: "Programação Rockwell - Intermediário",
    subtitle: "Controle Analógico Avançado, Instruções AOI, UDTs e Sintonia PID",
    description:
      "Aprofunde seus conhecimentos práticos em manipulação avançada de sinais industriais, criação de Add-On Instructions (AOI), tipos de dados definidos pelo usuário (UDT), e parametrização detalhada de inversores PowerFlex via Ethernet/IP.",
    category: "Automação Industrial & CLPs",
    instructor: "Eng. Victor Lima - VL Automações",
    badge: "",
    totalLessons: 0,
    lessons: [],
  },
  {
    id: "rockwell-avancado",
    title: "Programação Rockwell - Avançado",
    subtitle: "Supervisório FactoryTalk View SCADA, Redes Industriais e Otimização",
    description:
      "Domine o desenvolvimento de sistemas supervisórios completos com FactoryTalk View SE/ME, controle em malha fechada, redundância de controladores ControlLogix, gestão de alarmes industriais e diagnóstico de falhas.",
    category: "Automação Industrial & CLPs",
    instructor: "Eng. Victor Lima - VL Automações",
    badge: "",
    totalLessons: 0,
    lessons: [],
  },
];

// Curso inicial padrão
export const INITIAL_COURSE_ID = "rockwell-basico";
export const INITIAL_COURSE: Course = AVAILABLE_COURSES[0];

/**
 * Utilitário universal para converter links de vídeos (YouTube ou Google Drive)
 * para exibição em iframe no player.
 *
 * Suporta YouTube:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 *
 * Suporta Google Drive:
 * - https://drive.google.com/file/d/FILE_ID/view...
 * - https://drive.google.com/file/d/FILE_ID/preview
 * - https://drive.google.com/open?id=FILE_ID
 */
export function getVideoEmbedUrl(urlOrId?: string): string {
  if (!urlOrId || typeof urlOrId !== "string") return "";
  const trimmed = urlOrId.trim();
  if (!trimmed) return "";

  // 1. YouTube
  if (trimmed.includes("youtube.com/watch")) {
    const vMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]+)/);
    if (vMatch && vMatch[1]) {
      return `https://www.youtube.com/embed/${vMatch[1]}`;
    }
  }

  if (trimmed.includes("youtu.be/")) {
    const idMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      return `https://www.youtube.com/embed/${idMatch[1]}`;
    }
  }

  if (trimmed.includes("youtube.com/shorts/")) {
    const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
    if (shortsMatch && shortsMatch[1]) {
      return `https://www.youtube.com/embed/${shortsMatch[1]}`;
    }
  }

  if (trimmed.includes("youtube.com/embed/")) {
    return trimmed;
  }

  // 2. Google Drive
  if (trimmed.includes("drive.google.com/file/d/") && trimmed.includes("/preview")) {
    return trimmed;
  }

  const fileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch && fileMatch[1]) {
    return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  }

  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) {
    return `https://drive.google.com/file/d/${idParamMatch[1]}/preview`;
  }

  if (/^[a-zA-Z0-9_-]{25,}$/.test(trimmed)) {
    return `https://drive.google.com/file/d/${trimmed}/preview`;
  }

  return trimmed;
}

/**
 * Utilitário mantido para compatibilidade
 */
export function getGoogleDriveEmbedUrl(urlOrId?: string): string {
  return getVideoEmbedUrl(urlOrId);
}
