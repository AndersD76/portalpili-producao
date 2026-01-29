import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// Importar os setores do arquivo existente
import {
  CQ_A_CORTE,
  CQ_B_MONTAGEM,
  CQ_C_CENTRAL_HIDRAULICA,
  CQ_D_SOLDA_LADO_01,
  CQ_E_SOLDA_LADO_02,
  CQ_F_MONTAGEM_SOLDA_INFERIOR,
  CQ_G_MONTAGEM_ELETRICA_HIDRAULICO,
  CQ_H_MONTAGEM_CALHAS,
  CQ_I_TRAVADOR_RODAS_LATERAL,
  CQ_J_CAIXA_TRAVA_CHASSI,
  CQ_K_TRAVA_CHASSI,
  CQ_L_CAVALETE_TRAVA_CHASSI,
  CQ_M_CENTRAL_HIDRAULICA_SUBCONJUNTOS,
  CQ_N_PAINEL_ELETRICO,
  CQ_O_PEDESTAIS,
  CQ_P_SOB_PLATAFORMA,
  CQ_Q_SOLDA_INFERIOR,
  CQ_R_BRACOS,
  CQ_S_RAMPAS,
  CQ_T1_PREPARACAO,
  CQ_T2_PINTURA,
  CQ_U_MONTAGEM_HIDRAULICA_ELETRICA,
  CQ_V_EXPEDICAO,
  CQSetor
} from '@/lib/cqQuestions';

const SETORES_TOMBADOR: CQSetor[] = [
  CQ_A_CORTE,
  CQ_B_MONTAGEM,
  CQ_C_CENTRAL_HIDRAULICA,
  CQ_D_SOLDA_LADO_01,
  CQ_E_SOLDA_LADO_02,
  CQ_F_MONTAGEM_SOLDA_INFERIOR,
  CQ_G_MONTAGEM_ELETRICA_HIDRAULICO,
  CQ_H_MONTAGEM_CALHAS,
  CQ_I_TRAVADOR_RODAS_LATERAL,
  CQ_J_CAIXA_TRAVA_CHASSI,
  CQ_K_TRAVA_CHASSI,
  CQ_L_CAVALETE_TRAVA_CHASSI,
  CQ_M_CENTRAL_HIDRAULICA_SUBCONJUNTOS,
  CQ_N_PAINEL_ELETRICO,
  CQ_O_PEDESTAIS,
  CQ_P_SOB_PLATAFORMA,
  CQ_Q_SOLDA_INFERIOR,
  CQ_R_BRACOS,
  CQ_S_RAMPAS,
  CQ_T1_PREPARACAO,
  CQ_T2_PINTURA,
  CQ_U_MONTAGEM_HIDRAULICA_ELETRICA,
  CQ_V_EXPEDICAO,
];

// POST - Importar setores e perguntas do arquivo cqQuestions.ts
export async function POST() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let setoresImportados = 0;
    let perguntasImportadas = 0;

    for (let i = 0; i < SETORES_TOMBADOR.length; i++) {
      const setor = SETORES_TOMBADOR[i];

      // Verificar se o setor já existe
      const existingSetor = await client.query(
        'SELECT id FROM cq_setores WHERE codigo = $1',
        [setor.codigo]
      );

      let setorId: number;

      if (existingSetor.rows.length > 0) {
        setorId = existingSetor.rows[0].id;
      } else {
        // Criar setor
        const setorResult = await client.query(`
          INSERT INTO cq_setores (codigo, nome, processo, produto, ordem)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `, [setor.codigo, setor.nome, setor.processo || null, setor.produto || 'TOMBADOR', i]);

        setorId = setorResult.rows[0].id;
        setoresImportados++;
      }

      // Importar perguntas
      for (let j = 0; j < setor.perguntas.length; j++) {
        const pergunta = setor.perguntas[j];

        // Verificar se a pergunta já existe
        const existingPergunta = await client.query(
          'SELECT id FROM cq_perguntas WHERE setor_id = $1 AND codigo = $2',
          [setorId, pergunta.codigo]
        );

        if (existingPergunta.rows.length === 0) {
          await client.query(`
            INSERT INTO cq_perguntas (
              setor_id, codigo, descricao, etapa, avaliacao, medida_critica,
              metodo_verificacao, instrumento, criterios_aceitacao, opcoes,
              requer_imagem, imagem_descricao, tipo_resposta, ordem
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          `, [
            setorId,
            pergunta.codigo,
            pergunta.descricao,
            pergunta.etapa || null,
            pergunta.avaliacao || '100%',
            pergunta.medidaCritica || null,
            pergunta.metodoVerificacao || null,
            pergunta.instrumento || null,
            pergunta.criteriosAceitacao || null,
            JSON.stringify(pergunta.opcoes || ['Conforme', 'Não conforme']),
            pergunta.requerImagem || false,
            pergunta.imagemDescricao || null,
            pergunta.tipoResposta || 'selecao',
            j
          ]);

          perguntasImportadas++;
        }
      }
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: `Importação concluída: ${setoresImportados} setores e ${perguntasImportadas} perguntas importadas`,
      data: {
        setoresImportados,
        perguntasImportadas
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao importar CQs:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao importar configurações de CQ' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export const dynamic = 'force-dynamic';
