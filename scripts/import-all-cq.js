const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Todos os setores TOMBADOR
const SETORES_TOMBADOR = [
  { codigo: 'A', nome: 'CORTE', processo: 'A - CORTE' },
  { codigo: 'B', nome: 'MONTAGEM SUPERIOR E ESQUADRO', processo: 'B - MONTAGEM SUPERIOR E ESQUADRO' },
  { codigo: 'C', nome: 'CENTRAL HIDRÁULICA', processo: 'C - CENTRAL HIDRÁULICA' },
  { codigo: 'D', nome: 'SOLDA LADO 01', processo: 'D - SOLDA LADO 01' },
  { codigo: 'E', nome: 'SOLDA LADO 02', processo: 'E - SOLDA LADO 02' },
  { codigo: 'F', nome: 'MONTAGEM E SOLDA INFERIOR', processo: 'F - MONTAGEM E SOLDA INFERIOR' },
  { codigo: 'G', nome: 'MONTAGEM ELÉTRICA E HIDRÁULICO', processo: 'G - MONTAGEM ELÉTRICA E HIDRÁULICO' },
  { codigo: 'H', nome: 'MONTAGEM DE CALHAS', processo: 'H - MONTAGEM DE CALHAS' },
  { codigo: 'I', nome: 'TRAVADOR DE RODAS LATERAL', processo: 'I - TRAVADOR DE RODAS LATERAL' },
  { codigo: 'J', nome: 'CAIXA TRAVA CHASSI', processo: 'J - CAIXA TRAVA CHASSI' },
  { codigo: 'K', nome: 'TRAVA CHASSI', processo: 'K - TRAVA CHASSI' },
  { codigo: 'L', nome: 'CAVALETE TRAVA CHASSI', processo: 'L - CAVALETE TRAVA CHASSI' },
  { codigo: 'M', nome: 'CENTRAL HIDRÁULICA SUBCONJUNTOS', processo: 'M - CENTRAL HIDRÁULICA SUBCONJUNTOS' },
  { codigo: 'N', nome: 'PAINEL ELÉTRICO', processo: 'N - PAINEL ELÉTRICO' },
  { codigo: 'O', nome: 'PEDESTAIS', processo: 'O - PEDESTAIS' },
  { codigo: 'P', nome: 'SOB PLATAFORMA', processo: 'P - SOB PLATAFORMA' },
  { codigo: 'Q', nome: 'SOLDA INFERIOR', processo: 'Q - SOLDA INFERIOR' },
  { codigo: 'R', nome: 'BRAÇOS', processo: 'R - BRAÇOS' },
  { codigo: 'S', nome: 'RAMPAS', processo: 'S - RAMPAS' },
  { codigo: 'T1', nome: 'PREPARAÇÃO', processo: 'T1 - PREPARAÇÃO' },
  { codigo: 'T2', nome: 'PINTURA', processo: 'T2 - PINTURA' },
  { codigo: 'U', nome: 'MONTAGEM HIDRÁULICA ELÉTRICA SOB PLATAFORMA', processo: 'U - MONTAGEM HIDRÁULICA ELÉTRICA SOB PLATAFORMA' },
  { codigo: 'V', nome: 'EXPEDIÇÃO', processo: 'V - EXPEDIÇÃO' },
];

// Todos os setores COLETOR
const SETORES_COLETOR = [
  { codigo: 'Ac', nome: 'MONTAGEM INICIAL - COLETOR', processo: 'Ac - MONTAGEM INICIAL' },
  { codigo: 'Bc', nome: 'CENTRAL HIDRÁULICA - COLETOR', processo: 'Bc - CENTRAL HIDRÁULICA' },
  { codigo: 'Cc', nome: 'CICLONE - COLETOR', processo: 'Cc - CICLONE' },
  { codigo: 'Dc', nome: 'TUBO COLETA - COLETOR', processo: 'Dc - TUBO COLETA' },
  { codigo: 'Ec', nome: 'COLUNA INFERIOR - COLETOR', processo: 'Ec - COLUNA INFERIOR' },
  { codigo: 'Fc', nome: 'COLUNA SUPERIOR - COLETOR', processo: 'Fc - COLUNA SUPERIOR' },
  { codigo: 'Gc', nome: 'ESCADA PLATIBANDA - COLETOR', processo: 'Gc - ESCADA PLATIBANDA' },
  { codigo: 'Hc', nome: 'PINTURA - COLETOR', processo: 'Hc - PINTURA' },
];

async function importAll() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let setoresImportados = 0;
    let perguntasAtualizadas = 0;

    // Importar setores TOMBADOR
    for (let i = 0; i < SETORES_TOMBADOR.length; i++) {
      const setor = SETORES_TOMBADOR[i];
      const existing = await client.query('SELECT id FROM cq_setores WHERE codigo = $1', [setor.codigo]);

      if (existing.rows.length === 0) {
        await client.query(
          'INSERT INTO cq_setores (codigo, nome, processo, produto, ordem) VALUES ($1, $2, $3, $4, $5)',
          [setor.codigo, setor.nome, setor.processo, 'TOMBADOR', i]
        );
        setoresImportados++;
        console.log('Criado setor TOMBADOR:', setor.codigo, '-', setor.nome);
      } else {
        console.log('Setor já existe:', setor.codigo);
      }
    }

    // Importar setores COLETOR
    for (let i = 0; i < SETORES_COLETOR.length; i++) {
      const setor = SETORES_COLETOR[i];
      const existing = await client.query('SELECT id FROM cq_setores WHERE codigo = $1', [setor.codigo]);

      if (existing.rows.length === 0) {
        await client.query(
          'INSERT INTO cq_setores (codigo, nome, processo, produto, ordem) VALUES ($1, $2, $3, $4, $5)',
          [setor.codigo, setor.nome, setor.processo, 'COLETOR', i + 100]
        );
        setoresImportados++;
        console.log('Criado setor COLETOR:', setor.codigo, '-', setor.nome);
      } else {
        console.log('Setor já existe:', setor.codigo);
      }
    }

    await client.query('COMMIT');

    // Listar todos os setores
    const result = await client.query('SELECT codigo, nome, produto, (SELECT COUNT(*) FROM cq_perguntas WHERE setor_id = cq_setores.id) as perguntas FROM cq_setores ORDER BY produto, ordem');
    console.log('\n=== SETORES CONFIGURADOS ===');
    console.log('Total:', result.rows.length, 'setores\n');

    let currentProduto = '';
    result.rows.forEach(r => {
      if (r.produto !== currentProduto) {
        console.log('\n--- ' + r.produto + ' ---');
        currentProduto = r.produto;
      }
      console.log('  ' + r.codigo + ' - ' + r.nome + ' (' + r.perguntas + ' perguntas)');
    });

    console.log('\n=== Importação Concluída ===');
    console.log('Setores importados:', setoresImportados);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Erro:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

importAll();
