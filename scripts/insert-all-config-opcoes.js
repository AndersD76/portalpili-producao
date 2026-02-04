require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Todas as opções baseadas no formulário do Google Forms
const configOpcoes = [
  // TAMANHO DO TOMBADOR
  { grupo: 'TAMANHO_TOMBADOR', codigo: 'TB_30', nome: '30 metros', preco: 350000, tamanhos: '30', tipo: 'TOMBADOR', ordem: 1 },
  { grupo: 'TAMANHO_TOMBADOR', codigo: 'TB_26', nome: '26 metros', preco: 300000, tamanhos: '26', tipo: 'TOMBADOR', ordem: 2 },
  { grupo: 'TAMANHO_TOMBADOR', codigo: 'TB_21', nome: '21 metros', preco: 270000, tamanhos: '21', tipo: 'TOMBADOR', ordem: 3 },
  { grupo: 'TAMANHO_TOMBADOR', codigo: 'TB_18', nome: '18 metros', preco: 250000, tamanhos: '18', tipo: 'TOMBADOR', ordem: 4 },
  { grupo: 'TAMANHO_TOMBADOR', codigo: 'TB_12', nome: '12 metros', preco: 229000, tamanhos: '12', tipo: 'TOMBADOR', ordem: 5 },
  { grupo: 'TAMANHO_TOMBADOR', codigo: 'TB_11', nome: '11 metros', preco: 226000, tamanhos: '11', tipo: 'TOMBADOR', ordem: 6 },
  { grupo: 'TAMANHO_TOMBADOR', codigo: 'TB_10', nome: '10 metros', preco: 220000, tamanhos: '10', tipo: 'TOMBADOR', ordem: 7 },

  // TIPO (MÓVEL/FIXO)
  { grupo: 'TIPO_PISO', codigo: 'MOVEL', nome: 'MÓVEL', preco: 0, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 1 },
  { grupo: 'TIPO_PISO', codigo: 'FIXO', nome: 'FIXO', preco: 0, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 2 },

  // INCLINAÇÃO
  { grupo: 'INCLINACAO', codigo: 'INC_40', nome: '40°', preco: 0, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 1 },
  { grupo: 'INCLINACAO', codigo: 'INC_35', nome: '35°', preco: 0, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 2 },

  // ECONOMIZADOR DE ENERGIA
  { grupo: 'ECONOMIZADOR', codigo: 'ECO_COM', nome: 'COM', preco: 5000, tamanhos: '30,26', tipo: 'TOMBADOR', ordem: 1 },
  { grupo: 'ECONOMIZADOR', codigo: 'ECO_SEM', nome: 'SEM', preco: 0, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 2 },
  { grupo: 'ECONOMIZADOR', codigo: 'ECO_NA', nome: 'N/A', preco: 0, tamanhos: '10,11,12', tipo: 'TOMBADOR', ordem: 3 },

  // CALÇO DE MANUTENÇÃO
  { grupo: 'CALCO_MANUTENCAO', codigo: 'CALCO_COM', nome: 'COM', preco: 5800, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 1 },
  { grupo: 'CALCO_MANUTENCAO', codigo: 'CALCO_SEM', nome: 'SEM', preco: 0, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 2 },

  // TIPO DE ACIONAMENTO DO CALÇO
  { grupo: 'ACIONAMENTO_CALCO', codigo: 'AC_MANUAL', nome: 'MANUAL', preco: 0, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 1 },
  { grupo: 'ACIONAMENTO_CALCO', codigo: 'AC_ELETRICO', nome: 'ELÉTRICO', preco: 2000, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 2 },

  // KIT DE DESCIDA RÁPIDA
  { grupo: 'KIT_DESCIDA', codigo: 'KD_COM', nome: 'COM', preco: 3500, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 1 },
  { grupo: 'KIT_DESCIDA', codigo: 'KD_SEM', nome: 'SEM', preco: 0, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 2 },

  // VOLTAGEM DOS MOTORES
  { grupo: 'VOLTAGEM', codigo: 'V_220', nome: '220V', preco: 0, tamanhos: 'ALL', tipo: 'AMBOS', ordem: 1 },
  { grupo: 'VOLTAGEM', codigo: 'V_380', nome: '380V', preco: 0, tamanhos: 'ALL', tipo: 'AMBOS', ordem: 2 },
  { grupo: 'VOLTAGEM', codigo: 'V_440', nome: '440V', preco: 0, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 3 },
  { grupo: 'VOLTAGEM', codigo: 'V_660', nome: '660V', preco: 0, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 4 },

  // FREQUÊNCIA DOS MOTORES
  { grupo: 'FREQUENCIA', codigo: 'F_60', nome: '60Hz', preco: 0, tamanhos: 'ALL', tipo: 'AMBOS', ordem: 1 },
  { grupo: 'FREQUENCIA', codigo: 'F_50', nome: '50Hz', preco: 0, tamanhos: 'ALL', tipo: 'AMBOS', ordem: 2 },

  // TRAVAMENTO MÓVEL
  { grupo: 'TRAVAMENTO', codigo: 'TRAV_COM', nome: 'COM', preco: 165000, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 1 },
  { grupo: 'TRAVAMENTO', codigo: 'TRAV_SEM', nome: 'SEM', preco: 0, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 2 },

  // RAMPAS
  { grupo: 'RAMPAS', codigo: 'RAMP_COM', nome: 'COM', preco: 5780, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 1 },
  { grupo: 'RAMPAS', codigo: 'RAMP_SEM', nome: 'SEM', preco: 0, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 2 },

  // QUANTIDADE DE RAMPAS
  { grupo: 'QTD_RAMPAS', codigo: 'QR_UMA_FIXA', nome: 'UMA FIXA', preco: 5780, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 1 },
  { grupo: 'QTD_RAMPAS', codigo: 'QR_UMA_ARTICULADA', nome: 'UMA ARTICULADA', preco: 8000, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 2 },
  { grupo: 'QTD_RAMPAS', codigo: 'QR_DUAS_FIXAS', nome: 'DUAS FIXAS', preco: 11560, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 3 },
  { grupo: 'QTD_RAMPAS', codigo: 'QR_DUAS_ARTICULADAS', nome: 'DUAS ARTICULADAS', preco: 16000, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 4 },
  { grupo: 'QTD_RAMPAS', codigo: 'QR_FIXA_ARTICULADA', nome: 'UMA FIXA NA ENTRADA E UMA ARTICULADA NA SAÍDA', preco: 13780, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 5 },
  { grupo: 'QTD_RAMPAS', codigo: 'QR_ARTICULADA_FIXA', nome: 'UMA ARTICULADA NA ENTRADA E UMA FIXA NA SAÍDA', preco: 13780, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 6 },

  // ENCLAUSURAMENTO
  { grupo: 'ENCLAUSURAMENTO', codigo: 'ENC_COM', nome: 'COM', preco: 1250, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 1 },
  { grupo: 'ENCLAUSURAMENTO', codigo: 'ENC_SEM', nome: 'SEM', preco: 0, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 2 },

  // BOTOEIRAS
  { grupo: 'BOTOEIRAS', codigo: 'BOT_COM_FIO', nome: 'COM FIO', preco: 5000, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 1 },
  { grupo: 'BOTOEIRAS', codigo: 'BOT_SEM_FIO', nome: 'SEM FIO', preco: 9300, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 2 },
  { grupo: 'BOTOEIRAS', codigo: 'BOT_PEDESTAL', nome: 'PEDESTAL', preco: 2800, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 3 },

  // MOLDURA
  { grupo: 'MOLDURA', codigo: 'MOL_SEM', nome: 'SEM MOLDURA', preco: 0, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 1 },
  { grupo: 'MOLDURA', codigo: 'MOL_MEIA', nome: 'COM MEIA MOLDURA', preco: 6000, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 2 },
  { grupo: 'MOLDURA', codigo: 'MOL_INTEIRA', nome: 'COM MOLDURA INTEIRA', preco: 12000, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 3 },

  // GRELHAS/ASSOALHOS
  { grupo: 'GRELHAS', codigo: 'GRE_COM', nome: 'COM', preco: 5000, tamanhos: '30,26,21,18', tipo: 'TOMBADOR', ordem: 1 },
  { grupo: 'GRELHAS', codigo: 'GRE_SEM', nome: 'SEM', preco: 0, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 2 },
  { grupo: 'GRELHAS', codigo: 'GRE_NA', nome: 'N/A', preco: 0, tamanhos: '10,11,12', tipo: 'TOMBADOR', ordem: 3 },

  // VARANDAS
  { grupo: 'VARANDAS', codigo: 'VAR_COM', nome: 'COM', preco: 3000, tamanhos: '30,26,21,18', tipo: 'TOMBADOR', ordem: 1 },
  { grupo: 'VARANDAS', codigo: 'VAR_SEM', nome: 'SEM', preco: 0, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 2 },
  { grupo: 'VARANDAS', codigo: 'VAR_NA', nome: 'N/A', preco: 0, tamanhos: '10,11,12', tipo: 'TOMBADOR', ordem: 3 },

  // CILINDROS HIDRÁULICOS - QUANTIDADE
  { grupo: 'QTD_CILINDROS', codigo: 'CIL_4', nome: '4 cilindros', preco: 0, tamanhos: '30', tipo: 'TOMBADOR', ordem: 1 },
  { grupo: 'QTD_CILINDROS', codigo: 'CIL_3', nome: '3 cilindros', preco: 0, tamanhos: '26', tipo: 'TOMBADOR', ordem: 2 },
  { grupo: 'QTD_CILINDROS', codigo: 'CIL_2', nome: '2 cilindros', preco: 0, tamanhos: '10,11,12,18,21', tipo: 'TOMBADOR', ordem: 3 },

  // CILINDROS HIDRÁULICOS - TIPO
  { grupo: 'TIPO_CILINDROS', codigo: 'TCIL_INTERNOS', nome: 'INTERNOS', preco: 0, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 1 },
  { grupo: 'TIPO_CILINDROS', codigo: 'TCIL_EXTERNOS', nome: 'EXTERNOS', preco: 5000, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 2 },

  // ÓLEO
  { grupo: 'OLEO', codigo: 'OLE_COM', nome: 'COM', preco: 0, tamanhos: 'ALL', tipo: 'AMBOS', ordem: 1 },
  { grupo: 'OLEO', codigo: 'OLE_SEM', nome: 'SEM', preco: 0, tamanhos: 'ALL', tipo: 'AMBOS', ordem: 2 },

  // GUINDASTE
  { grupo: 'GUINDASTE', codigo: 'GUI_COM', nome: 'COM', preco: 15000, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 1 },
  { grupo: 'GUINDASTE', codigo: 'GUI_SEM', nome: 'SEM', preco: 0, tamanhos: 'ALL', tipo: 'TOMBADOR', ordem: 2 },

  // GARANTIA
  { grupo: 'GARANTIA', codigo: 'GAR_6', nome: '6 meses', preco: 0, tamanhos: 'ALL', tipo: 'AMBOS', ordem: 1 },
  { grupo: 'GARANTIA', codigo: 'GAR_12', nome: '12 meses', preco: 0, tamanhos: 'ALL', tipo: 'AMBOS', ordem: 2 },

  // FRETE
  { grupo: 'FRETE', codigo: 'FRE_CIF', nome: 'CIF', preco: 0, tamanhos: 'ALL', tipo: 'AMBOS', ordem: 1 },
  { grupo: 'FRETE', codigo: 'FRE_FOB', nome: 'FOB', preco: 0, tamanhos: 'ALL', tipo: 'AMBOS', ordem: 2 },

  // DESLOCAMENTOS TÉCNICOS
  { grupo: 'DESLOCAMENTOS', codigo: 'DESL_1', nome: '1 deslocamento', preco: 0, tamanhos: 'ALL', tipo: 'AMBOS', ordem: 1 },
  { grupo: 'DESLOCAMENTOS', codigo: 'DESL_2', nome: '2 deslocamentos', preco: 0, tamanhos: 'ALL', tipo: 'AMBOS', ordem: 2 },

  // PRAZO DE ENTREGA
  { grupo: 'PRAZO_ENTREGA', codigo: 'PRAZO_120', nome: '120 dias', preco: 0, tamanhos: 'ALL', tipo: 'AMBOS', ordem: 1 },
  { grupo: 'PRAZO_ENTREGA', codigo: 'PRAZO_150', nome: '150 dias', preco: 0, tamanhos: 'ALL', tipo: 'AMBOS', ordem: 2 },
  { grupo: 'PRAZO_ENTREGA', codigo: 'PRAZO_180', nome: '180 dias', preco: 0, tamanhos: 'ALL', tipo: 'AMBOS', ordem: 3 },

  // CHANCE DO NEGÓCIO
  { grupo: 'CHANCE_NEGOCIO', codigo: 'CHANCE_10', nome: '10 - MUITO PROVÁVEL', preco: 0, tamanhos: 'ALL', tipo: 'AMBOS', ordem: 1 },
  { grupo: 'CHANCE_NEGOCIO', codigo: 'CHANCE_7', nome: '7 - PROVÁVEL', preco: 0, tamanhos: 'ALL', tipo: 'AMBOS', ordem: 2 },
  { grupo: 'CHANCE_NEGOCIO', codigo: 'CHANCE_4', nome: '4 - POUCO PROVÁVEL', preco: 0, tamanhos: 'ALL', tipo: 'AMBOS', ordem: 3 },

  // REGIÃO
  { grupo: 'REGIAO', codigo: 'REG_SUL', nome: 'SUL', preco: 0, tamanhos: 'ALL', tipo: 'AMBOS', ordem: 1 },
  { grupo: 'REGIAO', codigo: 'REG_SUDESTE', nome: 'SUDESTE', preco: 0, tamanhos: 'ALL', tipo: 'AMBOS', ordem: 2 },
  { grupo: 'REGIAO', codigo: 'REG_CENTRO_OESTE', nome: 'CENTRO-OESTE', preco: 0, tamanhos: 'ALL', tipo: 'AMBOS', ordem: 3 },
  { grupo: 'REGIAO', codigo: 'REG_NORDESTE', nome: 'NORDESTE', preco: 0, tamanhos: 'ALL', tipo: 'AMBOS', ordem: 4 },
  { grupo: 'REGIAO', codigo: 'REG_NORTE', nome: 'NORTE', preco: 0, tamanhos: 'ALL', tipo: 'AMBOS', ordem: 5 },
  { grupo: 'REGIAO', codigo: 'REG_MERCADO_EXTERNO', nome: 'MERCADO EXTERNO', preco: 0, tamanhos: 'ALL', tipo: 'AMBOS', ordem: 6 },

  // === COLETOR ===

  // TIPO COLETOR
  { grupo: 'TIPO_COLETOR', codigo: 'COL_FIXO', nome: 'FIXO', preco: 0, tamanhos: 'ALL', tipo: 'COLETOR', ordem: 1 },
  { grupo: 'TIPO_COLETOR', codigo: 'COL_MOVEL', nome: 'MÓVEL', preco: 0, tamanhos: 'ALL', tipo: 'COLETOR', ordem: 2 },

  // GRAU DE ROTAÇÃO
  { grupo: 'GRAU_ROTACAO', codigo: 'ROT_180', nome: '180°', preco: 0, tamanhos: 'ALL', tipo: 'COLETOR', ordem: 1 },
  { grupo: 'GRAU_ROTACAO', codigo: 'ROT_270', nome: '270°', preco: 0, tamanhos: 'ALL', tipo: 'COLETOR', ordem: 2 },

  // RETORNO DO GRÃO
  { grupo: 'RETORNO_GRAO', codigo: 'RET_COM', nome: 'COM RETORNO DE GRÃO', preco: 5000, tamanhos: 'ALL', tipo: 'COLETOR', ordem: 1 },
  { grupo: 'RETORNO_GRAO', codigo: 'RET_SEM', nome: 'SEM RETORNO DE GRÃO', preco: 0, tamanhos: 'ALL', tipo: 'COLETOR', ordem: 2 },

  // DIÂMETRO DO TUBO
  { grupo: 'DIAMETRO_TUBO', codigo: 'TUBO_3', nome: '3 POLEGADAS', preco: 0, tamanhos: 'ALL', tipo: 'COLETOR', ordem: 1 },
  { grupo: 'DIAMETRO_TUBO', codigo: 'TUBO_4', nome: '4 POLEGADAS', preco: 3000, tamanhos: 'ALL', tipo: 'COLETOR', ordem: 2 },

  // MOTOR DO COMPRESSOR
  { grupo: 'MOTOR_COMPRESSOR', codigo: 'MOT_1', nome: 'UM MOTOR DE 4,8 CV', preco: 0, tamanhos: 'ALL', tipo: 'COLETOR', ordem: 1 },
  { grupo: 'MOTOR_COMPRESSOR', codigo: 'MOT_2', nome: 'DOIS MOTORES DE 4,8 CV', preco: 5000, tamanhos: 'ALL', tipo: 'COLETOR', ordem: 2 },

  // PLATIBANDA
  { grupo: 'PLATIBANDA', codigo: 'PLAT_COM', nome: 'COM PLATIBANDA', preco: 8000, tamanhos: 'ALL', tipo: 'COLETOR', ordem: 1 },
  { grupo: 'PLATIBANDA', codigo: 'PLAT_SEM', nome: 'SEM PLATIBANDA', preco: 0, tamanhos: 'ALL', tipo: 'COLETOR', ordem: 2 },

  // CADEIRA NA PLATIBANDA
  { grupo: 'CADEIRA_PLATIBANDA', codigo: 'CAD_COM', nome: 'COM CADEIRA', preco: 2500, tamanhos: 'ALL', tipo: 'COLETOR', ordem: 1 },
  { grupo: 'CADEIRA_PLATIBANDA', codigo: 'CAD_SEM', nome: 'SEM CADEIRA', preco: 0, tamanhos: 'ALL', tipo: 'COLETOR', ordem: 2 },

  // ACIONAMENTO HIDRÁULICO
  { grupo: 'ACIONAMENTO_HIDRAULICO', codigo: 'ACIO_ALAVANCA', nome: 'ATRAVÉS DE ALAVANCA ELETRO HIDRÁULICA PROPORCIONAL', preco: 0, tamanhos: 'ALL', tipo: 'COLETOR', ordem: 1 },
  { grupo: 'ACIONAMENTO_HIDRAULICO', codigo: 'ACIO_REMOTO_SEM_FIO', nome: 'ATRAVÉS DE CONTROLE REMOTO SEM FIO', preco: 5000, tamanhos: 'ALL', tipo: 'COLETOR', ordem: 2 },
  { grupo: 'ACIONAMENTO_HIDRAULICO', codigo: 'ACIO_REMOTO_COM_FIO', nome: 'ATRAVÉS DE CONTROLE REMOTO COM FIO', preco: 3000, tamanhos: 'ALL', tipo: 'COLETOR', ordem: 3 },

  // MARCA DOS CONTACTORES
  { grupo: 'MARCA_CONTACTORES', codigo: 'CONT_SIEMENS', nome: 'SIEMENS', preco: 0, tamanhos: 'ALL', tipo: 'COLETOR', ordem: 1 },
  { grupo: 'MARCA_CONTACTORES', codigo: 'CONT_WEG', nome: 'WEG', preco: 0, tamanhos: 'ALL', tipo: 'COLETOR', ordem: 2 },
  { grupo: 'MARCA_CONTACTORES', codigo: 'CONT_OUTRA', nome: 'Outra', preco: 0, tamanhos: 'ALL', tipo: 'COLETOR', ordem: 3 },

  // TIPO DE ESCADA
  { grupo: 'TIPO_ESCADA', codigo: 'ESC_MARINHEIRO', nome: 'MARINHEIRO', preco: 0, tamanhos: 'ALL', tipo: 'COLETOR', ordem: 1 },
  { grupo: 'TIPO_ESCADA', codigo: 'ESC_RETA', nome: 'RETA', preco: 3000, tamanhos: 'ALL', tipo: 'COLETOR', ordem: 2 },
  { grupo: 'TIPO_ESCADA', codigo: 'ESC_NA', nome: 'N/A', preco: 0, tamanhos: 'ALL', tipo: 'COLETOR', ordem: 3 },

  // MONTAGEM
  { grupo: 'MONTAGEM', codigo: 'MONT_COM', nome: 'COM MONTAGEM DO EQUIPAMENTO', preco: 15000, tamanhos: 'ALL', tipo: 'COLETOR', ordem: 1 },
  { grupo: 'MONTAGEM', codigo: 'MONT_SEM', nome: 'SEM MONTAGEM DO EQUIPAMENTO', preco: 0, tamanhos: 'ALL', tipo: 'COLETOR', ordem: 2 },
];

async function insertOpcoes() {
  console.log('\n=== Inserindo Opções de Configuração Completas ===\n');

  try {
    // Limpar tabela
    await pool.query('DELETE FROM crm_config_opcoes');

    // Inserir todas as opções
    let inserted = 0;
    for (const opt of configOpcoes) {
      await pool.query(`
        INSERT INTO crm_config_opcoes (grupo, codigo, nome, preco, tamanhos_aplicaveis, tipo_produto, ordem, ativo)
        VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
      `, [opt.grupo, opt.codigo, opt.nome, opt.preco, opt.tamanhos, opt.tipo, opt.ordem]);
      inserted++;
    }

    console.log(`✓ ${inserted} opções inseridas`);

    // Resumo
    const resumo = await pool.query(`
      SELECT grupo, tipo_produto, COUNT(*) as qtd
      FROM crm_config_opcoes
      GROUP BY grupo, tipo_produto
      ORDER BY tipo_produto, grupo
    `);

    console.log('\n=== Resumo por Grupo ===');
    let currentTipo = '';
    resumo.rows.forEach(r => {
      if (r.tipo_produto !== currentTipo) {
        currentTipo = r.tipo_produto;
        console.log(`\n--- ${currentTipo} ---`);
      }
      console.log(`  ${r.grupo}: ${r.qtd} opções`);
    });

    console.log('\n✅ Importação concluída!\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

insertOpcoes();
