import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ItemOrcamento {
  descricao: string;
  tipo: 'BASE' | 'OPCIONAL';
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface DadosOrcamento {
  clienteNome?: string;
  clienteEmpresa?: string;

  produto: string;
  descricaoProduto: string;
  tamanho?: number;
  dadosTecnicos?: {
    qtCilindros?: number;
    qtMotores?: number;
    qtOleo?: number;
    anguloInclinacao?: string;
  };

  itens: ItemOrcamento[];
  subtotal: number;
  descontoPercentual?: number;
  descontoValor?: number;
  valorFinal: number;

  quantidade: number;
  prazoEntrega: string;
  garantiaMeses: number;
  formaPagamento: string;
  validadeDias: number;
  observacoes?: string;

  vendedorNome?: string;
  vendedorEmail?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function gerarOrcamentoPDF(dados: DadosOrcamento): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.width;
  const hoje = new Date();
  const validade = new Date(hoje);
  validade.setDate(validade.getDate() + (dados.validadeDias || 30));

  // === HEADER ===
  doc.setFillColor(220, 38, 38);
  doc.rect(0, 0, pageW, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('PILI', 14, 14);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('ORCAMENTO', 14, 24);

  doc.setFontSize(9);
  doc.text(`Data: ${hoje.toLocaleDateString('pt-BR')}`, pageW - 14, 12, { align: 'right' });
  doc.text(`Validade: ${validade.toLocaleDateString('pt-BR')}`, pageW - 14, 18, { align: 'right' });
  doc.text(`Qtd: ${dados.quantidade} unidade(s)`, pageW - 14, 24, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  let y = 38;

  // === CLIENTE ===
  if (dados.clienteNome || dados.clienteEmpresa) {
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(14, y, pageW - 28, 18, 2, 2, 'F');

    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text('CLIENTE', 18, y + 5);

    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.text(dados.clienteEmpresa || dados.clienteNome || '', 18, y + 12);
    if (dados.clienteEmpresa && dados.clienteNome) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`A/C: ${dados.clienteNome}`, 18, y + 16);
      y += 22;
    } else {
      y += 22;
    }
  }

  // === EQUIPAMENTO ===
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 65, 81);
  doc.text('Equipamento', 14, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(dados.descricaoProduto, 14, y);
  y += 5;

  if (dados.dadosTecnicos) {
    const specs: string[] = [];
    if (dados.dadosTecnicos.qtCilindros) specs.push(`${dados.dadosTecnicos.qtCilindros} cilindro(s)`);
    if (dados.dadosTecnicos.qtMotores) specs.push(`${dados.dadosTecnicos.qtMotores} motor(es)`);
    if (dados.dadosTecnicos.qtOleo) specs.push(`${dados.dadosTecnicos.qtOleo}L oleo`);
    if (dados.dadosTecnicos.anguloInclinacao) specs.push(`Inclinacao: ${dados.dadosTecnicos.anguloInclinacao}`);
    if (specs.length > 0) {
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(specs.join('  |  '), 14, y);
      y += 4;
    }
  }
  y += 4;

  // === TABELA DE ITENS ===
  const bodyRows = dados.itens.map((item, i) => [
    String(i + 1),
    item.descricao,
    item.tipo === 'BASE' ? '' : String(item.quantidade),
    item.tipo === 'BASE' ? '' : formatCurrency(item.valorUnitario),
    formatCurrency(item.valorTotal),
  ]);

  // Subtotal row
  bodyRows.push(['', '', '', 'Subtotal', formatCurrency(dados.subtotal)]);

  // Discount row
  if (dados.descontoValor && dados.descontoValor > 0) {
    const descLabel = dados.descontoPercentual
      ? `Desconto (${dados.descontoPercentual}%)`
      : 'Desconto';
    bodyRows.push(['', '', '', descLabel, `- ${formatCurrency(dados.descontoValor)}`]);
  }

  autoTable(doc, {
    startY: y,
    head: [['#', 'Descricao', 'Qtd', 'Valor Unit.', 'Total']],
    body: bodyRows,
    theme: 'grid',
    headStyles: {
      fillColor: [220, 38, 38],
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: { fontSize: 9, textColor: [17, 24, 39] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 32, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      const rowIdx = data.row.index;
      const isSubtotal = rowIdx === dados.itens.length;
      const isDesconto = rowIdx === dados.itens.length + 1 && dados.descontoValor && dados.descontoValor > 0;
      if (isSubtotal || isDesconto) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [249, 250, 251];
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 4;

  // === TOTAL FINAL ===
  doc.setFillColor(220, 38, 38);
  doc.roundedRect(pageW - 14 - 80, y, 80, 14, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', pageW - 14 - 76, y + 9);
  doc.setFontSize(12);
  doc.text(formatCurrency(dados.valorFinal), pageW - 18, y + 9, { align: 'right' });

  y += 22;
  doc.setTextColor(0, 0, 0);

  // === CONDICOES COMERCIAIS ===
  if (y > 240) { doc.addPage(); y = 20; }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 65, 81);
  doc.text('Condicoes Comerciais', 14, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  const condicoes = [
    ['Quantidade', `${dados.quantidade} unidade(s)`],
    ['Prazo de Entrega', dados.prazoEntrega || '-'],
    ['Garantia', `${dados.garantiaMeses} meses`],
    ['Forma de Pagamento', dados.formaPagamento || '-'],
    ['Validade do Orcamento', `${dados.validadeDias} dias (ate ${validade.toLocaleDateString('pt-BR')})`],
  ];

  condicoes.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 65, y);
    y += 5;
  });

  // === OBSERVACOES ===
  if (dados.observacoes) {
    y += 4;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(55, 65, 81);
    doc.text('Observacoes', 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const lines = doc.splitTextToSize(dados.observacoes, pageW - 28);
    doc.text(lines, 14, y);
  }

  // === FOOTER ===
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.height;
    doc.setDrawColor(220, 220, 220);
    doc.line(14, pageH - 16, pageW - 14, pageH - 16);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('PILI Equipamentos Industriais | Portal Pili - Sistema de Gestao Comercial', 14, pageH - 10);
    if (dados.vendedorNome) {
      doc.text(`Vendedor: ${dados.vendedorNome}${dados.vendedorEmail ? ` (${dados.vendedorEmail})` : ''}`, 14, pageH - 6);
    }
    doc.text(`Pagina ${i} de ${pageCount}`, pageW - 14, pageH - 10, { align: 'right' });
  }

  // Download
  const nomeArquivo = `orcamento-pili-${dados.produto.toLowerCase()}-${hoje.toISOString().split('T')[0]}.pdf`;
  doc.save(nomeArquivo);
}
