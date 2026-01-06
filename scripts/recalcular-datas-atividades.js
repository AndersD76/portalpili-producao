const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Mapeamento completo de todas as tarefas com seus offsets corretos
const TASK_OFFSETS = {
  'LIBERAÇÃO FINANCEIRA': { offset: 0, dias: 1 },
  'CRIAÇÃO DA OPD': { offset: 1, dias: 1 },
  'DEFINIÇÃO DA OBRA CIVIL': { offset: 2, dias: 2 },
  'REUNIÃO DE START 1': { offset: 4, dias: 1 },
  'ENGENHARIA (MEC)': { offset: 5, dias: 5 },
  'ENGENHARIA (ELE/HID)': { offset: 10, dias: 5 },
  'REVISÃO FINAL DE PROJETOS': { offset: 15, dias: 2 },
  'REUNIÃO DE START 2': { offset: 17, dias: 1 },
  'COMPRA DE MATÉRIA PRIMA': { offset: 18, dias: 5 },
  'PROGRAMAÇÃO DAS LINHAS': { offset: 23, dias: 1 },
  'RESERVAS DE COMP/FAB': { offset: 24, dias: 2 },
  'IMPRIMIR LISTAS E PLANOS': { offset: 26, dias: 1 },
  'ASSINATURA DOS PLANOS DE CORTE': { offset: 27, dias: 1 },
  'IMPRIMIR OF/ETIQUETA': { offset: 28, dias: 1 },
  'PROGRAMAÇÃO DE CORTE': { offset: 29, dias: 1 },
  "ENTREGAR OF'S/LISTAS PARA ALMOX": { offset: 30, dias: 1 },
  'PRODUÇÃO': { offset: 31, dias: 42 },
  'EXPEDIÇÃO': { offset: 73, dias: 2 },
  'DESEMBARQUE E PRÉ INSTALAÇÃO': { offset: 75, dias: 3 },
  'LIBERAÇÃO E EMBARQUE': { offset: 78, dias: 1 },
  'INSTALAÇÃO E ENTREGA': { offset: 79, dias: 5 },
  // Subtarefas de PRODUÇÃO
  'CORTE': { offset: 26, dias: 2 },
  'MONTAGEM SUPERIOR E ESQUADRO': { offset: 28, dias: 2 },
  'CENTRAL HIDRÁULICA (SETOR HIDRÁULICA)': { offset: 30, dias: 2 },
  'SOLDA LADO 01': { offset: 32, dias: 2 },
  'SOLDA LADO 02': { offset: 34, dias: 2 },
  'MONTAGEM E SOLDA INFERIOR': { offset: 36, dias: 2 },
  'MONTAGEM ELÉTRICA/HIDRÁULICO': { offset: 38, dias: 2 },
  'MONTAGEM DAS CALHAS': { offset: 40, dias: 2 },
  'TRAVADOR DE RODAS LATERAL MÓVEL': { offset: 42, dias: 2 },
  'CAIXA DO TRAVA CHASSI': { offset: 44, dias: 2 },
  'TRAVA CHASSI': { offset: 46, dias: 2 },
  'CAVALETE DO TRAVA CHASSI': { offset: 48, dias: 2 },
  'CENTRAL HIDRÁULICA (SETOR SUBCONJUNTOS)': { offset: 50, dias: 2 },
  'PAINEL ELÉTRICO': { offset: 52, dias: 2 },
  'PEDESTAIS': { offset: 54, dias: 2 },
  'SOB PLATAFORMA': { offset: 56, dias: 2 },
  'SOLDA INFERIOR': { offset: 58, dias: 2 },
  'BRAÇOS': { offset: 60, dias: 2 },
  'RAMPAS': { offset: 62, dias: 2 },
  'PINTURA E PREPARAÇÃO DA PLATAFORMA': { offset: 64, dias: 2 },
  'MONTAGEM HIDRÁULICA ELÉTRICA SOB PLATAFORMA': { offset: 66, dias: 2 }
};

async function recalcularDatasAtividades() {
  const client = await pool.connect();

  try {
    console.log('🔄 Iniciando recálculo de datas das atividades...\n');

    // Buscar todas as OPDs
    const opdsResult = await client.query('SELECT numero, data_pedido FROM opds ORDER BY numero');
    console.log(`📋 Encontradas ${opdsResult.rowCount} OPDs para processar\n`);

    let opdsAtualizadas = 0;
    let opdsComErro = 0;
    let totalAtividadesAtualizadas = 0;

    for (const opd of opdsResult.rows) {
      try {
        await client.query('BEGIN');

        const baseDate = new Date(opd.data_pedido || new Date());
        let atividadesAtualizadas = 0;

        // Buscar todas as atividades desta OPD
        const atividadesResult = await client.query(
          `SELECT id, atividade FROM registros_atividades WHERE numero_opd = $1`,
          [opd.numero]
        );

        for (const atividade of atividadesResult.rows) {
          const taskConfig = TASK_OFFSETS[atividade.atividade];

          if (taskConfig) {
            const previsao = new Date(baseDate);
            previsao.setDate(previsao.getDate() + taskConfig.offset);

            await client.query(`
              UPDATE registros_atividades
              SET previsao_inicio = $1,
                  dias_programados = $2,
                  updated = $3
              WHERE id = $4
            `, [
              previsao.toISOString(),
              taskConfig.dias,
              new Date().toISOString(),
              atividade.id
            ]);

            atividadesAtualizadas++;
          }
        }

        await client.query('COMMIT');
        console.log(`✓ OPD ${opd.numero}: ${atividadesAtualizadas} atividades atualizadas`);
        opdsAtualizadas++;
        totalAtividadesAtualizadas += atividadesAtualizadas;

      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`✗ OPD ${opd.numero}: Erro ao processar - ${error.message}`);
        opdsComErro++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DO RECÁLCULO:');
    console.log('='.repeat(60));
    console.log(`✓ OPDs atualizadas: ${opdsAtualizadas}`);
    console.log(`✓ Total de atividades atualizadas: ${totalAtividadesAtualizadas}`);
    console.log(`✗ OPDs com erro: ${opdsComErro}`);
    console.log(`📋 Total processado: ${opdsResult.rowCount}`);
    console.log('='.repeat(60));
    console.log('\n✅ Recálculo concluído!\n');

  } catch (error) {
    console.error('❌ Erro geral no recálculo:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar o recálculo
recalcularDatasAtividades()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Falha na execução:', error);
    process.exit(1);
  });
