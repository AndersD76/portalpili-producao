/**
 * CRM PILI V2 - GERENTE COMERCIAL IA AVANÇADO
 * Sistema inteligente de gestão de vendas com análise preditiva, matching por nome e cruzamento de dados
 *
 * ⚠️⚠️⚠️ IMPORTANTE - CONFIGURAÇÃO OBRIGATÓRIA ⚠️⚠️⚠️
 *
 * PASSO 1: Obtenha sua API Key do Claude em: https://console.anthropic.com/settings/keys
 * PASSO 2: Cole sua API Key na linha 15 onde está escrito 'COLE_SUA_API_KEY_AQUI'
 * PASSO 3: Salve o arquivo e recarregue a planilha
 *
 * PRONTO! O sistema vai funcionar automaticamente.
 */

// ==================== CONFIGURAÇÕES ====================
function obterNomeAbaFormulario() {
  // Busca automaticamente a aba que contém "Respostas" ou "formulário" no nome
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const abas = ss.getSheets();

  Logger.log('obterNomeAbaFormulario: Procurando aba do formulário...');
  Logger.log('Total de abas: ' + abas.length);

  // Lista todas as abas para debug
  abas.forEach(aba => {
    Logger.log('  - ' + aba.getName());
  });

  // Procurar por padrões comuns
  const padroes = ['Respostas', 'respostas', 'formulário', 'formulario', 'Formulário', 'Formulario', 'Form'];

  for (const aba of abas) {
    const nome = aba.getName();
    for (const padrao of padroes) {
      if (nome.includes(padrao)) {
        Logger.log('Aba encontrada: "' + nome + '" (padrão: "' + padrao + '")');
        return nome;
      }
    }
  }

  // Se não encontrar, retorna a primeira aba com mais de 1 linha
  Logger.log('AVISO: Nenhuma aba com padrão conhecido encontrada. Usando primeira aba com dados.');
  for (const aba of abas) {
    if (aba.getLastRow() > 1) {
      Logger.log('Usando aba: "' + aba.getName() + '"');
      return aba.getName();
    }
  }

  // Último recurso: primeira aba
  if (abas.length > 0) {
    Logger.log('AVISO: Usando primeira aba como último recurso: "' + abas[0].getName() + '"');
    return abas[0].getName();
  }

  Logger.log('ERRO: Nenhuma aba encontrada na planilha!');
  return '';
}

// ==================== API KEY SEGURA ====================
// A API Key agora é armazenada de forma segura usando PropertiesService
// Para configurar: vá em Extensões > Apps Script > Executar > configurarApiKey()
// Ou use: PropertiesService.getScriptProperties().setProperty('CLAUDE_API_KEY', 'sua-key-aqui')

function obterClaudeApiKey() {
  const key = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  if (!key || key === 'COLE_SUA_API_KEY_AQUI') {
    throw new Error('❌ API Key do Claude não configurada! Execute a função configurarApiKey() ou defina manualmente.');
  }
  return key;
}

// Função helper para configurar a API Key de forma segura
function configurarApiKey() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    '🔑 Configurar API Key do Claude',
    'Cole sua API Key do Claude aqui:\n(Obtenha em: https://console.anthropic.com/settings/keys)',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() === ui.Button.OK) {
    const apiKey = response.getResponseText().trim();
    if (apiKey && apiKey.length > 20) {
      PropertiesService.getScriptProperties().setProperty('CLAUDE_API_KEY', apiKey);
      ui.alert('✅ Sucesso!', 'API Key configurada com segurança.', ui.ButtonSet.OK);
    } else {
      ui.alert('❌ Erro', 'API Key inválida. Tente novamente.', ui.ButtonSet.OK);
    }
  }
}

const CONFIG = {
  get ABA_FORMULARIO() { return obterNomeAbaFormulario(); },
  ABA_CONTROLE: 'CRM_CONTROLE',
  ABA_HISTORICO_CLIENTES: 'HISTORICO_CLIENTES',
  ABA_DADOS_ENRIQUECIDOS: 'DADOS_ENRIQUECIDOS',
  ABA_ANALISES_IA: 'ANALISES_IA',
  CLAUDE_MODEL: 'claude-sonnet-4-20250514',
  CACHE_TEMPO: 3600, // 1 hora em segundos
  SIMILARITY_THRESHOLD: 0.75, // Limiar para considerar nomes similares (75%)
  MAX_TENTATIVAS_API: 3
};

// Obtém API Key (primeiro tenta a constante, depois Script Properties, por último pergunta)
// Função legada - mantida para compatibilidade, agora usa obterClaudeApiKey()
function getApiKey() {
  try {
    return obterClaudeApiKey();
  } catch (e) {
    // Se não configurada, pergunta ao usuário
    const ui = SpreadsheetApp.getUi();
    const resp = ui.prompt(
      '🔑 Configurar API Key do Claude',
      'Cole sua API Key do Claude aqui:\n(Obtenha em: https://console.anthropic.com/settings/keys)',
      ui.ButtonSet.OK_CANCEL
    );

    if (resp.getSelectedButton() === ui.Button.OK) {
      const key = resp.getResponseText().trim();
      if (key && key.length > 20) {
        PropertiesService.getScriptProperties().setProperty('CLAUDE_API_KEY', key);
        return key;
      }
    }
    return null;
  }
}

// ETAPAS DO FUNIL
const ETAPAS = {
  'NOVO': { ordem: 1, cor: '#3498db', label: 'Novo', pesoProb: 15 },
  'CONTATO_FEITO': { ordem: 2, cor: '#9b59b6', label: 'Contato Feito', pesoProb: 25 },
  'AGUARDANDO_RETORNO': { ordem: 3, cor: '#f39c12', label: 'Aguardando Retorno', pesoProb: 35 },
  'NEGOCIACAO': { ordem: 4, cor: '#e67e22', label: 'Em Negociação', pesoProb: 50 },
  'PROPOSTA_ENVIADA': { ordem: 5, cor: '#1abc9c', label: 'Proposta Enviada', pesoProb: 60 },
  'FECHAMENTO': { ordem: 6, cor: '#27ae60', label: 'Fechamento', pesoProb: 80 },
  'GANHO': { ordem: 10, cor: '#27ae60', label: 'Ganho', pesoProb: 100 },
  'PERDIDO': { ordem: 11, cor: '#e74c3c', label: 'Perdido', pesoProb: 0 }
};

// ==================== MENU ====================
function onOpen() {
  var ui = SpreadsheetApp.getUi();

  // MENU ORIGINAL: Gerar Proposta (NÃO PODE SER REMOVIDO!)
  ui.createMenu('Gerar Proposta')
    .addItem('Listar Clientes em Análise', 'listarClientesEmAnalise')
    .addToUi();

  // MENU NOVO: CRM Inteligente
  ui.createMenu('🎯 CRM Inteligente')
    .addItem('📊 Abrir Pipeline', 'abrirPainelCRM')
    .addSeparator()
    .addItem('⚙️ Configurar API Key', 'configurarApiKeyCRM')
    .addItem('🔄 Sincronizar Dados', 'uiSincronizarCRM')
    .addItem('📋 Criar Abas de Controle', 'criarTodasAbasCRM')
    .addSeparator()
    .addItem('🔍 TESTAR: Diagnóstico Completo', 'testarSistemaDiagnostico')
    .addToUi();
}

// Renomear funções para evitar conflito
function abrirPainelCRM() {
  const html = HtmlService.createTemplateFromFile('Index')
    .evaluate().setWidth(1500).setHeight(950);
  SpreadsheetApp.getUi().showModalDialog(html, 'CRM PILI - Gerente Comercial IA');
}

// Função legada - mantida para compatibilidade, agora usa configurarApiKey()
function configurarApiKeyCRM() {
  configurarApiKey();
}

function uiSincronizarCRM() {
  const result = sincronizar();
  SpreadsheetApp.getUi().alert(result.msg);
}

function criarTodasAbasCRM() {
  criarAbaControle();
  criarAbaHistoricoClientes();
  criarAbaDadosEnriquecidos();
  criarAbaAnalisesIA();
  SpreadsheetApp.getUi().alert('Abas criadas com sucesso!');
}

// ==================== FUNÇÃO DE TESTE E DIAGNÓSTICO ====================
function testarSistemaDiagnostico() {
  const ui = SpreadsheetApp.getUi();
  let resultado = '🔍 DIAGNÓSTICO COMPLETO DO SISTEMA\n\n';

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Verificar abas
    resultado += '📋 ABAS DISPONÍVEIS:\n';
    const abas = ss.getSheets();
    abas.forEach(aba => {
      resultado += '  • ' + aba.getName() + ' (' + aba.getLastRow() + ' linhas)\n';
    });

    // 2. Verificar aba do formulário
    resultado += '\n📝 ABA DO FORMULÁRIO:\n';
    const nomeAbaForm = CONFIG.ABA_FORMULARIO;
    resultado += '  • Nome detectado: "' + nomeAbaForm + '"\n';
    const abaForm = ss.getSheetByName(nomeAbaForm);
    if (abaForm) {
      resultado += '  • Status: ✅ Encontrada\n';
      resultado += '  • Total linhas: ' + abaForm.getLastRow() + '\n';
      resultado += '  • Total colunas: ' + abaForm.getLastColumn() + '\n';

      const dados = abaForm.getDataRange().getValues();
      if (dados.length > 0) {
        resultado += '  • Cabeçalhos: ' + dados[0].join(', ') + '\n';
      }
      if (dados.length > 1) {
        resultado += '  • Primeira linha dados: [' + dados[1].slice(0, 6).join(', ') + '...]\n';
      }
    } else {
      resultado += '  • Status: ❌ NÃO ENCONTRADA\n';
    }

    // 3. Testar getPropostas()
    resultado += '\n🎯 TESTE getPropostas():\n';
    const props = getPropostas();
    resultado += '  • Total propostas retornadas: ' + props.length + '\n';

    if (props.length > 0) {
      resultado += '  • Primeira proposta:\n';
      resultado += '    - Número: ' + props[0].num + '\n';
      resultado += '    - Cliente: ' + props[0].cliente + '\n';
      resultado += '    - Etapa: ' + props[0].etapa + '\n';
      resultado += '    - Valor: ' + props[0].valorFmt + '\n';

      const ativas = props.filter(p => p.ativo);
      resultado += '  • Propostas ativas: ' + ativas.length + '\n';
      resultado += '  • Propostas ganhas: ' + props.filter(p => p.etapa === 'GANHO').length + '\n';
      resultado += '  • Propostas perdidas: ' + props.filter(p => p.etapa === 'PERDIDO').length + '\n';
    }

    // 4. Verificar aba de controle
    resultado += '\n📊 ABA DE CONTROLE:\n';
    const abaCtrl = ss.getSheetByName(CONFIG.ABA_CONTROLE);
    if (abaCtrl) {
      resultado += '  • Status: ✅ Encontrada\n';
      resultado += '  • Total linhas: ' + abaCtrl.getLastRow() + '\n';
    } else {
      resultado += '  • Status: ⚠️ Não encontrada (será criada ao sincronizar)\n';
    }

    // 5. Logs
    resultado += '\n📝 Para ver logs detalhados:\n';
    resultado += '  1. Menu: Extensões > Apps Script\n';
    resultado += '  2. Clique em "Execuções"\n';
    resultado += '  3. Veja os logs da última execução\n';

    resultado += '\n✅ Diagnóstico concluído!\n\n';
    resultado += 'Se getPropostas() retornou 0 propostas mas a aba tem dados,\n';
    resultado += 'verifique os logs no Apps Script para detalhes do erro.';

  } catch (erro) {
    resultado += '\n❌ ERRO NO DIAGNÓSTICO:\n' + erro + '\n\n' + erro.stack;
  }

  // Mostrar resultado
  ui.alert('Diagnóstico Completo', resultado, ui.ButtonSet.OK);
  Logger.log(resultado);
}

function configurarApiKey() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt('Configuração', 'Cole sua API Key do Claude (será armazenada de forma segura):', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() === ui.Button.OK) {
    PropertiesService.getScriptProperties().setProperty('CLAUDE_API_KEY', resp.getResponseText().trim());
    ui.alert('API Key configurada com sucesso!');
  }
}

function abrirPainel() {
  const html = HtmlService.createTemplateFromFile('Index')
    .evaluate().setWidth(1500).setHeight(950);
  SpreadsheetApp.getUi().showModalDialog(html, 'CRM PILI - Gerente Comercial IA');
}

function criarPropostaManual() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const abaForm = ss.getSheetByName(CONFIG.ABA_FORMULARIO);

  if (!abaForm) {
    ui.alert('❌ Erro', 'Aba "' + CONFIG.ABA_FORMULARIO + '" não encontrada!', ui.ButtonSet.OK);
    return;
  }

  // Coletar dados via prompt
  const cliente = ui.prompt('Cliente', 'Nome do Cliente:', ui.ButtonSet.OK_CANCEL);
  if (cliente.getSelectedButton() !== ui.Button.OK) return;

  const produto = ui.prompt('Produto', 'Produto (Tombador/Coletor):', ui.ButtonSet.OK_CANCEL);
  if (produto.getSelectedButton() !== ui.Button.OK) return;

  const vendedor = ui.prompt('Vendedor', 'Nome do Vendedor:', ui.ButtonSet.OK_CANCEL);
  if (vendedor.getSelectedButton() !== ui.Button.OK) return;

  const valor = ui.prompt('Valor', 'Valor da proposta (apenas números):', ui.ButtonSet.OK_CANCEL);
  if (valor.getSelectedButton() !== ui.Button.OK) return;

  const cnpj = ui.prompt('CNPJ (opcional)', 'CNPJ do cliente (ou deixe em branco):', ui.ButtonSet.OK_CANCEL);
  const cnpjVal = cnpj.getSelectedButton() === ui.Button.OK ? cnpj.getResponseText().trim() : '';

  const estado = ui.prompt('Estado', 'Estado (UF):', ui.ButtonSet.OK_CANCEL);
  if (estado.getSelectedButton() !== ui.Button.OK) return;

  const telefone = ui.prompt('Telefone (opcional)', 'Telefone do cliente:', ui.ButtonSet.OK_CANCEL);
  const telefoneVal = telefone.getSelectedButton() === ui.Button.OK ? telefone.getResponseText().trim() : '';

  const email = ui.prompt('E-mail (opcional)', 'E-mail do cliente:', ui.ButtonSet.OK_CANCEL);
  const emailVal = email.getSelectedButton() === ui.Button.OK ? email.getResponseText().trim() : '';

  // Validar valor
  const valorNum = parseFloat(valor.getResponseText().replace(/[^\d,.-]/g, '').replace(',', '.'));
  if (isNaN(valorNum)) {
    ui.alert('❌ Erro', 'Valor inválido!', ui.ButtonSet.OK);
    return;
  }

  // Gerar número da proposta (próximo disponível)
  const lastRow = abaForm.getLastRow();
  const numeroProposta = 'MANUAL-' + Date.now();

  // Calcular validade (30 dias a partir de hoje)
  const hoje = new Date();
  const validade = new Date(hoje.getTime() + (30 * 24 * 60 * 60 * 1000));

  // Adicionar na aba do formulário
  // Estrutura da planilha:
  // A: Situação, B: Carimbo, C: Número proposta, D: Produto, E: Vendedor, F: Razão Social,
  // G: País, H: Estado, ... L: CPF/CNPJ, M: E-mail/telefone/whatsapp, ... O: Validade (dias), ... CJ: TOTAL GERAL (R$)

  // Criar array com todas as colunas (preencher até a coluna que tem o valor)
  const novaLinha = new Array(200).fill(''); // Criar array grande o suficiente
  novaLinha[0] = ''; // A: Situação (vazio)
  novaLinha[1] = hoje; // B: Carimbo
  novaLinha[2] = numeroProposta; // C: Número proposta
  novaLinha[3] = produto.getResponseText().trim(); // D: Produto
  novaLinha[4] = vendedor.getResponseText().trim(); // E: Vendedor
  novaLinha[5] = cliente.getResponseText().trim(); // F: Razão Social (Cliente)
  novaLinha[6] = 'Brasil'; // G: País
  novaLinha[7] = estado.getResponseText().trim(); // H: Estado
  novaLinha[11] = cnpjVal; // L: CPF/CNPJ
  novaLinha[12] = (telefoneVal ? telefoneVal + ' | ' : '') + (emailVal || ''); // M: E-mail/telefone
  novaLinha[15] = '30'; // P: Validade da proposta em dias
  novaLinha[120] = valorNum; // TOTAL GERAL (coluna CJ, posição aproximada)

  abaForm.appendRow(novaLinha);

  // Criar entrada no CRM_CONTROLE
  let abaCtrl = ss.getSheetByName(CONFIG.ABA_CONTROLE);
  if (!abaCtrl) abaCtrl = criarAbaControle();

  const ctrlLinha = abaCtrl.getLastRow() + 1;
  abaCtrl.getRange(ctrlLinha, 1).setValue(numeroProposta); // PROPOSTA
  abaCtrl.getRange(ctrlLinha, 2).setValue('NOVO'); // ETAPA
  abaCtrl.getRange(ctrlLinha, 3).setValue(hoje); // DATA_CRIACAO

  ui.alert('✅ Sucesso!', 'Proposta criada: ' + numeroProposta + '\n\nCliente: ' + cliente.getResponseText() + '\nValor: R$ ' + valorNum.toLocaleString('pt-BR'), ui.ButtonSet.OK);

  // Atualizar histórico de clientes
  try {
    atualizarHistoricoClientes();
  } catch (e) {
    Logger.log('Erro ao atualizar histórico: ' + e);
  }
}

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate().setTitle('CRM PILI').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ==================== CRIAR ABAS ====================
function criarTodasAbas() {
  criarAbaControle();
  criarAbaHistoricoClientes();
  criarAbaDadosEnriquecidos();
  criarAbaAnalisesIA();
  SpreadsheetApp.getUi().alert('Abas criadas com sucesso!');
}

function criarAbaControle() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let aba = ss.getSheetByName(CONFIG.ABA_CONTROLE);
  if (!aba) {
    aba = ss.insertSheet(CONFIG.ABA_CONTROLE);
    const headers = ['PROPOSTA', 'ETAPA', 'DATA_CRIACAO', 'ULTIMO_CONTATO', 'PROXIMO_PASSO', 'DATA_PROXIMO', 'OBS', 'HISTORICO', 'SCORE_IA', 'ANALISE_IA', 'DADOS_CLIENTE_EXTERNO', 'CLIENTE_MATCH_ID', 'SCORE_MATCH'];
    aba.getRange(1, 1, 1, headers.length).setValues([headers]);
    aba.getRange(1, 1, 1, headers.length).setBackground('#1a1a2e').setFontColor('#fff').setFontWeight('bold');
    aba.setFrozenRows(1);
    aba.setColumnWidth(8, 300);
    aba.setColumnWidth(10, 400);
    aba.setColumnWidth(11, 400);
  }
  return aba;
}

function criarAbaHistoricoClientes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let aba = ss.getSheetByName(CONFIG.ABA_HISTORICO_CLIENTES);
  if (!aba) {
    aba = ss.insertSheet(CONFIG.ABA_HISTORICO_CLIENTES);
    const headers = ['ID_CLIENTE', 'NOME_NORMALIZADO', 'NOMES_VARIANTES', 'CNPJ', 'PROPOSTAS_TOTAL', 'PROPOSTAS_GANHAS', 'PROPOSTAS_PERDIDAS', 'VALOR_TOTAL_COMPRADO', 'ULTIMA_COMPRA', 'PRODUTOS_COMPRADOS', 'TICKET_MEDIO', 'TEMPO_MEDIO_FECHAMENTO', 'TAXA_CONVERSAO', 'SAZONALIDADE', 'PADRAO_COMPRA', 'DADOS_EXTERNOS', 'ATUALIZADO_EM'];
    aba.getRange(1, 1, 1, headers.length).setValues([headers]);
    aba.getRange(1, 1, 1, headers.length).setBackground('#1a1a2e').setFontColor('#fff').setFontWeight('bold');
    aba.setFrozenRows(1);
  }
  return aba;
}

function criarAbaDadosEnriquecidos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let aba = ss.getSheetByName(CONFIG.ABA_DADOS_ENRIQUECIDOS);
  if (!aba) {
    aba = ss.insertSheet(CONFIG.ABA_DADOS_ENRIQUECIDOS);
    const headers = ['ID_CLIENTE', 'RAZAO_SOCIAL', 'NOME_FANTASIA', 'CNPJ', 'SITUACAO', 'CAPITAL_SOCIAL', 'PORTE', 'NATUREZA_JURIDICA', 'ATIVIDADE_PRINCIPAL', 'DATA_ABERTURA', 'ENDERECO', 'TELEFONE', 'EMAIL', 'FONTE', 'CONFIABILIDADE', 'ULTIMA_ATUALIZACAO'];
    aba.getRange(1, 1, 1, headers.length).setValues([headers]);
    aba.getRange(1, 1, 1, headers.length).setBackground('#1a1a2e').setFontColor('#fff').setFontWeight('bold');
    aba.setFrozenRows(1);
  }
  return aba;
}

function criarAbaAnalisesIA() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let aba = ss.getSheetByName(CONFIG.ABA_ANALISES_IA);
  if (!aba) {
    aba = ss.insertSheet(CONFIG.ABA_ANALISES_IA);
    const headers = ['DATA', 'TIPO_ANALISE', 'PROPOSTA', 'CLIENTE', 'SCORE', 'PREVISAO_FECHAMENTO', 'RISCOS', 'OPORTUNIDADES', 'ACAO_RECOMENDADA', 'ANALISE_COMPLETA'];
    aba.getRange(1, 1, 1, headers.length).setValues([headers]);
    aba.getRange(1, 1, 1, headers.length).setBackground('#1a1a2e').setFontColor('#fff').setFontWeight('bold');
    aba.setFrozenRows(1);
    aba.setColumnWidth(10, 500);
  }
  return aba;
}

// ==================== MATCHING INTELIGENTE DE CLIENTES ====================

/**
 * Normaliza nome de cliente para comparação
 * Remove acentos, pontuação, converte para minúsculas, remove palavras comuns
 */
function normalizarNome(nome) {
  if (!nome) return '';

  let normalizado = String(nome)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s]/g, ' ') // Remove pontuação
    .replace(/\s+/g, ' ') // Remove espaços extras
    .trim();

  // Remove palavras comuns de razão social
  const palavrasRemover = ['ltda', 'ltd', 'me', 'epp', 'eireli', 'sa', 's/a', 's.a.', '& cia', 'e cia', 'comercio', 'industria', 'servicos', 'produtos', 'distribuidora', 'importadora', 'exportadora'];
  palavrasRemover.forEach(palavra => {
    normalizado = normalizado.replace(new RegExp('\\b' + palavra + '\\b', 'g'), '');
  });

  return normalizado.replace(/\s+/g, ' ').trim();
}

/**
 * Calcula similaridade entre dois textos usando distância de Levenshtein normalizada
 */
function calcularSimilaridade(str1, str2) {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  const s1 = String(str1).toLowerCase();
  const s2 = String(str2).toLowerCase();

  // Distância de Levenshtein
  const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
  for (let i = 0; i <= s1.length; i++) track[0][i] = i;
  for (let j = 0; j <= s2.length; j++) track[j][0] = j;

  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }

  const maxLen = Math.max(s1.length, s2.length);
  return maxLen === 0 ? 1 : 1 - (track[s2.length][s1.length] / maxLen);
}

/**
 * Encontra cliente por nome usando fuzzy matching
 */
function encontrarClientePorNome(nomeCliente, listaClientes) {
  if (!nomeCliente || !listaClientes || listaClientes.length === 0) return null;

  const nomeNormalizado = normalizarNome(nomeCliente);
  let melhorMatch = null;
  let melhorScore = 0;

  for (const cliente of listaClientes) {
    const clienteNomeNorm = normalizarNome(cliente.nome);
    let score = calcularSimilaridade(nomeNormalizado, clienteNomeNorm);

    // Também verifica variantes de nome
    if (cliente.nomesVariantes) {
      const variantes = String(cliente.nomesVariantes).split(',');
      for (const variante of variantes) {
        const scoreVariante = calcularSimilaridade(nomeNormalizado, normalizarNome(variante));
        if (scoreVariante > score) {
          score = scoreVariante;
        }
      }
    }

    if (score > melhorScore && score >= CONFIG.SIMILARITY_THRESHOLD) {
      melhorScore = score;
      melhorMatch = {
        ...cliente,
        scoreMatch: score
      };
    }
  }

  return melhorMatch;
}

// ==================== SINCRONIZAÇÃO ====================
function sincronizar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const nomeAba = CONFIG.ABA_FORMULARIO;
  const abaForm = ss.getSheetByName(nomeAba);

  if (!abaForm) {
    return { ok: false, msg: '❌ Aba formulário não encontrada!\n\nProcurei por: "' + nomeAba + '"\n\nVerifique se existe uma aba com "Respostas" ou "formulário" no nome.' };
  }

  let abaCtrl = ss.getSheetByName(CONFIG.ABA_CONTROLE);
  if (!abaCtrl) abaCtrl = criarAbaControle();

  const ctrlData = abaCtrl.getDataRange().getValues();
  const existentes = new Map();
  for (let i = 1; i < ctrlData.length; i++) {
    if (ctrlData[i][0]) existentes.set(String(ctrlData[i][0]), i + 1);
  }

  const formData = abaForm.getDataRange().getValues();
  const novas = [];
  const agora = new Date();

  // Contadores para debug
  let totalLinhas = formData.length - 1;
  let semNumero = 0;
  let jaExiste = 0;
  let teste = 0;

  // Carregar histórico de clientes para matching
  const clientesHistorico = carregarHistoricoClientes();

  for (let i = 1; i < formData.length; i++) {
    const situacao = String(formData[i][0] || '').toUpperCase(); // Coluna A = Situação
    const num = formData[i][2]; // Coluna C = número da proposta
    const timestamp = formData[i][1]; // Coluna B = Carimbo de data/hora
    const nomeCliente = String(formData[i][5] || '').trim(); // Coluna F = cliente

    // FILTRAR PROPOSTAS DE TESTE
    const numStr = String(num || '').toUpperCase();
    const clienteStr = nomeCliente.toUpperCase();
    const situacaoStr = situacao;

    if (situacaoStr.includes('TESTE') || situacaoStr.includes('TEST') || situacaoStr.includes('SUBSTITUI') ||
        clienteStr.includes('TESTE') || clienteStr.includes('TEST') || clienteStr.includes('SUBSTITUI') ||
        numStr.includes('TESTE') || numStr.includes('TEST') || numStr.includes('SUBSTITUI')) {
      teste++;
      continue; // Pula propostas de teste
    }

    if (!num) {
      semNumero++;
      continue;
    }

    if (existentes.has(String(num))) {
      jaExiste++;
      continue;
    }

    const dataCriacao = timestamp instanceof Date ? timestamp : agora;

    // Fazer matching do cliente
    let clienteMatchId = '';
    let scoreMatch = 0;
    if (nomeCliente && clientesHistorico.length > 0) {
      const match = encontrarClientePorNome(nomeCliente, clientesHistorico);
      if (match) {
        clienteMatchId = match.id;
        scoreMatch = match.scoreMatch;
      }
    }

    novas.push([num, 'NOVO', dataCriacao, '', '', '', '', '', '', '', '', clienteMatchId, scoreMatch]);
  }

  if (novas.length > 0) {
    abaCtrl.getRange(abaCtrl.getLastRow() + 1, 1, novas.length, 13).setValues(novas);
  }

  // Atualizar histórico de clientes
  atualizarHistoricoClientes();

  // Mensagem detalhada
  let msg = '✅ Sincronização concluída!\n\n';
  msg += '📊 ESTATÍSTICAS:\n';
  msg += '• Total no formulário: ' + totalLinhas + '\n';
  msg += '• Novas importadas: ' + novas.length + '\n';
  if (jaExiste > 0) msg += '• Já existiam: ' + jaExiste + '\n';
  if (teste > 0) msg += '• Propostas de teste ignoradas: ' + teste + '\n';
  if (semNumero > 0) msg += '• Sem número: ' + semNumero + '\n';
  msg += '\nAba lida: "' + nomeAba + '"';

  return { ok: true, msg: msg };
}

function uiSincronizar() {
  const result = sincronizar();
  SpreadsheetApp.getUi().alert(result.msg);
}

// ==================== HISTÓRICO DE CLIENTES AVANÇADO ====================

/**
 * Carrega lista de clientes do histórico para fazer matching
 */
function carregarHistoricoClientes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const abaHist = ss.getSheetByName(CONFIG.ABA_HISTORICO_CLIENTES);
  if (!abaHist || abaHist.getLastRow() < 2) return [];

  const dados = abaHist.getRange(2, 1, abaHist.getLastRow() - 1, 17).getValues();
  const clientes = [];

  for (const row of dados) {
    if (row[0]) { // Se tem ID
      clientes.push({
        id: row[0],
        nome: row[1],
        nomesVariantes: row[2],
        cnpj: row[3],
        totalPropostas: row[4],
        ganhas: row[5],
        perdidas: row[6],
        valorTotal: row[7],
        ultimaCompra: row[8],
        produtos: row[9],
        ticketMedio: row[10],
        tempoMedioFechamento: row[11],
        taxaConversao: row[12],
        sazonalidade: row[13],
        padraoCompra: row[14],
        dadosExternos: row[15]
      });
    }
  }

  return clientes;
}

function atualizarHistoricoClientes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const abaForm = ss.getSheetByName(CONFIG.ABA_FORMULARIO);
  if (!abaForm) return;

  let abaHist = ss.getSheetByName(CONFIG.ABA_HISTORICO_CLIENTES);
  if (!abaHist) abaHist = criarAbaHistoricoClientes();

  const formData = abaForm.getDataRange().getValues();
  const clientesMap = {};

  // Encontrar índice das colunas de valor (TOMBADOR e COLETOR)
  const headers = formData[0];
  let colValor = -1;
  let colValorColetor = -1;
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i] || '').toUpperCase();
    if (h.includes('TOTAL GERAL')) {
      if (h.includes('COLETOR')) {
        colValorColetor = i;
      } else if (colValor === -1) {
        colValor = i;
      }
    }
  }

  // Agregar dados por cliente
  for (let i = 1; i < formData.length; i++) {
    const r = formData[i];
    const clienteNome = String(r[5] || '').trim(); // Coluna F = cliente
    if (!clienteNome) continue;

    const clienteNomeNorm = normalizarNome(clienteNome);
    const sitForm = String(r[0] || '').toUpperCase();

    // Tentar pegar valor do TOMBADOR ou COLETOR (o que tiver preenchido)
    let valor = 0;
    if (colValor >= 0) {
      valor = parseValor(r[colValor]);
    }
    if (valor === 0 && colValorColetor >= 0) {
      valor = parseValor(r[colValorColetor]);
    }
    const data = parseData(r[1]); // Coluna B = Carimbo de data/hora da proposta
    const produto = String(r[3] || '');
    const cnpj = extrairCNPJ(r);

    // Agrupar por nome normalizado
    if (!clientesMap[clienteNomeNorm]) {
      clientesMap[clienteNomeNorm] = {
        nomesOriginais: new Set([clienteNome]),
        nomeNormalizado: clienteNomeNorm,
        cnpjs: new Set(),
        totalPropostas: 0,
        ganhas: 0,
        perdidas: 0,
        valorTotal: 0,
        ultimaCompra: null,
        produtos: new Set(),
        temposFechamento: [],
        datasCriacao: [],
        datasGanho: []
      };
    }

    const cliente = clientesMap[clienteNomeNorm];
    cliente.nomesOriginais.add(clienteNome);
    if (cnpj) cliente.cnpjs.add(cnpj);
    cliente.totalPropostas++;
    if (produto) cliente.produtos.add(produto);

    if (sitForm === 'FECHADA') {
      cliente.ganhas++;
      cliente.valorTotal += valor;
      if (data) {
        cliente.datasGanho.push(data);
        if (!cliente.ultimaCompra || data > cliente.ultimaCompra) {
          cliente.ultimaCompra = data;
        }
      }
    } else if (sitForm === 'PERDIDA') {
      cliente.perdidas++;
    }

    if (data) cliente.datasCriacao.push(data);
  }

  // Calcular métricas avançadas
  const agora = new Date();
  const linhas = Object.values(clientesMap).map((c, index) => {
    const id = 'CLI_' + (index + 1).toString().padStart(5, '0');
    const nomeRepresentativo = Array.from(c.nomesOriginais)[0]; // Pega o primeiro nome encontrado
    const nomesVariantes = Array.from(c.nomesOriginais).join(', ');
    const cnpj = Array.from(c.cnpjs)[0] || ''; // Pega o primeiro CNPJ encontrado
    const taxaConversao = c.totalPropostas > 0 ? ((c.ganhas / c.totalPropostas) * 100).toFixed(1) : 0;
    const ticketMedio = c.ganhas > 0 ? c.valorTotal / c.ganhas : 0;

    // Calcular tempo médio de fechamento
    let tempoMedioFechamento = 0;
    if (c.datasGanho.length > 0 && c.datasCriacao.length > 0) {
      const tempos = c.datasGanho.map((dataGanho, i) => {
        const dataCriacao = c.datasCriacao[i] || c.datasCriacao[0];
        return (dataGanho - dataCriacao) / (1000 * 60 * 60 * 24); // dias
      });
      tempoMedioFechamento = Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length);
    }

    // Identificar sazonalidade (meses com mais compras)
    let sazonalidade = '';
    if (c.datasGanho.length > 0) {
      const mesesContador = {};
      c.datasGanho.forEach(data => {
        const mes = data.getMonth();
        mesesContador[mes] = (mesesContador[mes] || 0) + 1;
      });
      const mesMaisCompras = Object.keys(mesesContador).reduce((a, b) =>
        mesesContador[a] > mesesContador[b] ? a : b
      );
      const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      sazonalidade = nomesMeses[mesMaisCompras];
    }

    // Identificar padrão de compra
    let padraoCompra = 'Novo cliente';
    if (c.ganhas >= 3) {
      padraoCompra = 'Cliente fiel';
    } else if (c.ganhas === 2) {
      padraoCompra = 'Cliente recorrente';
    } else if (c.ganhas === 1) {
      padraoCompra = 'Primeira compra';
    } else if (c.perdidas >= 2) {
      padraoCompra = 'Resistente';
    }

    return [
      id,
      nomeRepresentativo,
      nomesVariantes,
      cnpj,
      c.totalPropostas,
      c.ganhas,
      c.perdidas,
      c.valorTotal,
      c.ultimaCompra ? fmtData(c.ultimaCompra) : '',
      Array.from(c.produtos).join(', '),
      ticketMedio,
      tempoMedioFechamento,
      taxaConversao,
      sazonalidade,
      padraoCompra,
      '', // dados externos - preencher depois
      agora
    ];
  });

  if (linhas.length > 0) {
    // Limpar e reescrever
    if (abaHist.getLastRow() > 1) {
      abaHist.getRange(2, 1, abaHist.getLastRow() - 1, 17).clearContent();
    }
    abaHist.getRange(2, 1, linhas.length, 17).setValues(linhas);
  }
}

function getHistoricoCliente(nomeCliente) {
  const clientes = carregarHistoricoClientes();
  const match = encontrarClientePorNome(nomeCliente, clientes);
  return match;
}

function extrairCNPJ(row) {
  // Tentar encontrar CNPJ em qualquer coluna
  for (let i = 0; i < row.length; i++) {
    const val = String(row[i] || '');
    const match = val.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/);
    if (match) return match[0];
  }
  return '';
}

// ==================== IMPORTAÇÃO DE CSV ====================
function importarCSV() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Importar CSV',
    'Esta função irá importar dados de um arquivo CSV e fazer o cruzamento com os dados existentes.\n\nVocê possui um arquivo CSV?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  ui.alert('Instruções',
    'Para importar o CSV:\n\n' +
    '1. Abra o arquivo CSV no Excel\n' +
    '2. Copie todos os dados (Ctrl+A, Ctrl+C)\n' +
    '3. Cole em uma nova aba deste spreadsheet chamada "CSV_IMPORT"\n' +
    '4. Execute novamente esta função\n\n' +
    'Continue?',
    ui.ButtonSet.OK
  );

  processarCSVImportado();
}

function processarCSVImportado() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const abaCSV = ss.getSheetByName('CSV_IMPORT');

  if (!abaCSV) {
    SpreadsheetApp.getUi().alert('Aba CSV_IMPORT não encontrada. Por favor, cole os dados do CSV em uma aba chamada "CSV_IMPORT".');
    return;
  }

  const dados = abaCSV.getDataRange().getValues();
  if (dados.length < 2) {
    SpreadsheetApp.getUi().alert('Nenhum dado encontrado na aba CSV_IMPORT.');
    return;
  }

  // Enriquecer dados com base no CSV
  enriquecerDadosCSV(dados);

  SpreadsheetApp.getUi().alert('Importação concluída! Dados enriquecidos.');
}

function enriquecerDadosCSV(dadosCSV) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let abaEnriquecidos = ss.getSheetByName(CONFIG.ABA_DADOS_ENRIQUECIDOS);
  if (!abaEnriquecidos) abaEnriquecidos = criarAbaDadosEnriquecidos();

  const clientes = carregarHistoricoClientes();
  const headers = dadosCSV[0];

  // Encontrar colunas importantes no CSV
  const colSituacao = headers.indexOf('Situação');
  const colCliente = headers.indexOf('Razão Social do Cliente:');
  const colCNPJ = headers.indexOf('CPF/CNPJ/RUC do Cliente:');
  const colVendedor = headers.indexOf('Vendedor e/ou Representante (Nome e Sobrenome):');
  const colValor = headers.findIndex(h => String(h).includes('TOTAL GERAL'));
  const colConcorrente = headers.indexOf('Cliente fechou com o concorrente:');
  const colMotivoPerdida = headers.indexOf('Motivo que levou o cliente a não fechar a proposta:');

  const linhasEnriquecidas = [];
  const agora = new Date();

  for (let i = 1; i < dadosCSV.length; i++) {
    const row = dadosCSV[i];
    const nomeCliente = String(row[colCliente] || '').trim();
    if (!nomeCliente) continue;

    // Fazer matching do cliente
    const match = encontrarClientePorNome(nomeCliente, clientes);
    if (!match) continue; // Só processa se encontrou match

    const cnpj = String(row[colCNPJ] || '').trim();
    const concorrente = String(row[colConcorrente] || '').trim();
    const motivoPerdida = String(row[colMotivoPerdida] || '').trim();

    // Informações de inteligência competitiva
    let infoExtra = '';
    if (concorrente) {
      infoExtra += `Concorrente que ganhou: ${concorrente}. `;
    }
    if (motivoPerdida) {
      infoExtra += `Motivo da perda: ${motivoPerdida}. `;
    }

    // Salvar dados enriquecidos (apenas se tiver info relevante)
    if (cnpj || infoExtra) {
      linhasEnriquecidas.push([
        match.id,
        nomeCliente,
        '', // nome fantasia
        cnpj,
        '', // situação
        '', // capital social
        '', // porte
        '', // natureza jurídica
        '', // atividade principal
        '', // data abertura
        '', // endereço
        '', // telefone
        '', // email
        'CSV',
        '75%', // confiabilidade
        agora
      ]);
    }
  }

  if (linhasEnriquecidas.length > 0) {
    abaEnriquecidos.getRange(abaEnriquecidos.getLastRow() + 1, 1, linhasEnriquecidas.length, 16).setValues(linhasEnriquecidas);
  }
}

// ==================== BUSCAR DADOS EXTERNOS MELHORADO ====================

/**
 * Busca dados de empresa por NOME ou CNPJ
 * Agora tenta ambas as abordagens
 */
function buscarDadosEmpresa(nomeOuCNPJ, tipo = 'auto') {
  // Se parece com CNPJ, tenta por CNPJ primeiro
  const cnpjLimpo = String(nomeOuCNPJ).replace(/\D/g, '');

  if (cnpjLimpo.length === 14) {
    const dados = buscarPorCNPJ(cnpjLimpo);
    if (dados) return { ...dados, fonte: 'CNPJ' };
  }

  // Se não achou por CNPJ ou não é CNPJ, tenta por nome
  // Nota: A API ReceitaWS não suporta busca por nome, então precisaríamos de outra API
  // Por enquanto, retornamos informação de que precisa de busca manual
  return {
    razaoSocial: nomeOuCNPJ,
    necessitaBuscaManual: true,
    sugestao: `Buscar manualmente: ${nomeOuCNPJ} em Google, LinkedIn, Econodata`
  };
}

function buscarPorCNPJ(cnpjLimpo) {
  // CACHE: Verificar se já buscou esse CNPJ recentemente (evita bater na API toda hora)
  const cache = CacheService.getScriptCache();
  const cacheKey = 'cnpj_' + cnpjLimpo;
  const cached = cache.get(cacheKey);
  if (cached) {
    Logger.log('CNPJ ' + cnpjLimpo + ' retornado do cache');
    return JSON.parse(cached);
  }

  try {
    // ReceitaWS (API gratuita brasileira)
    const url = 'https://receitaws.com.br/v1/cnpj/' + cnpjLimpo;
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: { 'User-Agent': 'CRM_PILI/2.0' }
    });
    const dados = JSON.parse(response.getContentText());

    if (dados.status !== 'ERROR' && dados.nome) {
      const resultado = {
        razaoSocial: dados.nome || '',
        fantasia: dados.fantasia || '',
        cnpj: cnpjLimpo,
        situacao: dados.situacao || '',
        capitalSocial: dados.capital_social || '0',
        porte: dados.porte || '',
        naturezaJuridica: dados.natureza_juridica || '',
        atividadePrincipal: dados.atividade_principal?.[0]?.text || '',
        atividadesSecundarias: dados.atividades_secundarias?.slice(0, 3).map(a => a.text).join('; ') || '',
        dataAbertura: dados.abertura || '',
        endereco: `${dados.logradouro || ''}, ${dados.numero || ''} - ${dados.municipio || ''}/${dados.uf || ''}`,
        municipio: dados.municipio || '',
        uf: dados.uf || '',
        cep: dados.cep || '',
        telefone: dados.telefone || '',
        email: dados.email || '',
        numeroFuncionarios: estimarFuncionarios(dados.porte),
        fonte: 'ReceitaWS',
        // Contexto para IA sobre armazenagem
        setorAgro: verificarSeAgro(dados),
        capacidadeEstimada: estimarCapacidadeArmazenagem(dados)
      };

      // Salvar no cache por 24 horas
      cache.put(cacheKey, JSON.stringify(resultado), 86400);
      Logger.log('CNPJ ' + cnpjLimpo + ' buscado com sucesso');
      return resultado;
    }
  } catch (e) {
    Logger.log('Erro ao buscar CNPJ: ' + e);
  }

  return null;
}

// Estima número de funcionários baseado no porte
function estimarFuncionarios(porte) {
  if (!porte) return 'N/A';
  const p = String(porte).toUpperCase();
  if (p.includes('MEI')) return '1';
  if (p.includes('MICRO')) return '1-19';
  if (p.includes('PEQUENO')) return '20-99';
  if (p.includes('MÉDIO') || p.includes('MEDIO')) return '100-499';
  if (p.includes('GRANDE')) return '500+';
  return 'N/A';
}

// Verifica se empresa está no setor agro
function verificarSeAgro(dados) {
  if (!dados.atividade_principal && !dados.atividades_secundarias) return false;

  const atividades = [
    dados.atividade_principal?.[0]?.text || '',
    ...(dados.atividades_secundarias || []).map(a => a.text)
  ].join(' ').toUpperCase();

  const palavrasChave = ['AGRO', 'AGRICULTUR', 'PECUÁR', 'GRÃO', 'GRAO', 'SILO', 'ARMAZEN',
    'COOPERATIVA', 'CEREAIS', 'SOJA', 'MILHO', 'TRIGO', 'FEIJÃO', 'CAFE'];

  return palavrasChave.some(palavra => atividades.includes(palavra));
}

// Estima capacidade de armazenagem baseado no porte e atividade
function estimarCapacidadeArmazenagem(dados) {
  if (!verificarSeAgro(dados)) return 'Não se aplica';

  const porte = String(dados.porte || '').toUpperCase();

  if (porte.includes('MEI') || porte.includes('MICRO')) return 'Pequena (até 5.000 ton)';
  if (porte.includes('PEQUENO')) return 'Média (5.000 - 20.000 ton)';
  if (porte.includes('MÉDIO') || porte.includes('MEDIO')) return 'Grande (20.000 - 100.000 ton)';
  if (porte.includes('GRANDE')) return 'Muito Grande (100.000+ ton)';

  return 'A definir';
}

/**
 * Enriquece todos os clientes do histórico com dados externos
 */
function enriquecerTodosDados() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Enriquecer Dados - MODO OTIMIZADO',
    'Esta operação buscará dados externos em LOTES para evitar timeout.\n\nSerá processado 1 lote de até 15 clientes por vez.\n\nContinuar?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const abaHist = ss.getSheetByName(CONFIG.ABA_HISTORICO_CLIENTES);
  if (!abaHist || abaHist.getLastRow() < 2) {
    ui.alert('Nenhum cliente encontrado no histórico.');
    return;
  }

  let abaEnriquecidos = ss.getSheetByName(CONFIG.ABA_DADOS_ENRIQUECIDOS);
  if (!abaEnriquecidos) abaEnriquecidos = criarAbaDadosEnriquecidos();

  // Obter clientes já enriquecidos para não processar novamente
  const clientesJaEnriquecidos = new Set();
  if (abaEnriquecidos.getLastRow() > 1) {
    const enriquecidosData = abaEnriquecidos.getRange(2, 1, abaEnriquecidos.getLastRow() - 1, 1).getValues();
    enriquecidosData.forEach(row => {
      if (row[0]) clientesJaEnriquecidos.add(String(row[0]));
    });
  }

  const dados = abaHist.getRange(2, 1, abaHist.getLastRow() - 1, 17).getValues();
  const linhasEnriquecidas = [];
  let processados = 0;
  let pulados = 0;
  const agora = new Date();
  const LOTE_MAX = 15; // Processar no máximo 15 por execução
  const TEMPO_MAX = 4 * 60 * 1000; // 4 minutos (deixa margem de segurança)
  const tempoInicio = Date.now();

  for (const row of dados) {
    // Verificar tempo restante
    if (Date.now() - tempoInicio > TEMPO_MAX) {
      ui.alert('⏱️ Tempo limite próximo. Processamento interrompido.\n\n' +
        `Processados: ${processados}\n` +
        `Enriquecidos: ${linhasEnriquecidas.length}\n` +
        `Pulados (já enriquecidos): ${pulados}\n\n` +
        'Execute novamente para continuar.');
      break;
    }

    // Parar se já processou o lote máximo
    if (processados >= LOTE_MAX) {
      ui.alert('✅ Lote de ' + LOTE_MAX + ' clientes processado com sucesso!\n\n' +
        `Enriquecidos neste lote: ${linhasEnriquecidas.length}\n` +
        `Pulados (já enriquecidos): ${pulados}\n\n` +
        'Execute novamente para processar o próximo lote.');
      break;
    }

    const idCliente = row[0];
    const nome = row[1];
    const cnpj = row[3];

    if (!idCliente) continue;

    // Pular se já foi enriquecido
    if (clientesJaEnriquecidos.has(String(idCliente))) {
      pulados++;
      continue;
    }

    // Apenas processar se tiver CNPJ (economiza chamadas de API)
    if (!cnpj || cnpj.length < 11) {
      processados++;
      continue;
    }

    // Tenta buscar por CNPJ
    try {
      const dadosExternos = buscarDadosEmpresa(cnpj);

      if (dadosExternos && !dadosExternos.necessitaBuscaManual) {
        linhasEnriquecidas.push([
          idCliente,
          dadosExternos.razaoSocial || nome,
          dadosExternos.fantasia || '',
          cnpj || '',
          dadosExternos.situacao || '',
          dadosExternos.capitalSocial || '',
          dadosExternos.porte || '',
          dadosExternos.naturezaJuridica || '',
          dadosExternos.atividadePrincipal || '',
          dadosExternos.dataAbertura || '',
          dadosExternos.endereco || '',
          dadosExternos.telefone || '',
          dadosExternos.email || '',
          dadosExternos.fonte || 'API',
          '90%',
          agora
        ]);
      }
    } catch (e) {
      Logger.log('Erro ao enriquecer ' + idCliente + ': ' + e);
    }

    processados++;

    // Pausa a cada 2 requisições para não sobrecarregar a API
    if (processados % 2 === 0) {
      Utilities.sleep(1500); // 1.5 segundos
    }
  }

  // Adicionar novas linhas (não limpar as antigas)
  if (linhasEnriquecidas.length > 0) {
    const proximaLinha = abaEnriquecidos.getLastRow() + 1;
    abaEnriquecidos.getRange(proximaLinha, 1, linhasEnriquecidas.length, 16).setValues(linhasEnriquecidas);
  }

  if (processados < dados.length && processados < LOTE_MAX) {
    ui.alert(`✅ Enriquecimento concluído!\n\n${linhasEnriquecidas.length} clientes enriquecidos\n${pulados} já estavam enriquecidos\n\nTODOS os clientes foram processados!`);
  }
}

// ==================== OBTER DADOS ====================
function getControle() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(CONFIG.ABA_CONTROLE);
  if (!aba) return {};

  const dados = aba.getDataRange().getValues();
  const ctrl = {};

  for (let i = 1; i < dados.length; i++) {
    const num = dados[i][0];
    if (num) {
      ctrl[String(num)] = {
        linha: i + 1,
        etapa: dados[i][1] || 'NOVO',
        dataCriacao: parseData(dados[i][2]),
        ultContato: parseData(dados[i][3]),
        proxPasso: dados[i][4] || '',
        dataProx: parseData(dados[i][5]),
        obs: dados[i][6] || '',
        hist: dados[i][7] || '',
        scoreIA: dados[i][8] || '',
        analiseIA: dados[i][9] || '',
        dadosExternos: dados[i][10] || '',
        clienteMatchId: dados[i][11] || '',
        scoreMatch: dados[i][12] || 0
      };
    }
  }
  return ctrl;
}

function getPropostas() {
  const tempoInicio = new Date().getTime();
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const nomeAba = CONFIG.ABA_FORMULARIO;

    Logger.log('==========================================');
    Logger.log('DEBUG getPropostas - INÍCIO');
    Logger.log('⏱️ Tempo de início: ' + new Date().toISOString());
    Logger.log('Nome da aba procurada: "' + nomeAba + '"');
    Logger.log('Abas disponíveis: ' + ss.getSheets().map(s => s.getName()).join(', '));

    const aba = ss.getSheetByName(nomeAba);

    if (!aba) {
      const erro = 'ERRO: Aba "' + nomeAba + '" não encontrada. Abas disponíveis: ' + ss.getSheets().map(s => s.getName()).join(', ');
      Logger.log(erro);
      throw new Error(erro);
    }

    Logger.log('Aba encontrada: ' + aba.getName());

    const dados = aba.getDataRange().getValues();
    Logger.log('Linhas encontradas: ' + dados.length);

    if (dados.length < 2) {
      const erro = 'AVISO: Aba formulário está vazia (apenas ' + dados.length + ' linhas)';
      Logger.log(erro);
      return [];
    }

    const headers = dados[0];

    // Log COMPLETO dos headers para debug
    Logger.log('📋 HEADERS DA PLANILHA (total: ' + headers.length + ' colunas):');
    for (let i = 0; i < headers.length; i++) {
      Logger.log('  [' + i + '] (Coluna ' + String.fromCharCode(65 + i) + '): "' + String(headers[i]) + '"');
    }

    // Carregar controle de forma segura
    let ctrl = {};
    try {
      ctrl = getControle() || {};
      Logger.log('✅ Controle carregado: ' + Object.keys(ctrl).length + ' propostas no controle');
    } catch(e) {
      Logger.log('AVISO: Erro ao carregar controle: ' + e.message + '. Continuando com controle vazio.');
      ctrl = {};
    }

    const hoje = new Date();

    // TEMPORARIAMENTE DESABILITADO: Carregar histórico de clientes (muito pesado, causa timeout >30s)
    // O histórico será carregado sob demanda quando necessário
    let clientesHistorico = [];
    Logger.log('⚡ OTIMIZAÇÃO: Histórico de clientes desabilitado para evitar timeout');
    Logger.log('   (Reduz tempo de execução em ~15-20 segundos)');

    Logger.log('getPropostas: Processando ' + (dados.length - 1) + ' linhas');

  // Encontrar colunas importantes dinamicamente
  let colNumero = -1;
  let colValor = -1;
  let colTamanho = -1;
  let colModelo = -1;
  let colCapacidade = -1;
  let colTrilhos = -1;
  let colAcionamento = -1;
  let colValidade = -1;
  let colValorColetor = -1; // Segunda coluna de valor para COLETOR

  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i] || '').toUpperCase();
    if (colNumero === -1 && (h.includes('NÚMERO') || h.includes('NUMERO') || h.includes('Nº') || h.includes('N°'))) { colNumero = i; }

    // Detectar AMBAS as colunas de valor (TOMBADOR e COLETOR)
    if (h.includes('TOTAL GERAL')) {
      if (h.includes('COLETOR')) {
        colValorColetor = i;
      } else if (colValor === -1) {
        colValor = i;
      }
    }

    if (colTamanho === -1 && (h.includes('TAMANHO DO TOMBADOR') || h === 'TAMANHO')) colTamanho = i;
    if (colModelo === -1 && h === 'MODELO') colModelo = i;
    if (colCapacidade === -1 && h === 'CAPACIDADE') colCapacidade = i;
    if (colTrilhos === -1 && h.includes('COMPRIMENTO DOS TRILHOS')) colTrilhos = i;
    if (colAcionamento === -1 && h.includes('TIPO DE ACIONAMENTO')) colAcionamento = i;
    if (colValidade === -1 && (h.includes('VALIDADE') || h.includes('PRAZO'))) colValidade = i;
  }

  // Fallback para índice 2 se não encontrar coluna de número por nome
  if (colNumero === -1 && headers.length > 2) {
    colNumero = 2;
    Logger.log('⚠️ Coluna de número não encontrada por nome, usando índice 2 como fallback');
  }

  // Fallback para coluna 15 se não encontrar por nome (compatibilidade com planilhas antigas)
  if (colValidade === -1 && headers.length > 15) {
    colValidade = 15;
    Logger.log('Coluna de validade não encontrada por nome, usando índice 15 como fallback');
  }

  Logger.log('');
  Logger.log('🔍 COLUNAS DETECTADAS:');
  Logger.log('  Número: ' + (colNumero >= 0 ? colNumero + ' (Coluna ' + String.fromCharCode(65 + colNumero) + ')' : 'NÃO ENCONTRADA'));
  Logger.log('  Valor TOMBADOR: ' + (colValor >= 0 ? colValor + ' (Coluna ' + String.fromCharCode(65 + colValor) + ')' : 'NÃO ENCONTRADA'));
  Logger.log('  Valor COLETOR: ' + (colValorColetor >= 0 ? colValorColetor + ' (' + headers[colValorColetor] + ')' : 'NÃO ENCONTRADA'));
  Logger.log('  Validade: ' + (colValidade >= 0 ? colValidade + ' (Coluna ' + String.fromCharCode(65 + colValidade) + ')' : 'NÃO ENCONTRADA'));
  Logger.log('  Tamanho: ' + (colTamanho >= 0 ? colTamanho + ' (Coluna ' + String.fromCharCode(65 + colTamanho) + ')' : 'NÃO ENCONTRADA'));
  Logger.log('  Modelo: ' + (colModelo >= 0 ? colModelo + ' (Coluna ' + String.fromCharCode(65 + colModelo) + ')' : 'NÃO ENCONTRADA'));
  Logger.log('');

  // VALIDAÇÃO CRÍTICA: Coluna de número é ESSENCIAL
  if (colNumero === -1) {
    const erro = 'ERRO CRÍTICO: Coluna de NÚMERO DA PROPOSTA não encontrada! Procurei por: "NÚMERO", "NUMERO", "Nº", "N°"';
    Logger.log(erro);
    Logger.log('Headers disponíveis: ' + headers.join(', '));
    throw new Error(erro);
  }

  // VALIDAÇÃO: Coluna de valor é importante
  if (colValor === -1 && colValorColetor === -1) {
    Logger.log('⚠️ AVISO CRÍTICO: Nenhuma coluna "TOTAL GERAL" encontrada! Todas as propostas terão valor R$ 0.');
    Logger.log('Headers disponíveis: ' + headers.slice(0, 20).join(', ') + '...');
  }

  if (colValidade === -1) {
    Logger.log('⚠️ AVISO: Coluna de validade não encontrada! Propostas não terão data de vencimento.');
  }

  const props = [];
  let errosProcessamento = 0;
  const MAX_ERROS_PERMITIDOS = Math.floor(dados.length * 0.1); // 10% das linhas
  let linhasProcessadas = 0;
  let linhasPuladas = 0;
  let linhasFiltradas = 0;

  Logger.log('📊 Iniciando loop - Total de linhas para processar: ' + (dados.length - 1));

  for (let i = 1; i < dados.length; i++) {
    try {
      const r = dados[i];

      // Log das primeiras 3 linhas para debug
      if (i <= 3) {
        Logger.log('🔍 Linha ' + (i+1) + ': Dados = [' + r.slice(0, 8).join(', ') + '...]');
      }

      const num = r[colNumero];
      if (!num) {
        linhasPuladas++;
        if (linhasPuladas <= 3) {
          Logger.log('Linha ' + (i+1) + ' pulada: sem número da proposta (coluna ' + String.fromCharCode(65 + colNumero) + ' vazia)');
        }
        continue;
      }
      linhasProcessadas++;

      // Log das primeiras 3 propostas processadas
      if (linhasProcessadas <= 3) {
        Logger.log('✅ Processando proposta #' + num + ' (linha ' + (i+1) + ')');
      }

      const sitForm = String(r[0] || '').toUpperCase();
      const clienteUpper = String(r[5] || '').toUpperCase();
      const numUpper = String(r[colNumero] || '').toUpperCase();

      // Filtrar propostas de teste de forma robusta
      if (sitForm === 'TESTE' || sitForm.includes('SUBSTITUÍ') ||
          sitForm.includes('TEST') || clienteUpper.includes('TESTE') ||
          clienteUpper.includes('TEST') || numUpper.includes('TESTE') || numUpper.includes('TEST')) {
        linhasFiltradas++;
        if (linhasFiltradas <= 3) {
          Logger.log('Linha ' + (i+1) + ' filtrada como TESTE: ' + num);
        }
        continue;
      }

      const c = ctrl[String(num)] || { etapa: 'NOVO' };

      // Tentar pegar valor do TOMBADOR ou COLETOR (o que tiver preenchido)
      let valor = 0;
      if (colValor >= 0) {
        valor = parseValor(r[colValor]);
      }
      if (valor === 0 && colValorColetor >= 0) {
        valor = parseValor(r[colValorColetor]);
      }
      const dataCriacao = c.dataCriacao || parseData(r[1]) || hoje;
      const validade = colValidade >= 0 && r[colValidade] ? parseData(r[colValidade]) : null;
      const ultContato = parseData(c.ultContato);
      const dataProx = parseData(c.dataProx);
      const cliente = String(r[5] || '');

      // Calcular métricas temporais
      const diasVencer = validade ? Math.ceil((validade - hoje) / 86400000) : 999;
      const diasContato = ultContato ? Math.ceil((hoje - ultContato) / 86400000) : 99;
      const diasProx = dataProx ? Math.ceil((dataProx - hoje) / 86400000) : null;
      const diasProposta = Math.ceil((hoje - dataCriacao) / 86400000);

      // Determinar etapa
      let etapa = c.etapa || 'NOVO';
      if (sitForm === 'FECHADA') etapa = 'GANHO';
      else if (sitForm === 'PERDIDA') etapa = 'PERDIDO';

      // Buscar histórico do cliente com MATCHING INTELIGENTE (usando cache já carregado)
      const historicoCliente = encontrarClientePorNome(cliente, clientesHistorico);

      // Calcular probabilidade inteligente
      const analiseProb = calcularProbabilidadeInteligente({
        valor, diasVencer, diasContato, etapa, hist: c.hist,
        diasProposta, historicoCliente, produto: String(r[3] || '')
      });

      // Alertas
      const alertas = [];
      if (etapa !== 'GANHO' && etapa !== 'PERDIDO') {
        if (diasVencer <= 0) alertas.push({ tipo: 'VENCIDA', cor: 'red', prioridade: 1 });
        else if (diasVencer <= 3) alertas.push({ tipo: 'VENCE ' + diasVencer + 'D', cor: 'red', prioridade: 2 });
        else if (diasVencer <= 7) alertas.push({ tipo: 'VENCE ' + diasVencer + 'D', cor: 'yellow', prioridade: 3 });

        if (diasContato >= 7) alertas.push({ tipo: diasContato + 'D SEM CONTATO', cor: 'red', prioridade: 2 });
        else if (diasContato >= 3) alertas.push({ tipo: diasContato + 'D SEM CONTATO', cor: 'yellow', prioridade: 3 });

        if (diasProx !== null && diasProx < 0) alertas.push({ tipo: 'AÇÃO ATRASADA', cor: 'red', prioridade: 1 });
        else if (diasProx === 0) alertas.push({ tipo: 'AÇÃO HOJE', cor: 'yellow', prioridade: 2 });

        if (diasProposta > 30 && etapa === 'NOVO') alertas.push({ tipo: 'PROPOSTA ESTAGNADA', cor: 'red', prioridade: 2 });
        if (diasProposta > 60) alertas.push({ tipo: diasProposta + 'D NO FUNIL', cor: 'yellow', prioridade: 4 });
      }

      // Ordenar alertas por prioridade e criar cópia serializável
      alertas.sort((a, b) => a.prioridade - b.prioridade);
      const alertasSerializaveis = alertas.map(a => ({
        tipo: a.tipo,
        cor: a.cor,
        prioridade: a.prioridade
      }));

      // Garantir que etapaInfo seja serializável (apenas props essenciais)
      const etapaOriginal = ETAPAS[etapa] || ETAPAS['NOVO'];
      const etapaInfoSerializavel = {
        ordem: etapaOriginal.ordem,
        cor: etapaOriginal.cor,
        label: etapaOriginal.label,
        pesoProb: etapaOriginal.pesoProb
      };

      props.push({
        linhaForm: i + 1,
        linhaCtrl: c.linha || null,
        num: String(num),
        etapa: etapa,
        etapaInfo: etapaInfoSerializavel,
        vendedor: String(r[4] || 'SEM VENDEDOR'),
        cliente: cliente,
        estado: String(r[7] || ''),
        telefone: String(r[12] || ''),
        email: String(r[11] || ''),
        produto: String(r[3] || ''),
        produtoTamanho: colTamanho >= 0 ? String(r[colTamanho] || '') : '',
        produtoModelo: colModelo >= 0 ? String(r[colModelo] || '') : '',
        produtoCapacidade: colCapacidade >= 0 ? String(r[colCapacidade] || '') : '',
        produtoTrilhos: colTrilhos >= 0 ? String(r[colTrilhos] || '') : '',
        produtoAcionamento: colAcionamento >= 0 ? String(r[colAcionamento] || '') : '',
        valor: valor,
        valorFmt: fmtMoeda(valor),
        valorFmtCompleto: fmtMoedaCompleta(valor),
        validade: validade ? fmtData(validade) : '-',
        diasVencer: diasVencer,
        dataCriacao: fmtData(dataCriacao),
        dataCriacaoObj: dataCriacao,
        diasProposta: diasProposta,
        ultContato: ultContato ? fmtData(ultContato) : 'Nunca',
        diasContato: diasContato,
        proxPasso: c.proxPasso,
        dataProx: dataProx ? fmtData(dataProx) : '',
        diasProx: diasProx,
        obs: c.obs || '',
        hist: c.hist || '',
        prob: analiseProb.score,
        probLabel: analiseProb.label,
        probCor: analiseProb.cor,
        probFatores: analiseProb.fatores,
        alertas: alertasSerializaveis,
        ativo: etapa !== 'GANHO' && etapa !== 'PERDIDO',
        historicoCliente: historicoCliente,
        scoreIA: c.scoreIA,
        analiseIA: c.analiseIA,
        clienteMatchId: c.clienteMatchId,
        scoreMatch: c.scoreMatch
      });

      // Log das primeiras 3 propostas adicionadas
      if (props.length <= 3) {
        Logger.log('➕ Proposta #' + num + ' adicionada ao array (total: ' + props.length + ')');
      }

    } catch (e) {
      errosProcessamento++;

      // Log detalhado do erro para diagnóstico
      Logger.log('❌ ERRO ao processar linha ' + (i+1) + ' (Proposta: ' + (num || 'sem número') + '):');
      Logger.log('  Tipo: ' + e.name);
      Logger.log('  Mensagem: ' + e.message);
      Logger.log('  Stack: ' + (e.stack || 'Stack não disponível'));

      // Log dos primeiros 10 campos da linha para debug
      const dadosLinha = [];
      for (let j = 0; j < Math.min(10, r.length); j++) {
        dadosLinha.push('[' + j + ']: ' + String(r[j] || '').substring(0, 50));
      }
      Logger.log('  Dados: ' + dadosLinha.join(', '));

      // Se ultrapassar limite de erros, pode indicar problema estrutural
      if (errosProcessamento > MAX_ERROS_PERMITIDOS) {
        Logger.log('⚠️ AVISO CRÍTICO: Muitos erros detectados (' + errosProcessamento + '/' + dados.length + ' linhas). Verifique estrutura dos dados!');
      }
    }
  }

  // Relatório final de processamento
  Logger.log('📊 RESUMO FINAL:');
  Logger.log('  ✅ Propostas adicionadas ao array: ' + props.length);
  Logger.log('  📋 Linhas processadas: ' + linhasProcessadas);
  Logger.log('  ⏭️ Linhas puladas (sem número): ' + linhasPuladas);
  Logger.log('  🚫 Linhas filtradas (TESTE): ' + linhasFiltradas);
  Logger.log('  ❌ Erros encontrados: ' + errosProcessamento);
  Logger.log('  📝 Total de linhas no sheet: ' + (dados.length - 1));

  // Verificação de consistência
  const totalContabilizado = props.length + linhasPuladas + linhasFiltradas + errosProcessamento;
  const totalEsperado = dados.length - 1;
  if (totalContabilizado !== totalEsperado) {
    Logger.log('⚠️ INCONSISTÊNCIA: Contabilizadas ' + totalContabilizado + ' linhas, mas esperado ' + totalEsperado);
    Logger.log('   Diferença: ' + (totalEsperado - totalContabilizado) + ' linhas não contabilizadas!');
  }

  if (errosProcessamento > 0) {
    if (errosProcessamento > MAX_ERROS_PERMITIDOS) {
      Logger.log('⚠️ ATENÇÃO: Taxa de erro alta (' + Math.round(errosProcessamento/dados.length*100) + '%). Possível problema estrutural nos dados!');
    }
  }

  if (props.length === 0 && linhasProcessadas > 0) {
    Logger.log('⚠️ ALERTA CRÍTICO: Nenhuma proposta foi adicionada ao array, mas ' + linhasProcessadas + ' linhas foram processadas!');
    Logger.log('Isso indica que TODAS as propostas caíram no try-catch ou foram filtradas.');
  }

  if (props.length === 0 && linhasPuladas === (dados.length - 1)) {
    Logger.log('⚠️ DIAGNÓSTICO: TODAS as linhas têm a coluna C (número da proposta) VAZIA!');
    Logger.log('   Verifique se os dados do formulário estão sendo salvos na coluna correta.');
  }

  if (props.length === 0 && linhasFiltradas === linhasProcessadas) {
    Logger.log('⚠️ DIAGNÓSTICO: TODAS as linhas processadas foram filtradas como TESTE!');
    Logger.log('   Verifique o conteúdo das colunas A (Situação), C (Número) e F (Cliente).');
  }

    Logger.log('🔄 Loop finalizado - props.length ANTES da ordenação: ' + props.length);

    // Ordenar
    if (props.length > 0) {
      Logger.log('🔄 Iniciando ordenação de ' + props.length + ' propostas...');
      props.sort((a, b) => {
        if (a.etapaInfo.ordem !== b.etapaInfo.ordem) return a.etapaInfo.ordem - b.etapaInfo.ordem;
        return b.prob - a.prob;
      });
      Logger.log('✅ Ordenação concluída');
    }

    Logger.log('DEBUG getPropostas - FIM');
    Logger.log('🎯 Total propostas que serão retornadas: ' + props.length);

    if (props.length > 0) {
      Logger.log('📋 Primeiras 3 propostas: ' + JSON.stringify(props.slice(0, 3).map(p => ({ num: p.num, cliente: p.cliente, etapa: p.etapa }))));
    } else {
      Logger.log('⚠️ NENHUMA PROPOSTA SERÁ RETORNADA!');
    }

    Logger.log('==========================================');

    // Calcular tempo de execução até aqui
    const tempoProcessamento = new Date().getTime() - tempoInicio;
    Logger.log('⏱️ Tempo de processamento dos dados: ' + (tempoProcessamento/1000).toFixed(2) + 's');

    // OTIMIZAÇÃO AGRESSIVA: Retornar apenas dados essenciais (sem campos pesados)
    Logger.log('🔧 Aplicando otimização AGRESSIVA desde o início...');

    const propsMinimas = props.map(p => ({
      // Dados essenciais para exibição
      num: p.num,
      cliente: p.cliente,
      vendedor: p.vendedor,
      valor: p.valor,
      valorFmt: p.valorFmt,
      valorFmtCompleto: p.valorFmtCompleto,
      etapa: p.etapa,
      etapaInfo: p.etapaInfo,
      produto: p.produto,
      produtoTamanho: p.produtoTamanho || '',
      produtoModelo: p.produtoModelo || '',
      produtoCapacidade: p.produtoCapacidade || '',
      produtoTrilhos: p.produtoTrilhos || '',
      produtoAcionamento: p.produtoAcionamento || '',
      estado: p.estado,
      telefone: p.telefone,
      email: p.email,
      validade: p.validade,
      diasVencer: p.diasVencer,
      dataCriacao: p.dataCriacao,
      diasProposta: p.diasProposta,
      ultContato: p.ultContato,
      diasContato: p.diasContato,
      proxPasso: p.proxPasso || '',
      dataProx: p.dataProx || '',
      diasProx: p.diasProx,
      prob: p.prob,
      probLabel: p.probLabel,
      probCor: p.probCor,
      alertas: p.alertas || [],
      ativo: p.ativo,
      linhaForm: p.linhaForm,
      linhaCtrl: p.linhaCtrl,
      // Campos limitados em tamanho
      obs: p.obs ? (p.obs.length > 500 ? p.obs.substring(0, 497) + '...' : p.obs) : '',
      hist: p.hist ? (p.hist.length > 1000 ? p.hist.substring(0, 997) + '...' : p.hist) : '',
      analiseIA: p.analiseIA ? (p.analiseIA.length > 300 ? p.analiseIA.substring(0, 297) + '...' : p.analiseIA) : '',
      // Histórico simplificado
      historicoCliente: p.historicoCliente ? {
        ganhas: p.historicoCliente.ganhas || 0,
        valorTotal: p.historicoCliente.valorTotal || 0,
        taxaConversao: p.historicoCliente.taxaConversao || 0
      } : null,
      scoreMatch: p.scoreMatch || 0
    }));

    const tamanhoJSON = JSON.stringify(propsMinimas).length;
    const tamanhoKB = Math.round(tamanhoJSON / 1024);
    const tamanhoMB = (tamanhoKB / 1024).toFixed(2);

    Logger.log('✅ Dados otimizados: ' + propsMinimas.length + ' propostas');
    Logger.log('📦 Tamanho final: ' + tamanhoKB + 'KB (~' + tamanhoMB + 'MB)');

    const tempoTotal = new Date().getTime() - tempoInicio;
    Logger.log('⏱️ TEMPO TOTAL DE EXECUÇÃO: ' + (tempoTotal/1000).toFixed(2) + 's');

    if (tempoTotal > 30000) {
      Logger.log('⚠️ ALERTA CRÍTICO: Execução ultrapassou 30s! google.script.run vai falhar!');
      Logger.log('   Frontend não receberá os dados devido ao timeout');
    } else if (tempoTotal > 25000) {
      Logger.log('⚠️ AVISO: Execução próxima do limite (30s). Pode falhar em próximas execuções.');
    } else {
      Logger.log('✅ Tempo OK: ' + (tempoTotal/1000).toFixed(2) + 's (limite: 30s)');
    }

    if (tamanhoKB > 5120) {
      Logger.log('⚠️ AVISO: Dados grandes (' + tamanhoMB + 'MB). Pode exceder limite de transferência.');
    } else {
      Logger.log('✅ Tamanho OK: ' + tamanhoKB + 'KB');
    }

    Logger.log('🎯 Retornando ' + propsMinimas.length + ' propostas para o frontend');
    return propsMinimas;

  } catch (erro) {
    Logger.log('==========================================');
    Logger.log('ERRO CRÍTICO em getPropostas: ' + erro);
    Logger.log('Stack: ' + erro.stack);
    Logger.log('==========================================');
    throw erro; // Lança o erro para o frontend capturar
  }
}

function calcularProbabilidadeInteligente(dados) {
  const { valor, diasVencer, diasContato, etapa, hist, diasProposta, historicoCliente, produto } = dados;

  let score = ETAPAS[etapa]?.pesoProb || 25;
  const fatores = [];

  // 1. Cliente recorrente (muito importante!)
  if (historicoCliente && historicoCliente.ganhas > 0) {
    const bonus = Math.min(historicoCliente.ganhas * 10, 25);
    score += bonus;
    fatores.push({ fator: 'Cliente recorrente', impacto: '+' + bonus, detalhe: historicoCliente.ganhas + ' compras anteriores' });

    // Bônus extra se taxa de conversão for alta
    if (historicoCliente.taxaConversao && historicoCliente.taxaConversao >= 60) {
      score += 10;
      fatores.push({ fator: 'Alta taxa de conversão', impacto: '+10', detalhe: historicoCliente.taxaConversao + '%' });
    }
  }

  // 2. Valor vs Ticket médio do cliente
  if (historicoCliente && historicoCliente.ticketMedio && historicoCliente.ticketMedio > 0) {
    const ratio = valor / historicoCliente.ticketMedio;
    if (ratio <= 1.2) {
      score += 10;
      fatores.push({ fator: 'Valor dentro do padrão', impacto: '+10', detalhe: 'Compatível com histórico' });
    } else if (ratio > 2) {
      score -= 10;
      fatores.push({ fator: 'Valor acima do padrão', impacto: '-10', detalhe: 'Muito acima do ticket médio' });
    }
  }

  // 3. Validade da proposta
  if (diasVencer <= 0) {
    score -= 25;
    fatores.push({ fator: 'Proposta vencida', impacto: '-25', detalhe: 'Necessário renovar' });
  } else if (diasVencer <= 3) {
    score -= 10;
    fatores.push({ fator: 'Vencendo em breve', impacto: '-10', detalhe: diasVencer + ' dias' });
  } else if (diasVencer <= 7) {
    score -= 5;
    fatores.push({ fator: 'Atenção ao prazo', impacto: '-5', detalhe: diasVencer + ' dias' });
  }

  // 4. Tempo sem contato
  if (diasContato <= 2) {
    score += 15;
    fatores.push({ fator: 'Contato recente', impacto: '+15', detalhe: 'Negociação ativa' });
  } else if (diasContato >= 90) {
    // Se diasContato = 99, significa que nunca teve contato (valor padrão)
    score -= 15;
    fatores.push({ fator: 'Sem registro de contato', impacto: '-15', detalhe: 'Nunca contactado' });
  } else if (diasContato >= 30) {
    score -= 20;
    fatores.push({ fator: 'Muito tempo sem contato', impacto: '-20', detalhe: diasContato + ' dias' });
  } else if (diasContato >= 10) {
    score -= 15;
    fatores.push({ fator: 'Tempo sem contato', impacto: '-15', detalhe: diasContato + ' dias' });
  } else if (diasContato >= 5) {
    score -= 10;
    fatores.push({ fator: 'Necessita follow-up', impacto: '-10', detalhe: diasContato + ' dias' });
  }

  // 5. Tempo da proposta no funil
  if (diasProposta > 365 && etapa !== 'GANHO' && etapa !== 'PERDIDO') {
    // Proposta com mais de 1 ano: -20 (muito antiga, provavelmente morta)
    score -= 20;
    fatores.push({ fator: 'Proposta MUITO antiga', impacto: '-20', detalhe: diasProposta + ' dias (1+ ano) - reavaliar' });
  } else if (diasProposta > 180 && etapa !== 'GANHO' && etapa !== 'PERDIDO') {
    // Proposta com mais de 6 meses: -15
    score -= 15;
    fatores.push({ fator: 'Proposta antiga', impacto: '-15', detalhe: diasProposta + ' dias (6+ meses)' });
  } else if (diasProposta > 60 && etapa !== 'GANHO' && etapa !== 'PERDIDO') {
    score -= 10;
    fatores.push({ fator: 'Tempo no funil elevado', impacto: '-10', detalhe: diasProposta + ' dias' });
  } else if (diasProposta > 30 && ['NOVO', 'CONTATO_FEITO'].includes(etapa)) {
    score -= 8;
    fatores.push({ fator: 'Estagnada no início', impacto: '-8', detalhe: 'Evoluir ou encerrar' });
  }

  // 6. Quantidade de interações
  const numInteracoes = (hist || '').split('\n').filter(x => x.trim()).length;
  if (numInteracoes >= 8) {
    score += 15;
    fatores.push({ fator: 'Alto engajamento', impacto: '+15', detalhe: numInteracoes + ' interações' });
  } else if (numInteracoes >= 4) {
    score += 8;
    fatores.push({ fator: 'Bom engajamento', impacto: '+8', detalhe: numInteracoes + ' interações' });
  } else if (numInteracoes === 0 && diasProposta > 7) {
    score -= 10;
    fatores.push({ fator: 'Sem interações', impacto: '-10', detalhe: 'Iniciar contato' });
  }

  // 7. Valor alto
  if (valor >= 500000) {
    score += 5;
    fatores.push({ fator: 'Alto valor', impacto: '+5', detalhe: 'Cliente com potencial' });
  }

  // 8. NOVO: Padrão de compra do cliente
  if (historicoCliente) {
    if (historicoCliente.padraoCompra === 'Cliente fiel') {
      score += 15;
      fatores.push({ fator: 'Cliente fiel', impacto: '+15', detalhe: 'Histórico de fidelidade' });
    } else if (historicoCliente.padraoCompra === 'Resistente') {
      score -= 15;
      fatores.push({ fator: 'Cliente resistente', impacto: '-15', detalhe: 'Várias perdas anteriores' });
    }
  }

  // Normalizar (mínimo 5% para propostas ativas, máximo 100%)
  score = Math.max(5, Math.min(100, Math.round(score)));

  return {
    score: score,
    label: score >= 70 ? 'Alta' : score >= 40 ? 'Média' : 'Baixa',
    cor: score >= 70 ? '#27ae60' : score >= 40 ? '#f39c12' : '#e74c3c',
    fatores: fatores
  };
}

function getProposta(numProp) {
  return getPropostas().find(p => p.num === String(numProp));
}

// FUNÇÃO DE TESTE - Retorna apenas 10 propostas ultra-simplificadas para testar comunicação
function getPropostasTeste() {
  try {
    Logger.log('🧪 getPropostasTeste() - Teste de comunicação iniciado');
    const props = getPropostas();
    const teste = props.slice(0, 10).map(p => ({
      num: p.num,
      cliente: p.cliente,
      valor: p.valor
    }));
    Logger.log('🧪 Retornando ' + teste.length + ' propostas de teste');
    Logger.log('🧪 Tamanho: ' + JSON.stringify(teste).length + ' caracteres');
    return teste;
  } catch(e) {
    Logger.log('❌ ERRO no teste: ' + e.message);
    return [];
  }
}

// ==================== DADOS AGREGADOS ====================
function getDadosPorVendedor() {
  Logger.log('🔍 getDadosPorVendedor() INICIADA');
  try {
    const props = getPropostas();
    Logger.log('  Total de propostas obtidas: ' + (props ? props.length : 'null/undefined'));

    if (!props || props.length === 0) {
      Logger.log('⚠️ Nenhuma proposta retornada por getPropostas()');
      return [];
    }

    const vendedores = {};

    props.forEach(p => {
      const v = p.vendedor;
      if (!vendedores[v]) {
        vendedores[v] = {
          nome: v,
          propostas: [],
          total: 0,
          valor: 0,
          ganhos: 0,
          perdidos: 0,
          valorGanho: 0,
          alertasCriticos: 0
        };
      }
      vendedores[v].propostas.push(p);
      if (p.ativo) {
        vendedores[v].total++;
        vendedores[v].valor += p.valor;
        vendedores[v].alertasCriticos += p.alertas.filter(a => a.cor === 'red').length;
      } else if (p.etapa === 'GANHO') {
        vendedores[v].ganhos++;
        vendedores[v].valorGanho += p.valor;
      } else if (p.etapa === 'PERDIDO') {
        vendedores[v].perdidos++;
      }
    });

    const resultado = Object.values(vendedores)
      .map(v => {
        const dec = v.ganhos + v.perdidos;
        v.taxa = dec > 0 ? ((v.ganhos / dec) * 100).toFixed(0) : '-';
        v.propostas.sort((a, b) => b.prob - a.prob);
        return v;
      })
      .sort((a, b) => b.valor - a.valor);

    Logger.log('✅ getDadosPorVendedor() CONCLUÍDA - Retornando ' + resultado.length + ' vendedores');
    if (resultado.length > 0) {
      Logger.log('  Primeiro vendedor: ' + resultado[0].nome + ' - ' + resultado[0].total + ' ativas');
    }

    return resultado;
  } catch (e) {
    Logger.log('❌ ERRO em getDadosPorVendedor: ' + e);
    Logger.log('  Stack: ' + (e.stack || 'sem stack'));
    return [];
  }
}

function getResumoGeral() {
  try {
    const props = getPropostas();
  const r = {
    total: 0,
    valor: 0,
    ganhos: 0,
    valorGanho: 0,
    perdidos: 0,
    porEtapa: {},
    alertasCriticos: 0,
    propostasUrgentes: 0,
    mediaDiasFunil: 0
  };

  Object.keys(ETAPAS).forEach(e => r.porEtapa[e] = { qtd: 0, valor: 0 });

  let somaDias = 0;
  let countDias = 0;

  props.forEach(p => {
    if (p.ativo) {
      r.total++;
      r.valor += p.valor;
      r.alertasCriticos += p.alertas.filter(a => a.cor === 'red').length;
      if (p.alertas.length > 0) r.propostasUrgentes++;
      somaDias += p.diasProposta;
      countDias++;
    } else if (p.etapa === 'GANHO') {
      r.ganhos++;
      r.valorGanho += p.valor;
    } else if (p.etapa === 'PERDIDO') {
      r.perdidos++;
    }

    if (r.porEtapa[p.etapa]) {
      r.porEtapa[p.etapa].qtd++;
      r.porEtapa[p.etapa].valor += p.valor;
    }
  });

    const dec = r.ganhos + r.perdidos;
    r.taxa = dec > 0 ? ((r.ganhos / dec) * 100).toFixed(1) : 0;
    r.mediaDiasFunil = countDias > 0 ? Math.round(somaDias / countDias) : 0;

    return r;
  } catch (e) {
    Logger.log('Erro em getResumoGeral: ' + e);
    return {
      total: 0, valor: 0, ganhos: 0, valorGanho: 0, perdidos: 0,
      porEtapa: {}, alertasCriticos: 0, propostasUrgentes: 0,
      mediaDiasFunil: 0, taxa: 0
    };
  }
}

function getEtapas() {
  return ETAPAS;
}

// ==================== AÇÕES NA PROPOSTA ====================
function registrarAcao(numProp, acao, obs, proxPasso, dataProx) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let aba = ss.getSheetByName(CONFIG.ABA_CONTROLE);
  if (!aba) aba = criarAbaControle();

  const ctrl = getControle();
  const c = ctrl[String(numProp)];
  const agora = new Date();

  let linha = c ? c.linha : aba.getLastRow() + 1;
  if (!c) {
    aba.getRange(linha, 1).setValue(numProp);
    aba.getRange(linha, 2).setValue('NOVO');
    aba.getRange(linha, 3).setValue(agora);
  }

  aba.getRange(linha, 4).setValue(agora); // último contato
  if (proxPasso) aba.getRange(linha, 5).setValue(proxPasso);
  if (dataProx) aba.getRange(linha, 6).setValue(new Date(dataProx));
  if (obs) aba.getRange(linha, 7).setValue(obs);

  const histAtual = aba.getRange(linha, 8).getValue() || '';
  const novoHist = '[' + Utilities.formatDate(agora, 'America/Sao_Paulo', 'dd/MM HH:mm') + '] ' + acao + (obs ? ': ' + obs : '') + '\n' + histAtual;
  aba.getRange(linha, 8).setValue(novoHist.substring(0, 3000));

  return { ok: true };
}

function mudarEtapa(numProp, novaEtapa) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let aba = ss.getSheetByName(CONFIG.ABA_CONTROLE);
  if (!aba) aba = criarAbaControle();

  const ctrl = getControle();
  const c = ctrl[String(numProp)];
  const agora = new Date();

  let linha = c ? c.linha : aba.getLastRow() + 1;
  if (!c) {
    aba.getRange(linha, 1).setValue(numProp);
    aba.getRange(linha, 3).setValue(agora);
  }

  aba.getRange(linha, 2).setValue(novaEtapa);

  const histAtual = aba.getRange(linha, 8).getValue() || '';
  const etapaLabel = ETAPAS[novaEtapa] ? ETAPAS[novaEtapa].label : novaEtapa;
  const novoHist = '[' + Utilities.formatDate(agora, 'America/Sao_Paulo', 'dd/MM HH:mm') + '] Movido para: ' + etapaLabel + '\n' + histAtual;
  aba.getRange(linha, 8).setValue(novoHist.substring(0, 3000));

  if (novaEtapa === 'GANHO' || novaEtapa === 'PERDIDO') {
    atualizarHistoricoClientes();
  }

  return { ok: true };
}

function salvarObs(numProp, obs) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let aba = ss.getSheetByName(CONFIG.ABA_CONTROLE);
  if (!aba) aba = criarAbaControle();

  const ctrl = getControle();
  const c = ctrl[String(numProp)];

  let linha = c ? c.linha : aba.getLastRow() + 1;
  if (!c) aba.getRange(linha, 1).setValue(numProp);

  aba.getRange(linha, 7).setValue(obs);
  return { ok: true };
}

// ==================== IA - GERENTE COMERCIAL AVANÇADO ====================
function chamarIA(prompt, maxTokens) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return '⚠️ API KEY NÃO CONFIGURADA!\n\n' +
      '📋 Para configurar:\n' +
      '1. Vá em: Extensões > Apps Script\n' +
      '2. Execute a função: configurarApiKey()\n' +
      '3. Cole sua API Key quando solicitado\n\n' +
      '🔑 Obtenha sua key em: https://console.anthropic.com/settings/keys\n\n' +
      '💡 A API Key será armazenada de forma segura usando PropertiesService';
  }

  try {
    const r = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      payload: JSON.stringify({
        model: CONFIG.CLAUDE_MODEL,
        max_tokens: maxTokens || 2000,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }]
      }),
      muteHttpExceptions: true
    });

    const j = JSON.parse(r.getContentText());
    if (j.error) return '❌ ' + j.error.message;
    return j.content?.[0]?.text || 'Sem resposta';
  } catch (e) {
    return '❌ Erro: ' + e;
  }
}

function iaAnalisarProposta(numProp) {
  try {
    const p = getProposta(numProp);
    if (!p) return { erro: 'Proposta não encontrada' };

  // Montar contexto completo
  let contextCliente = '';
  if (p.historicoCliente) {
    const h = p.historicoCliente;
    const matchScore = p.scoreMatch ? ((p.scoreMatch * 100).toFixed(0) + '%') : 'N/A';
    contextCliente = `
📊 HISTÓRICO DO CLIENTE (Match Score: ${matchScore}):
- ID Cliente: ${h.id}
- Total de propostas: ${h.totalPropostas}
- Propostas fechadas: ${h.ganhas} (${h.taxaConversao}% conversão)
- Propostas perdidas: ${h.perdidas}
- Valor total comprado: R$ ${h.valorTotal?.toLocaleString('pt-BR') || 0}
- Última compra: ${h.ultimaCompra || 'Nunca'}
- Produtos já comprados: ${h.produtos || 'Nenhum'}
- Ticket médio: R$ ${h.ticketMedio?.toLocaleString('pt-BR') || 'N/A'}
- Tempo médio de fechamento: ${h.tempoMedioFechamento || 'N/A'} dias
- Padrão de compra: ${h.padraoCompra || 'Novo cliente'}
- Sazonalidade: ${h.sazonalidade || 'Sem padrão identificado'}
- Cliente recorrente: ${h.ganhas > 0 ? 'SIM (' + h.ganhas + ' compras)' : 'NÃO - primeiro contato'}`;
  } else {
    contextCliente = '\n📊 HISTÓRICO DO CLIENTE: Novo cliente - primeira proposta';
  }

  const fatoresProb = p.probFatores?.map(f => `• ${f.fator} (${f.impacto}): ${f.detalhe}`).join('\n') || 'Não calculado';

  const prompt = `Você é consultor comercial experiente. Analise a proposta e forneça subsídios práticos e acionáveis para ${p.vendedor} fechar a venda com ${p.cliente}.

DADOS DA PROPOSTA ${p.num}
Cliente: ${p.cliente}
Vendedor: ${p.vendedor}
Produto: ${p.produto}
Valor: ${p.valorFmt}
Etapa: ${p.etapaInfo.label}
Estado: ${p.estado}

TIMING
- Proposta criada há ${p.diasProposta} dias em ${p.dataCriacao}
- Validade: ${p.diasVencer <= 0 ? 'vencida, precisa renovar' : p.diasVencer + ' dias restantes'}
- Último contato há ${p.diasContato} dias
- Próxima ação: ${p.proxPasso || 'nenhuma agendada'}

${contextCliente}

PROBABILIDADE: ${p.prob}% (${p.probLabel})
Fatores principais:
${fatoresProb}

ALERTAS: ${p.alertas.length > 0 ? p.alertas.map(a => a.tipo).join(', ') : 'nenhum'}

HISTÓRICO DE INTERAÇÕES:
${p.hist || 'Sem interações registradas'}

CONTATO: Tel ${p.telefone || 'não informado'} - Email ${p.email || 'não informado'}

CONTEXTO PILI INDUSTRIAL
Produto: Tombadores e coletores de grãos para agronegócio
Diferenciais: 82,7% economia energia, garantia 5 anos, certificação NR-12, suporte próprio
Concorrentes: SAUR (caro, assistência demorada), Grupo Capital (preço baixo, qualidade inferior)
Mercado: Déficit 60M ton armazenagem Brasil, ROI típico 4-6 anos, economia mão obra 60-70%
Momento: Janeiro-Março é safra verão/soja, alta demanda armazenagem

ANÁLISE E SUBSÍDIOS

SITUAÇÃO ATUAL
(Descreva em 2-3 linhas objetivas onde está a proposta, o que precisa acontecer agora, qual o principal desafio)

PRÓXIMA AÇÃO - FAZER HOJE
(1 ação específica e clara com prazo de 24h. Exemplo: Ligar para o decisor até 17h para confirmar recebimento da proposta atualizada)

SCRIPT DE LIGAÇÃO - 60 SEGUNDOS
Escreva script completo e pronto para uso:

"Bom dia [nome decisor]. Aqui é ${p.vendedor} da Pili Industrial.
[Motivo específico da ligação considerando timing e etapa]
[1 benefício concreto do produto para este cliente]
[Dado ou número que prova o benefício]
[Pergunta de fechamento que gera compromisso]"

MENSAGEM WHATSAPP - COPIAR E ENVIAR
Máximo 4 linhas:

"Olá, aqui é ${p.vendedor} da Pili Industrial. [contexto da proposta]. [1 benefício específico]. [Chamada ação clara]."

RESPOSTAS PARA OBJEÇÕES

Se falar de PREÇO ALTO:
"Entendo [nome cliente]. [Calcule ROI específico deste valor]. Nosso equipamento se paga em X meses só com economia de energia. É investimento que reduz custos."

Se falar de PRAZO:
(Resposta específica sobre entrega)

Se comparar com SAUR:
"SAUR tem marca, mas assistência cara e demorada. Nós temos suporte próprio no ${p.estado} e garantia 5 anos. Você não fica na mão."

Se comparar com GRUPO CAPITAL:
"Preço baixo sai caro. Eles não atendem NR-12 adequadamente. Nossa certificação evita multas e problemas com fiscalização."

CRONOGRAMA 7 DIAS
DIA 1 hoje: (ação + objetivo)
DIA 3: (checkpoint + próxima ação)
DIA 7: (meta de avanço)

OPORTUNIDADE UPSELL
${p.produto.includes('TOMBADOR') ? 'Oferecer coletor como complemento, adicional R$ 200-300k para solução completa' : 'Oferecer acessórios ou serviços adicionais'}

PREVISÃO
Probabilidade: [percentual]
Prazo estimado: [dias]
O que precisa acontecer: [ação crítica]
Principal risco: [o que pode fazer perder]

REGRAS DE FORMATAÇÃO - OBRIGATÓRIO:
- NÃO use asteriscos duplos (**texto**) para negrito
- NÃO use underscores (__texto__) para sublinhado
- NÃO use hashtags (###) para títulos
- NÃO use símbolos decorativos (===, ---, ***)
- Use APENAS texto simples com CAPS LOCK para ênfase nos títulos de seções
- Exemplo CORRETO: "SITUAÇÃO ATUAL" (não "**SITUAÇÃO ATUAL**" ou "=== SITUAÇÃO ATUAL ===")

Seja direto, prático e focado em ações que ${p.vendedor} pode executar hoje.`;

    let analise = '';
    try {
      analise = chamarIA(prompt, 2500);
    } catch (e) {
      Logger.log('Erro ao chamar IA em iaAnalisarProposta: ' + e);
      analise = `⚠️ ERRO AO CONECTAR COM IA\n\nDetalhes: ${e}\n\nVerifique:\n1. API Key configurada corretamente\n2. Conexão com internet\n3. Créditos da API Claude`;
    }

    // Salvar análise na aba de controle e na aba de análises IA
    try {
      salvarAnaliseIA(numProp, p.prob, analise, p);
    } catch (e) {
      Logger.log('Erro ao salvar análise: ' + e);
    }

    return { proposta: p, analise: analise };

  } catch (erro) {
    Logger.log('ERRO CRÍTICO em iaAnalisarProposta: ' + erro);
    return {
      erro: 'Erro crítico: ' + erro,
      analise: '❌ ERRO: ' + erro + '\n\nVerifique os logs do Apps Script'
    };
  }
}

function salvarAnaliseIA(numProp, score, analise, proposta) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let abaCtrl = ss.getSheetByName(CONFIG.ABA_CONTROLE);
  let abaAnalises = ss.getSheetByName(CONFIG.ABA_ANALISES_IA);
  if (!abaAnalises) abaAnalises = criarAbaAnalisesIA();

  // Salvar no controle
  if (abaCtrl) {
    const ctrl = getControle();
    const c = ctrl[String(numProp)];
    if (c && c.linha) {
      abaCtrl.getRange(c.linha, 9).setValue(score);
      abaCtrl.getRange(c.linha, 10).setValue(analise.substring(0, 2000));
    }
  }

  // Extrair insights da análise para salvar estruturado
  const riscos = extrairSecao(analise, 'RISCOS CRÍTICOS');
  const oportunidades = extrairSecao(analise, 'OPORTUNIDADES');
  const acaoRecomendada = extrairSecao(analise, 'AÇÃO PRIORITÁRIA AGORA');
  const previsao = extrairSecao(analise, 'PREVISÃO DE FECHAMENTO');

  // Salvar na aba de análises
  const agora = new Date();
  abaAnalises.appendRow([
    agora,
    'Análise Individual',
    numProp,
    proposta?.cliente || '',
    score,
    previsao || '',
    riscos || '',
    oportunidades || '',
    acaoRecomendada || '',
    analise
  ]);
}

function extrairSecao(texto, secao) {
  const regex = new RegExp(secao + ':?\\s*([\\s\\S]*?)(?=\\n\\n[🎯⚠️💎📞💬📋🔮💰]|$)', 'i');
  const match = texto.match(regex);
  return match ? match[1].trim() : '';
}

function iaResponderObjecao(objecao, numProp) {
  const p = numProp ? getProposta(numProp) : null;

  let contextoCliente = '';
  if (p && p.historicoCliente && p.historicoCliente.ganhas > 0) {
    contextoCliente = `\n⭐ IMPORTANTE: Este é um cliente recorrente com ${p.historicoCliente.ganhas} compras anteriores totalizando R$ ${p.historicoCliente.valorTotal?.toLocaleString('pt-BR') || '0'}.
Taxa de conversão: ${p.historicoCliente.taxaConversao || 0}%. Use isso estrategicamente!`;
  }

  const prompt = `O cliente fez esta objeção: "${objecao}"

${p ? `CONTEXTO DA PROPOSTA:
Proposta ${p.num} - ${p.cliente} - ${p.valorFmt} - ${p.produto}
Vendedor: ${p.vendedor} - Etapa: ${p.etapaInfo.label}${contextoCliente}` : ''}

DIFERENCIAIS PILI INDUSTRIAL: 82,7% economia energia, garantia 5 anos, certificação NR-12, suporte próprio
CONCORRENTES: SAUR (caro, assistência demorada), Grupo Capital (preço baixo, qualidade inferior)

RESPOSTA PARA ${p ? p.vendedor : 'O VENDEDOR'} USAR

TIPO DE OBJEÇÃO:
(Classifique: Preço, Prazo, Qualidade, Concorrência, Outro)

RESPOSTA IMEDIATA - COPIAR E COLAR:
Escreva resposta pronta em 3-4 linhas seguindo este formato:
"(Validação empática). (Contra-argumento com dado concreto). (Pergunta de fechamento)."

ARGUMENTOS PRINCIPAIS:

ROI E BENEFÍCIO:
${p?.valor ? `Equipamento de ${p.valorFmt} se paga em X meses com 82,7% economia energia mais redução 20% perdas.` : 'Calcule ROI baseado no valor e benefícios do equipamento.'}

COMPARAÇÃO COM SAUR:
SAUR cobra R$ 800-1200 por manutenção. Nossa garantia 5 anos cobre tudo, economizando R$ X mil em 5 anos.

COMPARAÇÃO COM GRUPO CAPITAL:
Grupo Capital não atende NR-12 adequadamente. Multa pode chegar a R$ 50 mil ou mais. Nossa certificação evita isso.

PRAZO DE ENTREGA:
Entrega em ${p?.produto?.includes('TOMBADOR') ? '45 dias' : '30-45 dias'}. Instalação em 3 dias.

PLANO B:
(Se resposta acima não funcionar, ofereça alternativa específica para esta objeção)

REGRAS DE FORMATAÇÃO - OBRIGATÓRIO:
- NÃO use asteriscos duplos (**texto**) para negrito
- NÃO use underscores (__texto__) para sublinhado
- NÃO use hashtags (###) para títulos
- NÃO use símbolos decorativos (===, ---, ***)
- Use APENAS texto simples com CAPS LOCK para ênfase nos títulos
- Seja direto e focado em resposta prática que ${p ? p.vendedor : 'o vendedor'} possa usar agora.`;

  return chamarIA(prompt, 1000);
}

function iaSugerirMensagem(numProp, contexto) {
  const p = getProposta(numProp);
  if (!p) return 'Proposta não encontrada';

  let infoCliente = '';
  if (p.historicoCliente && p.historicoCliente.ganhas > 0) {
    infoCliente = `\n⭐ Cliente já comprou ${p.historicoCliente.ganhas} vez(es). Última compra: ${p.historicoCliente.ultimaCompra || 'não registrada'}.
Padrão: ${p.historicoCliente.padraoCompra || 'não definido'}. MENCIONE o relacionamento!`;
  }

  const prompt = `Gere mensagem WhatsApp profissional para o vendedor ${p.vendedor} enviar ao cliente ${p.cliente}.

CONTEXTO:
- Proposta ${p.num} - Valor: ${p.valorFmt} - Produto: ${p.produto}
- Etapa: ${p.etapaInfo.label} - Estado: ${p.estado}
- Último contato: há ${p.diasContato} dias - Validade: ${p.diasVencer <= 0 ? 'VENCIDA' : p.diasVencer + ' dias'}
- Motivo: ${contexto || 'retomar negociação'}${infoCliente}

DIFERENCIAIS PILI INDUSTRIAL: 82,7% economia energia, garantia 5 anos, certificação NR-12

FORMATO OBRIGATÓRIO:
Olá, aqui é ${p.vendedor} da Pili Industrial. Estou entrando em contato sobre [assunto da proposta]. [1 frase sobre benefício ou contexto]. [1 frase com chamada para ação].

REGRAS:
- Máximo 4 linhas
- Tom profissional e cordial B2B
- SEMPRE começar com "Olá, aqui é ${p.vendedor} da Pili Industrial"
- Mencionar proposta ${p.num} ou produto/valor
${p.historicoCliente && p.historicoCliente.ganhas > 0 ? '- Mencionar que é continuidade de parceria' : ''}
${p.diasVencer <= 0 ? '- Oferecer renovação da proposta' : ''}
- Terminar com ação clara como "Podemos alinhar por telefone?" ou "Posso ligar hoje?"
- SEM emojis
- SEM asterisco (**), underscores (__), hashtag (#), ou símbolos (===, ---)
- SEM markdown ou formatação - APENAS texto simples
- SEM frases como "espero retorno", "fico no aguardo", "qualquer dúvida", "estou à disposição"

Gere APENAS a mensagem sem aspas, sem título, sem explicação. Texto limpo e direto.`;

  return chamarIA(prompt, 400);
}

function analiseGeralIA() {
  const props = getPropostas().filter(p => p.ativo);
  const resumo = getResumoGeral();

  // Top 10 propostas por valor
  const top10 = [...props].sort((a, b) => b.valor - a.valor).slice(0, 10);

  // Propostas críticas
  const criticas = props.filter(p => p.alertas.some(a => a.cor === 'red'));

  // Clientes recorrentes no pipeline
  const comRecorrentes = props.filter(p => p.historicoCliente && p.historicoCliente.ganhas > 0);

  // Análise por padrão de cliente
  const porPadrao = {};
  props.forEach(p => {
    const padrao = p.historicoCliente?.padraoCompra || 'Novo cliente';
    porPadrao[padrao] = (porPadrao[padrao] || 0) + 1;
  });

  const prompt = `Você é consultor de gestão comercial especializado em gestão de equipes de vendas B2B.

Analise o pipeline da PILI INDUSTRIAL e forneça subsídios executivos para o gerente comercial cobrar resultados da equipe de vendas e tomar decisões estratégicas.

RESUMO EXECUTIVO DO PIPELINE
Total de propostas ativas: ${resumo.total}
Valor total em pipeline: R$ ${resumo.valor?.toLocaleString('pt-BR')}
Propostas ganhas: ${resumo.ganhos}
Valor ganho: R$ ${resumo.valorGanho?.toLocaleString('pt-BR')}
Taxa de conversão: ${resumo.taxa}%
Média de dias no funil: ${resumo.mediaDiasFunil} dias
Propostas com alertas críticos: ${resumo.propostasUrgentes}

TOP 10 PROPOSTAS POR VALOR
${top10.map((p, i) => `${i+1}. Proposta ${p.num} - ${p.cliente} - ${p.valorFmt} - ${p.etapaInfo.label} - Prob ${p.prob}% - Vendedor: ${p.vendedor} - ${p.diasProposta}d no funil${p.historicoCliente && p.historicoCliente.ganhas > 0 ? ' - RECORRENTE' : ''}`).join('\n')}

PROPOSTAS CRÍTICAS (${criticas.length})
${criticas.slice(0, 10).map(p => `Proposta ${p.num} ${p.cliente} ${p.valorFmt} (${p.vendedor}): ${p.alertas.map(a => a.tipo).join(', ')}${p.historicoCliente && p.historicoCliente.ganhas > 0 ? ' [RECORRENTE]' : ''}`).join('\n') || 'Nenhuma'}

ANÁLISE DE CLIENTES
Clientes recorrentes no pipeline: ${comRecorrentes.length} (${((comRecorrentes.length / props.length) * 100).toFixed(0)}%)
Distribuição por padrão:
${Object.entries(porPadrao).map(([k, v]) => `${k}: ${v} propostas`).join('\n')}

POR ETAPA DO FUNIL
${Object.entries(resumo.porEtapa).filter(([k, v]) => v.qtd > 0 && !['GANHO', 'PERDIDO'].includes(k)).map(([k, v]) => `${ETAPAS[k].label}: ${v.qtd} propostas (R$ ${v.valor?.toLocaleString('pt-BR')})`).join('\n')}

CONTEXTO ESTRATÉGICO
PILI INDUSTRIAL: 82,7% economia de energia, garantia 5 anos, atende NR-12, suporte próprio
Concorrentes: SAUR (maior, caro), Grupo Capital (barato, qualidade inferior)

ANÁLISE PARA GESTÃO DO TIME COMERCIAL

DIAGNÓSTICO GERAL DO PIPELINE (máximo 4 linhas):
(Avaliação objetiva: está saudável? Tendências? Gargalos? Red flags de gestão?)

COBRANÇA IMEDIATA - AÇÕES PARA HOJE (TOP 5):
(Para cada item: proposta - vendedor responsável - ação específica a cobrar - prazo - consequência se não fizer)
1.
2.
3.
4.
5.

MAIORES OPORTUNIDADES (próximos 15 dias):
(Propostas com maior potencial de fechamento rápido + qual suporte dar ao vendedor para garantir o fechamento)

RISCOS DE PERDA IMINENTE - INTERVENÇÃO NECESSÁRIA:
(Propostas em risco + se o gerente deve intervir diretamente ou apenas orientar o vendedor + estratégia de salvamento)

PERFORMANCE DOS VENDEDORES (CRÍTICO PARA GESTÃO):
(Para cada vendedor identificado nos dados:
- Nome do vendedor
- Quantas propostas está tocando
- Qual está performando bem/mal
- Padrões de comportamento como deixa esfriar, não faz follow-up, etc
- Ação de gestão recomendada como coaching, cobrança, realocação)

PADRÕES E INSIGHTS DE NEGÓCIO:
(Tendências, sazonalidade, tipos de cliente que convertem mais, produtos mais vendidos, objeções comuns)

NECESSIDADES DE CAPACITAÇÃO:
(Com base nos dados, quais skills o time precisa desenvolver? Treinamento pontual necessário?)

AÇÃO ESTRATÉGICA DE ALTO IMPACTO:
(UMA ação que o gerente deve implementar AGORA para aumentar conversão de todo o time - seja específico e executável)

AGENDA DE GESTÃO - PRÓXIMOS 7 DIAS:
Segunda: (Reunião ou cobrança específica)
Quarta: (Checkpoint ou ação)
Sexta: (Review ou ajuste)

FORECAST REALISTA (RESPONSABILIDADE DO GERENTE):
Expectativa de fechamento próximos 30 dias: R$ [valor] ([quantidade] propostas)
Taxa de conversão esperada: [percentual]
Propostas mais prováveis de fechar: [números das propostas]
Maior risco de perda: [números das propostas]
Ação do gerente para garantir forecast: [específica]

REGRAS DE FORMATAÇÃO - OBRIGATÓRIO:
- NÃO use asteriscos duplos (**texto**) para negrito
- NÃO use underscores (__texto__) para sublinhado
- NÃO use hashtags (###) para títulos
- NÃO use símbolos decorativos (===, ---, ***)
- Use APENAS texto simples com CAPS LOCK para ênfase nos títulos de seções
- SEM emojis no corpo do texto
- Use apenas texto simples e direto.`;

  const analise = chamarIA(prompt, 2500);

  // Salvar análise geral
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let abaAnalises = ss.getSheetByName(CONFIG.ABA_ANALISES_IA);
  if (!abaAnalises) abaAnalises = criarAbaAnalisesIA();

  const agora = new Date();
  abaAnalises.appendRow([
    agora,
    'Análise Geral do Pipeline',
    '',
    '',
    resumo.taxa,
    '',
    '',
    '',
    '',
    analise
  ]);

  const html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: -apple-system, sans-serif; padding: 20px; line-height: 1.6; }
      h1 { color: #1a1a2e; border-bottom: 3px solid #4361ee; padding-bottom: 10px; }
      pre { background: #f5f5f5; padding: 15px; border-radius: 8px; white-space: pre-wrap;
            border-left: 4px solid #4361ee; }
      .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;
                font-size: 12px; color: #666; }
    </style>
    <h1>🤖 Análise Geral - Gerente Comercial IA</h1>
    <pre>${analise}</pre>
    <div class="footer">
      Análise gerada em ${Utilities.formatDate(agora, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm')} |
      Modelo: ${CONFIG.CLAUDE_MODEL}
    </div>
  `).setWidth(900).setHeight(800);

  SpreadsheetApp.getUi().showModalDialog(html, 'Análise IA do Pipeline');
}

function gerarRelatorioExecutivo() {
  const props = getPropostas();
  const resumo = getResumoGeral();
  const vendedores = getDadosPorVendedor();

  let html = `
    <style>
      body { font-family: -apple-system, sans-serif; padding: 20px; }
      .card { background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 10px 0; }
      .numero { font-size: 24px; font-weight: bold; color: #4361ee; }
      h2 { color: #1a1a2e; border-bottom: 2px solid #4361ee; padding-bottom: 8px; }
      table { width: 100%; border-collapse: collapse; margin: 10px 0; }
      th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
      th { background: #1a1a2e; color: white; }
      .badge { padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; }
      .badge-recorrente { background: #dcfce7; color: #166534; }
    </style>
    <h1>📊 Relatório Executivo - Pipeline de Vendas</h1>

    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
      <div class="card">
        <div class="numero">${resumo.total}</div>
        <div>Propostas Ativas</div>
      </div>
      <div class="card">
        <div class="numero" style="color: #27ae60">R$ ${(resumo.valor/1000000).toFixed(2)}M</div>
        <div>Valor em Pipeline</div>
      </div>
      <div class="card">
        <div class="numero" style="color: #16a34a">${resumo.taxa}%</div>
        <div>Taxa de Conversão</div>
      </div>
      <div class="card">
        <div class="numero" style="color: #e74c3c">${resumo.propostasUrgentes}</div>
        <div>Propostas Urgentes</div>
      </div>
    </div>

    <h2>👥 Por Vendedor</h2>
    <table>
      <tr><th>Vendedor</th><th>Ativas</th><th>Pipeline</th><th>Ganhos</th><th>Conversão</th><th>Alertas</th></tr>
      ${vendedores.map(v => `<tr>
        <td>${v.nome}</td>
        <td>${v.total}</td>
        <td>R$ ${(v.valor/1000).toFixed(0)}k</td>
        <td>${v.ganhos}</td>
        <td>${v.taxa}%</td>
        <td style="color:${v.alertasCriticos > 0 ? 'red' : 'green'}">${v.alertasCriticos}</td>
      </tr>`).join('')}
    </table>

    <h2>📈 Por Etapa do Funil</h2>
    <table>
      <tr><th>Etapa</th><th>Qtd</th><th>Valor</th></tr>
      ${Object.entries(resumo.porEtapa)
        .filter(([k, v]) => v.qtd > 0 && !['GANHO', 'PERDIDO'].includes(k))
        .sort((a, b) => ETAPAS[a[0]].ordem - ETAPAS[b[0]].ordem)
        .map(([k, v]) => `<tr>
          <td><span style="color:${ETAPAS[k].cor}">●</span> ${ETAPAS[k].label}</td>
          <td>${v.qtd}</td>
          <td>R$ ${(v.valor/1000).toFixed(0)}k</td>
        </tr>`).join('')}
    </table>
  `;

  const htmlOutput = HtmlService.createHtmlOutput(html).setWidth(900).setHeight(700);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Relatório Executivo');
}

// ==================== BUSCAR DADOS DO CLIENTE MELHORADO ====================
function buscarDadosClienteIA(numProp) {
  try {
    const p = getProposta(numProp);
    if (!p) return { erro: 'Proposta não encontrada' };

    // Buscar dados enriquecidos
    let dadosEnriquecidos = null;
    if (p.clienteMatchId) {
      try {
        dadosEnriquecidos = buscarDadosEnriquecidosCliente(p.clienteMatchId);
      } catch (e) {
        Logger.log('Erro ao buscar dados enriquecidos: ' + e);
      }
    }

    // Tentar buscar por CNPJ
    let dadosCNPJ = null;
    const ctrl = getControle();
    const c = ctrl[String(numProp)];

    // Verificar se já temos dados salvos no cache
    if (c && c.dadosExternos && c.dadosExternos.length > 10) {
      return { proposta: p, analise: c.dadosExternos, fonte: 'cache' };
    }

    // Buscar CNPJ nos dados da proposta
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const abaForm = ss.getSheetByName(CONFIG.ABA_FORMULARIO);
      if (abaForm && p.linhaForm) {
        const linha = abaForm.getRange(p.linhaForm, 1, 1, abaForm.getLastColumn()).getValues()[0];
        const cnpj = extrairCNPJ(linha);
        if (cnpj) {
          dadosCNPJ = buscarDadosEmpresa(cnpj);
        }
      }
    } catch (e) {
      Logger.log('Erro ao buscar CNPJ: ' + e);
    }

    // Se não achou por CNPJ, tenta por nome
    if (!dadosCNPJ || dadosCNPJ.necessitaBuscaManual) {
      try {
        dadosCNPJ = buscarDadosEmpresa(p.cliente, 'nome');
      } catch (e) {
        Logger.log('Erro ao buscar por nome: ' + e);
      }
    }

  // Gerar análise com IA
  const prompt = `Analise este cliente B2B do agronegócio e forneça inteligência comercial objetiva para subsidiar a venda.

DADOS DISPONÍVEIS
Cliente: ${p.cliente} - Estado: ${p.estado}
Proposta: ${p.valorFmt} - Produto: ${p.produto}

${dadosCNPJ && !dadosCNPJ.necessitaBuscaManual ? `
DADOS CNPJ (ReceitaWS):
Razão: ${dadosCNPJ.razaoSocial}
Fantasia: ${dadosCNPJ.fantasia || 'não informado'}
Situação: ${dadosCNPJ.situacao}
Porte: ${dadosCNPJ.porte}
Capital: R$ ${dadosCNPJ.capitalSocial}
Atividade: ${dadosCNPJ.atividadePrincipal}
Abertura: ${dadosCNPJ.dataAbertura}
Endereço: ${dadosCNPJ.endereco}
${dadosCNPJ.setorAgro ? 'SETOR AGRO: SIM' : 'SETOR AGRO: Não identificado'}
${dadosCNPJ.capacidadeEstimada ? 'Capacidade armazenagem estimada: ' + dadosCNPJ.capacidadeEstimada : ''}
` : 'CNPJ não encontrado - análise sem dados oficiais'}

${p.historicoCliente ? `
HISTÓRICO PILI INDUSTRIAL:
Compras: ${p.historicoCliente.ganhas || 0} - Perdidas: ${p.historicoCliente.perdidas || 0}
Valor total: R$ ${p.historicoCliente.valorTotal?.toLocaleString('pt-BR') || '0'}
Conversão: ${p.historicoCliente.taxaConversao || 0}% - Padrão: ${p.historicoCliente.padraoCompra || 'indefinido'}
` : 'NOVO CLIENTE (sem histórico de compras)'}

ANÁLISE COMERCIAL OBJETIVA

PERFIL E FIT:
(Porte real: micro, pequeno, médio ou grande + setor + fit com nosso produto ${p.produto}. 2-3 linhas objetivas.)

CAPACIDADE DE COMPRA:
(Baseado em capital social e porte: pode pagar ${p.valorFmt}? Risco de inadimplência? Precisa financiamento? 2 linhas.)

ARGUMENTOS ESPECÍFICOS PARA ESTE CLIENTE:
1. (Argumento baseado no setor ou atividade)
2. (Argumento baseado no porte ou capacidade)
3. (Argumento baseado na localização ${p.estado})

ALERTAS COMERCIAIS:
(Red flags: situação cadastral, tamanho vs proposta, setor incompatível. Se nada, escrever "Nenhum alerta identificado")

ESTRATÉGIA DE FECHAMENTO:
(Abordagem específica: enfatizar ROI? Enfatizar segurança NR-12? Enfatizar garantia? Considere porte e setor. 3-4 linhas práticas.)

PRÓXIMOS PASSOS DE PESQUISA:
(O que o vendedor ou gerente deve pesquisar: LinkedIn da empresa, notícias Google, capacidade instalada. Seja específico no que buscar.)

${!dadosCNPJ || dadosCNPJ.necessitaBuscaManual ? `
COMO BUSCAR CNPJ:
1. Google: "${p.cliente} CNPJ"
2. Site Receita Federal: consultacnpj.com.br
3. LinkedIn da empresa (geralmente tem CNPJ)
4. Perguntar ao cliente com contexto de que precisa para emitir proposta formal` : ''}

REGRAS DE FORMATAÇÃO - OBRIGATÓRIO:
- NÃO use asteriscos duplos (**texto**) para negrito
- NÃO use underscores (__texto__) para sublinhado
- NÃO use hashtags (###) para títulos
- NÃO use símbolos decorativos (===, ---, ***)
- Use APENAS texto simples com CAPS LOCK para ênfase nos títulos de seções
- SEM emojis exceto os já presentes no prompt`;

    let analise = '';
    try {
      analise = chamarIA(prompt, 1500);
    } catch (e) {
      Logger.log('Erro ao chamar IA: ' + e);
      analise = `⚠️ Erro ao conectar com IA: ${e}\n\nDADOS DISPONÍVEIS:\n` +
        `Cliente: ${p.cliente}\nEstado: ${p.estado}\nProduto: ${p.produto}\nValor: ${p.valorFmt}`;
    }

    // Salvar nos dados externos
    try {
      if (c && c.linha) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const aba = ss.getSheetByName(CONFIG.ABA_CONTROLE);
        if (aba) {
          const dadosParaSalvar = dadosCNPJ && !dadosCNPJ.necessitaBuscaManual
            ? `CNPJ: ${dadosCNPJ.razaoSocial} | ${dadosCNPJ.porte} | Capital: R$ ${dadosCNPJ.capitalSocial}\n\n${analise}`
            : analise;
          aba.getRange(c.linha, 11).setValue(dadosParaSalvar.substring(0, 2000));
        }
      }
    } catch (e) {
      Logger.log('Erro ao salvar dados: ' + e);
    }

    return {
      proposta: p,
      dadosCNPJ: dadosCNPJ,
      dadosEnriquecidos: dadosEnriquecidos,
      analise: analise
    };

  } catch (erro) {
    Logger.log('ERRO CRÍTICO em buscarDadosClienteIA: ' + erro);
    return {
      erro: 'Erro ao buscar dados: ' + erro,
      analise: 'Erro ao processar: ' + erro
    };
  }
}

function buscarDadosEnriquecidosCliente(clienteId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(CONFIG.ABA_DADOS_ENRIQUECIDOS);
  if (!aba || aba.getLastRow() < 2) return null;

  const dados = aba.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (dados[i][0] === clienteId) {
      return `Razão Social: ${dados[i][1]}
Nome Fantasia: ${dados[i][2]}
Porte: ${dados[i][6]}
Atividade: ${dados[i][8]}
Fonte: ${dados[i][13]} (${dados[i][14]} confiabilidade)`;
    }
  }
  return null;
}

// ==================== UTILS ====================
function parseData(v) {
  // Validações mais rigorosas
  if (!v || v === '' || v === 0) return null;

  if (v instanceof Date) {
    // Verificar se a data é válida
    if (isNaN(v.getTime())) return null;

    // Verificar timestamp
    const timestamp = v.getTime();

    // Rejeitar timestamps negativos ou muito próximos de zero (epoch 1970)
    // Antes de 01/01/2000 00:00:00 UTC = 946684800000
    if (timestamp < 946684800000) {
      return null; // Data inválida ou muito antiga para um CRM
    }

    // CORRIGIR ANO: Google Sheets interpreta anos de 2 dígitos (00-99) como 1900-1999
    // Para um CRM moderno, datas de propostas sempre devem ser 2000+
    let ano = v.getFullYear();
    if (ano >= 1950 && ano < 2000) {
      // Converter 1969 → 2069, 1970 → 2070, etc.
      const dia = v.getDate();
      const mes = v.getMonth();
      ano = ano - 1900 + 2000;
      return new Date(ano, mes, dia);
    }

    return v;
  }
  try {
    // String com formato dd/mm/yyyy ou dd/mm/yy
    if (typeof v === 'string' && v.includes('/')) {
      const p = v.split('/');
      if (p.length === 3) {
        const dia = parseInt(p[0]);
        const mes = parseInt(p[1]) - 1;
        let ano = parseInt(p[2]);

        // Validar valores básicos
        if (isNaN(dia) || isNaN(mes) || isNaN(ano)) return null;
        if (dia < 1 || dia > 31 || mes < 0 || mes > 11) return null;

        // Converter ano de 2 dígitos para 4 dígitos
        if (ano < 100) {
          // Regra: anos 00-99 devem ser 2000-2099 (contexto de CRM moderno)
          ano += 2000;
        }

        const data = new Date(ano, mes, dia);

        // Validar se a data é válida
        if (isNaN(data.getTime())) return null;

        // Validar se dia/mês/ano não foram corrigidos automaticamente pelo Date (ex: 31/02 vira 03/03)
        if (data.getDate() !== dia || data.getMonth() !== mes || data.getFullYear() !== ano) {
          return null;
        }

        return data;
      }
    }

    // Tentar parsear como data
    const data = new Date(v);
    if (isNaN(data.getTime())) return null;

    // Verificar se a data é razoável (não muito antiga ou muito futura)
    const anoData = data.getFullYear();
    if (anoData < 1900 || anoData > 2100) return null;

    return data;
  } catch(e) {
    return null;
  }
}

function fmtData(d) {
  if (!d || d === null) return '-';
  try {
    const timestamp = d.getTime();
    // Rejeitar timestamps inválidos
    if (isNaN(timestamp) || timestamp < 946684800000) return '-';
    return Utilities.formatDate(d, 'America/Sao_Paulo', 'dd/MM/yyyy');
  }
  catch(e) { return '-'; }
}

function parseValor(v) {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  try {
    let str = String(v).replace('R$', '').replace(/\s/g, '');
    if (str.includes('.') && str.includes(',')) str = str.replace(/\./g, '').replace(',', '.');
    else if (str.includes(',')) str = str.replace(',', '.');
    return parseFloat(str) || 0;
  } catch(e) { return 0; }
}

function fmtMoeda(v) {
  if (!v) return 'R$ 0';
  if (v >= 1000000) return 'R$ ' + (v/1000000).toFixed(2) + 'M';
  if (v >= 1000) return 'R$ ' + (v/1000).toFixed(0) + 'k';
  return 'R$ ' + v.toFixed(0);
}

function fmtMoedaCompleta(v) {
  if (!v) return 'R$ 0,00';
  return 'R$ ' + v.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

// ==================== RELATÓRIOS GERENCIAIS ====================

/**
 * Gera relatório completo de propostas abertas por vendedor
 */
function gerarRelatorioPorVendedor(dataInicio, dataFim, status, vendedorFiltro, estadoFiltro) {
  let props = getPropostas();

  // Aplicar filtros de status
  if (status && status.length > 0) {
    props = props.filter(p => {
      if (status.includes('ABERTAS') && p.ativo) return true;
      if (status.includes('GANHO') && p.etapa === 'GANHO') return true;
      if (status.includes('PERDIDO') && p.etapa === 'PERDIDO') return true;
      return false;
    });
  } else {
    // Se nenhum status selecionado, mostrar apenas abertas (comportamento padrão)
    props = props.filter(p => p.ativo);
  }

  // Aplicar filtro de período
  if (dataInicio || dataFim) {
    props = props.filter(p => {
      if (!p.dataCriacaoObj) return false;
      const dataProp = p.dataCriacaoObj;
      if (dataInicio && dataProp < new Date(dataInicio)) return false;
      if (dataFim && dataProp > new Date(dataFim + 'T23:59:59')) return false;
      return true;
    });
  }

  // Aplicar filtro de vendedor
  if (vendedorFiltro) {
    props = props.filter(p => p.vendedor === vendedorFiltro);
  }

  // Aplicar filtro de estado
  if (estadoFiltro) {
    props = props.filter(p => p.estado === estadoFiltro);
  }

  const vendedores = getDadosPorVendedor();
  const agora = new Date();

  // Determinar descrição do período
  let descricaoPeriodo = 'Todas as propostas';
  if (dataInicio && dataFim) {
    descricaoPeriodo = `Período: ${Utilities.formatDate(new Date(dataInicio), 'America/Sao_Paulo', 'dd/MM/yyyy')} a ${Utilities.formatDate(new Date(dataFim), 'America/Sao_Paulo', 'dd/MM/yyyy')}`;
  } else if (dataInicio) {
    descricaoPeriodo = `A partir de ${Utilities.formatDate(new Date(dataInicio), 'America/Sao_Paulo', 'dd/MM/yyyy')}`;
  } else if (dataFim) {
    descricaoPeriodo = `Até ${Utilities.formatDate(new Date(dataFim), 'America/Sao_Paulo', 'dd/MM/yyyy')}`;
  }

  // Determinar descrição do status
  let descricaoStatus = 'Apenas abertas';
  if (status && status.length > 0) {
    const statusLabels = [];
    if (status.includes('ABERTAS')) statusLabels.push('Abertas');
    if (status.includes('GANHO')) statusLabels.push('Ganhas');
    if (status.includes('PERDIDO')) statusLabels.push('Perdidas');
    descricaoStatus = statusLabels.join(', ');
  }

  let html = `
    <style>
      body { font-family: -apple-system, sans-serif; padding: 20px; background: #f5f5f5; }
      .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
      .header h1 { margin: 0; font-size: 24px; }
      .header .data { font-size: 12px; opacity: 0.8; margin-top: 5px; }
      .resumo { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
      .resumo-card { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
      .resumo-num { font-size: 32px; font-weight: bold; color: #4361ee; margin-bottom: 5px; }
      .resumo-label { font-size: 13px; color: #666; text-transform: uppercase; }
      .vendedor-secao { background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      .vendedor-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 2px solid #4361ee; }
      .vendedor-nome { font-size: 20px; font-weight: 600; color: #1a1a2e; }
      .vendedor-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin-bottom: 15px; }
      .stat-box { background: #f8f9fa; padding: 12px; border-radius: 6px; text-align: center; }
      .stat-valor { font-size: 20px; font-weight: bold; color: #4361ee; }
      .stat-label { font-size: 11px; color: #666; margin-top: 3px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th { background: #1a1a2e; color: #fff; padding: 10px; text-align: left; font-size: 12px; }
      td { padding: 10px; border-bottom: 1px solid #eee; font-size: 12px; }
      tr:hover { background: #f8f9fa; }
      .badge { padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
      .badge-alta { background: #dcfce7; color: #166534; }
      .badge-media { background: #fef3c7; color: #92400e; }
      .badge-baixa { background: #fee2e2; color: #991b1b; }
      .badge-urgente { background: #fee2e2; color: #991b1b; font-weight: 700; }
      .valor-destaque { font-weight: 600; color: #4361ee; }
      .footer { margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 6px; text-align: center; font-size: 11px; color: #666; }

      @media print {
        body { background: #fff; padding: 10px; }
        .no-print { display: none !important; }
        .header { background: #1a1a2e !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .resumo-card, .vendedor-secao { box-shadow: none; border: 1px solid #ddd; page-break-inside: avoid; }
        .vendedor-secao { page-break-inside: avoid; }
        table { page-break-inside: auto; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        thead { display: table-header-group; }
        th { background: #333 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .badge-alta, .badge-media, .badge-baixa { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    </style>

    <div class="header">
      <h1>📊 RELATÓRIO DE PIPELINE POR VENDEDOR</h1>
      <div class="data">Gerado em: ${Utilities.formatDate(agora, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm')}</div>
      <div class="data" style="margin-top:5px">${descricaoPeriodo} | Status: ${descricaoStatus}</div>
    </div>

    <div class="resumo">
      <div class="resumo-card">
        <div class="resumo-num">${props.length}</div>
        <div class="resumo-label">Propostas</div>
      </div>
      <div class="resumo-card">
        <div class="resumo-num">R$ ${(props.reduce((s, p) => s + p.valor, 0) / 1000000).toFixed(2)}M</div>
        <div class="resumo-label">Valor Total</div>
      </div>
      <div class="resumo-card">
        <div class="resumo-num">${vendedores.length}</div>
        <div class="resumo-label">Vendedores Ativos</div>
      </div>
      <div class="resumo-card">
        <div class="resumo-num">${props.filter(p => p.alertas.some(a => a.cor === 'red')).length}</div>
        <div class="resumo-label">Propostas Urgentes</div>
      </div>
    </div>
  `;

  // Detalhamento por vendedor
  vendedores.forEach(v => {
    const propostasVendedor = props.filter(p => p.vendedor === v.nome);
    const urgentes = propostasVendedor.filter(p => p.alertas.some(a => a.cor === 'red')).length;
    const alta = propostasVendedor.filter(p => p.prob >= 70).length;
    const media = propostasVendedor.filter(p => p.prob >= 40 && p.prob < 70).length;
    const baixa = propostasVendedor.filter(p => p.prob < 40).length;

    html += `
      <div class="vendedor-secao">
        <div class="vendedor-header">
          <div class="vendedor-nome">👤 ${v.nome}</div>
          <div style="font-size:13px;color:#666">${v.total} propostas abertas</div>
        </div>

        <div class="vendedor-stats">
          <div class="stat-box">
            <div class="stat-valor">R$ ${(v.valor / 1000).toFixed(0)}k</div>
            <div class="stat-label">Pipeline</div>
          </div>
          <div class="stat-box">
            <div class="stat-valor" style="color:#27ae60">${alta}</div>
            <div class="stat-label">Alta Prob (70%+)</div>
          </div>
          <div class="stat-box">
            <div class="stat-valor" style="color:#f39c12">${media}</div>
            <div class="stat-label">Média Prob</div>
          </div>
          <div class="stat-box">
            <div class="stat-valor" style="color:#e74c3c">${baixa}</div>
            <div class="stat-label">Baixa Prob</div>
          </div>
          <div class="stat-box">
            <div class="stat-valor" style="color:#e74c3c">${urgentes}</div>
            <div class="stat-label">🚨 Urgentes</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Proposta</th>
              <th>Cliente</th>
              <th>Valor</th>
              <th>Etapa</th>
              <th>Prob</th>
              <th>Dias Funil</th>
              <th>Último Contato</th>
              <th>Alertas</th>
            </tr>
          </thead>
          <tbody>
    `;

    propostasVendedor.forEach(p => {
      const probBadge = p.prob >= 70 ? 'badge-alta' : p.prob >= 40 ? 'badge-media' : 'badge-baixa';
      const alertasText = p.alertas.length > 0 ? p.alertas.map(a => a.tipo).join(', ') : '-';
      const temUrgente = p.alertas.some(a => a.cor === 'red');

      html += `
        <tr${temUrgente ? ' style="background:#fff5f5"' : ''}>
          <td><strong>#${p.num}</strong></td>
          <td>${p.cliente}${p.historicoCliente && p.historicoCliente.ganhas > 0 ? ' <span style="color:#27ae60;font-size:10px">🔁</span>' : ''}</td>
          <td class="valor-destaque">${p.valorFmtCompleto}</td>
          <td>${p.etapaInfo.label}</td>
          <td><span class="badge ${probBadge}">${p.prob}%</span></td>
          <td>${p.diasProposta}d</td>
          <td>${p.diasContato}d atrás</td>
          <td><small>${alertasText}</small></td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;
  });

  html += `
    <div class="footer no-print">
      <strong>CRM PILI</strong> | Relatório Gerencial de Pipeline<br>
      ${descricaoPeriodo} | Status: ${descricaoStatus}
      <div style="margin-top:10px">
        <button onclick="window.print()" style="padding:10px 20px;background:#4361ee;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">
          🖨️ Imprimir Relatório
        </button>
      </div>
    </div>
  `;

  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(1200)
    .setHeight(800);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Relatório por Vendedor');
}

/**
 * Gera relatório de distribuição por estado
 */
function gerarRelatorioPorEstado(dataInicio, dataFim, status, vendedorFiltro, estadoFiltro) {
  let props = getPropostas();

  // Aplicar filtros de status
  if (status && status.length > 0) {
    props = props.filter(p => {
      if (status.includes('ABERTAS') && p.ativo) return true;
      if (status.includes('GANHO') && p.etapa === 'GANHO') return true;
      if (status.includes('PERDIDO') && p.etapa === 'PERDIDO') return true;
      return false;
    });
  } else {
    // Se nenhum status selecionado, mostrar apenas abertas (comportamento padrão)
    props = props.filter(p => p.ativo);
  }

  // Aplicar filtro de período
  if (dataInicio || dataFim) {
    props = props.filter(p => {
      if (!p.dataCriacaoObj) return false;
      const dataProp = p.dataCriacaoObj;
      if (dataInicio && dataProp < new Date(dataInicio)) return false;
      if (dataFim && dataProp > new Date(dataFim + 'T23:59:59')) return false;
      return true;
    });
  }

  // Aplicar filtro de vendedor
  if (vendedorFiltro) {
    props = props.filter(p => p.vendedor === vendedorFiltro);
  }

  // Aplicar filtro de estado
  if (estadoFiltro) {
    props = props.filter(p => p.estado === estadoFiltro);
  }

  const agora = new Date();

  // Determinar descrição do período
  let descricaoPeriodo = 'Todas as propostas';
  if (dataInicio && dataFim) {
    descricaoPeriodo = `Período: ${Utilities.formatDate(new Date(dataInicio), 'America/Sao_Paulo', 'dd/MM/yyyy')} a ${Utilities.formatDate(new Date(dataFim), 'America/Sao_Paulo', 'dd/MM/yyyy')}`;
  } else if (dataInicio) {
    descricaoPeriodo = `A partir de ${Utilities.formatDate(new Date(dataInicio), 'America/Sao_Paulo', 'dd/MM/yyyy')}`;
  } else if (dataFim) {
    descricaoPeriodo = `Até ${Utilities.formatDate(new Date(dataFim), 'America/Sao_Paulo', 'dd/MM/yyyy')}`;
  }

  // Determinar descrição do status
  let descricaoStatus = 'Apenas abertas';
  if (status && status.length > 0) {
    const statusLabels = [];
    if (status.includes('ABERTAS')) statusLabels.push('Abertas');
    if (status.includes('GANHO')) statusLabels.push('Ganhas');
    if (status.includes('PERDIDO')) statusLabels.push('Perdidas');
    descricaoStatus = statusLabels.join(', ');
  }

  // Agrupar por estado
  const porEstado = {};
  props.forEach(p => {
    const estado = p.estado || 'Não informado';
    if (!porEstado[estado]) {
      porEstado[estado] = {
        total: 0,
        valor: 0,
        propostas: [],
        vendedores: new Set()
      };
    }
    porEstado[estado].total++;
    porEstado[estado].valor += p.valor;
    porEstado[estado].propostas.push(p);
    porEstado[estado].vendedores.add(p.vendedor);
  });

  // Ordenar por valor
  const estadosOrdenados = Object.entries(porEstado)
    .sort((a, b) => b[1].valor - a[1].valor);

  let html = `
    <style>
      body { font-family: -apple-system, sans-serif; padding: 20px; background: #f5f5f5; }
      .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
      .header h1 { margin: 0; font-size: 24px; }
      .header .data { font-size: 12px; opacity: 0.8; margin-top: 5px; }
      .resumo { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
      .resumo-card { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
      .resumo-num { font-size: 32px; font-weight: bold; color: #4361ee; margin-bottom: 5px; }
      .resumo-label { font-size: 13px; color: #666; text-transform: uppercase; }
      .estado-secao { background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      .estado-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 2px solid #4361ee; }
      .estado-nome { font-size: 20px; font-weight: 600; color: #1a1a2e; }
      .estado-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 15px; }
      .stat-box { background: #f8f9fa; padding: 12px; border-radius: 6px; text-align: center; }
      .stat-valor { font-size: 20px; font-weight: bold; color: #4361ee; }
      .stat-label { font-size: 11px; color: #666; margin-top: 3px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th { background: #1a1a2e; color: #fff; padding: 10px; text-align: left; font-size: 12px; }
      td { padding: 10px; border-bottom: 1px solid #eee; font-size: 12px; }
      tr:hover { background: #f8f9fa; }
      .valor-destaque { font-weight: 600; color: #4361ee; }
      .footer { margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 6px; text-align: center; font-size: 11px; color: #666; }
      .ranking { background: linear-gradient(135deg, #4361ee 0%, #3651d4 100%); color: #fff; padding: 8px 15px; border-radius: 20px; font-weight: 700; font-size: 14px; }

      @media print {
        body { background: #fff; padding: 10px; }
        .no-print { display: none !important; }
        .header { background: #1a1a2e !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .resumo-card, .estado-secao { box-shadow: none; border: 1px solid #ddd; page-break-inside: avoid; }
        .estado-secao { page-break-inside: avoid; }
        table { page-break-inside: auto; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        thead { display: table-header-group; }
        th { background: #333 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .ranking { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    </style>

    <div class="header">
      <h1>🗺️ RELATÓRIO DE PIPELINE POR ESTADO</h1>
      <div class="data">Gerado em: ${Utilities.formatDate(agora, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm')}</div>
      <div class="data" style="margin-top:5px">${descricaoPeriodo} | Status: ${descricaoStatus}</div>
    </div>

    <div class="resumo">
      <div class="resumo-card">
        <div class="resumo-num">${estadosOrdenados.length}</div>
        <div class="resumo-label">Estados</div>
      </div>
      <div class="resumo-card">
        <div class="resumo-num">${props.length}</div>
        <div class="resumo-label">Propostas</div>
      </div>
      <div class="resumo-card">
        <div class="resumo-num">R$ ${(props.reduce((s, p) => s + p.valor, 0) / 1000000).toFixed(2)}M</div>
        <div class="resumo-label">Valor Total</div>
      </div>
    </div>
  `;

  // Detalhamento por estado
  estadosOrdenados.forEach(([estado, dados], index) => {
    const valorMedio = dados.valor / dados.total;
    const alta = dados.propostas.filter(p => p.prob >= 70).length;
    const percAlta = ((alta / dados.total) * 100).toFixed(0);

    html += `
      <div class="estado-secao">
        <div class="estado-header">
          <div>
            <span class="ranking">#${index + 1}</span>
            <span class="estado-nome" style="margin-left:15px">📍 ${estado}</span>
          </div>
          <div style="font-size:13px;color:#666">${dados.total} propostas | ${dados.vendedores.size} vendedor(es)</div>
        </div>

        <div class="estado-stats">
          <div class="stat-box">
            <div class="stat-valor">R$ ${(dados.valor / 1000).toFixed(0)}k</div>
            <div class="stat-label">Valor Total</div>
          </div>
          <div class="stat-box">
            <div class="stat-valor">R$ ${(valorMedio / 1000).toFixed(0)}k</div>
            <div class="stat-label">Ticket Médio</div>
          </div>
          <div class="stat-box">
            <div class="stat-valor" style="color:#27ae60">${alta}</div>
            <div class="stat-label">Alta Probabilidade</div>
          </div>
          <div class="stat-box">
            <div class="stat-valor">${percAlta}%</div>
            <div class="stat-label">% Alta Prob</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Proposta</th>
              <th>Cliente</th>
              <th>Vendedor</th>
              <th>Valor</th>
              <th>Prob</th>
              <th>Etapa</th>
              <th>Dias Funil</th>
            </tr>
          </thead>
          <tbody>
    `;

    // Ordenar propostas por valor
    dados.propostas.sort((a, b) => b.valor - a.valor).forEach(p => {
      html += `
        <tr>
          <td><strong>#${p.num}</strong></td>
          <td>${p.cliente}</td>
          <td>${p.vendedor}</td>
          <td class="valor-destaque">${p.valorFmtCompleto}</td>
          <td>${p.prob}%</td>
          <td><span style="color:${p.etapaInfo.cor}">${p.etapaInfo.label}</span></td>
          <td>${p.diasProposta}d</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;
  });

  html += `
    <div class="footer no-print">
      <strong>CRM PILI</strong> | Relatório Gerencial por Estado<br>
      ${descricaoPeriodo} | Status: ${descricaoStatus}
      <div style="margin-top:10px">
        <button onclick="window.print()" style="padding:10px 20px;background:#4361ee;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">
          🖨️ Imprimir Relatório
        </button>
      </div>
    </div>
  `;

  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(1200)
    .setHeight(800);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Relatório por Estado');
}

/**
 * Gera relatório executivo completo (resumo + vendedores + estados)
 */
function gerarRelatorioExecutivoCompleto(dataInicio, dataFim, status, vendedorFiltro, estadoFiltro) {
  let props = getPropostas();

  // Aplicar filtros de status
  if (status && status.length > 0) {
    props = props.filter(p => {
      if (status.includes('ABERTAS') && p.ativo) return true;
      if (status.includes('GANHO') && p.etapa === 'GANHO') return true;
      if (status.includes('PERDIDO') && p.etapa === 'PERDIDO') return true;
      return false;
    });
  } else {
    // Se nenhum status selecionado, mostrar apenas abertas (comportamento padrão)
    props = props.filter(p => p.ativo);
  }

  // Aplicar filtro de período
  if (dataInicio || dataFim) {
    props = props.filter(p => {
      if (!p.dataCriacaoObj) return false;
      const dataProp = p.dataCriacaoObj;
      if (dataInicio && dataProp < new Date(dataInicio)) return false;
      if (dataFim && dataProp > new Date(dataFim + 'T23:59:59')) return false;
      return true;
    });
  }

  // Aplicar filtro de vendedor
  if (vendedorFiltro) {
    props = props.filter(p => p.vendedor === vendedorFiltro);
  }

  // Aplicar filtro de estado
  if (estadoFiltro) {
    props = props.filter(p => p.estado === estadoFiltro);
  }

  const vendedores = getDadosPorVendedor();
  const resumo = getResumoGeral();
  const agora = new Date();

  // Determinar descrição do período
  let descricaoPeriodo = 'Todas as propostas';
  if (dataInicio && dataFim) {
    descricaoPeriodo = `Período: ${Utilities.formatDate(new Date(dataInicio), 'America/Sao_Paulo', 'dd/MM/yyyy')} a ${Utilities.formatDate(new Date(dataFim), 'America/Sao_Paulo', 'dd/MM/yyyy')}`;
  } else if (dataInicio) {
    descricaoPeriodo = `A partir de ${Utilities.formatDate(new Date(dataInicio), 'America/Sao_Paulo', 'dd/MM/yyyy')}`;
  } else if (dataFim) {
    descricaoPeriodo = `Até ${Utilities.formatDate(new Date(dataFim), 'America/Sao_Paulo', 'dd/MM/yyyy')}`;
  }

  // Determinar descrição do status
  let descricaoStatus = 'Apenas abertas';
  if (status && status.length > 0) {
    const statusLabels = [];
    if (status.includes('ABERTAS')) statusLabels.push('Abertas');
    if (status.includes('GANHO')) statusLabels.push('Ganhas');
    if (status.includes('PERDIDO')) statusLabels.push('Perdidas');
    descricaoStatus = statusLabels.join(', ');
  }

  // Agrupar por estado
  const porEstado = {};
  props.forEach(p => {
    const estado = p.estado || 'Não informado';
    if (!porEstado[estado]) {
      porEstado[estado] = { total: 0, valor: 0 };
    }
    porEstado[estado].total++;
    porEstado[estado].valor += p.valor;
  });

  const estadosTop = Object.entries(porEstado)
    .sort((a, b) => b[1].valor - a[1].valor)
    .slice(0, 10);

  let html = `
    <style>
      body { font-family: -apple-system, sans-serif; padding: 20px; background: #f5f5f5; }
      .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; padding: 30px; border-radius: 8px; margin-bottom: 30px; text-align: center; }
      .header h1 { margin: 0; font-size: 28px; margin-bottom: 10px; }
      .header .data { font-size: 13px; opacity: 0.9; }
      .secao { background: #fff; padding: 25px; border-radius: 8px; margin-bottom: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      .secao-titulo { font-size: 20px; font-weight: 600; color: #1a1a2e; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #4361ee; }
      .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 20px; }
      .kpi { text-align: center; padding: 20px; background: linear-gradient(135deg, #f8f9fa 0%, #fff 100%); border-radius: 8px; border: 1px solid #e0e0e0; }
      .kpi-num { font-size: 36px; font-weight: bold; color: #4361ee; margin-bottom: 8px; }
      .kpi-label { font-size: 12px; color: #666; text-transform: uppercase; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #1a1a2e; color: #fff; padding: 12px; text-align: left; font-size: 13px; }
      td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
      tr:hover { background: #f8f9fa; }
      .badge { padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; }
      .badge-verde { background: #dcfce7; color: #166534; }
      .badge-amarelo { background: #fef3c7; color: #92400e; }
      .badge-vermelho { background: #fee2e2; color: #991b1b; }
      .destaque { font-weight: 600; color: #4361ee; }
      .footer { margin-top: 30px; padding: 20px; background: #1a1a2e; color: #fff; border-radius: 8px; text-align: center; }

      @media print {
        body { background: #fff; padding: 10px; }
        .no-print { display: none !important; }
        .header { background: #1a1a2e !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .secao { box-shadow: none; border: 1px solid #ddd; page-break-inside: avoid; }
        table { page-break-inside: auto; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        thead { display: table-header-group; }
        th { background: #333 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .badge-verde, .badge-amarelo, .badge-vermelho { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .kpi { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    </style>

    <div class="header">
      <h1>📊 RELATÓRIO EXECUTIVO DE PIPELINE</h1>
      <div class="data">Gerado em ${Utilities.formatDate(agora, 'America/Sao_Paulo', 'dd/MM/yyyy \'às\' HH:mm')}</div>
      <div class="data" style="margin-top:5px">${descricaoPeriodo} | Status: ${descricaoStatus}</div>
    </div>

    <div class="secao">
      <div class="secao-titulo">📈 KPIs Principais</div>
      <div class="kpis">
        <div class="kpi">
          <div class="kpi-num">${props.length}</div>
          <div class="kpi-label">Propostas</div>
        </div>
        <div class="kpi">
          <div class="kpi-num">R$ ${(props.reduce((s, p) => s + p.valor, 0) / 1000000).toFixed(2)}M</div>
          <div class="kpi-label">Valor Total</div>
        </div>
        <div class="kpi">
          <div class="kpi-num">${resumo.ganhos}</div>
          <div class="kpi-label">Ganhos</div>
        </div>
        <div class="kpi">
          <div class="kpi-num">${resumo.taxa}%</div>
          <div class="kpi-label">Taxa Conversão</div>
        </div>
        <div class="kpi">
          <div class="kpi-num" style="color:#e74c3c">${resumo.propostasUrgentes}</div>
          <div class="kpi-label">🚨 Urgentes</div>
        </div>
      </div>
    </div>

    <div class="secao">
      <div class="secao-titulo">👥 Performance por Vendedor</div>
      <table>
        <thead>
          <tr>
            <th>Vendedor</th>
            <th>Propostas Ativas</th>
            <th>Pipeline</th>
            <th>Ganhos</th>
            <th>Taxa Conversão</th>
            <th>Alertas Críticos</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
  `;

  vendedores.forEach(v => {
    const statusBadge = v.taxa >= 50 ? 'badge-verde' : v.taxa >= 30 ? 'badge-amarelo' : 'badge-vermelho';
    const statusTexto = v.taxa >= 50 ? '✅ Excelente' : v.taxa >= 30 ? '⚠️ Regular' : '🚨 Atenção';

    html += `
      <tr>
        <td><strong>${v.nome}</strong></td>
        <td>${v.total}</td>
        <td class="destaque">R$ ${(v.valor / 1000).toFixed(0)}k</td>
        <td>${v.ganhos}</td>
        <td><strong>${v.taxa}%</strong></td>
        <td>${v.alertasCriticos > 0 ? '<span style="color:#e74c3c">🚨 ' + v.alertasCriticos + '</span>' : '-'}</td>
        <td><span class="badge ${statusBadge}">${statusTexto}</span></td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>

    <div class="secao">
      <div class="secao-titulo">🗺️ Top 10 Estados (por valor)</div>
      <table>
        <thead>
          <tr>
            <th>Posição</th>
            <th>Estado</th>
            <th>Propostas</th>
            <th>Valor Total</th>
            <th>Ticket Médio</th>
            <th>% do Pipeline</th>
          </tr>
        </thead>
        <tbody>
  `;

  estadosTop.forEach(([estado, dados], index) => {
    const ticketMedio = dados.valor / dados.total;
    const percentual = ((dados.valor / resumo.valor) * 100).toFixed(1);

    html += `
      <tr>
        <td><strong>#${index + 1}</strong></td>
        <td>📍 <strong>${estado}</strong></td>
        <td>${dados.total}</td>
        <td class="destaque">R$ ${(dados.valor / 1000).toFixed(0)}k</td>
        <td>R$ ${(ticketMedio / 1000).toFixed(0)}k</td>
        <td><strong>${percentual}%</strong></td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>

    <div class="secao">
      <div class="secao-titulo">📊 Análise do Funil</div>
      <table>
        <thead>
          <tr>
            <th>Etapa</th>
            <th>Quantidade</th>
            <th>Valor</th>
            <th>% Propostas</th>
            <th>Ticket Médio</th>
          </tr>
        </thead>
        <tbody>
  `;

  Object.entries(resumo.porEtapa)
    .filter(([k, v]) => v.qtd > 0 && !['GANHO', 'PERDIDO'].includes(k))
    .sort((a, b) => ETAPAS[a[0]].ordem - ETAPAS[b[0]].ordem)
    .forEach(([etapa, dados]) => {
      const percentual = ((dados.qtd / resumo.total) * 100).toFixed(1);
      const ticketMedio = dados.valor / dados.qtd;

      html += `
        <tr>
          <td><span style="color:${ETAPAS[etapa].cor};font-weight:600">● ${ETAPAS[etapa].label}</span></td>
          <td>${dados.qtd}</td>
          <td class="destaque">R$ ${(dados.valor / 1000).toFixed(0)}k</td>
          <td>${percentual}%</td>
          <td>R$ ${(ticketMedio / 1000).toFixed(0)}k</td>
        </tr>
      `;
    });

  html += `
        </tbody>
      </table>
    </div>

    <div class="footer no-print">
      <div style="font-size:18px;font-weight:600;margin-bottom:10px">CRM PILI - Sistema Inteligente de Gestão Comercial</div>
      <div style="font-size:13px;opacity:0.9">
        ${descricaoPeriodo} | Status: ${descricaoStatus}<br>
        ${vendedores.length} vendedores ativos | ${estadosTop.length} estados | ${props.length} propostas
      </div>
      <div style="margin-top:15px">
        <button onclick="window.print()" style="padding:10px 20px;background:#fff;color:#1a1a2e;border:2px solid #fff;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">
          🖨️ Imprimir Relatório
        </button>
      </div>
    </div>
  `;

  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(1200)
    .setHeight(800);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Relatório Executivo Completo');
}

/**
 * Gera relatório de atividades do pipeline (histórico de ações)
 */
function gerarRelatorioAtividades(dataInicio, dataFim, status, vendedorFiltro, estadoFiltro) {
  let props = getPropostas();

  // Aplicar filtros de status
  if (status && status.length > 0) {
    props = props.filter(p => {
      if (status.includes('ABERTAS') && p.ativo) return true;
      if (status.includes('GANHO') && p.etapa === 'GANHO') return true;
      if (status.includes('PERDIDO') && p.etapa === 'PERDIDO') return true;
      return false;
    });
  } else {
    props = props.filter(p => p.ativo);
  }

  // Aplicar filtro de vendedor
  if (vendedorFiltro) {
    props = props.filter(p => p.vendedor === vendedorFiltro);
  }

  // Aplicar filtro de estado
  if (estadoFiltro) {
    props = props.filter(p => p.estado === estadoFiltro);
  }

  const agora = new Date();

  // Determinar descrição do período
  let descricaoPeriodo = 'Todo o histórico';
  if (dataInicio && dataFim) {
    descricaoPeriodo = `${Utilities.formatDate(new Date(dataInicio), 'America/Sao_Paulo', 'dd/MM/yyyy')} a ${Utilities.formatDate(new Date(dataFim), 'America/Sao_Paulo', 'dd/MM/yyyy')}`;
  } else if (dataInicio) {
    descricaoPeriodo = `A partir de ${Utilities.formatDate(new Date(dataInicio), 'America/Sao_Paulo', 'dd/MM/yyyy')}`;
  } else if (dataFim) {
    descricaoPeriodo = `Até ${Utilities.formatDate(new Date(dataFim), 'America/Sao_Paulo', 'dd/MM/yyyy')}`;
  }

  // Coletar todas as atividades
  const atividades = [];

  props.forEach(p => {
    // Data de criação
    if (p.dataCriacaoObj) {
      atividades.push({
        data: p.dataCriacaoObj,
        tipo: 'Criação',
        proposta: p.num,
        cliente: p.cliente,
        vendedor: p.vendedor,
        valor: p.valor,
        detalhes: `Proposta criada - ${p.produto} - ${p.valorFmt}`,
        etapa: 'NOVO'
      });
    }

    // Ações registradas no histórico
    if (p.hist) {
      const linhas = p.hist.split('\n');
      linhas.forEach(linha => {
        const match = linha.match(/\[(\d{2}\/\d{2}\/\d{4})\]\s*(.+)/);
        if (match) {
          const dataStr = match[1];
          const acao = match[2];
          const partesData = dataStr.split('/');
          const dataAcao = new Date(partesData[2], partesData[1] - 1, partesData[0]);

          atividades.push({
            data: dataAcao,
            tipo: acao.includes('Etapa:') ? 'Mudança Etapa' : 'Ação',
            proposta: p.num,
            cliente: p.cliente,
            vendedor: p.vendedor,
            valor: p.valor,
            detalhes: acao,
            etapa: p.etapa
          });
        }
      });
    }

    // Última mudança de etapa (se diferente de NOVO)
    if (p.etapa !== 'NOVO' && p.ultContato) {
      const dataUltContato = parseData(p.ultContato);
      if (dataUltContato) {
        atividades.push({
          data: dataUltContato,
          tipo: 'Contato',
          proposta: p.num,
          cliente: p.cliente,
          vendedor: p.vendedor,
          valor: p.valor,
          detalhes: `Último contato registrado`,
          etapa: p.etapa
        });
      }
    }

    // Se ganhou ou perdeu
    if (p.etapa === 'GANHO' || p.etapa === 'PERDIDO') {
      atividades.push({
        data: agora, // Aproximação, idealmente deveria ter data real
        tipo: p.etapa === 'GANHO' ? 'Venda Ganha' : 'Venda Perdida',
        proposta: p.num,
        cliente: p.cliente,
        vendedor: p.vendedor,
        valor: p.valor,
        detalhes: p.etapa === 'GANHO' ? `✅ Venda fechada - ${p.valorFmt}` : `❌ Proposta perdida`,
        etapa: p.etapa
      });
    }
  });

  // Filtrar por período
  let atividadesFiltradas = atividades;
  if (dataInicio || dataFim) {
    atividadesFiltradas = atividades.filter(a => {
      if (!a.data) return false;
      if (dataInicio && a.data < new Date(dataInicio)) return false;
      if (dataFim && a.data > new Date(dataFim + 'T23:59:59')) return false;
      return true;
    });
  }

  // Ordenar por data (mais recente primeiro)
  atividadesFiltradas.sort((a, b) => b.data - a.data);

  // Estatísticas
  const totalAtividades = atividadesFiltradas.length;
  const porTipo = {};
  const porVendedor = {};

  atividadesFiltradas.forEach(a => {
    porTipo[a.tipo] = (porTipo[a.tipo] || 0) + 1;
    porVendedor[a.vendedor] = (porVendedor[a.vendedor] || 0) + 1;
  });

  let html = `
    <style>
      body { font-family: -apple-system, sans-serif; padding: 20px; background: #f5f5f5; }
      .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
      .header h1 { margin: 0; font-size: 24px; }
      .header .data { font-size: 12px; opacity: 0.8; margin-top: 5px; }
      .resumo { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
      .resumo-card { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
      .resumo-num { font-size: 32px; font-weight: bold; color: #f39c12; margin-bottom: 5px; }
      .resumo-label { font-size: 13px; color: #666; text-transform: uppercase; }
      .atividade { background: #fff; padding: 15px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid #f39c12; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      .atividade-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
      .atividade-data { font-size: 11px; color: #888; }
      .atividade-tipo { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
      .tipo-criacao { background: #dcfce7; color: #166534; }
      .tipo-acao { background: #dbeafe; color: #1e40af; }
      .tipo-mudanca { background: #fef3c7; color: #92400e; }
      .tipo-contato { background: #e0e7ff; color: #4338ca; }
      .tipo-ganho { background: #d1fae5; color: #065f46; }
      .tipo-perdido { background: #fee2e2; color: #991b1b; }
      .atividade-proposta { font-weight: 600; color: #1a1a2e; }
      .atividade-detalhes { font-size: 13px; color: #666; margin-top: 5px; }
      .footer { margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 6px; text-align: center; font-size: 11px; color: #666; }

      @media print {
        body { background: #fff; padding: 10px; }
        .no-print { display: none !important; }
        .header { background: #1a1a2e !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .resumo-card, .atividade { box-shadow: none; border: 1px solid #ddd; page-break-inside: avoid; }
      }
    </style>

    <div class="header">
      <h1>📋 RELATÓRIO DE ATIVIDADES DO PIPELINE</h1>
      <div class="data">Gerado em: ${Utilities.formatDate(agora, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm')}</div>
      <div class="data" style="margin-top:5px">Período: ${descricaoPeriodo}</div>
    </div>

    <div class="resumo">
      <div class="resumo-card">
        <div class="resumo-num">${totalAtividades}</div>
        <div class="resumo-label">Atividades</div>
      </div>
      <div class="resumo-card">
        <div class="resumo-num">${porTipo['Criação'] || 0}</div>
        <div class="resumo-label">Propostas Criadas</div>
      </div>
      <div class="resumo-card">
        <div class="resumo-num">${porTipo['Venda Ganha'] || 0}</div>
        <div class="resumo-label">Vendas Ganhas</div>
      </div>
      <div class="resumo-card">
        <div class="resumo-num">${porTipo['Ação'] + porTipo['Contato'] + porTipo['Mudança Etapa'] || 0}</div>
        <div class="resumo-label">Interações</div>
      </div>
    </div>

    <div style="background:#fff;padding:20px;border-radius:8px;margin-bottom:20px;box-shadow:0 2px 4px rgba(0,0,0,0.1)">
      <h3 style="margin:0 0 15px 0;color:#1a1a2e">📊 Resumo por Tipo</h3>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:15px">
  `;

  Object.entries(porTipo).sort((a, b) => b[1] - a[1]).forEach(([tipo, count]) => {
    html += `
      <div style="padding:12px;background:#f8f9fa;border-radius:6px;text-align:center">
        <div style="font-size:20px;font-weight:bold;color:#f39c12">${count}</div>
        <div style="font-size:11px;color:#666">${tipo}</div>
      </div>
    `;
  });

  html += `
      </div>
    </div>

    <div style="background:#fff;padding:20px;border-radius:8px;margin-bottom:20px;box-shadow:0 2px 4px rgba(0,0,0,0.1)">
      <h3 style="margin:0 0 15px 0;color:#1a1a2e">⏱️ Histórico de Atividades (${atividadesFiltradas.length})</h3>
  `;

  atividadesFiltradas.forEach(a => {
    const tipoClass = a.tipo === 'Criação' ? 'tipo-criacao' :
                      a.tipo === 'Ação' ? 'tipo-acao' :
                      a.tipo === 'Mudança Etapa' ? 'tipo-mudanca' :
                      a.tipo === 'Contato' ? 'tipo-contato' :
                      a.tipo === 'Venda Ganha' ? 'tipo-ganho' : 'tipo-perdido';

    html += `
      <div class="atividade">
        <div class="atividade-header">
          <div>
            <span class="atividade-tipo ${tipoClass}">${a.tipo}</span>
            <span class="atividade-proposta"> #${a.proposta} - ${a.cliente}</span>
          </div>
          <span class="atividade-data">${Utilities.formatDate(a.data, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm')}</span>
        </div>
        <div class="atividade-detalhes">
          👤 ${a.vendedor} | ${a.detalhes}
        </div>
      </div>
    `;
  });

  html += `
    </div>

    <div class="footer no-print">
      <strong>CRM PILI</strong> | Relatório de Atividades do Pipeline<br>
      ${descricaoPeriodo} | ${totalAtividades} atividades registradas
      <div style="margin-top:10px">
        <button onclick="window.print()" style="padding:10px 20px;background:#f39c12;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">
          🖨️ Imprimir Relatório
        </button>
      </div>
    </div>
  `;

  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(1200)
    .setHeight(800);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Relatório de Atividades');
}

// ==================== SISTEMA ORIGINAL "GERAR PROPOSTA" ====================

function listarClientesEmAnalise() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var range = sheet.getDataRange();
  var values = range.getDisplayValues();

  var clientesEmAnalise = [];
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] === 'EM ANÁLISE') { // Situação: Coluna A (índice 0)
      clientesEmAnalise.push({
        nome: values[i][5], // Nome do Cliente: Coluna F
        email: values[i][10], // E-mail do Cliente: Coluna K
        linha: i + 1,
        tipo: values[i][3] // Tipo: Coluna D
      });
    }
  }

  var ui = SpreadsheetApp.getUi();
  if (clientesEmAnalise.length > 0) {
    var listaClientesParaSelecao = clientesEmAnalise.map((cliente, index) => (index + 1) + ' - ' + cliente.nome).join('\n');

    // Adicionar escolha de idioma
    var idiomaSelecionado = escolherIdioma(ui);
    var cambio = null;
    if (idiomaSelecionado === 'espanhol') {
      cambio = obterCambio(ui);
      if (cambio === null) {
        ui.alert('Operação cancelada.');
        return;
      }
    }

    var selecionadoCorretamente = false;
    while (!selecionadoCorretamente) {
      var response = ui.prompt(
        'Clientes em Análise',
        'Digite o número do cliente que deseja gerar a proposta: \n' + listaClientesParaSelecao,
        ui.ButtonSet.OK_CANCEL);

      if (response.getSelectedButton() === ui.Button.CANCEL) {
        ui.alert('Operação cancelada.');
        return;
      }

      var indiceSelecionado = parseInt(response.getResponseText()) - 1;
      if (!isNaN(indiceSelecionado) && indiceSelecionado >= 0 && indiceSelecionado < clientesEmAnalise.length) {
        var clienteSelecionado = clientesEmAnalise[indiceSelecionado];
        ui.alert('Gerando proposta para ' + clienteSelecionado.nome + '.');
        if (clienteSelecionado.tipo === 'TOMBADOR') {
          enviarDadosParaDocumentoTombador(clienteSelecionado, values, idiomaSelecionado, cambio);
        } else if (clienteSelecionado.tipo === 'COLETOR') {
          enviarDadosParaDocumentoColetor(clienteSelecionado, values, idiomaSelecionado, cambio);
        }
        selecionadoCorretamente = true;
      } else {
        ui.alert('Número inválido. Por favor, tente novamente.');
      }
    }
  } else {
    ui.alert('Não há clientes em análise no momento.');
  }
}

function escolherIdioma(ui) {
  var response = ui.prompt(
    'Escolha o Idioma / Elegir el Idioma',
    'Digite "1" para Português ou "2" para Espanhol: ',
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() === ui.Button.CANCEL) return 'portugues';
  var escolha = response.getResponseText();
  return escolha === '2' ? 'espanhol' : 'portugues';
}

function obterCambio(ui) {
  var response = ui.prompt(
    'Conversión a Dólares',
    'Ingrese la tasa de cambio (R$/US$): ',
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() === ui.Button.CANCEL) return null;
  var cambio = parseFloat(response.getResponseText().replace(',', '.'));
  if (isNaN(cambio) || cambio <= 0) {
    ui.alert('Tasa de cambio inválida. Por favor, ingrese un valor válido.');
    return null;
  }
  return cambio;
}

function converterParaDolar(valor, cambio) {
  if (!valor || !cambio) return valor;
  var valorNumerico = parseFloat(valor.toString().replace(/[^\d,.]/g, '').replace(',', '.'));
  if (isNaN(valorNumerico)) return valor;
  return (valorNumerico / cambio).toFixed(2).replace('.', ',') + ' US$';
}

function traduzirDocumento(doc, idioma) {
  if (idioma !== 'espanhol') return;
  var body = doc.getBody();
  var totalElementos = body.getNumChildren();

  for (var i = 0; i < totalElementos; i++) {
    var elemento = body.getChild(i);
    if (elemento.getType() === DocumentApp.ElementType.PARAGRAPH) {
      var paragrafo = elemento.asParagraph();
      var texto = paragrafo.getText();
      if (texto && !texto.match(/\{\{.*?\}\}/)) { // Evita traduzir marcadores
        var textoTraduzido = LanguageApp.translate(texto, 'pt', 'es');
        paragrafo.setText(textoTraduzido);
      }
    } else if (elemento.getType() === DocumentApp.ElementType.TABLE) {
      var tabela = elemento.asTable();
      for (var r = 0; r < tabela.getNumRows(); r++) {
        var linha = tabela.getRow(r);
        for (var c = 0; c < linha.getNumCells(); c++) {
          var celula = linha.getCell(c);
          var textoCelula = celula.getText();
          if (textoCelula && !textoCelula.match(/\{\{.*?\}\}/)) {
            var textoTraduzido = LanguageApp.translate(textoCelula, 'pt', 'es');
            celula.setText(textoTraduzido);
          }
        }
      }
    }
  }
}

function enviarDadosParaDocumentoTombador(clienteSelecionado, values, idiomaSelecionado, cambio) {
  var documentUrl = "https://docs.google.com/document/d/1diSJSdDf8kgAbNc2aNUpe9WJsaSuktx1NVnrFFrB7jE/edit";
  var docId = documentUrl.match(/[-\w]{25,}/)[0];
  var copiedDoc = DriveApp.getFileById(docId).makeCopy();
  var copiedDocId = copiedDoc.getId();
  var dataAtual = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");
  var nomeDoDocumento = 'Proposta para ' + clienteSelecionado.nome + ' ' + dataAtual + ' ' + Utilities.getUuid();
  copiedDoc.setName(nomeDoDocumento);

  var doc = DocumentApp.openById(copiedDocId);
  var body = doc.getBody();

  // Traduzir o texto fixo do documento para Espanhol, se necessário
  traduzirDocumento(doc, idiomaSelecionado);

  // Obter o cabeçalho da planilha
  var headers = values[0];

  // Mapeamento dos dados do cliente para TOMBADOR
  var dadosCliente = {
    "{{EMAIL}}": values[clienteSelecionado.linha - 1][headers.indexOf('E-mail:')],
    "{{CONFIRMAÇÃO_DO_EMAIL}}": values[clienteSelecionado.linha - 1][headers.indexOf('Confirmação do e-mail')],
    "{{REGIÃO}}": values[clienteSelecionado.linha - 1][headers.indexOf('Região:')],
    "{{ID_CLIENTE}}": values[clienteSelecionado.linha - 1][headers.indexOf('CPF/CNPJ/RUC do Cliente:')],
    "{{NOME_DO_CLIENTE}}": values[clienteSelecionado.linha - 1][headers.indexOf('Razão Social do Cliente:')],
    "{{ENDEREÇO_DO_CLIENTE}}": values[clienteSelecionado.linha - 1][headers.indexOf('Endereço do Cliente (completo):')],
    "{{E-MAIL_DO_CLIENTE}}": values[clienteSelecionado.linha - 1][headers.indexOf('E-mail do Cliente:')],
    "{{PREVISÃO_DE_ENTREGA}}": values[clienteSelecionado.linha - 1][headers.indexOf('Prazo de entrega (dias):')],
    "{{DATA_DA_VISITA}}": values[clienteSelecionado.linha - 1][headers.indexOf('Validade da proposta (em dias):')],
    "{{VALIDADE_DA_PROPOSTA_A}}": values[clienteSelecionado.linha - 1][headers.indexOf('Validade da proposta (em dias):')],
    "{{CHANCE_DO_NEGÓCIO}}": values[clienteSelecionado.linha - 1][headers.indexOf('Chance do negócio se concretizar:')],
    "{{PRODUTO}}": values[clienteSelecionado.linha - 1][headers.indexOf('Produto:')],
    "{{TAMANHO_DO_TOMBADOR}}": values[clienteSelecionado.linha - 1][headers.indexOf('Tamanho do tombador:')],
    "{{COMPLEMENTO}}": values[clienteSelecionado.linha - 1][headers.indexOf('Complemento ao título do produto:')],
    "{{TIPO}}": values[clienteSelecionado.linha - 1][headers.indexOf('Tipo:')],
    "{{COMPRIMENTO_DOS_TRILHOS}}": values[clienteSelecionado.linha - 1][headers.indexOf('Comprimento dos trilhos (metros):')],
    "{{ECONOMIZADOR_DE_ENERGIA}}": values[clienteSelecionado.linha - 1][headers.indexOf('Economizador de energia:')],
    "{{TIPO_DE_ACIONAMENTO}}": values[clienteSelecionado.linha - 1][headers.indexOf('Tipo de acionamento:')],
    "{{KIT_DE_DESCIDA_RÁPIDA}}": values[clienteSelecionado.linha - 1][headers.indexOf('KIT DE DESCIDA A')],
    "{{QUANTIDADE_DE_MANGUEIRAS_HIDRÁULICAS}}": values[clienteSelecionado.linha - 1][headers.indexOf('Quantidade de mangueiras hidráulicas (em metros):')],
    "{{QUANTIDADE_DE_MANGUEIRAS_ELÉTRICAS}}": values[clienteSelecionado.linha - 1][headers.indexOf('Quantidade de rede elétricas (em metros):')],
    "{{VOLTAGEM_DOS_MOTORES}}": values[clienteSelecionado.linha - 1][headers.indexOf('Voltagem dos motores (V):')],
    "{{FREQUÊNCIA_DOS_MOTORES}}": values[clienteSelecionado.linha - 1][headers.indexOf('Frequência dos motores (Hz):')],
    "{{TRAVAMENTO_AUXILIAR}}": values[clienteSelecionado.linha - 1][headers.indexOf('Travamento auxiliar:')],
    "{{VALOR_DO_TRAVAMENTO_AUXILIAR}}": converterParaDolar(values[clienteSelecionado.linha - 1][headers.indexOf('Valot total do travamento auxiliar (R$):')], cambio),
    "{{RAMPAS}}": values[clienteSelecionado.linha - 1][headers.indexOf('Rampas:')],
    "{{QUANTIDADE_DE_CONJUNTO_DE_RAMPAS}}": values[clienteSelecionado.linha - 1][headers.indexOf('Quantidade de conjunto de rampas:')],
    "{{ENCLAUSURAMENTO}}": values[clienteSelecionado.linha - 1][headers.indexOf('Enclausuramento:')],
    "{{COMPLEMENTO_ENCL}}": values[clienteSelecionado.linha - 1][headers.indexOf('Observações complementares:')],
    "{{VALOR_DO_ENCLAUSURAMENTO}}": converterParaDolar(values[clienteSelecionado.linha - 1][headers.indexOf('Valot total do enclausuramento (R$):')], cambio),
    "{{BOTOEIRAS}}": values[clienteSelecionado.linha - 1][headers.indexOf('Botoeiras:')],
    "{{QUANTIDADE_DE_FIO}}": values[clienteSelecionado.linha - 1][headers.indexOf('Quantidade de fio (metros):')],
    "{{TIPO_DE_MOLDURA}}": values[clienteSelecionado.linha - 1][headers.indexOf('TIPO DE MOLDURA A')],
    "{{TIPO_DE_CILINDROS_HIDRÁULICOS}}": values[clienteSelecionado.linha - 1][headers.indexOf('Tipo de cilindros hidráulicos:')],
    "{{GUINDASTE}}": values[clienteSelecionado.linha - 1][headers.indexOf('Guindaste:')],
    "{{VALOR_DO_GUINDASTE}}": converterParaDolar(values[clienteSelecionado.linha - 1][headers.indexOf('Valot total do guindaste (R$):')], cambio),
    "{{ÓLEO}}": values[clienteSelecionado.linha - 1][headers.indexOf('Óleo:')],
    "{{VALOR_DO_ÓLEO}}": converterParaDolar(values[clienteSelecionado.linha - 1][headers.indexOf('Valor do total óleo (R$):')], cambio),
    "{{OUTROS_REQUISITOS_SOLICITADOS_PELO_CLIENTE}}": values[clienteSelecionado.linha - 1][headers.indexOf('Outros requisitos solicitados pelo cliente:')],
    "{{TEMPO_DE_GARANTIA}}": values[clienteSelecionado.linha - 1][headers.indexOf('Tempo de garantia (em meses):')],
    "{{PREÇO_DO_EQUIPAMENTO_1}}": converterParaDolar(values[clienteSelecionado.linha - 1][headers.indexOf('Preço do equipamento (R$) (TOMBADOR):')], cambio),
    "{{TIPO_DE_FRETE_B}}": values[clienteSelecionado.linha - 1][headers.indexOf('TIPO C:')],
    "{{TIPO_DE_FRETE_A}}": values[clienteSelecionado.linha - 1][headers.indexOf('Tipo de frete:')],
    "{{VALOR_DO_FRETE}}": converterParaDolar(values[clienteSelecionado.linha - 1][headers.indexOf('Valot total do frete (R$):')], cambio),
    "{{FORMA_DE_PAGAMENTO}}": values[clienteSelecionado.linha - 1][headers.indexOf('Forma de pagamento:')],
    "{{DETALHE_A_FORMA_DE_PAGAMENTO}}": values[clienteSelecionado.linha - 1][headers.indexOf('Detalhe a forma de pagamento (digitação livre):')],
    "{{MODELO}}": values[clienteSelecionado.linha - 1][headers.indexOf('Modelo')],
    "{{CAPACIDADE}}": values[clienteSelecionado.linha - 1][headers.indexOf('Capacidade')],
    "{{TAMANHO}}": values[clienteSelecionado.linha - 1][headers.indexOf('Tamanho')],
    "{{APLICAÇÃO}}": values[clienteSelecionado.linha - 1][headers.indexOf('Aplicação')],
    "{{QT_DE_TRAVA_CHASSI}}": values[clienteSelecionado.linha - 1][headers.indexOf('Qt de trava chassi')],
    "{{QT_DE_TRAVA_RODA}}": values[clienteSelecionado.linha - 1][headers.indexOf('Qt de trava roda')],
    "{{QT_DE_CILINDROS}}": values[clienteSelecionado.linha - 1][headers.indexOf('Qt de cilindros')],
    "{{QT_DE_MOTOR}}": values[clienteSelecionado.linha - 1][headers.indexOf('Qt de motores')],
    "{{QT_DE_ÓLEO}}": values[clienteSelecionado.linha - 1][headers.indexOf('Qt de óleo')],
    "{{OLEO_A}}": values[clienteSelecionado.linha - 1][headers.indexOf('Qt de óleo')],
    "{{OLEO_B}}": values[clienteSelecionado.linha - 1][headers.indexOf('Qt de óleo A')],
    "{{BOTEIRAS2}}": values[clienteSelecionado.linha - 1][headers.indexOf('Boteiras2')],
    "{{ANGULO_DE_INCLINACAO_A}}": values[clienteSelecionado.linha - 1][headers.indexOf('Ângulo de inclinação:')],
    "{{QUANTIDADE}}": values[clienteSelecionado.linha - 1][headers.indexOf('Quantidade de equipamento (UN) (TOMBADOR):')],
    "{{TOTAL_GERAL}}": converterParaDolar(values[clienteSelecionado.linha - 1][headers.indexOf('TOTAL GERAL (R$):')], cambio),
    "{{COMPRIMENTO_TRILHOS}}": values[clienteSelecionado.linha - 1][headers.indexOf('Comprimento dos trilhos (metros):')],
    "{{DESLOCAMENTOS}}": values[clienteSelecionado.linha - 1][headers.indexOf('Número de deslocamentos técnicos previstos/solicitados:')],
    "{{VALOR_DIARIA}}": converterParaDolar(values[clienteSelecionado.linha - 1][headers.indexOf('Valor da diária técnica (R$):')], cambio),
    "{{VENDEDOR}}": values[clienteSelecionado.linha - 1][headers.indexOf('Vendedor e/ou Representante (Nome e Sobrenome):')],
    "{{TRAVAMENTO_AUXILIAR_A}}": values[clienteSelecionado.linha - 1][headers.indexOf('TRAVAMENTO AUXILIAR A')],
    "{{ENCLAUSURAMENTO_A}}": values[clienteSelecionado.linha - 1][headers.indexOf('ENCLAUSURAMENTO B')],
    "{{CALCO_DE_MANUTENCAO_A}}": values[clienteSelecionado.linha - 1][headers.indexOf('CALÇO DE MANUTENÇÃO E ACIONAMENTO A')],
    "{{KIT_DE_DESCIDA_RAPIDA_A}}": values[clienteSelecionado.linha - 1][headers.indexOf('KIT DE DESCIDA RÁPIDA A')],
    "{{ECONOMIZADOR_DE_ENERGIA_A}}": values[clienteSelecionado.linha - 1][headers.indexOf('ECONOMIZADOR DE ENERGIA A')],
    "{{ECONOMIZADOR_ENERGIA_B}}": values[clienteSelecionado.linha - 1][headers.indexOf('ECONOMIZADOR DE ENERGIA B')],
    "{{RAMPAS_E_CONJUNTOS_A}}": values[clienteSelecionado.linha - 1][headers.indexOf('RAMPAS E CONJUNTOS A')],
    "{{GUINDASTE_A}}": values[clienteSelecionado.linha - 1][headers.indexOf('GUINDASTE A')],
    "{{TRAVAMENTO_AUXILIAR_B}}": values[clienteSelecionado.linha - 1][headers.indexOf('TRAVAMENTO AUXILIAR B')],
    "{{GRELHA_A}}": values[clienteSelecionado.linha - 1][headers.indexOf('GRELHAS A')],
    "{{CALHA_A}}": values[clienteSelecionado.linha - 1][headers.indexOf('CALHAS A')],
    "{{NUMERO_PROPOSTA}}": values[clienteSelecionado.linha - 1][headers.indexOf('Número da proposta')],
    "{{DATA}}": values[clienteSelecionado.linha - 1][headers.indexOf('Carimbo de data/hora')],
    "{{MUNICÍPIO}}": values[clienteSelecionado.linha - 1][headers.indexOf('Município (onde será instalado o equipamento):')],
    "{{UF}}": values[clienteSelecionado.linha - 1][headers.indexOf('Estado (onde será instalado o equipamento):')],
    "{{PAÍS}}": values[clienteSelecionado.linha - 1][headers.indexOf('País (onde será instalado o equipamento):')],
    "{{VARANDAS_LATERAIS_1}}": values[clienteSelecionado.linha - 1][headers.indexOf('VARANDAS LATERAIS 1')],
    "{{GRELHAS_E_CALHAS_1}}": values[clienteSelecionado.linha - 1][headers.indexOf('GRELHAS E CALHAS 1')],
    "{{METROS}}": values[clienteSelecionado.linha - 1][headers.indexOf('Metros')],
    "{{QT_TA}}": values[clienteSelecionado.linha - 1][headers.indexOf('Quantidade de travamento auxiliar (UN) A:')],
    "{{QT_EN}}": values[clienteSelecionado.linha - 1][headers.indexOf('Quantidade de enclausuramento (UN) A:')],
    "{{QT_GU}}": values[clienteSelecionado.linha - 1][headers.indexOf('Quantidade de guindaste (UN) A:')],
    "{{QT_FR}}": values[clienteSelecionado.linha - 1][headers.indexOf('Quantidade unitária do frete (UN) A:')],
    "{{QT_EE}}": values[clienteSelecionado.linha - 1][headers.indexOf('Quantidade de economizador de energia (UN) A:')],
    "{{VALOR_DO_ECONOMIZADOR}}": converterParaDolar(values[clienteSelecionado.linha - 1][headers.indexOf('Valor do total do economizador de energia (R$):')], cambio),
    "{{QT_CM}}": values[clienteSelecionado.linha - 1][headers.indexOf('Quantidade de calço de manutenção (UN) A:')],
    "{{VALOR_DO_CALÇO}}": converterParaDolar(values[clienteSelecionado.linha - 1][headers.indexOf('Valor do total do calço de manutenção (R$):')], cambio),
    "{{QT_KD}}": values[clienteSelecionado.linha - 1][headers.indexOf('Quantidade de kit de descida rápida (UN) A:')],
    "{{VALOR_DO_KIT}}": converterParaDolar(values[clienteSelecionado.linha - 1][headers.indexOf('Valor do total do kit de descida rápida (R$):')], cambio),
    "{{Descrição_Anexo_1}}": values[clienteSelecionado.linha - 1][headers.indexOf('Anexo 1 do tombador (Descrição)')],
    "{{Descrição_Anexo_2}}": values[clienteSelecionado.linha - 1][headers.indexOf('Anexo 2 do tombador (Descrição)')],
    "{{Descrição_Anexo_3}}": values[clienteSelecionado.linha - 1][headers.indexOf('Anexo 3 do tombador (Descrição)')],
    "{{Descrição_Anexo_4}}": values[clienteSelecionado.linha - 1][headers.indexOf('Anexo 4 do tombador (Descrição)')],
    "{{Descrição_Anexo_5}}": values[clienteSelecionado.linha - 1][headers.indexOf('Anexo 5 do tombador (Descrição)')],
    "{{QT_CAL}}": values[clienteSelecionado.linha - 1][headers.indexOf('Quantidade calha (UN) A:')],
    "{{VALOR_DO_CALHA}}": converterParaDolar(values[clienteSelecionado.linha - 1][headers.indexOf('Valor do total da calha (R$):')], cambio),
    "{{QT_GRE}}": values[clienteSelecionado.linha - 1][headers.indexOf('Quantidade de grelha/assoalho (UN) A:')],
    "{{VALOR_DO_GRELHA}}": converterParaDolar(values[clienteSelecionado.linha - 1][headers.indexOf('Valor do total da grelha/assoalho (R$):')], cambio),
  };

  // Substituir os marcadores no documento
  for (var marcador in dadosCliente) {
    var valorCliente = dadosCliente[marcador];

    if (valorCliente !== undefined && valorCliente !== null && valorCliente.toString().trim() !== '' && valorCliente.toString() !== '#') {
      var valorProcessado = valorCliente.toString().trim();
      body.replaceText(marcador, valorProcessado);
    } else {
      var rangeElement = body.findText(marcador);

      while (rangeElement !== null) {
        var elemento = rangeElement.getElement();
        var parent = elemento.getParent();
        elemento.asText().replaceText(marcador, "");

        if (parent.getType() === DocumentApp.ElementType.PARAGRAPH) {
          var paragrafo = parent.asParagraph();
          var textoRestante = paragrafo.getText().trim();
          if (textoRestante.length === 0 || textoRestante === "#") {
            paragrafo.removeFromParent();
          }
        } else if (parent.getType() === DocumentApp.ElementType.TABLE_CELL) {
          var cell = parent.asTableCell();
          var table = cell.getParentTable();
          var rowIndex = table.getRowIndex(cell);
          var row = table.getRow(rowIndex);

          var allCellsEmpty = true;
          for (var i = 0; i < row.getNumCells(); i++) {
            var cellText = row.getCell(i).getText().trim();
            if (cellText.length > 0 && cellText !== "#") {
              allCellsEmpty = false;
              break;
            }
          }

          if (allCellsEmpty) {
            table.removeRow(rowIndex);
            rowIndex--;
          }
        }

        rangeElement = body.findText(marcador, rangeElement);
      }
    }
  }

  // Inserir imagens dos anexos
  var colunasAnexo = ['Anexo 1 do tombador', 'Anexo 2 do tombador', 'Anexo 3 do tombador', 'Anexo 4 do tombador', 'Anexo 5 do tombador'];
  colunasAnexo.forEach(function(coluna, index) {
    try {
      var urlArquivo = values[clienteSelecionado.linha - 1][headers.indexOf(coluna)];
      var marcadorAnexo = "{{" + coluna + "}}";

      if (urlArquivo) {
        var fileId = urlArquivo.match(/[-\w]{25,}/)[0];
        var arquivo = DriveApp.getFileById(fileId);
        var mimeType = arquivo.getMimeType();

        if (mimeType === MimeType.JPEG || mimeType === MimeType.PNG) {
          var rangeElement = body.findText(marcadorAnexo);
          if (rangeElement) {
            var paragrafo = rangeElement.getElement().getParent().asParagraph();
            paragrafo.replaceText(marcadorAnexo, "");

            var imagemBlob = arquivo.getBlob();
            var imagem = paragrafo.appendInlineImage(imagemBlob);

            var larguraPagina = 595.28;
            var alturaPagina = 841.89;

            var larguraImagem = imagem.getWidth();
            var alturaImagem = imagem.getHeight();

            var proporcaoImagem = larguraImagem / alturaImagem;
            var proporcaoPagina = larguraPagina / alturaPagina;

            if (proporcaoImagem > proporcaoPagina) {
              imagem.setWidth(larguraPagina);
              imagem.setHeight(larguraPagina / proporcaoImagem);
            } else {
              imagem.setHeight(alturaPagina);
              imagem.setWidth(alturaPagina * proporcaoImagem);
            }
          }
        }
      } else {
        var rangeElement = body.findText(marcadorAnexo);
        if (rangeElement) {
          var paragrafo = rangeElement.getElement().getParent().asParagraph();
          paragrafo.replaceText(marcadorAnexo, "");
        }
      }
    } catch (error) {
      Logger.log("Erro ao processar a imagem da coluna: " + coluna + " - " + error.message);
    }
  });

  doc.saveAndClose();
  exportarEEnviarDocx(clienteSelecionado, copiedDoc);
}

function enviarDadosParaDocumentoColetor(clienteSelecionado, values, idiomaSelecionado, cambio) {
  var documentUrl = "https://docs.google.com/document/d/15YEgl4q3smhCSWUDX6eMXz45HWJGJgF8vDFm6qb45qc/edit";
  var docId = documentUrl.match(/[-\w]{25,}/)[0];
  var copiedDoc = DriveApp.getFileById(docId).makeCopy();
  var copiedDocId = copiedDoc.getId();
  var dataAtual = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");
  var nomeDoDocumento = 'Proposta para ' + clienteSelecionado.nome + ' ' + dataAtual + ' ' + Utilities.getUuid();
  copiedDoc.setName(nomeDoDocumento);

  var doc = DocumentApp.openById(copiedDocId);
  var body = doc.getBody();

  traduzirDocumento(doc, idiomaSelecionado);

  var headers = values[0];

  // Mapeamento dos dados do cliente para COLETOR (versão resumida - adicione os demais campos conforme o original)
  var dadosCliente = {
    "{{NUMERO_PROPOSTA}}": values[clienteSelecionado.linha - 1][headers.indexOf('Número da proposta')],
    "{{DATA}}": values[clienteSelecionado.linha - 1][headers.indexOf('Carimbo de data/hora')],
    "{{ROTACAO}}": values[clienteSelecionado.linha - 1][headers.indexOf('Tipo de coletor:')],
    "{{COMPRIMENTO_TRILHOS}}": values[clienteSelecionado.linha - 1][headers.indexOf('Comprimento dos trilhos do coletor:')],
    "{{TRILHOS}}": values[clienteSelecionado.linha - 1][headers.indexOf('Trilhos:')],
    "{{GRAUS}}": values[clienteSelecionado.linha - 1][headers.indexOf('Grau de rotação do coletor:')],
    "{{MODELO}}": values[clienteSelecionado.linha - 1][headers.indexOf('Modelo do coletor')],
    "{{NOME_DO_CLIENTE}}": values[clienteSelecionado.linha - 1][headers.indexOf('Razão Social do Cliente:')],
    "{{ID_CLIENTE}}": values[clienteSelecionado.linha - 1][headers.indexOf('CPF/CNPJ/RUC do Cliente:')],
    // ... Adicione os demais campos conforme necessário
  };

  // Substituição de marcadores (lógica similar ao Tombador)
  for (var marcador in dadosCliente) {
    var valorCliente = dadosCliente[marcador];
    if (valorCliente !== undefined && valorCliente !== null && valorCliente.toString().trim() !== '' && valorCliente.toString() !== '#') {
      body.replaceText(marcador, valorCliente.toString().trim());
    } else {
      // Remover marcadores vazios
      var rangeElement = body.findText(marcador);
      while (rangeElement !== null) {
        rangeElement.getElement().asText().replaceText(marcador, "");
        rangeElement = body.findText(marcador, rangeElement);
      }
    }
  }

  doc.saveAndClose();
  exportarEEnviarDocx(clienteSelecionado, copiedDoc);
}

function exportarEEnviarDocx(clienteSelecionado, copiedDoc) {
  var assunto = "Proposta gerada para o cliente: " + clienteSelecionado.nome;
  var corpoEmail = "Prezado Comercial,\n\nSegue em anexo a proposta gerada para o cliente " + clienteSelecionado.nome + ". Por favor, revise e prossiga com o envio.\n\nAtenciosamente,\nEquipe de Vendas";

  var fileId = copiedDoc.getId();
  var exportUrl = "https://docs.google.com/feeds/download/documents/export/Export?id=" + fileId + "&exportFormat=docx";

  var token = ScriptApp.getOAuthToken();
  var response = UrlFetchApp.fetch(exportUrl, {
    headers: {
      'Authorization': 'Bearer ' + token
    }
  });

  var docxBlob = response.getBlob().setName(copiedDoc.getName() + ".docx");
  DriveApp.createFile(docxBlob);

  var opcoesEmail = {
    attachments: [docxBlob],
    name: 'Sistema de Envio Automático'
  };

  MailApp.sendEmail("comercial1@pili.ind.br", assunto, corpoEmail, opcoesEmail);
}

// ==================== RELATÓRIO COM FILTROS APLICADOS ====================
function gerarRelatorioComFiltrosAplicados(propostasFiltradas, descricaoFiltros) {
  try {
    Logger.log('Gerando relatório filtrado: ' + propostasFiltradas.length + ' propostas');

    const props = propostasFiltradas;

    // Calcular estatísticas
    const valorTotal = props.reduce((s, p) => s + (p.valor || 0), 0);
    const ativas = props.filter(p => p.ativo);
    const ganhas = props.filter(p => p.etapa === 'GANHO');
    const perdidas = props.filter(p => p.etapa === 'PERDIDO');

    // Agrupar por vendedor
    const porVendedor = {};
    props.forEach(p => {
      const v = p.vendedor || 'SEM VENDEDOR';
      if (!porVendedor[v]) {
        porVendedor[v] = { nome: v, propostas: [], valor: 0, ativas: 0 };
      }
      porVendedor[v].propostas.push(p);
      porVendedor[v].valor += p.valor || 0;
      if (p.ativo) porVendedor[v].ativas++;
    });

    const vendedores = Object.values(porVendedor).sort((a, b) => b.valor - a.valor);

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório Filtrado - CRM PILI</title>
        <style>
          body { font-family: -apple-system, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
          .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #1a1a2e; border-bottom: 3px solid #4361ee; padding-bottom: 15px; margin-bottom: 20px; }
          .filtros-aplicados { background: #e8f0fe; padding: 15px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #4361ee; }
          .filtros-aplicados h3 { margin-top: 0; color: #1a1a2e; font-size: 16px; }
          .filtros-aplicados p { margin: 5px 0; color: #555; font-size: 14px; }
          .resumo { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
          .resumo-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
          .resumo-card.green { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
          .resumo-card.red { background: linear-gradient(135deg, #ee0979 0%, #ff6a00 100%); }
          .resumo-card.blue { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
          .resumo-num { font-size: 32px; font-weight: 700; margin-bottom: 5px; }
          .resumo-label { font-size: 12px; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
          th { background: #f8f9fa; color: #555; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
          tr:hover { background: #f8f9fa; }
          .btn { padding: 10px 20px; background: #4361ee; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; }
          .btn:hover { background: #3651d4; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📊 Relatório Filtrado - CRM PILI</h1>

          <div class="filtros-aplicados">
            <h3>🔍 Filtros Aplicados:</h3>
            <p>${descricaoFiltros}</p>
          </div>

          <div class="resumo">
            <div class="resumo-card blue">
              <div class="resumo-num">${props.length}</div>
              <div class="resumo-label">Total</div>
            </div>
            <div class="resumo-card">
              <div class="resumo-num">${ativas.length}</div>
              <div class="resumo-label">Ativas</div>
            </div>
            <div class="resumo-card green">
              <div class="resumo-num">${ganhas.length}</div>
              <div class="resumo-label">Ganhas</div>
            </div>
            <div class="resumo-card red">
              <div class="resumo-num">${perdidas.length}</div>
              <div class="resumo-label">Perdidas</div>
            </div>
          </div>

          <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin-bottom:25px">
            <h3 style="margin-top:0">💰 Valor Total do Pipeline Filtrado</h3>
            <div style="font-size:36px;font-weight:700;color:#4361ee">R$ ${valorTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
          </div>

          <h2 style="color:#1a1a2e;margin-top:40px">👥 Por Vendedor</h2>
          <table>
            <thead>
              <tr>
                <th>Vendedor</th>
                <th>Propostas</th>
                <th>Ativas</th>
                <th>Valor Total</th>
              </tr>
            </thead>
            <tbody>
    `;

    vendedores.forEach(v => {
      html += `
        <tr>
          <td><strong>${v.nome}</strong></td>
          <td>${v.propostas.length}</td>
          <td>${v.ativas}</td>
          <td style="color:#4361ee;font-weight:600">R$ ${v.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>

          <h2 style="color:#1a1a2e;margin-top:40px">📋 Lista de Propostas</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Valor</th>
                <th>Prob</th>
                <th>Etapa</th>
              </tr>
            </thead>
            <tbody>
    `;

    props.forEach(p => {
      html += `
        <tr>
          <td><strong>${p.num}</strong></td>
          <td>${p.cliente}</td>
          <td>${p.vendedor}</td>
          <td style="color:#4361ee;font-weight:600">${p.valorFmtCompleto || 'R$ 0,00'}</td>
          <td>${p.prob}%</td>
          <td><span style="padding:4px 10px;background:${p.etapaInfo?.cor || '#ccc'};color:white;border-radius:4px;font-size:11px">${p.etapaInfo?.label || 'N/A'}</span></td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>

          <div style="margin-top:40px;padding:20px;background:#f8f9fa;border-radius:8px;text-align:center" class="no-print">
            <button onclick="window.print()" class="btn">🖨️ Imprimir Relatório</button>
          </div>

          <div style="margin-top:30px;padding-top:20px;border-top:2px solid #eee;text-align:center;color:#888;font-size:12px">
            Gerado em ${new Date().toLocaleString('pt-BR')} | CRM PILI - Sistema Inteligente de Gestão Comercial
          </div>
        </div>
      </body>
      </html>
    `;

    const htmlOutput = HtmlService.createHtmlOutput(html)
      .setWidth(1200)
      .setHeight(800);

    SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Relatório Filtrado - ' + props.length + ' propostas');

    Logger.log('✅ Relatório filtrado gerado com sucesso');
    return { sucesso: true };

  } catch (e) {
    Logger.log('❌ Erro ao gerar relatório filtrado: ' + e.message);
    throw new Error('Erro ao gerar relatório: ' + e.message);
  }
}

// ==================== DASHBOARD ANALYTICS ====================
function getDadosDashboard() {
  try {
    Logger.log('🔄 Gerando dados do dashboard...');

    const props = getPropostas();

    if (!props || props.length === 0) {
      return {
        totalPropostas: 0,
        valorTotal: 0,
        taxaConversao: 0,
        ticketMedio: 0
      };
    }

    // ========== MÉTRICAS PRINCIPAIS ==========
    const totalPropostas = props.length;
    const ativas = props.filter(p => p.ativo);
    const ganhas = props.filter(p => p.etapa === 'GANHO');
    const perdidas = props.filter(p => p.etapa === 'PERDIDO');

    const valorTotal = props.reduce((sum, p) => sum + (p.valor || 0), 0);
    const valorGanho = ganhas.reduce((sum, p) => sum + (p.valor || 0), 0);
    const valorPerdido = perdidas.reduce((sum, p) => sum + (p.valor || 0), 0);
    const valorAtivo = ativas.reduce((sum, p) => sum + (p.valor || 0), 0);

    const taxaConversao = totalPropostas > 0 ? Math.round((ganhas.length / totalPropostas) * 100) : 0;
    const ticketMedio = totalPropostas > 0 ? Math.round(valorTotal / totalPropostas) : 0;

    // ========== FUNIL POR ETAPA ==========
    const funil = {};
    const etapasObj = getEtapas();
    Object.keys(etapasObj).forEach(k => {
      if (etapasObj[k].ordem < 10) {
        const count = props.filter(p => p.etapa === k).length;
        const valor = props.filter(p => p.etapa === k).reduce((s, p) => s + (p.valor || 0), 0);
        funil[k] = { label: etapasObj[k].label, count: count, valor: valor, cor: etapasObj[k].cor };
      }
    });

    // ========== PERFORMANCE POR VENDEDOR ==========
    const vendedoresMap = {};
    props.forEach(p => {
      const v = p.vendedor;
      if (!vendedoresMap[v]) {
        vendedoresMap[v] = {
          nome: v,
          total: 0,
          ativas: 0,
          ganhas: 0,
          perdidas: 0,
          valor: 0,
          valorGanho: 0,
          valorPerdido: 0,
          taxaConversao: 0
        };
      }
      vendedoresMap[v].total++;
      vendedoresMap[v].valor += (p.valor || 0);

      if (p.ativo) vendedoresMap[v].ativas++;
      if (p.etapa === 'GANHO') {
        vendedoresMap[v].ganhas++;
        vendedoresMap[v].valorGanho += (p.valor || 0);
      }
      if (p.etapa === 'PERDIDO') {
        vendedoresMap[v].perdidas++;
        vendedoresMap[v].valorPerdido += (p.valor || 0);
      }
    });

    Object.keys(vendedoresMap).forEach(v => {
      const total = vendedoresMap[v].total;
      const ganhas = vendedoresMap[v].ganhas;
      vendedoresMap[v].taxaConversao = total > 0 ? Math.round((ganhas / total) * 100) : 0;
    });

    const vendedores = Object.values(vendedoresMap).sort((a, b) => b.valor - a.valor);

    // ========== DISTRIBUIÇÃO GEOGRÁFICA ==========
    const estadosMap = {};
    props.forEach(p => {
      const e = p.estado || 'N/A';
      if (!estadosMap[e]) {
        estadosMap[e] = { estado: e, count: 0, valor: 0, ganhas: 0, valorGanho: 0 };
      }
      estadosMap[e].count++;
      estadosMap[e].valor += (p.valor || 0);
      if (p.etapa === 'GANHO') {
        estadosMap[e].ganhas++;
        estadosMap[e].valorGanho += (p.valor || 0);
      }
    });

    const estados = Object.values(estadosMap).sort((a, b) => b.valor - a.valor);

    // ========== EVOLUÇÃO TEMPORAL (últimos 12 meses) ==========
    const hoje = new Date();
    const mesesMap = {};

    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const key = Utilities.formatDate(d, 'America/Sao_Paulo', 'yyyy-MM');
      const label = Utilities.formatDate(d, 'America/Sao_Paulo', 'MMM/yy');
      mesesMap[key] = { mes: label, criadas: 0, ganhas: 0, perdidas: 0, valorCriado: 0, valorGanho: 0 };
    }

    // Log debug para entender o problema
    let datasValidas = 0;
    let datasInvalidas = 0;
    let primeiraDataExemplo = null;

    props.forEach(p => {
      if (p.dataCriacaoObj && p.dataCriacaoObj instanceof Date && !isNaN(p.dataCriacaoObj.getTime())) {
        datasValidas++;
        if (!primeiraDataExemplo) primeiraDataExemplo = p.dataCriacaoObj;

        const key = Utilities.formatDate(p.dataCriacaoObj, 'America/Sao_Paulo', 'yyyy-MM');
        if (mesesMap[key]) {
          mesesMap[key].criadas++;
          mesesMap[key].valorCriado += (p.valor || 0);
        }
      } else {
        datasInvalidas++;
      }
    });

    Logger.log('📅 Evolução Temporal - Datas válidas: ' + datasValidas + ' | Inválidas: ' + datasInvalidas);
    if (primeiraDataExemplo) {
      Logger.log('  Exemplo de data válida: ' + Utilities.formatDate(primeiraDataExemplo, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss'));
    }
    Logger.log('  Meses mapeados: ' + Object.keys(mesesMap).join(', '));

    ganhas.forEach(p => {
      if (p.dataCriacaoObj && p.dataCriacaoObj instanceof Date && !isNaN(p.dataCriacaoObj.getTime())) {
        const key = Utilities.formatDate(p.dataCriacaoObj, 'America/Sao_Paulo', 'yyyy-MM');
        if (mesesMap[key]) {
          mesesMap[key].ganhas++;
          mesesMap[key].valorGanho += (p.valor || 0);
        }
      }
    });

    perdidas.forEach(p => {
      if (p.dataCriacaoObj && p.dataCriacaoObj instanceof Date && !isNaN(p.dataCriacaoObj.getTime())) {
        const key = Utilities.formatDate(p.dataCriacaoObj, 'America/Sao_Paulo', 'yyyy-MM');
        if (mesesMap[key]) {
          mesesMap[key].perdidas++;
        }
      }
    });

    const evolucaoTemporal = Object.values(mesesMap);

    // ========== ANÁLISE DE PROBABILIDADE ==========
    const probabilidade = {
      alta: props.filter(p => p.prob >= 70).length,
      media: props.filter(p => p.prob >= 40 && p.prob < 70).length,
      baixa: props.filter(p => p.prob < 40).length,
      valorAlta: props.filter(p => p.prob >= 70).reduce((s, p) => s + (p.valor || 0), 0),
      valorMedia: props.filter(p => p.prob >= 40 && p.prob < 70).reduce((s, p) => s + (p.valor || 0), 0),
      valorBaixa: props.filter(p => p.prob < 40).reduce((s, p) => s + (p.valor || 0), 0)
    };

    // ========== ALERTAS E URGÊNCIAS ==========
    const urgentes = props.filter(p => p.alertas && p.alertas.some(a => a.cor === 'red')).length;
    const semContato = props.filter(p => p.diasContato > 7).length;
    const vencidas = props.filter(p => p.diasVencer <= 0 && p.ativo).length;

    // ========== PRODUTOS ==========
    const produtosMap = {};
    props.forEach(p => {
      const prod = p.produto || 'N/A';
      if (!produtosMap[prod]) {
        produtosMap[prod] = { produto: prod, count: 0, valor: 0, ganhas: 0 };
      }
      produtosMap[prod].count++;
      produtosMap[prod].valor += (p.valor || 0);
      if (p.etapa === 'GANHO') produtosMap[prod].ganhas++;
    });

    const produtos = Object.values(produtosMap).sort((a, b) => b.valor - a.valor).slice(0, 10);

    // ========== RETORNAR DADOS ==========
    const resultado = {
      // Métricas principais
      totalPropostas: totalPropostas,
      ativas: ativas.length,
      ganhas: ganhas.length,
      perdidas: perdidas.length,
      valorTotal: valorTotal,
      valorAtivo: valorAtivo,
      valorGanho: valorGanho,
      valorPerdido: valorPerdido,
      taxaConversao: taxaConversao,
      ticketMedio: ticketMedio,

      // Funil
      funil: funil,

      // Performance
      vendedores: vendedores,
      estados: estados, // TODOS os estados para o mapa do Brasil

      // Temporal
      evolucaoTemporal: evolucaoTemporal,

      // Probabilidade
      probabilidade: probabilidade,

      // Alertas
      urgentes: urgentes,
      semContato: semContato,
      vencidas: vencidas,

      // Produtos
      produtos: produtos
    };

    Logger.log('✅ Dados do dashboard gerados com sucesso: ' + totalPropostas + ' propostas');
    Logger.log('  - Vendedores: ' + vendedores.length);
    Logger.log('  - Estados: ' + estados.length);
    Logger.log('  - Produtos: ' + produtos.length);
    return resultado;

  } catch (e) {
    Logger.log('❌ Erro ao gerar dados do dashboard: ' + e.message);
    return null;
  }
}

function autorizar() { Logger.log('OK'); }
