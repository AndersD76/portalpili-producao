import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST() {
  const results: string[] = [];
  const errors: string[] = [];

  try {
    // 1. Criar tabela de postits
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS postits (
          id SERIAL PRIMARY KEY,
          opd VARCHAR(255) NOT NULL,
          descricao TEXT NOT NULL,
          responsavel VARCHAR(255) NOT NULL,
          prazo DATE NOT NULL,
          status VARCHAR(50) DEFAULT 'pendente',
          criado_por VARCHAR(255),
          criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_postits_opd ON postits(opd)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_postits_status ON postits(status)`);
      results.push('✅ Tabela postits criada');
    } catch (e: any) {
      errors.push(`❌ Erro postits: ${e.message}`);
    }

    // 2. Criar tabela de comentários/chat
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS comentarios_opd (
          id SERIAL PRIMARY KEY,
          numero_opd VARCHAR(255) NOT NULL,
          usuario_id INTEGER,
          usuario_nome VARCHAR(255) NOT NULL,
          usuario_id_funcionario VARCHAR(50),
          mensagem TEXT NOT NULL,
          tipo VARCHAR(50) DEFAULT 'COMENTARIO',
          arquivos JSONB,
          created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_comentarios_numero_opd ON comentarios_opd(numero_opd)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_comentarios_created ON comentarios_opd(created DESC)`);
      results.push('✅ Tabela comentarios_opd criada');
    } catch (e: any) {
      errors.push(`❌ Erro comentarios_opd: ${e.message}`);
    }

    // 3. Adicionar colunas de timer nas atividades
    try {
      await pool.query(`
        ALTER TABLE registros_atividades
        ADD COLUMN IF NOT EXISTS tempo_acumulado_segundos INTEGER DEFAULT 0
      `);
      results.push('✅ Coluna tempo_acumulado_segundos adicionada');
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
        errors.push(`❌ Erro tempo_acumulado_segundos: ${e.message}`);
      }
    }

    try {
      await pool.query(`
        ALTER TABLE registros_atividades
        ADD COLUMN IF NOT EXISTS ultimo_inicio TIMESTAMP WITH TIME ZONE
      `);
      results.push('✅ Coluna ultimo_inicio adicionada');
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
        errors.push(`❌ Erro ultimo_inicio: ${e.message}`);
      }
    }

    try {
      await pool.query(`
        ALTER TABLE registros_atividades
        ADD COLUMN IF NOT EXISTS logs JSONB DEFAULT '[]'::jsonb
      `);
      results.push('✅ Coluna logs adicionada');
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
        errors.push(`❌ Erro logs: ${e.message}`);
      }
    }

    // 4. Adicionar coluna tipo_produto na tabela de OPDs
    try {
      await pool.query(`
        ALTER TABLE opds
        ADD COLUMN IF NOT EXISTS tipo_produto VARCHAR(50) DEFAULT 'TOMBADOR'
      `);
      results.push('✅ Coluna tipo_produto adicionada às OPDs');
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
        errors.push(`❌ Erro tipo_produto: ${e.message}`);
      }
    }

    // 5. Adicionar coluna tem_nao_conformidade nas atividades
    try {
      await pool.query(`
        ALTER TABLE registros_atividades
        ADD COLUMN IF NOT EXISTS tem_nao_conformidade BOOLEAN DEFAULT FALSE
      `);
      results.push('✅ Coluna tem_nao_conformidade adicionada às atividades');
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
        errors.push(`❌ Erro tem_nao_conformidade: ${e.message}`);
      }
    }

    // 6. Atualizar constraint de status para incluir PAUSADA
    try {
      await pool.query(`
        ALTER TABLE registros_atividades
        DROP CONSTRAINT IF EXISTS registros_atividades_status_check
      `);
      await pool.query(`
        ALTER TABLE registros_atividades
        ADD CONSTRAINT registros_atividades_status_check
        CHECK (status IN ('A REALIZAR', 'EM ANDAMENTO', 'PAUSADA', 'CONCLUÍDA'))
      `);
      results.push('✅ Constraint de status atualizado (inclui PAUSADA)');
    } catch (e: any) {
      // Ignorar se já existe ou se não houver constraint
      if (!e.message.includes('already exists') && !e.message.includes('does not exist')) {
        errors.push(`❌ Erro constraint status: ${e.message}`);
      }
    }

    // 7. Criar tabela de não conformidades
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS nao_conformidades (
          id SERIAL PRIMARY KEY,
          numero VARCHAR(50) UNIQUE NOT NULL,
          data_ocorrencia DATE NOT NULL,
          local_ocorrencia VARCHAR(255),
          setor_responsavel VARCHAR(100),
          tipo VARCHAR(50) NOT NULL,
          origem VARCHAR(100),
          gravidade VARCHAR(50),
          descricao TEXT NOT NULL,
          evidencias JSONB,
          produtos_afetados TEXT,
          quantidade_afetada VARCHAR(100),
          detectado_por VARCHAR(255),
          detectado_por_id INTEGER,
          disposicao VARCHAR(50),
          disposicao_descricao TEXT,
          acao_contencao TEXT,
          responsavel_contencao VARCHAR(255),
          causa_raiz TEXT,
          acao_corretiva TEXT,
          responsavel_acao VARCHAR(255),
          prazo_acao DATE,
          verificacao_eficacia TEXT,
          data_verificacao DATE,
          responsavel_verificacao VARCHAR(255),
          status VARCHAR(50) DEFAULT 'ABERTA',
          created_by VARCHAR(255),
          numero_opd VARCHAR(50),
          atividade_id INTEGER,
          created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_nc_numero ON nao_conformidades(numero)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_nc_status ON nao_conformidades(status)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_nc_numero_opd ON nao_conformidades(numero_opd)`);
      results.push('✅ Tabela nao_conformidades criada');
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
        errors.push(`❌ Erro nao_conformidades: ${e.message}`);
      }
    }

    // 8. Criar sequência para NCs
    try {
      await pool.query(`
        CREATE SEQUENCE IF NOT EXISTS seq_nao_conformidade START 1
      `);
      results.push('✅ Sequência seq_nao_conformidade criada');
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
        errors.push(`❌ Erro seq_nao_conformidade: ${e.message}`);
      }
    }

    // 9. Criar tabela de push subscriptions
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255),
          user_nome VARCHAR(255),
          endpoint TEXT NOT NULL UNIQUE,
          p256dh TEXT NOT NULL,
          auth TEXT NOT NULL,
          created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          active BOOLEAN DEFAULT TRUE
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(active)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint)`);
      results.push('✅ Tabela push_subscriptions criada');
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
        errors.push(`❌ Erro push_subscriptions: ${e.message}`);
      }
    }

    // 10. Criar tabela de logs de notificações
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS notification_logs (
          id SERIAL PRIMARY KEY,
          tipo VARCHAR(50) NOT NULL,
          referencia VARCHAR(255),
          titulo VARCHAR(255) NOT NULL,
          mensagem TEXT NOT NULL,
          enviado_por VARCHAR(255),
          total_enviados INTEGER DEFAULT 0,
          total_falhas INTEGER DEFAULT 0,
          created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_notification_logs_tipo ON notification_logs(tipo)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON notification_logs(created)`);
      results.push('✅ Tabela notification_logs criada');
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
        errors.push(`❌ Erro notification_logs: ${e.message}`);
      }
    }

    // 11. Adicionar colunas extras na tabela acoes_corretivas
    try {
      await pool.query(`ALTER TABLE acoes_corretivas ADD COLUMN IF NOT EXISTS emitente VARCHAR(255)`);
      await pool.query(`ALTER TABLE acoes_corretivas ADD COLUMN IF NOT EXISTS processos_envolvidos JSONB`);
      await pool.query(`ALTER TABLE acoes_corretivas ADD COLUMN IF NOT EXISTS causas TEXT`);
      await pool.query(`ALTER TABLE acoes_corretivas ADD COLUMN IF NOT EXISTS subcausas TEXT`);
      await pool.query(`ALTER TABLE acoes_corretivas ADD COLUMN IF NOT EXISTS acoes TEXT`);
      await pool.query(`ALTER TABLE acoes_corretivas ADD COLUMN IF NOT EXISTS status_acoes VARCHAR(50)`);
      await pool.query(`ALTER TABLE acoes_corretivas ADD COLUMN IF NOT EXISTS acoes_finalizadas VARCHAR(50)`);
      await pool.query(`ALTER TABLE acoes_corretivas ADD COLUMN IF NOT EXISTS situacao_final VARCHAR(50)`);
      await pool.query(`ALTER TABLE acoes_corretivas ADD COLUMN IF NOT EXISTS responsavel_analise VARCHAR(255)`);
      await pool.query(`ALTER TABLE acoes_corretivas ADD COLUMN IF NOT EXISTS data_analise DATE`);
      await pool.query(`ALTER TABLE acoes_corretivas ADD COLUMN IF NOT EXISTS evidencias_anexos JSONB`);
      results.push('✅ Colunas extras adicionadas à tabela acoes_corretivas');
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
        errors.push(`❌ Erro colunas acoes_corretivas: ${e.message}`);
      }
    }

    // 12. Reprocessar NCs dos formulários existentes
    try {
      // Buscar formulários com "não conforme" e atualizar atividades
      const atividadesComNC = await pool.query(`
        SELECT DISTINCT ra.id
        FROM registros_atividades ra
        JOIN formularios_preenchidos fp ON fp.atividade_id = ra.id
        WHERE fp.dados_formulario::text ILIKE '%não conforme%'
           OR fp.dados_formulario::text ILIKE '%nao conforme%'
           OR fp.dados_formulario::text ILIKE '%Não conforme%'
           OR fp.dados_formulario::text ILIKE '%Nao conforme%'
      `);

      if (atividadesComNC.rowCount && atividadesComNC.rowCount > 0) {
        for (const row of atividadesComNC.rows) {
          await pool.query(
            'UPDATE registros_atividades SET tem_nao_conformidade = true WHERE id = $1',
            [row.id]
          );
        }
        results.push(`✅ ${atividadesComNC.rowCount} atividades marcadas com NC`);
      } else {
        results.push('✅ Nenhuma NC encontrada nos formulários');
      }
    } catch (e: any) {
      errors.push(`❌ Erro ao reprocessar NCs: ${e.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Migrações executadas',
      results,
      errors
    });

  } catch (error: any) {
    console.error('Erro geral na migração:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      results,
      errors
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST para executar as migrações',
    migrations: [
      'Criar tabela postits',
      'Criar tabela comentarios_opd',
      'Adicionar colunas de timer (tempo_acumulado_segundos, ultimo_inicio, logs)',
      'Atualizar constraint de status',
      'Criar tabela nao_conformidades',
      'Criar tabela push_subscriptions',
      'Criar tabela notification_logs'
    ]
  });
}
