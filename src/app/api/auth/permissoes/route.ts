import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface PerfilPermissao {
  criar: boolean;
  editar: boolean;
  excluir: boolean;
  aprovar: boolean;
  visualizar: boolean;
}

interface PermissoesPadrao {
  [key: string]: PerfilPermissao;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('usuario_id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'ID do usuário é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar dados do usuário e perfil
    let userResult;
    try {
      userResult = await query(`
        SELECT
          u.id,
          u.is_admin,
          u.perfil_id,
          pa.permissoes_padrao
        FROM usuarios u
        LEFT JOIN perfis_acesso pa ON pa.id = u.perfil_id
        WHERE u.id = $1
      `, [userId]);
    } catch (userError) {
      console.error('Erro na query de usuário:', userError);
      throw new Error(`Query usuário falhou: ${userError instanceof Error ? userError.message : 'erro desconhecido'}`);
    }

    if (!userResult?.rows?.length) {
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];
    const isAdmin = user.is_admin === true;
    const permissoesPadrao: PermissoesPadrao = user.permissoes_padrao || {};

    // Buscar módulos ativos
    let modulosResult;
    try {
      modulosResult = await query(`
        SELECT id, codigo, nome, rota, icone
        FROM modulos
        WHERE ativo = true
        ORDER BY ordem
      `);
    } catch (modulosError) {
      console.error('Erro na query de módulos:', modulosError);
      throw new Error(`Query módulos falhou: ${modulosError instanceof Error ? modulosError.message : 'erro desconhecido'}`);
    }

    // Buscar permissões personalizadas do usuário
    let permPersonalizadas;
    try {
      permPersonalizadas = await query(`
        SELECT modulo_id, pode_visualizar, pode_criar, pode_editar, pode_excluir, pode_aprovar
        FROM permissoes_modulos
        WHERE usuario_id = $1
      `, [userId]);
    } catch (permError) {
      console.error('Erro na query de permissões:', permError);
      throw new Error(`Query permissões falhou: ${permError instanceof Error ? permError.message : 'erro desconhecido'}`);
    }

    const permPersonalizadasMap = new Map();
    permPersonalizadas?.rows?.forEach(p => {
      permPersonalizadasMap.set(p.modulo_id, p);
    });

    // Construir permissões finais
    const permissoes = modulosResult?.rows?.map(modulo => {
      const permPersonalizada = permPersonalizadasMap.get(modulo.id);
      const permPerfil = permissoesPadrao[modulo.codigo] || {};

      // Prioridade: admin > personalizada > perfil > padrão
      return {
        modulo_id: modulo.id,
        codigo: modulo.codigo,
        nome: modulo.nome,
        rota: modulo.rota,
        icone: modulo.icone,
        pode_visualizar: isAdmin || (permPersonalizada?.pode_visualizar ?? permPerfil.visualizar ?? true),
        pode_criar: isAdmin || (permPersonalizada?.pode_criar ?? permPerfil.criar ?? false),
        pode_editar: isAdmin || (permPersonalizada?.pode_editar ?? permPerfil.editar ?? false),
        pode_excluir: isAdmin || (permPersonalizada?.pode_excluir ?? permPerfil.excluir ?? false),
        pode_aprovar: isAdmin || (permPersonalizada?.pode_aprovar ?? permPerfil.aprovar ?? false),
      };
    }) || [];

    return NextResponse.json({
      success: true,
      data: permissoes,
      isAdmin,
      perfil_id: user.perfil_id,
    });
  } catch (error) {
    console.error('Erro ao buscar permissões:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json(
      { success: false, error: `Erro ao buscar permissões: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
