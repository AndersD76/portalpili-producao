import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import {
  CQ_A_CORTE, CQ_B_MONTAGEM, CQ_C_CENTRAL_HIDRAULICA, CQ_D_SOLDA_LADO_01, CQ_E_SOLDA_LADO_02,
  CQ_F_MONTAGEM_SOLDA_INFERIOR, CQ_G_MONTAGEM_ELETRICA_HIDRAULICO, CQ_H_MONTAGEM_CALHAS,
  CQ_I_TRAVADOR_RODAS_LATERAL, CQ_J_CAIXA_TRAVA_CHASSI, CQ_K_TRAVA_CHASSI, CQ_L_CAVALETE_TRAVA_CHASSI,
  CQ_M_CENTRAL_HIDRAULICA_SUBCONJUNTOS, CQ_N_PAINEL_ELETRICO, CQ_O_PEDESTAIS, CQ_P_SOB_PLATAFORMA,
  CQ_Q_SOLDA_INFERIOR, CQ_R_BRACOS, CQ_S_RAMPAS, CQ_T1_PREPARACAO, CQ_T2_PINTURA,
  CQ_U_MONTAGEM_HIDRAULICA_ELETRICA, CQ_V_EXPEDICAO,
  CQ_Ac_MONTAGEM_INICIAL, CQ_Bc_CENTRAL_HIDRAULICA, CQ_Cc_CICLONE, CQ_Dc_TUBO_COLETA,
  CQ_Ec_COLUNA_INFERIOR, CQ_Fc_COLUNA_SUPERIOR, CQ_Gc_ESCADA_PLATIBANDA, CQ_Hc_PINTURA,
  CQSetor
} from '../src/lib/cqQuestions';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const TODOS_SETORES: CQSetor[] = [
  CQ_A_CORTE, CQ_B_MONTAGEM, CQ_C_CENTRAL_HIDRAULICA, CQ_D_SOLDA_LADO_01, CQ_E_SOLDA_LADO_02,
  CQ_F_MONTAGEM_SOLDA_INFERIOR, CQ_G_MONTAGEM_ELETRICA_HIDRAULICO, CQ_H_MONTAGEM_CALHAS,
  CQ_I_TRAVADOR_RODAS_LATERAL, CQ_J_CAIXA_TRAVA_CHASSI, CQ_K_TRAVA_CHASSI, CQ_L_CAVALETE_TRAVA_CHASSI,
  CQ_M_CENTRAL_HIDRAULICA_SUBCONJUNTOS, CQ_N_PAINEL_ELETRICO, CQ_O_PEDESTAIS, CQ_P_SOB_PLATAFORMA,
  CQ_Q_SOLDA_INFERIOR, CQ_R_BRACOS, CQ_S_RAMPAS, CQ_T1_PREPARACAO, CQ_T2_PINTURA,
  CQ_U_MONTAGEM_HIDRAULICA_ELETRICA, CQ_V_EXPEDICAO,
  CQ_Ac_MONTAGEM_INICIAL, CQ_Bc_CENTRAL_HIDRAULICA, CQ_Cc_CICLONE, CQ_Dc_TUBO_COLETA,
  CQ_Ec_COLUNA_INFERIOR, CQ_Fc_COLUNA_SUPERIOR, CQ_Gc_ESCADA_PLATIBANDA, CQ_Hc_PINTURA
];

async function importAll() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let perguntasImportadas = 0;

    for (const setor of TODOS_SETORES) {
      // Buscar ID do setor
      const setorResult = await client.query('SELECT id FROM cq_setores WHERE codigo = $1', [setor.codigo]);

      if (setorResult.rows.length === 0) {
        console.log('Setor não encontrado:', setor.codigo);
        continue;
      }

      const setorId = setorResult.rows[0].id;
      console.log('Importando perguntas de:', setor.codigo, '-', setor.nome);

      for (let j = 0; j < setor.perguntas.length; j++) {
        const p = setor.perguntas[j];

        // Verificar se pergunta existe
        const existing = await client.query(
          'SELECT id FROM cq_perguntas WHERE setor_id = $1 AND codigo = $2',
          [setorId, p.codigo]
        );

        if (existing.rows.length === 0) {
          await client.query(`
            INSERT INTO cq_perguntas (
              setor_id, codigo, descricao, etapa, avaliacao, medida_critica,
              metodo_verificacao, instrumento, criterios_aceitacao, opcoes,
              requer_imagem, imagem_descricao, tipo_resposta, ordem
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          `, [
            setorId, p.codigo, p.descricao, p.etapa || null, p.avaliacao || '100%',
            p.medidaCritica || null, p.metodoVerificacao || null, p.instrumento || null,
            p.criteriosAceitacao || null, JSON.stringify(p.opcoes || ['Conforme', 'Não conforme', 'Não Aplicável']),
            p.requerImagem || false, p.imagemDescricao || null, p.tipoResposta || 'selecao', j
          ]);
          perguntasImportadas++;
        }
      }
    }

    await client.query('COMMIT');

    // Resumo
    const result = await client.query(`
      SELECT s.codigo, s.nome, s.produto, COUNT(p.id) as perguntas
      FROM cq_setores s
      LEFT JOIN cq_perguntas p ON p.setor_id = s.id
      GROUP BY s.id
      ORDER BY s.produto, s.ordem
    `);

    console.log('\n=== RESUMO ===');
    let totalPerguntas = 0;
    result.rows.forEach(r => {
      console.log(r.codigo + ' - ' + r.nome + ': ' + r.perguntas + ' perguntas');
      totalPerguntas += parseInt(r.perguntas);
    });
    console.log('\nTotal: ' + result.rows.length + ' setores, ' + totalPerguntas + ' perguntas');
    console.log('Perguntas importadas agora: ' + perguntasImportadas);
  } catch (e: any) {
    await client.query('ROLLBACK');
    console.error('Erro:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

importAll();
