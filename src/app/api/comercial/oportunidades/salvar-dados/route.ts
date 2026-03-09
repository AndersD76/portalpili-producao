import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Salva dados da Receita Federal no cadastro dos clientes (apenas campos vazios)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resultados } = body;

    if (!resultados || !Array.isArray(resultados) || resultados.length === 0) {
      return NextResponse.json({ success: false, error: 'Nenhum dado para salvar' }, { status: 400 });
    }

    let atualizados = 0;
    let erros = 0;
    const clientesProcessados = new Set<number>();
    const retorno: any[] = [];

    for (const item of resultados) {
      // Pular itens sem dados da receita ou sem cliente_id
      if (!item.dados_receita || !item.cliente_id || item.status === 'erro' || item.status === 'sem_cnpj') {
        retorno.push({ ...item });
        continue;
      }

      // Evitar processar o mesmo cliente mais de uma vez
      if (clientesProcessados.has(item.cliente_id)) {
        retorno.push({ ...item, status: 'atualizado', mensagem: 'Já processado' });
        continue;
      }
      clientesProcessados.add(item.cliente_id);

      const receita = item.dados_receita;
      const atuais = item.dados_atuais || {};
      const dadosNovos: Record<string, any> = {};
      const camposAtualizados: string[] = [];

      // CNPJ descoberto
      if (item.cnpj_descoberto && receita.cnpj) {
        dadosNovos.cpf_cnpj = receita.cnpj;
        camposAtualizados.push('cnpj');
      }

      // Só preencher campos VAZIOS
      if (!atuais.telefone && receita.telefone) {
        dadosNovos.telefone = receita.telefone;
        camposAtualizados.push('telefone');
      }
      if (!atuais.email && receita.email) {
        dadosNovos.email = receita.email;
        camposAtualizados.push('email');
      }
      if (receita.nome_fantasia && !item.cliente_fantasia) {
        dadosNovos.nome_fantasia = receita.nome_fantasia;
        camposAtualizados.push('nome_fantasia');
      }
      if (receita.cep) {
        // Verificar se já tem CEP no banco
        const clienteResult = await query('SELECT cep, logradouro, bairro, cidade, estado FROM crm_clientes WHERE id = $1', [item.cliente_id]);
        const cliente = clienteResult.rows[0];
        if (cliente) {
          if (!cliente.cep && receita.cep) {
            dadosNovos.cep = receita.cep;
            camposAtualizados.push('cep');
          }
          if (!cliente.logradouro && receita.endereco) {
            // Extrair logradouro do endereço formatado
            const partes = receita.endereco.split(',');
            if (partes[0]) dadosNovos.logradouro = partes[0].trim();
            camposAtualizados.push('endereço');
          }
          if (!cliente.cidade && receita.endereco) {
            // Extrair cidade do endereço (último trecho antes da /)
            const match = receita.endereco.match(/- ([^/]+)\/([A-Z]{2})$/);
            if (match) {
              dadosNovos.cidade = match[1].trim();
              if (!cliente.estado) dadosNovos.estado = match[2];
              camposAtualizados.push('cidade');
            }
          }
        }
      }

      if (Object.keys(dadosNovos).length > 0) {
        const setClauses: string[] = [];
        const values: any[] = [];
        let idx = 1;
        for (const [key, val] of Object.entries(dadosNovos)) {
          setClauses.push(`${key} = $${idx++}`);
          values.push(val);
        }
        setClauses.push(`updated_at = NOW()`);
        values.push(item.cliente_id);

        try {
          await query(
            `UPDATE crm_clientes SET ${setClauses.join(', ')} WHERE id = $${idx}`,
            values
          );
          atualizados++;
        } catch (e) {
          console.error('Erro ao salvar cliente:', item.cliente_id, e);
          erros++;
        }
      }

      retorno.push({
        ...item,
        status: camposAtualizados.length > 0 ? 'atualizado' : 'completo',
        mensagem: camposAtualizados.length > 0
          ? `Salvo: ${camposAtualizados.join(', ')}`
          : 'Dados já completos',
        campos_atualizados: camposAtualizados,
      });
    }

    return NextResponse.json({
      success: true,
      data: retorno,
      resumo: {
        total: retorno.length,
        atualizados,
        completos: retorno.filter(r => r.status === 'completo').length,
        sem_cnpj: retorno.filter(r => r.status === 'sem_cnpj').length,
        erros: retorno.filter(r => r.status === 'erro').length + erros,
      },
    });
  } catch (error: any) {
    console.error('Erro ao salvar dados:', error);
    return NextResponse.json({ success: false, error: error.message || 'Erro interno' }, { status: 500 });
  }
}
