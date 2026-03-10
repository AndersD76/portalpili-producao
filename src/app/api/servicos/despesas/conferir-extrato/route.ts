import { NextResponse } from 'next/server';
import { verificarPermissao } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * POST /api/servicos/despesas/conferir-extrato
 * Recebe texto do extrato, usa IA para extrair transações e comparar com lançamentos
 */
export async function POST(request: Request) {
  const auth = await verificarPermissao('SERVICOS', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  try {
    const body = await request.json();
    const { extrato_texto, date_from, date_to } = body;

    if (!extrato_texto?.trim()) {
      return NextResponse.json({ success: false, error: 'Texto do extrato é obrigatório' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'ANTHROPIC_API_KEY não configurada' }, { status: 500 });
    }

    // Step 1: Use AI to extract transactions from statement text
    const extractPrompt = `Analise este extrato bancário/cartão e extraia todas as transações.

Responda APENAS com JSON válido, sem texto adicional:
{
  "transacoes": [
    {
      "data": "DD/MM/AAAA",
      "descricao": "descrição da transação",
      "valor": 0.00,
      "categoria_provavel": "Almoço|Janta|Hospedagem|Combustível|Transporte|Peças|Outros"
    }
  ]
}

Se não conseguir extrair, retorne {"transacoes": []}.
Valores negativos são débitos (despesas). Converta para positivo.`;

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        messages: [{ role: 'user', content: `${extractPrompt}\n\nEXTRATO:\n${extrato_texto}` }],
      }),
    });

    if (!aiRes.ok) {
      return NextResponse.json({ success: false, error: 'Erro na API de IA' }, { status: 502 });
    }

    const aiResult = await aiRes.json();
    const aiText = aiResult.content?.[0]?.text?.trim() || '';
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ success: false, error: 'Não foi possível interpretar o extrato' }, { status: 422 });
    }

    const extracted = JSON.parse(jsonMatch[0]);
    const transacoes: Array<{ data: string; descricao: string; valor: number; categoria_provavel: string }> = extracted.transacoes || [];

    if (transacoes.length === 0) {
      return NextResponse.json({ success: false, error: 'Nenhuma transação encontrada no extrato' }, { status: 422 });
    }

    // Step 2: Fetch system expenses for the period
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (date_from) { conditions.push(`expense_date >= $${idx++}`); params.push(date_from); }
    if (date_to) { conditions.push(`expense_date <= $${idx++}`); params.push(date_to); }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const systemRes = await query(
      `SELECT id, client_name, amount, expense_date, category, technician_name, payment_method
       FROM field_expenses ${where}
       ORDER BY expense_date, amount`,
      params
    );
    const systemExpenses: Array<{ id: number; client_name: string; amount: number; expense_date: string; category: string; technician_name: string }> = systemRes?.rows || [];

    // Step 3: Match transactions
    const matched: Array<{ transacao: typeof transacoes[0]; despesa: typeof systemExpenses[0]; confianca: string }> = [];
    const unmatchedStatement: typeof transacoes = [];
    const usedIds = new Set<number>();

    for (const t of transacoes) {
      let bestMatch: typeof systemExpenses[0] | null = null;
      let bestScore = 0;

      for (const s of systemExpenses) {
        if (usedIds.has(s.id)) continue;

        let score = 0;
        // Value match (±R$0.50)
        if (Math.abs(Number(s.amount) - t.valor) <= 0.50) score += 50;
        else if (Math.abs(Number(s.amount) - t.valor) <= 5) score += 20;

        // Date match (±3 days)
        if (t.data && s.expense_date) {
          const parts = t.data.split('/');
          if (parts.length === 3) {
            const tDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            const sDate = new Date(s.expense_date);
            const diffDays = Math.abs((tDate.getTime() - sDate.getTime()) / 86400000);
            if (diffDays <= 1) score += 30;
            else if (diffDays <= 3) score += 15;
          }
        }

        // Category hint
        if (t.categoria_provavel && s.category && t.categoria_provavel === s.category) score += 20;

        if (score > bestScore) {
          bestScore = score;
          bestMatch = s;
        }
      }

      if (bestMatch && bestScore >= 50) {
        matched.push({
          transacao: t,
          despesa: bestMatch,
          confianca: bestScore >= 80 ? 'alta' : bestScore >= 50 ? 'media' : 'baixa',
        });
        usedIds.add(bestMatch.id);
      } else {
        unmatchedStatement.push(t);
      }
    }

    const unmatchedSystem = systemExpenses.filter(s => !usedIds.has(s.id));

    const totalStatement = transacoes.reduce((s, t) => s + t.valor, 0);
    const totalSystem = systemExpenses.reduce((s, e) => s + Number(e.amount), 0);

    // Save reconciliation
    try {
      await query(
        `INSERT INTO statement_reconciliations
         (period_label, total_statement, total_system, difference,
          matched_count, unmatched_statement_count, unmatched_system_count,
          result_json, filters_json, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          `${date_from || '?'} a ${date_to || '?'}`,
          totalStatement,
          totalSystem,
          totalStatement - totalSystem,
          matched.length,
          unmatchedStatement.length,
          unmatchedSystem.length,
          JSON.stringify({ matched, unmatchedStatement, unmatchedSystem }),
          JSON.stringify({ date_from, date_to }),
          auth.usuario?.nome || 'sistema',
        ]
      );
    } catch (e) {
      console.error('Erro ao salvar conferência:', e);
    }

    return NextResponse.json({
      success: true,
      data: {
        totalStatement,
        totalSystem,
        difference: totalStatement - totalSystem,
        transacoesExtrato: transacoes.length,
        despesasSistema: systemExpenses.length,
        matched,
        unmatchedStatement,
        unmatchedSystem,
      },
    });
  } catch (error) {
    console.error('Erro na conferência:', error);
    return NextResponse.json({ success: false, error: 'Erro ao processar conferência' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
