import pool from './db';

/**
 * Verifica se um formulário contém não-conformidades e atualiza a atividade
 */
export async function verificarNaoConformidade(
  atividadeId: number,
  dadosFormulario: Record<string, any>
): Promise<boolean> {
  let temNC = false;

  // Função para normalizar valor para comparação
  const normalizar = (val: any): string => {
    if (val === null || val === undefined) return '';
    return String(val).toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };

  // Valores que indicam não-conformidade (normalizados)
  const valoresNC = [
    'nao conforme',
    'não conforme',
    'nao_conforme',
    'nc',
    'reprovado',
    'reprovada',
    'rejeitado',
    'rejeitada',
    'defeito',
    'defeituoso',
    'problema',
    'falha',
  ];

  // Verificar todos os campos do formulário
  for (const [key, value] of Object.entries(dadosFormulario)) {
    // Ignorar campos de imagem, arquivo, etc
    if (key.includes('imagem') || key.includes('arquivo') || key.includes('anexo') || key.includes('foto')) {
      continue;
    }

    // Verificar campos de status (cq1a_status, cq2b_status, etc)
    if (key.includes('status') || key.includes('conforme') || key.includes('verificacao') || key.includes('resultado')) {
      const valorNormalizado = normalizar(value);

      // Verificar se contém algum valor de NC
      for (const nc of valoresNC) {
        if (valorNormalizado.includes(nc)) {
          temNC = true;
          console.log(`🚨 NC detectada no campo ${key}: "${value}"`);
          break;
        }
      }

      if (temNC) break;
    }

    // Verificar campos booleanos que podem ser "Não" ou false
    if (typeof value === 'boolean' && value === false) {
      // Alguns campos booleanos "false" indicam problema
      const camposCriticos = [
        'ferramentas_completas',
        'epis_completos',
        'materiais_conferidos',
        'nivel_oleo_verificado',
        'teste_vazamento',
        'aterramento_verificado',
        'teste_subida_vazio',
        'teste_descida_vazio',
        'ajuste_fins_curso',
        'teste_emergencia',
        'conforme',
        'aprovado',
      ];

      if (camposCriticos.some(campo => key.includes(campo))) {
        temNC = true;
        console.log(`🚨 NC detectada (booleano false) no campo ${key}`);
        break;
      }
    }

    // Verificar strings que são "Não" em campos relevantes
    if (typeof value === 'string') {
      const valorNormalizado = normalizar(value);
      if ((valorNormalizado === 'nao' || valorNormalizado === 'n') &&
          (key.includes('conforme') || key.includes('aprovado') || key.includes('ok'))) {
        temNC = true;
        console.log(`🚨 NC detectada (valor "Não") no campo ${key}: "${value}"`);
        break;
      }
    }
  }

  // Atualizar a atividade se encontrou NC
  if (atividadeId) {
    try {
      await pool.query(
        'UPDATE registros_atividades SET tem_nao_conformidade = $1 WHERE id = $2',
        [temNC, atividadeId]
      );
      console.log(`✅ Atividade ${atividadeId} atualizada: tem_nao_conformidade = ${temNC}`);
    } catch (error) {
      console.error('Erro ao atualizar não-conformidade:', error);
    }
  }

  return temNC;
}

/**
 * Marca uma atividade como tendo não-conformidade
 */
export async function marcarNaoConformidade(atividadeId: number, temNC: boolean = true): Promise<void> {
  try {
    await pool.query(
      'UPDATE registros_atividades SET tem_nao_conformidade = $1 WHERE id = $2',
      [temNC, atividadeId]
    );
  } catch (error) {
    console.error('Erro ao marcar não-conformidade:', error);
    throw error;
  }
}
