/**
 * Dados do curso para a plataforma VL AUTOMAÇÕES.
 *
 * Curso: Programação Rockwell com Controle Analógico, Supervisório e Inversor
 * Estrutura: Curso -> Módulos -> Aulas
 *
 * Cada aula contém:
 * - title: Título da aula
 * - description: Descrição e objetivos
 * - videoUrl: Link do vídeo no Google Drive (o administrador pode inserir e editar)
 * - formUrl: Link do Google Forms para responder atividades práticas
 * - duration: Tempo estimado da aula
 */

import { Course } from "./types";

export const INITIAL_COURSE: Course = {
  id: "rockwell-controle-analogico-supervisorio",
  title: "Programação Rockwell com Controle Analógico, Supervisório e Inversor",
  subtitle: "Formação completa em automação de alto nível para indústrias modernas",
  description:
    "Aprenda na prática a arquitetura ControlLogix e CompactLogix da Rockwell Automation com Studio 5000. Domine escalonamento analógico 4-20mA/0-10V, sintonia de malhas PID, parametrização de inversores PowerFlex via Ethernet/IP e criação de telas de supervisório no FactoryTalk View.",
  category: "Automação Industrial & CLPs",
  instructor: "Eng. Victor Lima - VL Automações",
  badge: "Certificação Profissional",
  totalLessons: 10,
  modules: [
    {
      id: "mod-1",
      courseId: "rockwell-controle-analogico-supervisorio",
      title: "Módulo 1: Fundamentos de ControlLogix e Studio 5000",
      description: "Ambientação no software Studio 5000, comunicação RSLinx e estrutura de Tags.",
      order: 1,
      lessons: [
        {
          id: "aula-1-1",
          courseId: "rockwell-controle-analogico-supervisorio",
          moduleId: "mod-1",
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
          courseId: "rockwell-controle-analogico-supervisorio",
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
          courseId: "rockwell-controle-analogico-supervisorio",
          moduleId: "mod-1",
          title: "Configuração de Rede Ethernet/IP e RSLinx Classic",
          description:
            "Driver Ethernet Devices versus Ethernet/IP no RSLinx, identificação de módulos remotos na rede, definição de IP estático com BootP/DHCP Tool e teste de ping industrial.",
          videoUrl: "",
          formUrl: "",
          order: 3,
          duration: "20 min",
        },
      ],
    },
    {
      id: "mod-2",
      courseId: "rockwell-controle-analogico-supervisorio",
      title: "Módulo 2: Controle e Escalonamento de Sinais Analógicos",
      description: "Entradas 4-20mA / 0-10V, conversão digital e sintonia de algoritmo PID.",
      order: 2,
      lessons: [
        {
          id: "aula-2-1",
          courseId: "rockwell-controle-analogico-supervisorio",
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
          courseId: "rockwell-controle-analogico-supervisorio",
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
          courseId: "rockwell-controle-analogico-supervisorio",
          moduleId: "mod-2",
          title: "Sintonia e Aplicação do Bloco de Controle PID",
          description:
            "Configuração da instrução PID no Studio 5000: Setpoint (SP), Process Variable (PV) e Control Variable (CV). Técnicas práticas de sintonia proporcional, integral e derivativa em bancada.",
          videoUrl: "",
          formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSc-demo-forms-vl-automacoes/viewform",
          order: 6,
          duration: "35 min",
        },
      ],
    },
    {
      id: "mod-3",
      courseId: "rockwell-controle-analogico-supervisorio",
      title: "Módulo 3: Parametrização e Integração de Inversor PowerFlex",
      description: "Controle de motor elétrico via rede Ethernet/IP e comandos digitais.",
      order: 3,
      lessons: [
        {
          id: "aula-3-1",
          courseId: "rockwell-controle-analogico-supervisorio",
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
          courseId: "rockwell-controle-analogico-supervisorio",
          moduleId: "mod-3",
          title: "Comandos de Partida, Referência de Frequência e Leitura de Corrente",
          description:
            "Manipulação da Logic Command Word e Frequency Reference. Leitura em tempo real do status de rotação (RPM), corrente consumida (A) e código de falhas diretamente no ladder.",
          videoUrl: "",
          formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSc-demo-forms-vl-automacoes/viewform",
          order: 8,
          duration: "30 min",
        },
      ],
    },
    {
      id: "mod-4",
      courseId: "rockwell-controle-analogico-supervisorio",
      title: "Módulo 4: Supervisório e Interface Homem-Máquina (SCADA / IHM)",
      description: "Desenvolvimento de telas industriais no FactoryTalk View ME/SE.",
      order: 4,
      lessons: [
        {
          id: "aula-4-1",
          courseId: "rockwell-controle-analogico-supervisorio",
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
          courseId: "rockwell-controle-analogico-supervisorio",
          moduleId: "mod-4",
          title: "Tags de Comunicação, Alarmes, Tendências (Trends) e Conclusão",
          description:
            "Configuração do FactoryTalk Linx, registro histórico de variáveis analógicas em gráficos de tendência (TrendX), gerenciamento de mensagens de alarme de processo e checklist de encerramento do curso.",
          videoUrl: "",
          formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSc-demo-forms-vl-automacoes/viewform",
          order: 10,
          duration: "40 min",
        },
      ],
    },
  ],
};

/**
 * Utilitário para converter qualquer link ou ID do Google Drive no formato embed (preview).
 * Exemplos suportados:
 * - https://drive.google.com/file/d/1abcXYZ.../view?usp=sharing
 * - https://drive.google.com/file/d/1abcXYZ.../preview
 * - https://drive.google.com/open?id=1abcXYZ...
 * - https://drive.google.com/uc?id=1abcXYZ...
 * - ID puro do arquivo do Google Drive
 */
export function getGoogleDriveEmbedUrl(urlOrId?: string): string {
  if (!urlOrId || typeof urlOrId !== "string") return "";
  const trimmed = urlOrId.trim();
  if (!trimmed) return "";

  // Se já for uma URL direta com /preview
  if (trimmed.includes("drive.google.com/file/d/") && trimmed.includes("/preview")) {
    return trimmed;
  }

  // Se for o formato /file/d/{ID}/view ou similar
  const fileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch && fileMatch[1]) {
    return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  }

  // Se for o formato ?id={ID}
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) {
    return `https://drive.google.com/file/d/${idParamMatch[1]}/preview`;
  }

  // Se o usuário colou apenas o ID alfanumérico do Google Drive (geralmente 25-45 caracteres)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return `https://drive.google.com/file/d/${trimmed}/preview`;
  }

  return trimmed;
}
