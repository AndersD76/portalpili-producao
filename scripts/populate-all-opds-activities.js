const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false,
  } : false,
});

const ATIVIDADES_PADRAO = [
  { atividade: 'LIBERAÇÃO FINANCEIRA', responsavel: 'FINANCEIRO', ordem: 1 },
  { atividade: 'CRIAÇÃO DA OPD', responsavel: 'PCP', ordem: 2 },
  { atividade: 'COMPRA DE MATÉRIA PRIMA', responsavel: 'COMPRAS', ordem: 3 },
  { atividade: 'RECEBIMENTO DE MATÉRIA PRIMA', responsavel: 'ALMOXARIFADO', ordem: 4 },
  { atividade: 'CORTE', responsavel: 'CORTE', ordem: 5 },
  { atividade: 'DOBRA', responsavel: 'DOBRA', ordem: 6 },
  { atividade: 'USINAGEM', responsavel: 'USINAGEM', ordem: 7 },
  { atividade: 'SOLDAGEM', responsavel: 'SOLDAGEM', ordem: 8 },
  { atividade: 'JATEAMENTO', responsavel: 'JATEAMENTO', ordem: 9 },
  { atividade: 'PINTURA', responsavel: 'PINTURA', ordem: 10 },
  { atividade: 'MONTAGEM MECÂNICA', responsavel: 'MONTAGEM', ordem: 11 },
  { atividade: 'MONTAGEM HIDRÁULICA', responsavel: 'MONTAGEM', ordem: 12 },
  { atividade: 'MONTAGEM ELÉTRICA', responsavel: 'MONTAGEM', ordem: 13 },
  { atividade: 'TESTES', responsavel: 'QUALIDADE', ordem: 14 },
  { atividade: 'EMBALAGEM', responsavel: 'EXPEDIÇÃO', ordem: 15 },
  { atividade: 'PRODUÇÃO', responsavel: 'PRODUÇÃO', ordem: 16 },
  { atividade: 'EXPEDIÇÃO', responsavel: 'EXPEDIÇÃO', ordem: 17 },
  { atividade: 'LIBERAÇÃO E EMBARQUE', responsavel: 'EXPEDIÇÃO', ordem: 18 },
  { atividade: 'PREPARAÇÃO', responsavel: 'INSTALAÇÃO', ordem: 19 },
  { atividade: 'DESEMBARQUE E PRÉ-INSTALAÇÃO', responsavel: 'INSTALAÇÃO', ordem: 20 },
  { atividade: 'ENTREGA', responsavel: 'INSTALAÇÃO', ordem: 21 },
];

function calcularPrevisaoInicio(dataPedido, ordem) {
  const data = new Date(dataPedido);
  data.setDate(data.getDate() + (ordem - 1) * 2);
  return data;
}

async function populateAllOpdActivities() {
  try {
    console.log('🔍 Buscando todas as OPDs...');

    // Buscar todas as OPDs
    const opdsResult = await pool.query(`
      SELECT numero, data_pedido
      FROM opds
      ORDER BY numero
    `);

    const opds = opdsResult.rows;
    console.log(`📋 Encontradas ${opds.length} OPDs\n`);

    let totalAtividadesCriadas = 0;
    let opdsSemAtividades = 0;

    for (const opd of opds) {
      // Verificar quantas atividades já existem para esta OPD
      const atividadesExistentes = await pool.query(`
        SELECT COUNT(*) as count
        FROM registros_atividades
        WHERE numero_opd = $1
      `, [opd.numero]);

      const countExistente = parseInt(atividadesExistentes.rows[0].count);

      if (countExistente === 21) {
        console.log(`✅ OPD ${opd.numero} já possui todas as 21 atividades`);
        continue;
      }

      console.log(`⚠️  OPD ${opd.numero} possui apenas ${countExistente} atividades. Criando as ${21 - countExistente} faltantes...`);
      opdsSemAtividades++;

      // Buscar quais atividades já existem
      const atividadesExistentesNomes = await pool.query(`
        SELECT atividade
        FROM registros_atividades
        WHERE numero_opd = $1
      `, [opd.numero]);

      const nomesExistentes = atividadesExistentesNomes.rows.map(r => r.atividade);

      // Criar apenas as atividades que não existem
      const dataPedidoDate = opd.data_pedido ? new Date(opd.data_pedido) : new Date();
      let atividadesCriadasNestaOPD = 0;

      for (const atividadePadrao of ATIVIDADES_PADRAO) {
        if (!nomesExistentes.includes(atividadePadrao.atividade)) {
          const previsaoInicio = calcularPrevisaoInicio(dataPedidoDate, atividadePadrao.ordem);

          await pool.query(`
            INSERT INTO registros_atividades (
              numero_opd,
              atividade,
              responsavel,
              previsao_inicio,
              data_pedido,
              status
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            opd.numero,
            atividadePadrao.atividade,
            atividadePadrao.responsavel,
            previsaoInicio.toISOString(),
            opd.data_pedido || null,
            'A REALIZAR'
          ]);

          atividadesCriadasNestaOPD++;
          totalAtividadesCriadas++;
        }
      }

      console.log(`   ✅ Criadas ${atividadesCriadasNestaOPD} atividades para OPD ${opd.numero}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ PROCESSO CONCLUÍDO COM SUCESSO!');
    console.log('='.repeat(60));
    console.log(`📊 Total de OPDs processadas: ${opds.length}`);
    console.log(`📊 OPDs que precisaram de atividades: ${opdsSemAtividades}`);
    console.log(`📊 Total de atividades criadas: ${totalAtividadesCriadas}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Erro ao popular atividades:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

populateAllOpdActivities();
