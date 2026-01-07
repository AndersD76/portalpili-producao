import pool from './db';

/**
 * Verifica se um formulário contém não-conformidades e atualiza a atividade
 */
export async function verificarNaoConformidade(
  atividadeId: number,
  dadosFormulario: Record<string, any>
): Promise<boolean> {
  // Valores que indicam não-conformidade
  const valoresNC = [
    'Não conforme',
    'Não Conforme',
    'NAO CONFORME',
    'nao conforme',
    'Não',
    'NAO',
    'nao',
    false, // para campos booleanos
  ];

  let temNC = false;

  // Verificar todos os campos do formulário
  for (const [key, value] of Object.entries(dadosFormulario)) {
    // Verificar campos de status
    if (key.includes('status') || key.includes('conforme')) {
      if (valoresNC.includes(value)) {
        temNC = true;
        break;
      }
    }

    // Verificar campos booleanos que podem ser "Não"
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
      ];

      if (camposCriticos.includes(key)) {
        temNC = true;
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
