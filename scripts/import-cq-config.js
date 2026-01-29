const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Definições dos setores (copiado de cqQuestions.ts)
const SETORES = [
  {
    codigo: 'A',
    nome: 'CORTE',
    processo: 'A - CORTE',
    perguntas: [
      { codigo: 'CQ1-A', descricao: 'MEDIDA TOTAL DE CORTE DA VIGA', etapa: 'VIGA', avaliacao: '100%', medidaCritica: 'Comprimento total (após esquadro pronto)', metodoVerificacao: 'Dimensional', instrumento: 'Trena', criteriosAceitacao: '+/- 10 mm', opcoes: ['Conforme', 'Não conforme'], requerImagem: false },
      { codigo: 'CQ2-A', descricao: 'VERIFICAR DETALHE PARA CORTE DE ENCAIXE DE VIGA', etapa: 'VIGA', avaliacao: '100%', medidaCritica: 'Medida de corte da aba e presença de chanfro', metodoVerificacao: 'Dimensional', instrumento: 'Trena', criteriosAceitacao: '+/- 5 mm', opcoes: ['Conforme', 'Não conforme'], requerImagem: false },
      { codigo: 'CQ3-A', descricao: 'VERIFICAR DISTRIBUIÇÃO DAS VIGAS E MEDIDA TOTAL (IDENTIFICAÇÃO DA VIGA 72/82/92)', etapa: 'VIGA', avaliacao: '100%', medidaCritica: 'Comprimento e identificação das vigas', metodoVerificacao: 'Dimensional; Visual', instrumento: 'Trena', criteriosAceitacao: '+/- 8 mm. Seguir conforme desenho.', opcoes: ['Conforme', 'Não conforme'], requerImagem: true, imagemDescricao: 'ANEXAR IMAGEM DA IDENTIFICAÇÃO DAS VIGAS' },
    ]
  },
  {
    codigo: 'B',
    nome: 'MONTAGEM SUPERIOR E ESQUADRO',
    processo: 'B - MONTAGEM SUPERIOR E ESQUADRO',
    perguntas: [
      { codigo: 'CQ1-B', descricao: 'MEDIDA DA MONTAGEM INICIAL (CONFORME DESENHO ETAPA 0)', etapa: 'VIGA', avaliacao: '100%', medidaCritica: 'Comprimento; Largura', metodoVerificacao: 'Dimensional', instrumento: 'Trena', criteriosAceitacao: '+/- 5 mm', opcoes: ['Conforme', 'Não conforme'], requerImagem: true, imagemDescricao: 'ANEXAR IMAGEM DA IDENTIFICAÇÃO DAS VIGAS' },
      { codigo: 'CQ2-B', descricao: 'ESQUADRO', etapa: 'VIGA', avaliacao: '100%', medidaCritica: 'Comprimento; Ângulo', metodoVerificacao: 'Dimensional', instrumento: 'Trena; Esquadro', criteriosAceitacao: '+/- 5 mm; +/- 1 grau', opcoes: ['Conforme', 'Não conforme'], requerImagem: false },
      { codigo: 'CQ3-B', descricao: 'POSICIONAMENTO DO TRAVA CHASSI COD.24569 (CONFORME DESENHO ETAPA 0)', etapa: 'MONTAGEM', avaliacao: '100%', medidaCritica: 'Comprimento', metodoVerificacao: 'Dimensional', instrumento: 'Trena', criteriosAceitacao: '+/- 5 mm', opcoes: ['Conforme', 'Não conforme'], requerImagem: false },
      { codigo: 'CQ4-B', descricao: 'POSICIONAMENTO DO APOIO DO TRAVADOR DE RODAS COD. 23691 (CONFORME DESENHO ETAPA 1)', etapa: 'MONTAGEM', avaliacao: '100%', medidaCritica: 'Comprimento', metodoVerificacao: 'Dimensional', instrumento: 'Trena', criteriosAceitacao: '+/- 5 mm', opcoes: ['Conforme', 'Não conforme'], requerImagem: false },
      { codigo: 'CQ5-B', descricao: 'POSICIONAMENTO DO APOIO DO TRAVADOR DE RODAS COD. 23789 (CONFORME DESENHO ETAPA 1)', etapa: 'MONTAGEM', avaliacao: '100%', medidaCritica: 'Comprimento', metodoVerificacao: 'Dimensional', instrumento: 'Trena', criteriosAceitacao: '+/- 5 mm', opcoes: ['Conforme', 'Não conforme'], requerImagem: false },
    ]
  },
  {
    codigo: 'C',
    nome: 'CENTRAL HIDRÁULICA',
    processo: 'C - CENTRAL HIDRÁULICA',
    perguntas: [
      { codigo: 'CQ1-C', descricao: 'POSICIONAMENTO DAS BOMBAS', etapa: 'MONTAGEM', avaliacao: '100%', medidaCritica: 'Posição', metodoVerificacao: 'Visual', instrumento: 'N/A', criteriosAceitacao: 'Conforme desenho', opcoes: ['Conforme', 'Não conforme'], requerImagem: true, imagemDescricao: 'ANEXAR IMAGEM DO POSICIONAMENTO' },
      { codigo: 'CQ2-C', descricao: 'CONEXÕES HIDRÁULICAS', etapa: 'MONTAGEM', avaliacao: '100%', medidaCritica: 'Aperto', metodoVerificacao: 'Visual; Torque', instrumento: 'Torquímetro', criteriosAceitacao: 'Sem vazamentos', opcoes: ['Conforme', 'Não conforme'], requerImagem: false },
    ]
  },
  {
    codigo: 'D',
    nome: 'SOLDA LADO 01',
    processo: 'D - SOLDA LADO 01',
    perguntas: [
      { codigo: 'CQ1-D', descricao: 'QUALIDADE DA SOLDA - VISUAL', etapa: 'SOLDA', avaliacao: '100%', medidaCritica: 'Trinca; Porosidade; Mordedura', metodoVerificacao: 'Visual', instrumento: 'N/A', criteriosAceitacao: 'Sem defeitos visuais', opcoes: ['Conforme', 'Não conforme'], requerImagem: true, imagemDescricao: 'ANEXAR IMAGEM DA SOLDA' },
      { codigo: 'CQ2-D', descricao: 'CORDÃO DE SOLDA - DIMENSIONAL', etapa: 'SOLDA', avaliacao: '100%', medidaCritica: 'Largura; Altura', metodoVerificacao: 'Dimensional', instrumento: 'Paquímetro', criteriosAceitacao: 'Conforme especificação', opcoes: ['Conforme', 'Não conforme'], requerImagem: false },
    ]
  },
  {
    codigo: 'E',
    nome: 'SOLDA LADO 02',
    processo: 'E - SOLDA LADO 02',
    perguntas: [
      { codigo: 'CQ1-E', descricao: 'QUALIDADE DA SOLDA - VISUAL', etapa: 'SOLDA', avaliacao: '100%', medidaCritica: 'Trinca; Porosidade; Mordedura', metodoVerificacao: 'Visual', instrumento: 'N/A', criteriosAceitacao: 'Sem defeitos visuais', opcoes: ['Conforme', 'Não conforme'], requerImagem: true, imagemDescricao: 'ANEXAR IMAGEM DA SOLDA' },
      { codigo: 'CQ2-E', descricao: 'CORDÃO DE SOLDA - DIMENSIONAL', etapa: 'SOLDA', avaliacao: '100%', medidaCritica: 'Largura; Altura', metodoVerificacao: 'Dimensional', instrumento: 'Paquímetro', criteriosAceitacao: 'Conforme especificação', opcoes: ['Conforme', 'Não conforme'], requerImagem: false },
    ]
  },
  {
    codigo: 'F',
    nome: 'MONTAGEM E SOLDA INFERIOR',
    processo: 'F - MONTAGEM E SOLDA INFERIOR',
    perguntas: [
      { codigo: 'CQ1-F', descricao: 'POSICIONAMENTO DOS COMPONENTES', etapa: 'MONTAGEM', avaliacao: '100%', medidaCritica: 'Posição', metodoVerificacao: 'Dimensional', instrumento: 'Trena', criteriosAceitacao: '+/- 5 mm', opcoes: ['Conforme', 'Não conforme'], requerImagem: false },
      { codigo: 'CQ2-F', descricao: 'QUALIDADE DA SOLDA INFERIOR', etapa: 'SOLDA', avaliacao: '100%', medidaCritica: 'Trinca; Porosidade', metodoVerificacao: 'Visual', instrumento: 'N/A', criteriosAceitacao: 'Sem defeitos visuais', opcoes: ['Conforme', 'Não conforme'], requerImagem: true, imagemDescricao: 'ANEXAR IMAGEM DA SOLDA' },
    ]
  }
];

async function importCQ() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let setoresImportados = 0;
    let perguntasImportadas = 0;

    for (let i = 0; i < SETORES.length; i++) {
      const setor = SETORES[i];

      // Verificar se setor existe
      const existing = await client.query('SELECT id FROM cq_setores WHERE codigo = $1', [setor.codigo]);

      let setorId;
      if (existing.rows.length > 0) {
        setorId = existing.rows[0].id;
        console.log('Setor já existe:', setor.codigo, '-', setor.nome);
      } else {
        const result = await client.query(
          'INSERT INTO cq_setores (codigo, nome, processo, produto, ordem) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [setor.codigo, setor.nome, setor.processo || null, 'TOMBADOR', i]
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
            p.criteriosAceitacao || null, JSON.stringify(p.opcoes || ['Conforme', 'Não conforme']),
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
    console.log('\n=== Importação Concluída ===');
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

importCQ();
