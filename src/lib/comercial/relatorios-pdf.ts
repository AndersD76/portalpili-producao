import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ESTAGIOS_LABELS: Record<string, string> = {
  PROSPECCAO: 'Prospecção',
  QUALIFICACAO: 'Qualificação',
  PROPOSTA: 'Proposta',
  EM_ANALISE: 'Em Análise',
  EM_NEGOCIACAO: 'Em Negociação',
  FECHADA: 'Fechada',
  PERDIDA: 'Perdida',
  SUSPENSO: 'Suspenso',
  SUBSTITUIDO: 'Substituído',
  TESTE: 'Teste',
};

const SITUACAO_LABELS: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  GERADA: 'Gerada',
  ENVIADA: 'Enviada',
  EM_NEGOCIACAO: 'Em Negociação',
  APROVADA: 'Aprovada',
  FECHADA: 'Fechada',
  REJEITADA: 'Rejeitada',
  PERDIDA: 'Perdida',
  EXPIRADA: 'Expirada',
  CANCELADA: 'Cancelada',
  SUBSTITUIDA: 'Substituída',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
}

function gerarHeader(doc: jsPDF, titulo: string, periodo: string) {
  // Red header bar
  doc.setFillColor(220, 38, 38); // red-600
  doc.rect(0, 0, doc.internal.pageSize.width, 28, 'F');

  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('PILI', 14, 14);

  // Report title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(titulo, 14, 23);

  // Period & date on right
  doc.setFontSize(9);
  const pageW = doc.internal.pageSize.width;
  doc.text(periodo, pageW - 14, 14, { align: 'right' });
  doc.text(`Gerado: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, pageW - 14, 23, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  return 35; // y position after header
}

function gerarFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.height;
    const pageW = doc.internal.pageSize.width;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Portal Pili - Sistema de Gestão Comercial', 14, pageH - 8);
    doc.text(`Página ${i} de ${pageCount}`, pageW - 14, pageH - 8, { align: 'right' });
  }
}

function addSectionTitle(doc: jsPDF, y: number, title: string): number {
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 65, 81); // gray-700
  doc.text(title, 14, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  return y + 6;
}

function addKpiBox(doc: jsPDF, x: number, y: number, w: number, label: string, value: string) {
  doc.setFillColor(249, 250, 251); // gray-50
  doc.roundedRect(x, y, w, 22, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128); // gray-500
  doc.text(label, x + w / 2, y + 7, { align: 'center' });
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39); // gray-900
  doc.setFont('helvetica', 'bold');
  doc.text(value, x + w / 2, y + 17, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
}

// ============================================
// RELATÓRIO GERAL (TOTAIS)
// ============================================

interface TotaisData {
  pipeline: Array<{ estagio: string; quantidade: string; valor_total: string; prob_media: string }>;
  kpis: {
    total: number;
    abertas: number;
    ganhas: number;
    perdidas: number;
    valor_abertas: number;
    valor_ganho: number;
    ticket_medio: number;
    taxa_conversao: number;
  };
  propostas: Array<{ situacao: string; quantidade: string; valor_total: string }>;
  clientes: { total: string; ativos: string };
}

export function gerarRelatorioTotais(dados: TotaisData, periodo: string) {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  let y = gerarHeader(doc, 'Relatório Geral - Resumo Comercial', periodo);

  // KPI boxes
  const kpi = dados.kpis;
  const boxW = 42;
  const gap = 4;
  const startX = 14;

  addKpiBox(doc, startX, y, boxW, 'Oportunidades', String(kpi.total));
  addKpiBox(doc, startX + boxW + gap, y, boxW, 'Em Aberto', formatCurrency(kpi.valor_abertas));
  addKpiBox(doc, startX + 2 * (boxW + gap), y, boxW, 'Valor Ganho', formatCurrency(kpi.valor_ganho));
  addKpiBox(doc, startX + 3 * (boxW + gap), y, boxW, 'Conversão', formatPercent(kpi.taxa_conversao));
  y += 30;

  // Pipeline table
  y = addSectionTitle(doc, y, 'Pipeline por Estágio');

  autoTable(doc, {
    startY: y,
    head: [['Estágio', 'Quantidade', 'Valor Total', 'Prob. Média']],
    body: dados.pipeline.map(p => [
      ESTAGIOS_LABELS[p.estagio] || p.estagio,
      String(toNum(p.quantidade)),
      formatCurrency(toNum(p.valor_total)),
      formatPercent(toNum(p.prob_media)),
    ]),
    foot: [[
      'TOTAL',
      String(dados.pipeline.reduce((s, p) => s + toNum(p.quantidade), 0)),
      formatCurrency(dados.pipeline.reduce((s, p) => s + toNum(p.valor_total), 0)),
      '',
    ]],
    theme: 'grid',
    headStyles: { fillColor: [220, 38, 38], textColor: 255, fontSize: 9 },
    footStyles: { fillColor: [249, 250, 251], textColor: [17, 24, 39], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10;

  // Propostas table
  if (dados.propostas.length > 0) {
    y = addSectionTitle(doc, y, 'Propostas por Situação');

    autoTable(doc, {
      startY: y,
      head: [['Situação', 'Quantidade', 'Valor Total']],
      body: dados.propostas.map(p => [
        SITUACAO_LABELS[p.situacao] || p.situacao,
        String(toNum(p.quantidade)),
        formatCurrency(toNum(p.valor_total)),
      ]),
      foot: [[
        'TOTAL',
        String(dados.propostas.reduce((s, p) => s + toNum(p.quantidade), 0)),
        formatCurrency(dados.propostas.reduce((s, p) => s + toNum(p.valor_total), 0)),
      ]],
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38], textColor: 255, fontSize: 9 },
      footStyles: { fillColor: [249, 250, 251], textColor: [17, 24, 39], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'right' },
      },
      margin: { left: 14, right: 14 },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Clientes summary
  const clientes = dados.clientes;
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text(`Clientes: ${toNum(clientes.total)} total | ${toNum(clientes.ativos)} ativos`, 14, y);

  gerarFooter(doc);
  doc.save('relatorio-geral-comercial.pdf');
}

// ============================================
// RELATÓRIO POR VENDEDOR
// ============================================

interface VendedoresData {
  vendedores: Array<{
    id: number;
    nome: string;
    tipo: string;
    comissao_padrao: string;
    total_oportunidades: string;
    ganhas: string;
    perdidas: string;
    valor_ganho: string;
    valor_aberto: string;
    total_clientes: string;
  }>;
  propostas_vendedor: Array<{
    vendedor_nome: string;
    total_propostas: string;
    aprovadas: string;
    valor_total: string;
  }>;
}

export function gerarRelatorioVendedores(dados: VendedoresData, periodo: string) {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  let y = gerarHeader(doc, 'Relatório por Vendedor', periodo);

  // Vendedores table
  y = addSectionTitle(doc, y, 'Desempenho por Vendedor');

  autoTable(doc, {
    startY: y,
    head: [['Vendedor', 'Tipo', 'Oport.', 'Ganhas', 'Perdidas', 'Conv. %', 'Valor Ganho', 'Em Aberto', 'Clientes', 'Comissão']],
    body: dados.vendedores.map(v => {
      const ganhas = toNum(v.ganhas);
      const perdidas = toNum(v.perdidas);
      const total = ganhas + perdidas;
      const conv = total > 0 ? (ganhas / total) * 100 : 0;
      const comissao = toNum(v.comissao_padrao) * toNum(v.valor_ganho);
      return [
        v.nome,
        v.tipo === 'INTERNO' ? 'Interno' : 'Representante',
        String(toNum(v.total_oportunidades)),
        String(ganhas),
        String(perdidas),
        formatPercent(conv),
        formatCurrency(toNum(v.valor_ganho)),
        formatCurrency(toNum(v.valor_aberto)),
        String(toNum(v.total_clientes)),
        formatCurrency(comissao),
      ];
    }),
    foot: [[
      'TOTAL',
      '',
      String(dados.vendedores.reduce((s, v) => s + toNum(v.total_oportunidades), 0)),
      String(dados.vendedores.reduce((s, v) => s + toNum(v.ganhas), 0)),
      String(dados.vendedores.reduce((s, v) => s + toNum(v.perdidas), 0)),
      '',
      formatCurrency(dados.vendedores.reduce((s, v) => s + toNum(v.valor_ganho), 0)),
      formatCurrency(dados.vendedores.reduce((s, v) => s + toNum(v.valor_aberto), 0)),
      String(dados.vendedores.reduce((s, v) => s + toNum(v.total_clientes), 0)),
      formatCurrency(dados.vendedores.reduce((s, v) => s + toNum(v.comissao_padrao) * toNum(v.valor_ganho), 0)),
    ]],
    theme: 'grid',
    headStyles: { fillColor: [220, 38, 38], textColor: 255, fontSize: 8 },
    footStyles: { fillColor: [249, 250, 251], textColor: [17, 24, 39], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'center' },
      9: { halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10;

  // Propostas por vendedor
  if (dados.propostas_vendedor.length > 0) {
    y = addSectionTitle(doc, y, 'Propostas por Vendedor');

    autoTable(doc, {
      startY: y,
      head: [['Vendedor', 'Total Propostas', 'Aprovadas', 'Valor Total']],
      body: dados.propostas_vendedor.map(p => [
        p.vendedor_nome,
        String(toNum(p.total_propostas)),
        String(toNum(p.aprovadas)),
        formatCurrency(toNum(p.valor_total)),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'right' },
      },
      margin: { left: 14, right: 14 },
    });
  }

  gerarFooter(doc);
  doc.save('relatorio-vendedores.pdf');
}

// ============================================
// RELATÓRIO POR PRODUTO
// ============================================

interface ProdutosData {
  produtos: Array<{
    produto: string;
    total: string;
    abertas: string;
    ganhas: string;
    perdidas: string;
    valor_total: string;
    valor_ganho: string;
    valor_medio: string;
  }>;
  pipeline_produto: Array<{
    produto: string;
    estagio: string;
    quantidade: string;
    valor_total: string;
  }>;
  propostas_produto: Array<{
    produto: string;
    total_propostas: string;
    aprovadas: string;
    valor_total: string;
  }>;
}

export function gerarRelatorioProdutos(dados: ProdutosData, periodo: string) {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  let y = gerarHeader(doc, 'Relatório por Produto', periodo);

  // Summary table
  y = addSectionTitle(doc, y, 'Resumo por Produto');

  autoTable(doc, {
    startY: y,
    head: [['Produto', 'Total', 'Abertas', 'Ganhas', 'Perdidas', 'Conversão', 'Valor Total', 'Valor Ganho', 'Ticket Médio']],
    body: dados.produtos.map(p => {
      const ganhas = toNum(p.ganhas);
      const perdidas = toNum(p.perdidas);
      const total = ganhas + perdidas;
      const conv = total > 0 ? (ganhas / total) * 100 : 0;
      return [
        p.produto || 'N/D',
        String(toNum(p.total)),
        String(toNum(p.abertas)),
        String(ganhas),
        String(perdidas),
        formatPercent(conv),
        formatCurrency(toNum(p.valor_total)),
        formatCurrency(toNum(p.valor_ganho)),
        formatCurrency(toNum(p.valor_medio)),
      ];
    }),
    foot: [[
      'TOTAL',
      String(dados.produtos.reduce((s, p) => s + toNum(p.total), 0)),
      String(dados.produtos.reduce((s, p) => s + toNum(p.abertas), 0)),
      String(dados.produtos.reduce((s, p) => s + toNum(p.ganhas), 0)),
      String(dados.produtos.reduce((s, p) => s + toNum(p.perdidas), 0)),
      '',
      formatCurrency(dados.produtos.reduce((s, p) => s + toNum(p.valor_total), 0)),
      formatCurrency(dados.produtos.reduce((s, p) => s + toNum(p.valor_ganho), 0)),
      '',
    ]],
    theme: 'grid',
    headStyles: { fillColor: [220, 38, 38], textColor: 255, fontSize: 8 },
    footStyles: { fillColor: [249, 250, 251], textColor: [17, 24, 39], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10;

  // Pipeline breakdown per product
  y = addSectionTitle(doc, y, 'Pipeline por Produto e Estágio');

  autoTable(doc, {
    startY: y,
    head: [['Produto', 'Estágio', 'Quantidade', 'Valor']],
    body: dados.pipeline_produto.map(p => [
      p.produto || 'N/D',
      ESTAGIOS_LABELS[p.estagio] || p.estagio,
      String(toNum(p.quantidade)),
      formatCurrency(toNum(p.valor_total)),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [220, 38, 38], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      2: { halign: 'center' },
      3: { halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10;

  // Propostas por produto
  if (dados.propostas_produto.length > 0) {
    y = addSectionTitle(doc, y, 'Propostas por Produto');

    autoTable(doc, {
      startY: y,
      head: [['Produto', 'Total Propostas', 'Aprovadas', 'Valor Total']],
      body: dados.propostas_produto.map(p => [
        p.produto || 'N/D',
        String(toNum(p.total_propostas)),
        String(toNum(p.aprovadas)),
        formatCurrency(toNum(p.valor_total)),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'right' },
      },
      margin: { left: 14, right: 14 },
    });
  }

  gerarFooter(doc);
  doc.save('relatorio-produtos.pdf');
}
