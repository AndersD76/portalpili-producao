const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Preços base TOMBADOR (tamanhos em metros: 30, 26, 21, 18, 12, 11, 10)
const PRECOS_TOMBADOR = [
  { tamanho: 30, tipo: 'FIXO', preco: 285000, descricao: 'Tombador Fixo 30m - 4 cilindros', qt_cilindros: 4, qt_motores: 2, qt_oleo: 1500, angulo: '40' },
  { tamanho: 30, tipo: 'MOVEL', preco: 315000, descricao: 'Tombador Móvel 30m - 4 cilindros', qt_cilindros: 4, qt_motores: 2, qt_oleo: 1500, angulo: '40' },
  { tamanho: 26, tipo: 'FIXO', preco: 245000, descricao: 'Tombador Fixo 26m - 3 cilindros', qt_cilindros: 3, qt_motores: 2, qt_oleo: 1000, angulo: '40' },
  { tamanho: 26, tipo: 'MOVEL', preco: 275000, descricao: 'Tombador Móvel 26m - 3 cilindros', qt_cilindros: 3, qt_motores: 2, qt_oleo: 1000, angulo: '40' },
  { tamanho: 21, tipo: 'FIXO', preco: 195000, descricao: 'Tombador Fixo 21m - 2 cilindros', qt_cilindros: 2, qt_motores: 1, qt_oleo: 550, angulo: '40' },
  { tamanho: 21, tipo: 'MOVEL', preco: 225000, descricao: 'Tombador Móvel 21m - 2 cilindros', qt_cilindros: 2, qt_motores: 1, qt_oleo: 550, angulo: '40' },
  { tamanho: 18, tipo: 'FIXO', preco: 175000, descricao: 'Tombador Fixo 18m - 2 cilindros', qt_cilindros: 2, qt_motores: 1, qt_oleo: 550, angulo: '40' },
  { tamanho: 18, tipo: 'MOVEL', preco: 205000, descricao: 'Tombador Móvel 18m - 2 cilindros', qt_cilindros: 2, qt_motores: 1, qt_oleo: 550, angulo: '40' },
  { tamanho: 12, tipo: 'FIXO', preco: 145000, descricao: 'Tombador Fixo 12m - 2 cilindros', qt_cilindros: 2, qt_motores: 1, qt_oleo: 350, angulo: '35' },
  { tamanho: 11, tipo: 'FIXO', preco: 135000, descricao: 'Tombador Fixo 11m - 2 cilindros', qt_cilindros: 2, qt_motores: 1, qt_oleo: 350, angulo: '35' },
  { tamanho: 10, tipo: 'FIXO', preco: 125000, descricao: 'Tombador Fixo 10m - 2 cilindros', qt_cilindros: 2, qt_motores: 1, qt_oleo: 350, angulo: '35' },
];

// Preços base COLETOR (graus de rotação: 180, 270)
const PRECOS_COLETOR = [
  { tamanho: 180, tipo: 'FIXO', preco: 89000, descricao: 'Coletor de Pó Fixo - 180°', qt_motores: 1 },
  { tamanho: 180, tipo: 'MOVEL', preco: 115000, descricao: 'Coletor de Pó Móvel - 180°', qt_motores: 1 },
  { tamanho: 270, tipo: 'FIXO', preco: 98000, descricao: 'Coletor de Pó Fixo - 270°', qt_motores: 1 },
  { tamanho: 270, tipo: 'MOVEL', preco: 125000, descricao: 'Coletor de Pó Móvel - 270°', qt_motores: 1 },
];

// Categorias de opcionais
const CATEGORIAS = [
  { codigo: 'ELETRICA', nome: 'Componentes Elétricos', produto: 'AMBOS', ordem: 1 },
  { codigo: 'SEGURANCA', nome: 'Equipamentos de Segurança', produto: 'AMBOS', ordem: 2 },
  { codigo: 'ESTRUTURA', nome: 'Componentes Estruturais', produto: 'AMBOS', ordem: 3 },
  { codigo: 'SERVICOS', nome: 'Serviços Adicionais', produto: 'AMBOS', ordem: 4 },
];

// Opcionais (baseado no PDF)
const OPCIONAIS = [
  // Tombador - Elétrica
  { codigo: 'ECON_ENERGIA', nome: 'Economizador de Energia', categoria: 'ELETRICA', preco: 8500, produto: 'TOMBADOR' },
  { codigo: 'BOTOEIRA_FIO', nome: 'Botoeira com Fio', categoria: 'ELETRICA', preco: 1200, produto: 'AMBOS' },
  { codigo: 'BOTOEIRA_SEM_FIO', nome: 'Botoeira Sem Fio', categoria: 'ELETRICA', preco: 2500, produto: 'AMBOS' },
  { codigo: 'BOTOEIRA_PEDESTAL', nome: 'Botoeira Pedestal', categoria: 'ELETRICA', preco: 1800, produto: 'AMBOS' },

  // Tombador - Segurança
  { codigo: 'CALCO_MANUAL', nome: 'Calço de Manutenção Manual', categoria: 'SEGURANCA', preco: 2500, produto: 'AMBOS' },
  { codigo: 'CALCO_ELETRICO', nome: 'Calço de Manutenção Elétrico', categoria: 'SEGURANCA', preco: 4500, produto: 'AMBOS' },
  { codigo: 'KIT_DESCIDA', nome: 'Kit de Descida Rápida', categoria: 'SEGURANCA', preco: 3500, produto: 'TOMBADOR' },
  { codigo: 'TRAV_AUXILIAR', nome: 'Travamento Auxiliar', categoria: 'SEGURANCA', preco: 2800, produto: 'TOMBADOR' },

  // Tombador - Estrutura
  { codigo: 'RAMPA_FIXA', nome: 'Rampa Fixa (unidade)', categoria: 'ESTRUTURA', preco: 1800, produto: 'TOMBADOR' },
  { codigo: 'RAMPA_ARTICULADA', nome: 'Rampa Articulada (unidade)', categoria: 'ESTRUTURA', preco: 2800, produto: 'TOMBADOR' },
  { codigo: 'ENCLAUSURAMENTO', nome: 'Enclausuramento (por m²)', categoria: 'ESTRUTURA', preco: 450, produto: 'TOMBADOR', preco_tipo: 'POR_METRO' },
  { codigo: 'MEIA_MOLDURA', nome: 'Meia Moldura', categoria: 'ESTRUTURA', preco: 1500, produto: 'TOMBADOR' },
  { codigo: 'MOLDURA_INTEIRA', nome: 'Moldura Inteira', categoria: 'ESTRUTURA', preco: 2800, produto: 'TOMBADOR' },
  { codigo: 'GRELHA_ASSOALHO', nome: 'Grelha/Assoalho (unidade)', categoria: 'ESTRUTURA', preco: 950, produto: 'TOMBADOR' },
  { codigo: 'VARANDA_LATERAL', nome: 'Varanda Lateral (por tombador)', categoria: 'ESTRUTURA', preco: 3200, produto: 'TOMBADOR' },

  // Coletor - Estrutura
  { codigo: 'PLATIBANDA', nome: 'Platibanda', categoria: 'ESTRUTURA', preco: 4500, produto: 'COLETOR' },
  { codigo: 'CADEIRA_PLATIBANDA', nome: 'Cadeira na Platibanda', categoria: 'ESTRUTURA', preco: 2200, produto: 'COLETOR' },
  { codigo: 'RETORNO_GRAO', nome: 'Retorno do Grão para Caminhão', categoria: 'ESTRUTURA', preco: 5500, produto: 'COLETOR' },
  { codigo: 'TUBO_4POL', nome: 'Tubo de 4 Polegadas', categoria: 'ESTRUTURA', preco: 3500, produto: 'COLETOR' },
  { codigo: 'ESCADA_RETA', nome: 'Escada Reta', categoria: 'ESTRUTURA', preco: 2800, produto: 'COLETOR' },
  { codigo: 'ESCADA_MARINHEIRO', nome: 'Escada Marinheiro', categoria: 'ESTRUTURA', preco: 0, produto: 'COLETOR' },

  // Serviços
  { codigo: 'GUINDASTE', nome: 'Guindaste para Descarregamento', categoria: 'SERVICOS', preco: 8500, produto: 'AMBOS' },
  { codigo: 'MONTAGEM', nome: 'Montagem do Equipamento', categoria: 'SERVICOS', preco: 12000, produto: 'AMBOS' },
  { codigo: 'FRETE_KM', nome: 'Frete por KM', categoria: 'SERVICOS', preco: 8.5, produto: 'AMBOS', preco_tipo: 'POR_METRO' },
  { codigo: 'DIARIA_TECNICA', nome: 'Diária Técnica', categoria: 'SERVICOS', preco: 850, produto: 'AMBOS' },
];

// Configurações
const CONFIGURACOES = [
  { chave: 'MARGEM_PADRAO', valor: '30', tipo: 'NUMBER', descricao: 'Margem padrão de lucro (%)' },
  { chave: 'COMISSAO_PADRAO', valor: '3', tipo: 'NUMBER', descricao: 'Comissão padrão do vendedor (%)' },
  { chave: 'MAX_DESCONTO_MANUAL', valor: '15', tipo: 'NUMBER', descricao: 'Desconto máximo permitido (%)' },
  { chave: 'VALIDADE_PROPOSTA', valor: '15', tipo: 'NUMBER', descricao: 'Validade padrão da proposta (dias)' },
  { chave: 'PRAZO_ENTREGA_PADRAO', valor: '120', tipo: 'NUMBER', descricao: 'Prazo de entrega padrão (dias)' },
  { chave: 'FRETE_POR_KM', valor: '8.5', tipo: 'NUMBER', descricao: 'Valor do frete por km (R$)' },
  { chave: 'DIARIA_TECNICA', valor: '850', tipo: 'NUMBER', descricao: 'Valor da diária técnica (R$)' },
  { chave: 'MANGUEIRAS_PADRAO', valor: '7', tipo: 'NUMBER', descricao: 'Metros de mangueira padrão' },
  { chave: 'CABOS_PADRAO', valor: '1', tipo: 'NUMBER', descricao: 'Metros de cabos padrão' },
];

// Descontos
const DESCONTOS = [
  { nome: 'Sem Desconto', desconto: 0, fator: 1.0000, comissao: 0.048 },
  { nome: 'Desconto 2%', desconto: 0.02, fator: 0.9804, comissao: 0.046 },
  { nome: 'Desconto 4%', desconto: 0.04, fator: 0.9615, comissao: 0.044 },
  { nome: 'Desconto 5%', desconto: 0.05, fator: 0.9524, comissao: 0.042 },
  { nome: 'Desconto 6%', desconto: 0.06, fator: 0.9434, comissao: 0.040 },
  { nome: 'Desconto 8%', desconto: 0.08, fator: 0.9259, comissao: 0.038 },
  { nome: 'Desconto 10%', desconto: 0.10, fator: 0.9091, comissao: 0.035 },
  { nome: 'Desconto 12%', desconto: 0.12, fator: 0.8929, comissao: 0.030 },
  { nome: 'Desconto 15%', desconto: 0.15, fator: 0.8696, comissao: 0.025 },
];

async function importarPrecos() {
  const client = await pool.connect();

  try {
    console.log('🚀 Iniciando importação de preços...\n');

    // 1. Criar categorias
    console.log('📁 Criando categorias...');
    for (const cat of CATEGORIAS) {
      await client.query(`
        INSERT INTO crm_precos_categorias (codigo, nome, produto, ordem_exibicao, ativo)
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (codigo) DO UPDATE SET
          nome = EXCLUDED.nome,
          produto = EXCLUDED.produto,
          ordem_exibicao = EXCLUDED.ordem_exibicao
      `, [cat.codigo, cat.nome, cat.produto, cat.ordem]);
    }
    console.log(`   ✓ ${CATEGORIAS.length} categorias criadas\n`);

    // 2. Importar preços base TOMBADOR
    console.log('🔧 Importando preços TOMBADOR...');
    let countTombador = 0;
    for (const preco of PRECOS_TOMBADOR) {
      await client.query(`
        INSERT INTO crm_precos_base (produto, tamanho, tipo, preco, descricao, qt_cilindros, qt_motores, qt_oleo, angulo_inclinacao, ativo, ordem_exibicao)
        VALUES ('TOMBADOR', $1, $2, $3, $4, $5, $6, $7, $8, true, $9)
        ON CONFLICT DO NOTHING
      `, [preco.tamanho, preco.tipo, preco.preco, preco.descricao, preco.qt_cilindros, preco.qt_motores, preco.qt_oleo, preco.angulo, countTombador]);
      countTombador++;
    }
    console.log(`   ✓ ${countTombador} preços de TOMBADOR importados\n`);

    // 3. Importar preços base COLETOR
    console.log('🔧 Importando preços COLETOR...');
    let countColetor = 0;
    for (const preco of PRECOS_COLETOR) {
      await client.query(`
        INSERT INTO crm_precos_base (produto, tamanho, tipo, preco, descricao, qt_motores, ativo, ordem_exibicao)
        VALUES ('COLETOR', $1, $2, $3, $4, $5, true, $6)
        ON CONFLICT DO NOTHING
      `, [preco.tamanho, preco.tipo, preco.preco, preco.descricao, preco.qt_motores, countColetor + 100]);
      countColetor++;
    }
    console.log(`   ✓ ${countColetor} preços de COLETOR importados\n`);

    // 4. Buscar IDs das categorias
    const categoriasResult = await client.query(`SELECT id, codigo FROM crm_precos_categorias`);
    const categoriasMap = {};
    for (const row of categoriasResult.rows) {
      categoriasMap[row.codigo] = row.id;
    }

    // 5. Importar opcionais
    console.log('⚙️ Importando opcionais...');
    let countOpcionais = 0;
    for (const opc of OPCIONAIS) {
      const categoriaId = categoriasMap[opc.categoria] || null;
      await client.query(`
        INSERT INTO crm_precos_opcoes (categoria_id, codigo, nome, descricao, preco, preco_tipo, produto, ativo, ordem_exibicao)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
        ON CONFLICT (codigo) DO UPDATE SET
          categoria_id = EXCLUDED.categoria_id,
          nome = EXCLUDED.nome,
          preco = EXCLUDED.preco,
          preco_tipo = EXCLUDED.preco_tipo,
          produto = EXCLUDED.produto
      `, [categoriaId, opc.codigo, opc.nome, opc.nome, opc.preco, opc.preco_tipo || 'FIXO', opc.produto, countOpcionais]);
      countOpcionais++;
    }
    console.log(`   ✓ ${countOpcionais} opcionais importados\n`);

    // 6. Importar configurações
    console.log('⚙️ Importando configurações...');
    for (const config of CONFIGURACOES) {
      await client.query(`
        INSERT INTO crm_precos_config (chave, valor, tipo, descricao)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (chave) DO UPDATE SET
          valor = EXCLUDED.valor,
          tipo = EXCLUDED.tipo,
          descricao = EXCLUDED.descricao
      `, [config.chave, config.valor, config.tipo, config.descricao]);
    }
    console.log(`   ✓ ${CONFIGURACOES.length} configurações importadas\n`);

    // 7. Importar descontos
    console.log('💰 Importando tabela de descontos...');
    for (const desc of DESCONTOS) {
      await client.query(`
        INSERT INTO crm_precos_descontos (nome, desconto_percentual, fator_multiplicador, comissao_percentual, ativo, ordem_exibicao)
        VALUES ($1, $2, $3, $4, true, $5)
        ON CONFLICT (desconto_percentual) DO UPDATE SET
          nome = EXCLUDED.nome,
          fator_multiplicador = EXCLUDED.fator_multiplicador,
          comissao_percentual = EXCLUDED.comissao_percentual
      `, [desc.nome, desc.desconto, desc.fator, desc.comissao, DESCONTOS.indexOf(desc)]);
    }
    console.log(`   ✓ ${DESCONTOS.length} faixas de desconto importadas\n`);

    // 8. Verificar totais
    const totais = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM crm_precos_base WHERE ativo = true) as precos_base,
        (SELECT COUNT(*) FROM crm_precos_opcoes WHERE ativo = true) as opcionais,
        (SELECT COUNT(*) FROM crm_precos_config) as configs,
        (SELECT COUNT(*) FROM crm_precos_categorias WHERE ativo = true) as categorias,
        (SELECT COUNT(*) FROM crm_precos_descontos WHERE ativo = true) as descontos
    `);

    console.log('📊 Resumo da importação:');
    console.log(`   - Preços base: ${totais.rows[0].precos_base}`);
    console.log(`   - Opcionais: ${totais.rows[0].opcionais}`);
    console.log(`   - Configurações: ${totais.rows[0].configs}`);
    console.log(`   - Categorias: ${totais.rows[0].categorias}`);
    console.log(`   - Faixas de desconto: ${totais.rows[0].descontos}`);

    console.log('\n✅ Importação concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro na importação:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

importarPrecos();
