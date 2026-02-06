// Script para sincronizar vendedores da tabela usuarios para crm_vendedores
// Vendedores sao usuarios marcados com is_vendedor = TRUE
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Lista de nomes de vendedores conhecidos
const VENDEDORES_CONHECIDOS = [
  'VINICIUS MOTA',
  'LUIS ALBERTO ROOS',
  'TIAGO GEVINSKI',
  'VICENTE DE PAUL MARTINEZ',
  'VICENTE DE APUL MARTINEZ',
  'WAGNER BARBOSA DOS REIS',
  'LUCIANO MICHEL DA COSTA',
  'JAIR D AGUSTIN',
  'MARCOS ANTONIO SULIGO',
  'CELSO PAROT DE OLIVEIRA',
  'COMERCIAL AGROINTER',
  'SILVINO MARCOS GARCIA',
  'GILBERTO JOSE KRASUCKI',
  'CLARICE PICOLI',
  'EDERSON RODRIGUES DA SILVA',
  'GIOVANI PILI',
  'ROBSON ALEX BORTOLOSO',
  'GILBERTO PA'
];

async function syncVendedores() {
  const client = await pool.connect();
  try {
    console.log('=== Sincronizando Vendedores da Tabela Usuarios ===\n');

    // Primeiro, marcar os vendedores conhecidos
    console.log('Marcando vendedores conhecidos...');
    for (const nome of VENDEDORES_CONHECIDOS) {
      const result = await client.query(
        "UPDATE usuarios SET is_vendedor = true WHERE UPPER(nome) LIKE '%' || $1 || '%'",
        [nome]
      );
      if (result.rowCount > 0) {
        console.log('  Marcado:', nome);
      }
    }

    // Buscar usuarios que sao vendedores (is_vendedor = true)
    const usuariosResult = await client.query(
      "SELECT id, nome, email, id_funcionario, cargo, departamento FROM usuarios WHERE is_vendedor = true ORDER BY nome"
    );

    console.log('Usuarios com EXTERNO=TRUE:', usuariosResult.rows.length);
    console.log('');

    let inseridos = 0;
    let atualizados = 0;

    for (const usuario of usuariosResult.rows) {
      // Verificar se ja existe na tabela crm_vendedores
      const existeResult = await client.query(
        'SELECT id FROM crm_vendedores WHERE usuario_id = $1',
        [usuario.id]
      );

      const email = usuario.email || `vendedor${usuario.id}@pili.ind.br`;
      const cargo = usuario.cargo || 'VENDEDOR';

      if (existeResult.rows.length > 0) {
        // Atualizar dados se necessario
        await client.query(`
          UPDATE crm_vendedores
          SET nome = $1, email = $2, cargo = $3, updated_at = NOW()
          WHERE usuario_id = $4
        `, [usuario.nome, email, cargo, usuario.id]);
        atualizados++;
        console.log('  [ATUALIZADO] ID:', usuario.id, '-', usuario.nome);
      } else {
        // Verificar se email ja existe
        const emailExiste = await client.query(
          'SELECT id FROM crm_vendedores WHERE email = $1',
          [email]
        );

        let emailFinal = email;
        if (emailExiste.rows.length > 0) {
          emailFinal = email.replace('@', `.${usuario.id}@`);
        }

        // Inserir novo vendedor
        await client.query(`
          INSERT INTO crm_vendedores (usuario_id, nome, email, cargo, ativo, created_at, updated_at)
          VALUES ($1, $2, $3, $4, true, NOW(), NOW())
        `, [usuario.id, usuario.nome, emailFinal, cargo]);
        inseridos++;
        console.log('  [NOVO] ID:', usuario.id, '-', usuario.nome);
      }
    }

    console.log('\n=== Resumo ===');
    console.log('  Novos inseridos:', inseridos);
    console.log('  Atualizados:', atualizados);
    console.log('  Total processados:', usuariosResult.rows.length);

    // Listar todos os vendedores atuais
    console.log('\n=== Vendedores Atuais no CRM ===');
    const vendedoresResult = await client.query(`
      SELECT v.id, v.usuario_id, v.nome, v.email, v.cargo, v.ativo
      FROM crm_vendedores v
      ORDER BY v.nome
    `);

    vendedoresResult.rows.forEach(v => {
      const usuarioInfo = v.usuario_id ? `Usuario: ${v.usuario_id}` : 'Sem vinculo';
      console.log('  ID:', v.id, '|', usuarioInfo, '| Nome:', v.nome, '| Ativo:', v.ativo);
    });

    console.log('\nTotal de vendedores no CRM:', vendedoresResult.rows.length);

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

syncVendedores();
