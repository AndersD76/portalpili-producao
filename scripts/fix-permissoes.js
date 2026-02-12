/**
 * Script para diagnosticar e corrigir permissões dos usuários
 * Executa: node scripts/fix-permissoes.js
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();

  try {
    console.log('=== DIAGNÓSTICO DE PERMISSÕES ===\n');

    // 1. Verificar se tabelas existem
    const tabelas = ['modulos', 'perfis_acesso', 'permissoes_modulos'];
    for (const tabela of tabelas) {
      const existe = await client.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)`,
        [tabela]
      );
      console.log(`Tabela ${tabela}: ${existe.rows[0].exists ? 'EXISTE' : 'NÃO EXISTE'}`);
    }

    // 2. Criar tabelas se não existem
    console.log('\n--- Criando/verificando tabelas ---');

    await client.query(`
      CREATE TABLE IF NOT EXISTS modulos (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(50) UNIQUE NOT NULL,
        nome VARCHAR(100) NOT NULL,
        descricao TEXT,
        icone VARCHAR(50),
        ordem INT DEFAULT 0,
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS perfis_acesso (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) UNIQUE NOT NULL,
        descricao TEXT,
        permissoes_padrao JSONB NOT NULL,
        nivel INT DEFAULT 0,
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS permissoes_modulos (
        id SERIAL PRIMARY KEY,
        usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        modulo_id INT NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
        pode_visualizar BOOLEAN DEFAULT true,
        pode_criar BOOLEAN DEFAULT false,
        pode_editar BOOLEAN DEFAULT false,
        pode_excluir BOOLEAN DEFAULT false,
        pode_aprovar BOOLEAN DEFAULT false,
        restricoes JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(usuario_id, modulo_id)
      )
    `);

    // Adicionar perfil_id na tabela usuarios se não existir
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'perfil_id') THEN
          ALTER TABLE usuarios ADD COLUMN perfil_id INT REFERENCES perfis_acesso(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'is_admin') THEN
          ALTER TABLE usuarios ADD COLUMN is_admin BOOLEAN DEFAULT false;
        END IF;
      END $$
    `);

    console.log('Tabelas OK');

    // 3. Inserir/atualizar módulos
    console.log('\n--- Configurando módulos ---');
    await client.query(`
      INSERT INTO modulos (codigo, nome, descricao, icone, ordem) VALUES
        ('PRODUCAO', 'Produção', 'Gestão de OPDs e atividades de produção', 'factory', 1),
        ('QUALIDADE', 'Qualidade', 'Não conformidades, reclamações e ações corretivas', 'check-circle', 2),
        ('COMERCIAL', 'Comercial', 'CRM, propostas e gestão de vendas', 'briefcase', 3),
        ('ADMIN', 'Administração', 'Gestão de usuários e configurações do sistema', 'settings', 99)
      ON CONFLICT (codigo) DO UPDATE SET
        nome = EXCLUDED.nome,
        descricao = EXCLUDED.descricao,
        icone = EXCLUDED.icone,
        ordem = EXCLUDED.ordem,
        ativo = true
    `);

    const modulos = await client.query('SELECT id, codigo FROM modulos WHERE ativo = true ORDER BY ordem');
    console.log('Módulos:', modulos.rows.map(m => m.codigo).join(', '));

    // 4. Inserir/atualizar perfis
    console.log('\n--- Configurando perfis ---');
    const perfis = [
      {
        nome: 'Administrador',
        descricao: 'Acesso total ao sistema',
        nivel: 10,
        permissoes: {
          PRODUCAO: { visualizar: true, criar: true, editar: true, excluir: true, aprovar: true },
          QUALIDADE: { visualizar: true, criar: true, editar: true, excluir: true, aprovar: true },
          COMERCIAL: { visualizar: true, criar: true, editar: true, excluir: true, aprovar: true },
          ADMIN: { visualizar: true, criar: true, editar: true, excluir: true, aprovar: true },
        },
      },
      {
        nome: 'Gerente',
        descricao: 'Acesso completo aos módulos operacionais',
        nivel: 5,
        permissoes: {
          PRODUCAO: { visualizar: true, criar: true, editar: true, excluir: true, aprovar: true },
          QUALIDADE: { visualizar: true, criar: true, editar: true, excluir: true, aprovar: true },
          COMERCIAL: { visualizar: true, criar: true, editar: true, excluir: true, aprovar: true },
          ADMIN: { visualizar: true, criar: false, editar: false, excluir: false, aprovar: false },
        },
      },
      {
        nome: 'Vendedor',
        descricao: 'Acesso ao módulo comercial',
        nivel: 2,
        permissoes: {
          PRODUCAO: { visualizar: true, criar: false, editar: false, excluir: false, aprovar: false },
          QUALIDADE: { visualizar: false, criar: false, editar: false, excluir: false, aprovar: false },
          COMERCIAL: { visualizar: true, criar: true, editar: true, excluir: false, aprovar: false },
          ADMIN: { visualizar: false, criar: false, editar: false, excluir: false, aprovar: false },
        },
      },
      {
        nome: 'Operador Produção',
        descricao: 'Acesso ao módulo de produção',
        nivel: 1,
        permissoes: {
          PRODUCAO: { visualizar: true, criar: true, editar: true, excluir: false, aprovar: false },
          QUALIDADE: { visualizar: true, criar: true, editar: false, excluir: false, aprovar: false },
          COMERCIAL: { visualizar: false, criar: false, editar: false, excluir: false, aprovar: false },
          ADMIN: { visualizar: false, criar: false, editar: false, excluir: false, aprovar: false },
        },
      },
      {
        nome: 'Qualidade',
        descricao: 'Acesso ao módulo de qualidade',
        nivel: 2,
        permissoes: {
          PRODUCAO: { visualizar: true, criar: false, editar: false, excluir: false, aprovar: false },
          QUALIDADE: { visualizar: true, criar: true, editar: true, excluir: true, aprovar: true },
          COMERCIAL: { visualizar: false, criar: false, editar: false, excluir: false, aprovar: false },
          ADMIN: { visualizar: false, criar: false, editar: false, excluir: false, aprovar: false },
        },
      },
    ];

    for (const perfil of perfis) {
      await client.query(
        `INSERT INTO perfis_acesso (nome, descricao, permissoes_padrao, nivel)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (nome) DO UPDATE SET
           descricao = EXCLUDED.descricao,
           permissoes_padrao = EXCLUDED.permissoes_padrao,
           nivel = EXCLUDED.nivel`,
        [perfil.nome, perfil.descricao, JSON.stringify(perfil.permissoes), perfil.nivel]
      );
    }

    const perfisDB = await client.query('SELECT id, nome, nivel FROM perfis_acesso ORDER BY nivel DESC');
    console.log('Perfis:');
    perfisDB.rows.forEach(p => console.log(`  - ${p.nome} (id=${p.id}, nível=${p.nivel})`));

    // 5. Listar todos os usuários e seu estado atual
    console.log('\n--- Estado atual dos usuários ---');
    const usuarios = await client.query(`
      SELECT u.id, u.nome, u.email, u.departamento, u.cargo, u.is_admin, u.perfil_id, u.ativo,
             pa.nome as perfil_nome,
             COALESCE(u.is_vendedor, false) as is_vendedor
      FROM usuarios u
      LEFT JOIN perfis_acesso pa ON u.perfil_id = pa.id
      WHERE COALESCE(u.ativo, true) = true
      ORDER BY u.is_admin DESC NULLS LAST, u.nome
    `);

    usuarios.rows.forEach(u => {
      console.log(`  [${u.is_admin ? 'ADMIN' : '     '}] ${u.nome} | dept=${u.departamento || 'NULL'} | perfil=${u.perfil_nome || 'NENHUM'} (id=${u.perfil_id || 'NULL'})`);
    });

    // 6. Buscar IDs dos perfis
    const perfilAdmin = perfisDB.rows.find(p => p.nome === 'Administrador');
    const perfilGerente = perfisDB.rows.find(p => p.nome === 'Gerente');
    const perfilVendedor = perfisDB.rows.find(p => p.nome === 'Vendedor');
    const perfilProducao = perfisDB.rows.find(p => p.nome === 'Operador Produção');
    const perfilQualidade = perfisDB.rows.find(p => p.nome === 'Qualidade');

    // 7. Atribuir perfis a usuários que não têm
    console.log('\n--- Atribuindo perfis ---');
    let atualizados = 0;

    for (const u of usuarios.rows) {
      let perfilIdNovo = null;
      let motivo = '';

      // Admin → Perfil Administrador
      if (u.is_admin === true) {
        if (!u.perfil_id || u.perfil_id !== perfilAdmin.id) {
          perfilIdNovo = perfilAdmin.id;
          motivo = 'is_admin=true → Administrador';
        }
      }
      // Vendedor / Comercial
      else if (u.is_vendedor === true || (u.departamento && u.departamento.toUpperCase() === 'COMERCIAL')) {
        if (!u.perfil_id) {
          perfilIdNovo = perfilVendedor.id;
          motivo = 'departamento=COMERCIAL → Vendedor';
        }
      }
      // Produção
      else if (u.departamento && u.departamento.toUpperCase().includes('PRODU')) {
        if (!u.perfil_id) {
          perfilIdNovo = perfilProducao.id;
          motivo = 'departamento=PRODUÇÃO → Operador Produção';
        }
      }
      // Qualidade
      else if (u.departamento && u.departamento.toUpperCase().includes('QUALIDADE')) {
        if (!u.perfil_id) {
          perfilIdNovo = perfilQualidade.id;
          motivo = 'departamento=QUALIDADE → Qualidade';
        }
      }
      // Gerente (se cargo inclui gerente/diretor)
      else if (u.cargo && (u.cargo.toUpperCase().includes('GERENTE') || u.cargo.toUpperCase().includes('DIRETOR'))) {
        if (!u.perfil_id) {
          perfilIdNovo = perfilGerente.id;
          motivo = 'cargo=Gerente/Diretor → Gerente';
        }
      }
      // Sem departamento definido → Gerente (acesso amplo como fallback)
      else if (!u.perfil_id) {
        perfilIdNovo = perfilGerente.id;
        motivo = 'sem departamento → Gerente (fallback)';
      }

      if (perfilIdNovo) {
        await client.query('UPDATE usuarios SET perfil_id = $1 WHERE id = $2', [perfilIdNovo, u.id]);
        console.log(`  ✓ ${u.nome}: ${motivo}`);
        atualizados++;
      }
    }

    if (atualizados === 0) {
      console.log('  Todos os usuários já têm perfil atribuído.');
    } else {
      console.log(`  ${atualizados} usuários atualizados.`);
    }

    // 8. Garantir que is_admin não é NULL para ninguém
    const fixNull = await client.query(`UPDATE usuarios SET is_admin = false WHERE is_admin IS NULL`);
    if (fixNull.rowCount > 0) {
      console.log(`\n  ✓ ${fixNull.rowCount} usuários com is_admin=NULL corrigidos para false`);
    }

    // 9. Verificação final
    console.log('\n=== ESTADO FINAL ===\n');
    const finalState = await client.query(`
      SELECT u.id, u.nome, u.is_admin, u.perfil_id, pa.nome as perfil_nome, u.departamento
      FROM usuarios u
      LEFT JOIN perfis_acesso pa ON u.perfil_id = pa.id
      WHERE COALESCE(u.ativo, true) = true
      ORDER BY u.is_admin DESC NULLS LAST, pa.nivel DESC NULLS LAST, u.nome
    `);

    finalState.rows.forEach(u => {
      const role = u.is_admin ? '[ADMIN]' : '       ';
      console.log(`  ${role} ${u.nome.padEnd(30)} | Perfil: ${(u.perfil_nome || 'NENHUM').padEnd(20)} | Dept: ${u.departamento || '-'}`);
    });

    // 10. Testar se permissões funcionam para cada perfil
    console.log('\n=== TESTE DE PERMISSÕES ===\n');
    for (const perfil of perfisDB.rows) {
      const permsData = await client.query('SELECT permissoes_padrao FROM perfis_acesso WHERE id = $1', [perfil.id]);
      const perms = permsData.rows[0]?.permissoes_padrao || {};
      const modList = ['PRODUCAO', 'QUALIDADE', 'COMERCIAL', 'ADMIN'];
      const resumo = modList.map(m => {
        const p = perms[m] || {};
        const acoes = [];
        if (p.visualizar) acoes.push('V');
        if (p.criar) acoes.push('C');
        if (p.editar) acoes.push('E');
        if (p.excluir) acoes.push('X');
        if (p.aprovar) acoes.push('A');
        return `${m}=[${acoes.join('')}]`;
      }).join(' ');
      console.log(`  ${perfil.nome.padEnd(20)} → ${resumo}`);
    }

    console.log('\n✅ Permissões configuradas com sucesso!');
    console.log('⚠️  Usuários precisam RELOGAR para que as novas permissões tenham efeito no JWT.');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    throw error;
  } finally {
    client.release();
    pool.end();
  }
}

run().catch(console.error);
