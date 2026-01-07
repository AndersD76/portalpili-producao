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

    // 4. Atualizar constraint de status para incluir PAUSADA
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
      'Atualizar constraint de status'
    ]
  });
}
