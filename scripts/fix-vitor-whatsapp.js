/**
 * Corrige o numero de WhatsApp do Vitor Muller no banco
 * Problema: DB tem 554999648368 (12 digitos, errado)
 * Correto:  5554999648368 (13 digitos, com DDD 54)
 *
 * Uso: node scripts/fix-vitor-whatsapp.js
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    // Buscar vendedores com whatsapp de 12 digitos que comecam com 554 (provavelmente DDD 54)
    const check = await client.query(`
      SELECT id, nome, whatsapp, telefone
      FROM crm_vendedores
      WHERE whatsapp IS NOT NULL
      ORDER BY nome
    `);

    console.log('\n=== Telefones/WhatsApp dos vendedores ===');
    check.rows.forEach(r => {
      const wlen = (r.whatsapp || '').replace(/\D/g, '').length;
      const tlen = (r.telefone || '').replace(/\D/g, '').length;
      const wflag = wlen === 12 ? ' ⚠️  12 DIGITOS' : wlen === 13 ? ' ✅' : '';
      console.log(`  [${r.id}] ${r.nome.padEnd(25)} WA: ${(r.whatsapp || '-').padEnd(20)} (${wlen} dig)${wflag}  TEL: ${r.telefone || '-'} (${tlen} dig)`);
    });

    // Verificar se Vitor Muller tem o numero errado
    const vitor = check.rows.find(r => r.nome.toLowerCase().includes('vitor'));
    if (!vitor) {
      console.log('\nVitor nao encontrado');
      return;
    }

    const waAtual = (vitor.whatsapp || '').replace(/\D/g, '');
    console.log(`\nVitor Muller (id=${vitor.id}):`);
    console.log(`  WhatsApp atual: ${waAtual} (${waAtual.length} digitos)`);

    if (waAtual.length === 12 && waAtual.startsWith('554')) {
      // Provavel que esteja faltando o 5 do DDD 54
      // 554999648368 -> 5554999648368
      const waCorrigido = '5' + waAtual;
      console.log(`  WhatsApp correto: ${waCorrigido} (${waCorrigido.length} digitos)`);

      const { rows } = await client.query(
        `UPDATE crm_vendedores SET whatsapp = $1, updated_at = NOW() WHERE id = $2 RETURNING nome, whatsapp`,
        [waCorrigido, vitor.id]
      );

      if (rows.length) {
        console.log(`\n✅ Corrigido! ${rows[0].nome} -> WhatsApp: ${rows[0].whatsapp}`);
      }
    } else if (waAtual.length === 13) {
      console.log('  ✅ Numero ja tem 13 digitos, parece correto');
    } else {
      console.log(`  ⚠️  Numero tem ${waAtual.length} digitos - verifique manualmente`);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
