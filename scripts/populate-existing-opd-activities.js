require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const ATIVIDADES_PADRAO = [
  { atividade: 'LIBERAÇÃO FINANCEIRA', responsavel: 'FINANCEIRO', ordem: 1 },
  { atividade: 'CRIAÇÃO DA OPD', responsavel: 'PCP', ordem: 2 },
  { atividade: 'DEFINIÇÃO DA OBRA CIVIL', responsavel: 'PCP', ordem: 3 },
  { atividade: 'REUNIÃO DE START 1', responsavel: 'PCP', ordem: 4 },
  { atividade: 'ENGENHARIA (MEC)', responsavel: 'ENGENHARIA (MEC)', ordem: 5 },
  { atividade: 'ENGENHARIA (ELE/HID)', responsavel: 'ENGENHARIA (ELE/HID)', ordem: 6 },
  { atividade: 'REVISÃO FINAL DE PROJETOS', responsavel: 'PCP', ordem: 7 },
  { atividade: 'REUNIÃO DE START 2', responsavel: 'PCP', ordem: 8 },
  { atividade: 'PROGRAMAÇÃO DAS LINHAS', responsavel: 'PCP', ordem: 9 },
  { atividade: 'RESERVAS DE COMP/FAB', responsavel: 'PCP', ordem: 10 },
  { atividade: 'IMPRIMIR LISTAS E PLANOS', responsavel: 'PCP', ordem: 11 },
  { atividade: 'ASSINATURA DOS PLANOS DE CORTE', responsavel: 'ENGENHARIA', ordem: 12 },
  { atividade: 'IMPRIMIR OF/ETIQUETA', responsavel: 'PCP', ordem: 13 },
  { atividade: 'PROGRAMAÇÃO DE CORTE', responsavel: 'PCP', ordem: 14 },
  { atividade: "ENTREGAR OF'S/LISTAS PARA ALMOX", responsavel: 'PCP', ordem: 15 },
  { atividade: 'PRODUÇÃO', responsavel: 'PRODUÇÃO', ordem: 16 },
  { atividade: 'EXPEDIÇÃO', responsavel: 'EXPEDIÇÃO', ordem: 17 },
  { atividade: 'LIBERAÇÃO E EMBARQUE', responsavel: 'EXPEDIÇÃO', ordem: 18 },
  { atividade: 'PREPARAÇÃO', responsavel: 'INSTALAÇÃO', ordem: 19 },
  { atividade: 'DESEMBARQUE E PRÉ-INSTALAÇÃO', responsavel: 'INSTALAÇÃO', ordem: 20 },
  { atividade: 'ENTREGA', responsavel: 'INSTALAÇÃO', ordem: 21 },
];

function calcularPrevisaoInicio(dataPedido, ordemAtividade) {
  const previsao = new Date(dataPedido);
  previsao.setDate(previsao.getDate() + ordemAtividade);
  return previsao;
}

async function populateActivities() {
  try {
    // Buscar todas as OPDs
    const opdsResult = await pool.query('SELECT numero, data_pedido FROM opds ORDER BY numero');
    console.log(`📋 Encontradas ${opdsResult.rowCount} OPDs`);

    for (const opd of opdsResult.rows) {
      // Verificar se já tem atividades
      const atividadesResult = await pool.query(
        'SELECT COUNT(*) FROM registros_atividades WHERE numero_opd = $1',
        [opd.numero]
      );

      const count = parseInt(atividadesResult.rows[0].count);

      if (count === 0) {
        console.log(`\n🔧 OPD ${opd.numero} não tem atividades. Criando...`);

        const dataPedidoDate = opd.data_pedido ? new Date(opd.data_pedido) : new Date();

        for (const atividadePadrao of ATIVIDADES_PADRAO) {
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
        }

        console.log(`✅ ${ATIVIDADES_PADRAO.length} atividades criadas para OPD ${opd.numero}`);
      } else {
        console.log(`✓ OPD ${opd.numero} já tem ${count} atividades`);
      }
    }

    console.log('\n✅ Processo concluído!');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    await pool.end();
    process.exit(1);
  }
}

populateActivities();
