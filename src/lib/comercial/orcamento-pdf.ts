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
  numeroProposta?: number;

  clienteNome?: string;
  clienteEmpresa?: string;
  clienteCNPJ?: string;
  decisorNome?: string;
  decisorTelefone?: string;
  decisorEmail?: string;

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

// Mapeamento de imagens por produto/tamanho
// Arquivos em public/products/
function getImagemProduto(produto: string, tamanho?: number): string | null {
  if (produto === 'TOMBADOR') {
    if (tamanho && tamanho <= 12) return '/products/tombador-11-12.png';
    if (tamanho === 18) return '/products/tombador-18.png';
    if (tamanho && tamanho >= 21) return '/products/tombador-21-30.png';
    return '/products/tombador-21-30.png'; // fallback
  }
  return null;
}

// Imagens de opcionais
function getImagemOpcional(nome: string): string | null {
  const lower = nome.toLowerCase();
  if (lower.includes('cilindro') && lower.includes('interno')) return '/products/cilindro-interno.png';
  if (lower.includes('cilindro') && lower.includes('externo')) return '/products/cilindro-externo.png';
  if (lower.includes('enclausuramento')) return '/products/enclausuramento.png';
  return null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Carrega imagem de URL e retorna base64 data URL
async function carregarImagem(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Pre-carrega todas as imagens necessarias
async function precarregarImagens(dados: DadosOrcamento): Promise<Map<string, string>> {
  const imagens = new Map<string, string>();
  const urls: string[] = [];

  // Logo
  urls.push('/logo-pili.png');

  // Imagem do produto principal
  const imgProduto = getImagemProduto(dados.produto, dados.tamanho);
  if (imgProduto) urls.push(imgProduto);

  // Imagens dos opcionais
  for (const item of dados.itens) {
    if (item.tipo === 'OPCIONAL') {
      const imgOpc = getImagemOpcional(item.descricao);
      if (imgOpc && !urls.includes(imgOpc)) urls.push(imgOpc);
    }
  }

  await Promise.all(
    urls.map(async (url) => {
      const data = await carregarImagem(url);
      if (data) imagens.set(url, data);
    })
  );

  return imagens;
}

function _buildOrcamentoDoc(
  dados: DadosOrcamento,
  imagens: Map<string, string>,
  rascunho: boolean
): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.width;
  const pageH = doc.internal.pageSize.height;
  const hoje = new Date();
  const validade = new Date(hoje);
  validade.setDate(validade.getDate() + (dados.validadeDias || 30));

  const numeroStr = dados.numeroProposta ? String(dados.numeroProposta).padStart(4, '0') : '';

  // === HEADER com logo ===
  doc.setFillColor(220, 38, 38);
  doc.rect(0, 0, pageW, 32, 'F');

  // Logo
  const logoData = imagens.get('/logo-pili.png');
  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', 10, 3, 26, 26);
    } catch { /* logo nao carregou */ }
  }

  const textStartX = logoData ? 40 : 14;

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('PILI EQUIPAMENTOS INDUSTRIAIS', textStartX, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (rascunho) {
    doc.text('PROPOSTA COMERCIAL - RASCUNHO', textStartX, 20);
  } else if (numeroStr) {
    doc.text(`ORCAMENTO N. ${numeroStr}`, textStartX, 20);
  } else {
    doc.text('PROPOSTA COMERCIAL', textStartX, 20);
  }

  doc.setFontSize(8);
  doc.text(`Data: ${hoje.toLocaleDateString('pt-BR')}`, pageW - 14, 10, { align: 'right' });
  doc.text(`Validade: ${validade.toLocaleDateString('pt-BR')}`, pageW - 14, 15, { align: 'right' });
  doc.text(`Qtd: ${dados.quantidade} unidade(s)`, pageW - 14, 20, { align: 'right' });
  if (numeroStr) {
    doc.text(`Ref: ${numeroStr}`, pageW - 14, 25, { align: 'right' });
  }

  doc.setTextColor(0, 0, 0);
  let y = 38;

  // === SAUDACAO ===
  const nomeCliente = dados.clienteNome || dados.clienteEmpresa || 'Cliente';
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(55, 65, 81);
  const saudacao = `Prezado(a) ${nomeCliente}, e com satisfacao que a Pili Equipamentos Industriais, referencia em solucoes para movimentacao de graos, apresenta esta proposta para o equipamento abaixo.`;
  const linhasSaudacao = doc.splitTextToSize(saudacao, pageW - 28);
  doc.text(linhasSaudacao, 14, y);
  y += linhasSaudacao.length * 4.5 + 3;
  doc.setTextColor(0, 0, 0);

  // === CLIENTE ===
  if (dados.clienteNome || dados.clienteEmpresa || dados.clienteCNPJ) {
    let blockH = 18;
    if (dados.clienteEmpresa && dados.clienteNome) blockH = 22;
    if (dados.clienteCNPJ) blockH += 5;
    if (dados.decisorNome || dados.decisorTelefone || dados.decisorEmail) blockH += 10;

    doc.setFillColor(249, 250, 251);
    doc.roundedRect(14, y, pageW - 28, blockH, 2, 2, 'F');

    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text('CLIENTE', 18, y + 5);

    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.text(dados.clienteEmpresa || dados.clienteNome || '', 18, y + 12);

    let clienteY = y + 12;

    if (dados.clienteCNPJ) {
      const cnpjFormatado = dados.clienteCNPJ.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text(`CNPJ: ${cnpjFormatado}`, pageW - 18, y + 5, { align: 'right' });
    }

    if (dados.clienteEmpresa && dados.clienteNome) {
      clienteY += 5;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(17, 24, 39);
      doc.text(`A/C: ${dados.clienteNome}`, 18, clienteY);
    }

    if (dados.decisorNome || dados.decisorTelefone || dados.decisorEmail) {
      clienteY += 6;
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text('DECISOR:', 18, clienteY);
      doc.setTextColor(17, 24, 39);
      const decisorParts: string[] = [];
      if (dados.decisorNome) decisorParts.push(dados.decisorNome);
      if (dados.decisorTelefone) decisorParts.push(dados.decisorTelefone);
      if (dados.decisorEmail) decisorParts.push(dados.decisorEmail);
      doc.text(decisorParts.join('  |  '), 40, clienteY);
    }

    y += blockH + 4;
  }

  // === EQUIPAMENTO + IMAGEM ===
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 65, 81);
  doc.text('Equipamento', 14, y);
  y += 2;

  const imgProdutoUrl = getImagemProduto(dados.produto, dados.tamanho);
  const imgProdutoData = imgProdutoUrl ? imagens.get(imgProdutoUrl) : null;

  if (imgProdutoData) {
    // Layout: imagem a direita, texto a esquerda
    const imgW = 70;
    const imgH = 45;
    const imgX = pageW - 14 - imgW;
    const imgY = y;

    try {
      // Fundo cinza claro atras da imagem
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(imgX - 2, imgY - 2, imgW + 4, imgH + 4, 2, 2, 'F');
      doc.addImage(imgProdutoData, 'PNG', imgX, imgY, imgW, imgH);
    } catch { /* imagem nao carregou */ }

    // Texto do produto ao lado esquerdo
    const textMaxW = imgX - 14 - 4;

    y += 5;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    const descLines = doc.splitTextToSize(dados.descricaoProduto, textMaxW);
    doc.text(descLines, 14, y);
    y += descLines.length * 5 + 3;

    if (dados.dadosTecnicos) {
      const specs: string[] = [];
      if (dados.dadosTecnicos.qtCilindros) specs.push(`${dados.dadosTecnicos.qtCilindros} cilindro(s)`);
      if (dados.dadosTecnicos.qtMotores) specs.push(`${dados.dadosTecnicos.qtMotores} motor(es)`);
      if (dados.dadosTecnicos.qtOleo) specs.push(`${dados.dadosTecnicos.qtOleo}L oleo`);
      if (dados.dadosTecnicos.anguloInclinacao) specs.push(`Incl.: ${dados.dadosTecnicos.anguloInclinacao}`);
      if (specs.length > 0) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        specs.forEach(spec => {
          doc.text(`• ${spec}`, 16, y);
          y += 4;
        });
      }
    }

    // Garantir que y passe abaixo da imagem
    y = Math.max(y, imgY + imgH + 6);
  } else {
    // Sem imagem - layout normal
    y += 4;
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
  }

  // === TABELA DE ITENS ===
  const bodyRows = dados.itens.map((item, i) => [
    String(i + 1),
    item.descricao,
    item.tipo === 'BASE' ? '' : String(item.quantidade),
    item.tipo === 'BASE' ? '' : formatCurrency(item.valorUnitario),
    formatCurrency(item.valorTotal),
  ]);

  bodyRows.push(['', '', '', 'Subtotal', formatCurrency(dados.subtotal)]);

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

  // === IMAGENS DOS OPCIONAIS (se houver) ===
  const opcionaisComImagem = dados.itens
    .filter(item => item.tipo === 'OPCIONAL')
    .map(item => ({ item, imgUrl: getImagemOpcional(item.descricao) }))
    .filter(({ imgUrl }) => imgUrl && imagens.has(imgUrl!));

  if (opcionaisComImagem.length > 0) {
    if (y > 220) { doc.addPage(); y = 20; }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(55, 65, 81);
    doc.text('Opcionais Inclusos', 14, y);
    y += 6;

    const imgSize = 35;
    const gap = 6;
    let xPos = 14;

    for (const { item, imgUrl } of opcionaisComImagem) {
      const imgData = imagens.get(imgUrl!);
      if (!imgData) continue;

      if (xPos + imgSize > pageW - 14) {
        xPos = 14;
        y += imgSize + 14;
      }
      if (y + imgSize > pageH - 30) {
        doc.addPage();
        y = 20;
        xPos = 14;
      }

      try {
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(xPos - 1, y - 1, imgSize + 2, imgSize + 2, 1, 1, 'F');
        doc.addImage(imgData, 'PNG', xPos, y, imgSize, imgSize);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(55, 65, 81);
        const label = doc.splitTextToSize(item.descricao, imgSize);
        doc.text(label, xPos + imgSize / 2, y + imgSize + 4, { align: 'center' });
      } catch { /* imagem opcional nao carregou */ }

      xPos += imgSize + gap;
    }

    y += imgSize + 16;
  }

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
    ['Validade da Proposta', `${dados.validadeDias} dias (ate ${validade.toLocaleDateString('pt-BR')})`],
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

  // === MARCA D'AGUA RASCUNHO ===
  if (rascunho) {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      // Texto grande e suave repetido na diagonal
      const gState = new (doc as any).GState({ opacity: 0.06 });
      doc.setGState(gState);
      doc.setFontSize(70);
      doc.setTextColor(220, 38, 38);
      doc.setFont('helvetica', 'bold');
      // Posicionar em 3 pontos da pagina
      doc.text('RASCUNHO', pageW / 2, 80, { align: 'center', angle: 45 });
      doc.text('RASCUNHO', pageW / 2, pageH / 2, { align: 'center', angle: 45 });
      doc.text('RASCUNHO', pageW / 2, pageH - 40, { align: 'center', angle: 45 });
      // Restaurar opacidade
      doc.setGState(new (doc as any).GState({ opacity: 1 }));
    }
  }

  // === FOOTER ===
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(220, 220, 220);
    doc.line(14, pageH - 16, pageW - 14, pageH - 16);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);

    if (rascunho) {
      doc.text('RASCUNHO - Documento sem valor comercial | PILI Equipamentos Industriais', 14, pageH - 10);
    } else {
      const footerLeft = numeroStr
        ? `Orcamento N. ${numeroStr} | PILI Equipamentos Industriais | Portal Pili`
        : 'PILI Equipamentos Industriais | Portal Pili - Sistema de Gestao Comercial';
      doc.text(footerLeft, 14, pageH - 10);
    }

    if (dados.vendedorNome) {
      doc.text(`Vendedor: ${dados.vendedorNome}${dados.vendedorEmail ? ` (${dados.vendedorEmail})` : ''}`, 14, pageH - 6);
    }
    doc.text(`Pagina ${i} de ${pageCount}`, pageW - 14, pageH - 10, { align: 'right' });
  }

  return doc;
}

function _buildNomeArquivo(dados: DadosOrcamento, rascunho: boolean): string {
  const data = new Date().toISOString().split('T')[0];
  const produto = dados.produto.toLowerCase();
  const prefix = rascunho ? 'rascunho' : 'orcamento';
  if (dados.numeroProposta) {
    const num = String(dados.numeroProposta).padStart(4, '0');
    return `${prefix}-pili-${num}-${produto}-${data}.pdf`;
  }
  return `${prefix}-pili-${produto}-${data}.pdf`;
}

// === API Publica ===

export async function gerarOrcamentoPDF(dados: DadosOrcamento): Promise<void> {
  const imagens = await precarregarImagens(dados);
  const doc = _buildOrcamentoDoc(dados, imagens, false);
  doc.save(_buildNomeArquivo(dados, false));
}

export async function gerarRascunhoPDF(dados: DadosOrcamento): Promise<void> {
  const imagens = await precarregarImagens(dados);
  const doc = _buildOrcamentoDoc(dados, imagens, true);
  doc.save(_buildNomeArquivo(dados, true));
}

export async function gerarOrcamentoPDFBlob(dados: DadosOrcamento): Promise<Blob> {
  const imagens = await precarregarImagens(dados);
  const doc = _buildOrcamentoDoc(dados, imagens, false);
  return doc.output('blob');
}

export async function gerarRascunhoPDFBlob(dados: DadosOrcamento): Promise<Blob> {
  const imagens = await precarregarImagens(dados);
  const doc = _buildOrcamentoDoc(dados, imagens, true);
  return doc.output('blob');
}

export function getNomeArquivoPDF(dados: DadosOrcamento): string {
  return _buildNomeArquivo(dados, false);
}
