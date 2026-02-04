const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Mapeamento de gravidade
const mapGravidade = (gravidade) => {
  if (!gravidade || gravidade === 'nan') return null;
  const g = gravidade.toLowerCase().trim();
  if (g.includes('alta')) return 'ALTA';
  if (g.includes('média') || g.includes('media') || g.includes('méda')) return 'MEDIA';
  if (g.includes('baixa')) return 'BAIXA';
  if (g.includes('impacta')) return 'BAIXA';
  return 'MEDIA';
};

// Mapeamento de disposição
const mapDisposicao = (disposicao) => {
  if (!disposicao || disposicao === 'nan') return null;
  const d = disposicao.toLowerCase().trim();
  if (d.includes('retrabalho')) return 'RETRABALHO';
  if (d.includes('sucata')) return 'SUCATA';
  if (d.includes('aceite') || d.includes('condicional')) return 'ACEITE_CONDICIONAL';
  if (d.includes('devolução') || d.includes('devolucao')) return 'DEVOLUCAO';
  if (d.includes('reaproveitamento')) return 'REAPROVEITAMENTO';
  return disposicao.toUpperCase().replace(/ /g, '_');
};

// Mapeamento de tipo
const mapTipo = (tipo) => {
  if (!tipo || tipo === 'nan') return 'OUTRO';
  const t = tipo.toLowerCase().trim();
  if (t.includes('solda')) return 'SOLDA';
  if (t.includes('montagem') || t.includes('motagem')) return 'MONTAGEM';
  if (t.includes('fornecedor')) return 'FORNECEDOR';
  if (t.includes('projeto')) return 'PROJETO';
  if (t.includes('pintura')) return 'PINTURA';
  if (t.includes('medição') || t.includes('medicao')) return 'MEDICAO';
  if (t.includes('laser')) return 'LASER';
  if (t.includes('corte')) return 'CORTE';
  if (t.includes('dobra')) return 'DOBRA';
  if (t.includes('auditoria')) return 'AUDITORIA';
  if (t.includes('pcp')) return 'PCP';
  return 'OUTRO';
};

// Converter data DD/MM/YYYY para formato ISO
const parseDate = (dateStr) => {
  if (!dateStr || dateStr === 'nan') return new Date().toISOString();
  const parts = dateStr.split('/');
  if (parts.length !== 3) return new Date().toISOString();
  const [day, month, year] = parts;
  return new Date(year, month - 1, day).toISOString();
};

async function importNaoConformidades() {
  const client = await pool.connect();

  try {
    console.log('Iniciando importação de Não Conformidades...\n');

    // Ler arquivo JSON
    const filePath = path.join(__dirname, '..', 'files', 'nc_dados_compactos.json');
    const rawData = fs.readFileSync(filePath, 'utf8');
    const dados = JSON.parse(rawData);

    console.log(`Total de registros a importar: ${dados.length}\n`);

    await client.query('BEGIN');

    // Resetar a sequência para continuar após os importados
    const maxIdResult = await client.query('SELECT COALESCE(MAX(id), 0) as max_id FROM nao_conformidades');
    const startId = maxIdResult.rows[0].max_id;
    console.log(`ID máximo atual na tabela: ${startId}`);

    // Verificar quantos registros já existem
    const countResult = await client.query('SELECT COUNT(*) as count FROM nao_conformidades');
    const existingCount = parseInt(countResult.rows[0].count);
    console.log(`Registros existentes: ${existingCount}\n`);

    let importados = 0;
    let erros = 0;
    let duplicados = 0;

    for (const nc of dados) {
      try {
        // Gerar número único baseado no id original
        const year = parseDate(nc.data).substring(0, 4);
        const numero = `RNC-IMP-${year}-${nc.id.toString().padStart(4, '0')}`;

        // Verificar se já existe
        const existsResult = await client.query(
          'SELECT id FROM nao_conformidades WHERE numero = $1',
          [numero]
        );

        if (existsResult.rows.length > 0) {
          duplicados++;
          continue;
        }

        // Inserir registro
        await client.query(`
          INSERT INTO nao_conformidades (
            numero,
            data_ocorrencia,
            local_ocorrencia,
            setor_responsavel,
            tipo,
            origem,
            gravidade,
            descricao,
            produtos_afetados,
            quantidade_afetada,
            detectado_por,
            disposicao,
            disposicao_descricao,
            acao_contencao,
            status,
            created,
            updated
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        `, [
          numero,
          parseDate(nc.data),
          nc.uf && nc.uf !== 'nan' ? nc.uf.trim() : null,
          nc.processo && nc.processo !== 'nan' ? nc.processo.trim() : null,
          mapTipo(nc.tipo),
          nc.tarefa && nc.tarefa !== 'nan' ? nc.tarefa.trim() : null,
          mapGravidade(nc.gravidade),
          nc.descricao && nc.descricao !== 'nan' ? nc.descricao : 'Sem descrição',
          nc.codigo_peca && nc.codigo_peca !== 'nan' ? nc.codigo_peca : null,
          nc.qtd || null,
          nc.responsavel && nc.responsavel !== 'nan' ? nc.responsavel.trim() : null,
          mapDisposicao(nc.disposicao),
          nc.disposicao && nc.disposicao !== 'nan' ? nc.disposicao : null,
          nc.acao && nc.acao !== 'nan' ? nc.acao : null,
          'FECHADA', // Importados como fechados pois são históricos
          new Date().toISOString(),
          new Date().toISOString()
        ]);

        importados++;

        if (importados % 100 === 0) {
          console.log(`Importados: ${importados}/${dados.length}`);
        }

      } catch (err) {
        erros++;
        console.error(`Erro ao importar registro ${nc.id}:`, err.message);
      }
    }

    await client.query('COMMIT');

    console.log('\n========================================');
    console.log('Importação concluída!');
    console.log('========================================');
    console.log(`Total de registros: ${dados.length}`);
    console.log(`Importados: ${importados}`);
    console.log(`Duplicados (ignorados): ${duplicados}`);
    console.log(`Erros: ${erros}`);
    console.log('========================================');

    // Atualizar sequência
    const newMaxResult = await client.query('SELECT MAX(id) as max_id FROM nao_conformidades');
    const newMaxId = newMaxResult.rows[0].max_id || 0;
    await client.query(`ALTER SEQUENCE seq_nao_conformidade RESTART WITH ${newMaxId + 1}`);
    console.log(`Sequência atualizada para: ${newMaxId + 1}`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro durante a importação:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

importNaoConformidades().catch(console.error);
