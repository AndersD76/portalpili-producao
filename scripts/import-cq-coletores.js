const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Definições dos setores para COLETOR
const SETORES_COLETOR = [
  {
    codigo: 'CA',
    nome: 'CORTE - COLETOR',
    processo: 'A - CORTE',
    perguntas: [
      { codigo: 'CQ1-CA', descricao: 'MEDIDA TOTAL DE CORTE DA ESTRUTURA', etapa: 'ESTRUTURA', avaliacao: '100%', medidaCritica: 'Comprimento total', metodoVerificacao: 'Dimensional', instrumento: 'Trena', criteriosAceitacao: '+/- 10 mm', opcoes: ['Conforme', 'Não conforme', 'Não Aplicável'], requerImagem: false },
      { codigo: 'CQ2-CA', descricao: 'VERIFICAR CORTE DOS TUBOS', etapa: 'ESTRUTURA', avaliacao: '100%', medidaCritica: 'Medida e ângulo de corte', metodoVerificacao: 'Dimensional', instrumento: 'Trena; Esquadro', criteriosAceitacao: '+/- 5 mm', opcoes: ['Conforme', 'Não conforme', 'Não Aplicável'], requerImagem: false },
      { codigo: 'CQ3-CA', descricao: 'IDENTIFICAÇÃO DOS COMPONENTES CORTADOS', etapa: 'ESTRUTURA', avaliacao: '100%', medidaCritica: 'Identificação visual', metodoVerificacao: 'Visual', instrumento: 'N/A', criteriosAceitacao: 'Identificado conforme desenho', opcoes: ['Conforme', 'Não conforme', 'Não Aplicável'], requerImagem: true, imagemDescricao: 'ANEXAR IMAGEM DA IDENTIFICAÇÃO' },
    ]
  },
  {
    codigo: 'CB',
    nome: 'MONTAGEM INICIAL - COLETOR',
    processo: 'B - MONTAGEM INICIAL',
    perguntas: [
      { codigo: 'CQ1-CB', descricao: 'MEDIDA DA MONTAGEM INICIAL DA ESTRUTURA', etapa: 'ESTRUTURA', avaliacao: '100%', medidaCritica: 'Comprimento; Largura; Altura', metodoVerificacao: 'Dimensional', instrumento: 'Trena', criteriosAceitacao: '+/- 5 mm', opcoes: ['Conforme', 'Não conforme', 'Não Aplicável'], requerImagem: true, imagemDescricao: 'ANEXAR IMAGEM DA MONTAGEM' },
      { codigo: 'CQ2-CB', descricao: 'ESQUADRO E ALINHAMENTO', etapa: 'ESTRUTURA', avaliacao: '100%', medidaCritica: 'Ângulo e alinhamento', metodoVerificacao: 'Dimensional', instrumento: 'Esquadro; Nível', criteriosAceitacao: '+/- 1 grau', opcoes: ['Conforme', 'Não conforme', 'Não Aplicável'], requerImagem: false },
      { codigo: 'CQ3-CB', descricao: 'POSICIONAMENTO DOS SUPORTES', etapa: 'MONTAGEM', avaliacao: '100%', medidaCritica: 'Posição conforme desenho', metodoVerificacao: 'Dimensional', instrumento: 'Trena', criteriosAceitacao: '+/- 5 mm', opcoes: ['Conforme', 'Não conforme', 'Não Aplicável'], requerImagem: false },
    ]
  },
  {
    codigo: 'CC',
    nome: 'SISTEMA HIDRÁULICO - COLETOR',
    processo: 'C - SISTEMA HIDRÁULICO',
    perguntas: [
      { codigo: 'CQ1-CC', descricao: 'POSICIONAMENTO DOS CILINDROS', etapa: 'HIDRÁULICO', avaliacao: '100%', medidaCritica: 'Posição e fixação', metodoVerificacao: 'Visual; Dimensional', instrumento: 'Trena', criteriosAceitacao: 'Conforme desenho', opcoes: ['Conforme', 'Não conforme', 'Não Aplicável'], requerImagem: true, imagemDescricao: 'ANEXAR IMAGEM DOS CILINDROS' },
      { codigo: 'CQ2-CC', descricao: 'CONEXÕES HIDRÁULICAS', etapa: 'HIDRÁULICO', avaliacao: '100%', medidaCritica: 'Aperto e vedação', metodoVerificacao: 'Visual; Torque', instrumento: 'Torquímetro', criteriosAceitacao: 'Sem vazamentos', opcoes: ['Conforme', 'Não conforme', 'Não Aplicável'], requerImagem: false },
      { codigo: 'CQ3-CC', descricao: 'MANGUEIRAS E TUBULAÇÕES', etapa: 'HIDRÁULICO', avaliacao: '100%', medidaCritica: 'Roteamento e fixação', metodoVerificacao: 'Visual', instrumento: 'N/A', criteriosAceitacao: 'Sem dobras ou danos', opcoes: ['Conforme', 'Não conforme', 'Não Aplicável'], requerImagem: false },
    ]
  },
  {
    codigo: 'CD',
    nome: 'SOLDA - COLETOR',
    processo: 'D - SOLDA',
    perguntas: [
      { codigo: 'CQ1-CD', descricao: 'QUALIDADE DA SOLDA - VISUAL', etapa: 'SOLDA', avaliacao: '100%', medidaCritica: 'Trinca; Porosidade; Mordedura', metodoVerificacao: 'Visual', instrumento: 'N/A', criteriosAceitacao: 'Sem defeitos visuais', opcoes: ['Conforme', 'Não conforme', 'Não Aplicável'], requerImagem: true, imagemDescricao: 'ANEXAR IMAGEM DA SOLDA' },
      { codigo: 'CQ2-CD', descricao: 'CORDÃO DE SOLDA - DIMENSIONAL', etapa: 'SOLDA', avaliacao: '100%', medidaCritica: 'Largura; Altura do cordão', metodoVerificacao: 'Dimensional', instrumento: 'Paquímetro', criteriosAceitacao: 'Conforme especificação', opcoes: ['Conforme', 'Não conforme', 'Não Aplicável'], requerImagem: false },
      { codigo: 'CQ3-CD', descricao: 'PONTOS DE SOLDA CRÍTICOS', etapa: 'SOLDA', avaliacao: '100%', medidaCritica: 'Integridade estrutural', metodoVerificacao: 'Visual', instrumento: 'N/A', criteriosAceitacao: 'Solda completa sem falhas', opcoes: ['Conforme', 'Não conforme', 'Não Aplicável'], requerImagem: true, imagemDescricao: 'ANEXAR IMAGEM DOS PONTOS CRÍTICOS' },
    ]
  },
  {
    codigo: 'CE',
    nome: 'MONTAGEM FINAL - COLETOR',
    processo: 'E - MONTAGEM FINAL',
    perguntas: [
      { codigo: 'CQ1-CE', descricao: 'MONTAGEM DO SISTEMA DE COLETA', etapa: 'MONTAGEM', avaliacao: '100%', medidaCritica: 'Posicionamento e fixação', metodoVerificacao: 'Visual; Dimensional', instrumento: 'Trena', criteriosAceitacao: 'Conforme desenho', opcoes: ['Conforme', 'Não conforme', 'Não Aplicável'], requerImagem: true, imagemDescricao: 'ANEXAR IMAGEM DO SISTEMA' },
      { codigo: 'CQ2-CE', descricao: 'MONTAGEM ELÉTRICA', etapa: 'ELÉTRICA', avaliacao: '100%', medidaCritica: 'Conexões e roteamento', metodoVerificacao: 'Visual', instrumento: 'Multímetro', criteriosAceitacao: 'Conforme diagrama elétrico', opcoes: ['Conforme', 'Não conforme', 'Não Aplicável'], requerImagem: false },
      { codigo: 'CQ3-CE', descricao: 'ACABAMENTO GERAL', etapa: 'ACABAMENTO', avaliacao: '100%', medidaCritica: 'Aparência e qualidade', metodoVerificacao: 'Visual', instrumento: 'N/A', criteriosAceitacao: 'Sem riscos, amassados ou defeitos', opcoes: ['Conforme', 'Não conforme', 'Não Aplicável'], requerImagem: false },
    ]
  },
  {
    codigo: 'CF',
    nome: 'TESTE E LIBERAÇÃO - COLETOR',
    processo: 'F - TESTE E LIBERAÇÃO',
    perguntas: [
      { codigo: 'CQ1-CF', descricao: 'TESTE FUNCIONAL DO SISTEMA HIDRÁULICO', etapa: 'TESTE', avaliacao: '100%', medidaCritica: 'Funcionamento correto', metodoVerificacao: 'Funcional', instrumento: 'N/A', criteriosAceitacao: 'Sem vazamentos, operação suave', opcoes: ['Conforme', 'Não conforme', 'Não Aplicável'], requerImagem: false },
      { codigo: 'CQ2-CF', descricao: 'TESTE DO SISTEMA ELÉTRICO', etapa: 'TESTE', avaliacao: '100%', medidaCritica: 'Funcionamento dos comandos', metodoVerificacao: 'Funcional', instrumento: 'N/A', criteriosAceitacao: 'Todos comandos operacionais', opcoes: ['Conforme', 'Não conforme', 'Não Aplicável'], requerImagem: false },
      { codigo: 'CQ3-CF', descricao: 'INSPEÇÃO FINAL E DOCUMENTAÇÃO', etapa: 'LIBERAÇÃO', avaliacao: '100%', medidaCritica: 'Completude da documentação', metodoVerificacao: 'Visual', instrumento: 'N/A', criteriosAceitacao: 'Documentação completa', opcoes: ['Conforme', 'Não conforme', 'Não Aplicável'], requerImagem: true, imagemDescricao: 'ANEXAR IMAGEM DO PRODUTO FINAL' },
    ]
  }
];

async function importCQColetor() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let setoresImportados = 0;
    let perguntasImportadas = 0;

    for (let i = 0; i < SETORES_COLETOR.length; i++) {
      const setor = SETORES_COLETOR[i];

      // Verificar se setor existe
      const existing = await client.query('SELECT id FROM cq_setores WHERE codigo = $1', [setor.codigo]);

      let setorId;
      if (existing.rows.length > 0) {
        setorId = existing.rows[0].id;
        console.log('Setor já existe:', setor.codigo, '-', setor.nome);
      } else {
        const result = await client.query(
          'INSERT INTO cq_setores (codigo, nome, processo, produto, ordem) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [setor.codigo, setor.nome, setor.processo || null, 'COLETOR', i + 10] // ordem +10 para ficar depois dos tombadores
        );
        setorId = result.rows[0].id;
        setoresImportados++;
        console.log('Setor criado:', setor.codigo, '-', setor.nome);
      }

      // Importar perguntas
      for (let j = 0; j < setor.perguntas.length; j++) {
        const p = setor.perguntas[j];

        const existingP = await client.query(
          'SELECT id FROM cq_perguntas WHERE setor_id = $1 AND codigo = $2',
          [setorId, p.codigo]
        );

        if (existingP.rows.length === 0) {
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
            p.requerImagem || false, p.imagemDescricao || null, 'selecao', j
          ]);
          perguntasImportadas++;
          console.log('  Pergunta criada:', p.codigo);
        } else {
          console.log('  Pergunta já existe:', p.codigo);
        }
      }
    }

    await client.query('COMMIT');
    console.log('\n=== Importação Coletores Concluída ===');
    console.log('Setores importados:', setoresImportados);
    console.log('Perguntas importadas:', perguntasImportadas);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Erro:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

importCQColetor();
