import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verificarNaoConformidade } from '@/lib/naoConformidade';

export async function POST(request: Request, { params }: { params: Promise<{ numero: string }> }) {
  const client = await pool.connect();
  try {
    const { numero } = await params;
    const { atividade_id, dados_formulario, preenchido_por, is_rascunho = false } = await request.json();
    if (!dados_formulario) return NextResponse.json({ success: false, error: 'Dados obrigatórios' }, { status: 400 });
    await client.query('BEGIN');

    // Verificar se já existe um formulário (rascunho ou não) para esta atividade
    const existingResult = await client.query(`
      SELECT id FROM formularios_preenchidos
      WHERE atividade_id = $1 AND tipo_formulario = 'CONTROLE_QUALIDADE_COLETOR_COLUNA_INFERIOR'
      LIMIT 1
    `, [atividade_id]);

    let result;

    if (existingResult.rows.length > 0) {
      // Atualizar formulário existente
      result = await client.query(`
        UPDATE formularios_preenchidos
        SET dados_formulario = $1,
            preenchido_por = $2,
            updated = $3,
            data_preenchimento = CASE WHEN NOT $4 THEN $3 ELSE data_preenchimento END
        WHERE id = $5
        RETURNING *
      `, [
        JSON.stringify({ ...dados_formulario, _is_rascunho: is_rascunho }),
        preenchido_por || 'Sistema',
        new Date().toISOString(),
        is_rascunho,
        existingResult.rows[0].id
      ]);
    } else {
      // Inserir novo formulário
      result = await client.query(`INSERT INTO formularios_preenchidos (atividade_id, numero_opd, tipo_formulario, dados_formulario, anexos, preenchido_por, data_preenchimento, created, updated) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`, [
        atividade_id || null,
        numero,
        'CONTROLE_QUALIDADE_COLETOR_COLUNA_INFERIOR',
        JSON.stringify({ ...dados_formulario, _is_rascunho: is_rascunho }),
        null,
        preenchido_por || 'Sistema',
        is_rascunho ? null : new Date().toISOString(),
        new Date().toISOString(),
        new Date().toISOString()
      ]);
    }

    // Verificar e marcar não-conformidade apenas se não for rascunho
    if (atividade_id && !is_rascunho) {
      await verificarNaoConformidade(atividade_id, dados_formulario);
    }
    await client.query('COMMIT');
    return NextResponse.json({
      success: true,
      data: result.rows[0],
      is_rascunho,
      message: is_rascunho ? 'Rascunho salvo com sucesso' : 'Formulário salvo com sucesso'
    }, { status: existingResult.rows.length > 0 ? 200 : 201 });
  } catch (error) { await client.query('ROLLBACK'); return NextResponse.json({ success: false, error: 'Erro ao salvar' }, { status: 500 }); }
  finally { client.release(); }
}

export async function GET(request: Request, { params }: { params: Promise<{ numero: string }> }) {
  try {
    const { numero } = await params;
    const atividadeId = new URL(request.url).searchParams.get('atividade_id');
    let query = `SELECT * FROM formularios_preenchidos WHERE tipo_formulario = 'CONTROLE_QUALIDADE_COLETOR_COLUNA_INFERIOR'`;
    const queryParams: any[] = [];
    if (atividadeId) { query += ` AND atividade_id = $1`; queryParams.push(parseInt(atividadeId)); }
    else { query += ` AND numero_opd = $1`; queryParams.push(numero); }
    query += ` ORDER BY created DESC LIMIT 1`;
    const result = await pool.query(query, queryParams);
    if (result.rows.length === 0) return NextResponse.json({ success: false, error: 'Não encontrado' }, { status: 404 });
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) { return NextResponse.json({ success: false, error: 'Erro ao buscar' }, { status: 500 }); }
}
export const dynamic = 'force-dynamic';
