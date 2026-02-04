// Script para importar preços do Excel para o banco de dados
// Executa via: node scripts/import-precos-excel.js

const XLSX = require('xlsx');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function importPrecos() {
  const client = await pool.connect();

  try {
    console.log('Importando preços do Excel...\n');

    // ============ PREÇOS BASE (TOMBADOR) ============
    console.log('📋 Importando PREÇOS BASE TOMBADOR...\n');

    const precosBaseTombador = [
      { tamanho: 10, preco: 215000, tipo: 'FIXO', descricao: 'Tombador 10m FIXO', qt_cilindros: 2, qt_motores: 1, qt_oleo: 200, angulo: '35' },
      { tamanho: 11, preco: 226000, tipo: 'FIXO', descricao: 'Tombador 11m FIXO', qt_cilindros: 2, qt_motores: 1, qt_oleo: 200, angulo: '35' },
      { tamanho: 12, preco: 229000, tipo: 'FIXO', descricao: 'Tombador 12m FIXO', qt_cilindros: 2, qt_motores: 1, qt_oleo: 280, angulo: '35' },
      { tamanho: 18, preco: 335600, tipo: 'FIXO', descricao: 'Tombador 18m FIXO', qt_cilindros: 2, qt_motores: 1, qt_oleo: 550, angulo: '40' },
      { tamanho: 21, preco: 455000, tipo: 'FIXO', descricao: 'Tombador 21m FIXO', qt_cilindros: 2, qt_motores: 2, qt_oleo: 550, angulo: '40' },
      { tamanho: 26, preco: 789000, tipo: 'FIXO', descricao: 'Tombador 26m FIXO', qt_cilindros: 2, qt_motores: 2, qt_oleo: 1000, angulo: '40' },
      { tamanho: 30, preco: 986000, tipo: 'FIXO', descricao: 'Tombador 30m FIXO', qt_cilindros: 2, qt_motores: 2, qt_oleo: 1000, angulo: '40' },
      { tamanho: 18, preco: 436000, tipo: 'MOVEL', descricao: 'Tombador 18m MÓVEL', qt_cilindros: 2, qt_motores: 1, qt_oleo: 550, angulo: '40' },
      { tamanho: 21, preco: 649000, tipo: 'MOVEL', descricao: 'Tombador 21m MÓVEL', qt_cilindros: 2, qt_motores: 2, qt_oleo: 550, angulo: '40' },
      { tamanho: 26, preco: 1026000, tipo: 'MOVEL', descricao: 'Tombador 26m MÓVEL', qt_cilindros: 2, qt_motores: 2, qt_oleo: 1000, angulo: '40' },
      { tamanho: 30, preco: 1282000, tipo: 'MOVEL', descricao: 'Tombador 30m MÓVEL', qt_cilindros: 2, qt_motores: 2, qt_oleo: 1000, angulo: '40' },
    ];

    for (const preco of precosBaseTombador) {
      const existente = await client.query(
        'SELECT id FROM crm_precos_base WHERE produto = $1 AND tamanho = $2 AND tipo = $3',
        ['TOMBADOR', preco.tamanho, preco.tipo]
      );

      if (existente.rows.length > 0) {
        await client.query(
          'UPDATE crm_precos_base SET preco = $1, descricao = $2, qt_cilindros = $3, qt_motores = $4, qt_oleo = $5, angulo_inclinacao = $6, ativo = true, updated_at = NOW() WHERE id = $7',
          [preco.preco, preco.descricao, preco.qt_cilindros, preco.qt_motores, preco.qt_oleo, preco.angulo, existente.rows[0].id]
        );
        console.log('  Atualizado: TOMBADOR ' + preco.tamanho + 'm ' + preco.tipo + ' = R$ ' + preco.preco.toLocaleString('pt-BR'));
      } else {
        await client.query(
          'INSERT INTO crm_precos_base (produto, tamanho, tipo, descricao, preco, qt_cilindros, qt_motores, qt_oleo, angulo_inclinacao, ativo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)',
          ['TOMBADOR', preco.tamanho, preco.tipo, preco.descricao, preco.preco, preco.qt_cilindros, preco.qt_motores, preco.qt_oleo, preco.angulo]
        );
        console.log('  Inserido: TOMBADOR ' + preco.tamanho + 'm ' + preco.tipo + ' = R$ ' + preco.preco.toLocaleString('pt-BR'));
      }
    }

    // ============ PREÇOS BASE (COLETOR) ============
    console.log('\n📋 Importando PREÇOS BASE COLETOR...\n');

    const precosBaseColetor = [
      { tamanho: 180, preco: 95000, tipo: 'FIXO', descricao: 'Coletor 180° FIXO', qt_motores: 1 },
      { tamanho: 270, preco: 125000, tipo: 'FIXO', descricao: 'Coletor 270° FIXO', qt_motores: 1 },
      { tamanho: 180, preco: 135000, tipo: 'MOVEL', descricao: 'Coletor 180° MÓVEL', qt_motores: 1 },
      { tamanho: 270, preco: 165000, tipo: 'MOVEL', descricao: 'Coletor 270° MÓVEL', qt_motores: 1 },
    ];

    for (const preco of precosBaseColetor) {
      const existente = await client.query(
        'SELECT id FROM crm_precos_base WHERE produto = $1 AND tamanho = $2 AND tipo = $3',
        ['COLETOR', preco.tamanho, preco.tipo]
      );

      if (existente.rows.length > 0) {
        await client.query(
          'UPDATE crm_precos_base SET preco = $1, descricao = $2, qt_motores = $3, ativo = true, updated_at = NOW() WHERE id = $4',
          [preco.preco, preco.descricao, preco.qt_motores, existente.rows[0].id]
        );
        console.log('  Atualizado: COLETOR ' + preco.tamanho + ' ' + preco.tipo + ' = R$ ' + preco.preco.toLocaleString('pt-BR'));
      } else {
        await client.query(
          'INSERT INTO crm_precos_base (produto, tamanho, tipo, descricao, preco, qt_motores, ativo) VALUES ($1, $2, $3, $4, $5, $6, true)',
          ['COLETOR', preco.tamanho, preco.tipo, preco.descricao, preco.preco, preco.qt_motores]
        );
        console.log('  Inserido: COLETOR ' + preco.tamanho + ' ' + preco.tipo + ' = R$ ' + preco.preco.toLocaleString('pt-BR'));
      }
    }

    // ============ VERIFICAÇÃO FINAL ============
    console.log('\n========================================');
    console.log('RESUMO DA IMPORTAÇÃO:');

    const baseCount = await client.query('SELECT COUNT(*) as total FROM crm_precos_base WHERE ativo = true');
    console.log('   Preços Base ativos: ' + baseCount.rows[0].total);
    console.log('========================================\n');

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

importPrecos();
