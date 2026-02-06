import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { query } from './db';

// Tipos de ações que podem ser verificadas
export type Acao = 'visualizar' | 'criar' | 'editar' | 'excluir' | 'aprovar';

// Dados do usuário extraídos do token JWT
export interface UsuarioToken {
  id: number;
  id_funcionario: string;
  nome: string;
  email: string;
  cargo: string;
  departamento: string;
  is_admin: boolean;
  perfil_id: number | null;
}

// Resultado da verificação de autenticação
interface AuthResult {
  autenticado: true;
  usuario: UsuarioToken;
}

interface AuthError {
  autenticado: false;
  resposta: NextResponse;
}

// Resultado da verificação de permissão
interface PermissaoResult {
  permitido: true;
  usuario: UsuarioToken;
}

interface PermissaoError {
  permitido: false;
  resposta: NextResponse;
}

/**
 * Verifica se o usuário está autenticado extraindo e validando o JWT do cookie
 */
export async function verificarAutenticacao(): Promise<AuthResult | AuthError> {
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!JWT_SECRET) {
    console.error('[AUTH] JWT_SECRET não configurado');
    return {
      autenticado: false,
      resposta: NextResponse.json(
        { success: false, error: 'Erro de configuração do servidor' },
        { status: 500 }
      )
    };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return {
      autenticado: false,
      resposta: NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UsuarioToken;
    return {
      autenticado: true,
      usuario: decoded
    };
  } catch {
    return {
      autenticado: false,
      resposta: NextResponse.json(
        { success: false, error: 'Token inválido ou expirado' },
        { status: 401 }
      )
    };
  }
}

/**
 * Busca as permissões do usuário para um módulo específico
 */
async function buscarPermissaoModulo(usuarioId: number, codigoModulo: string): Promise<{
  pode_visualizar: boolean;
  pode_criar: boolean;
  pode_editar: boolean;
  pode_excluir: boolean;
  pode_aprovar: boolean;
} | null> {
  try {
    // Buscar dados do usuário e perfil
    const userResult = await query(`
      SELECT
        u.id,
        u.is_admin,
        u.perfil_id,
        pa.permissoes_padrao
      FROM usuarios u
      LEFT JOIN perfis_acesso pa ON pa.id = u.perfil_id
      WHERE u.id = $1 AND u.ativo = true
    `, [usuarioId]);

    if (!userResult?.rows?.length) {
      return null;
    }

    const user = userResult.rows[0];

    // Admin tem todas as permissões
    if (user.is_admin === true) {
      return {
        pode_visualizar: true,
        pode_criar: true,
        pode_editar: true,
        pode_excluir: true,
        pode_aprovar: true
      };
    }

    const permissoesPadrao = user.permissoes_padrao || {};

    // Buscar módulo
    const moduloResult = await query(`
      SELECT id FROM modulos WHERE codigo = $1 AND ativo = true
    `, [codigoModulo]);

    if (!moduloResult?.rows?.length) {
      return null;
    }

    const moduloId = moduloResult.rows[0].id;

    // Buscar permissões personalizadas
    const permResult = await query(`
      SELECT pode_visualizar, pode_criar, pode_editar, pode_excluir, pode_aprovar
      FROM permissoes_modulos
      WHERE usuario_id = $1 AND modulo_id = $2
    `, [usuarioId, moduloId]);

    const permPersonalizada = permResult?.rows?.[0];
    const permPerfil = permissoesPadrao[codigoModulo] || {};

    // Prioridade: personalizada > perfil > padrão
    return {
      pode_visualizar: permPersonalizada?.pode_visualizar ?? permPerfil.visualizar ?? true,
      pode_criar: permPersonalizada?.pode_criar ?? permPerfil.criar ?? false,
      pode_editar: permPersonalizada?.pode_editar ?? permPerfil.editar ?? false,
      pode_excluir: permPersonalizada?.pode_excluir ?? permPerfil.excluir ?? false,
      pode_aprovar: permPersonalizada?.pode_aprovar ?? permPerfil.aprovar ?? false
    };
  } catch (error) {
    console.error('[AUTH] Erro ao buscar permissões:', error);
    return null;
  }
}

/**
 * Verifica se o usuário tem permissão para executar uma ação em um módulo
 *
 * @param modulo - Código do módulo (PRODUCAO, QUALIDADE, COMERCIAL, ADMIN)
 * @param acao - Ação a ser verificada (visualizar, criar, editar, excluir, aprovar)
 *
 * @example
 * const auth = await verificarPermissao('PRODUCAO', 'editar');
 * if (!auth.permitido) return auth.resposta;
 * // Continuar com a lógica...
 */
export async function verificarPermissao(
  modulo: string,
  acao: Acao
): Promise<PermissaoResult | PermissaoError> {
  // Primeiro verificar autenticação
  const authResult = await verificarAutenticacao();

  if (!authResult.autenticado) {
    return {
      permitido: false,
      resposta: authResult.resposta
    };
  }

  const usuario = authResult.usuario;

  // Admin tem todas as permissões
  if (usuario.is_admin) {
    return {
      permitido: true,
      usuario
    };
  }

  // Buscar permissões do módulo
  const permissoes = await buscarPermissaoModulo(usuario.id, modulo);

  if (!permissoes) {
    return {
      permitido: false,
      resposta: NextResponse.json(
        { success: false, error: 'Usuário não encontrado ou inativo' },
        { status: 403 }
      )
    };
  }

  // Mapear ação para campo de permissão
  const campoPermissao = `pode_${acao}` as keyof typeof permissoes;
  const temPermissao = permissoes[campoPermissao];

  if (!temPermissao) {
    return {
      permitido: false,
      resposta: NextResponse.json(
        {
          success: false,
          error: `Você não tem permissão para ${acao} neste módulo`,
          modulo,
          acao
        },
        { status: 403 }
      )
    };
  }

  return {
    permitido: true,
    usuario
  };
}

/**
 * Mapeamento de rotas para módulos
 * Usado para determinar automaticamente qual módulo verificar baseado na rota
 */
export const rotaParaModulo: Record<string, string> = {
  // Produção
  'formularios': 'PRODUCAO',
  'atividades': 'PRODUCAO',
  'opds': 'PRODUCAO',
  'comentarios': 'PRODUCAO',
  'dashboard': 'PRODUCAO',
  'sinprod': 'PRODUCAO',

  // Qualidade
  'qualidade': 'QUALIDADE',
  'nao-conformidade': 'QUALIDADE',
  'reclamacao-cliente': 'QUALIDADE',
  'acao-corretiva': 'QUALIDADE',
  'cq-config': 'QUALIDADE',

  // Comercial
  'comercial': 'COMERCIAL',
  'clientes': 'COMERCIAL',
  'propostas': 'COMERCIAL',
  'vendedores': 'COMERCIAL',
  'precos': 'COMERCIAL',

  // Admin
  'admin': 'ADMIN',
  'usuarios': 'ADMIN',
  'perfis': 'ADMIN',
  'modulos': 'ADMIN'
};

/**
 * Determina o módulo baseado no caminho da requisição
 */
export function obterModuloDaRota(pathname: string): string | null {
  const partes = pathname.split('/').filter(Boolean);

  // Remover 'api' do início
  if (partes[0] === 'api') {
    partes.shift();
  }

  // Procurar correspondência
  for (const parte of partes) {
    if (rotaParaModulo[parte]) {
      return rotaParaModulo[parte];
    }
  }

  return null;
}

/**
 * Mapeia método HTTP para ação de permissão
 */
export function metodoParaAcao(method: string): Acao {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'visualizar';
    case 'POST':
      return 'criar';
    case 'PUT':
    case 'PATCH':
      return 'editar';
    case 'DELETE':
      return 'excluir';
    default:
      return 'visualizar';
  }
}
