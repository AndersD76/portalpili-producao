# -*- coding: utf-8 -*-
"""
Script para sincronizar vendedores do CSV com o banco de dados
e vincular propostas aos vendedores corretos
"""
import pandas as pd
import psycopg2
import os
import sys
import re

sys.stdout.reconfigure(encoding='utf-8')

conn = psycopg2.connect(
    "postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"
)

def normalizar_nome(nome):
    """Normaliza nome para comparacao"""
    if pd.isna(nome):
        return ''
    nome = str(nome).strip().upper()
    # Remover acentos
    nome = nome.replace('Ã', 'A').replace('Á', 'A').replace('À', 'A')
    nome = nome.replace('É', 'E').replace('Ê', 'E')
    nome = nome.replace('Í', 'I').replace('Ó', 'O').replace('Ú', 'U')
    nome = nome.replace('Ç', 'C')
    return nome

def gerar_email(nome):
    """Gera email a partir do nome"""
    nome_limpo = re.sub(r'[^a-zA-Z\s]', '', nome.lower())
    partes = nome_limpo.split()
    if len(partes) >= 2:
        return f"{partes[0]}.{partes[-1]}@pili.ind.br"
    return f"{partes[0]}@pili.ind.br" if partes else "vendedor@pili.ind.br"

def gerar_login(nome):
    """Gera login a partir do nome"""
    nome_limpo = re.sub(r'[^a-zA-Z\s]', '', nome.lower())
    partes = nome_limpo.split()
    if len(partes) >= 2:
        return f"{partes[0]}.{partes[-1]}"
    return partes[0] if partes else "vendedor"

def main():
    print("=" * 68)
    print("    SINCRONIZANDO VENDEDORES E VINCULANDO PROPOSTAS")
    print("=" * 68)

    # Ler CSV
    csv_path = os.path.join(os.path.dirname(__file__), '..', 'docs',
                            'PROPOSTA COMERCIAL (respostas) - Respostas ao formulário 5 (2).csv')
    df = pd.read_csv(csv_path, encoding='utf-8')

    # Encontrar colunas
    vend_col = None
    num_col = None
    email_col = None

    for col in df.columns:
        if 'vendedor' in col.lower() and 'representante' in col.lower():
            vend_col = col
        if 'mero da proposta' in col.lower():
            num_col = col
        if 'e-mail do vendedor' in col.lower():
            email_col = col

    print(f"\nColunas encontradas:")
    print(f"  Vendedor: {vend_col}")
    print(f"  Numero: {num_col}")
    print(f"  Email: {email_col}")

    cursor = conn.cursor()

    try:
        # 1. Buscar vendedores existentes no banco
        cursor.execute("SELECT id, nome, email FROM crm_vendedores")
        vendedores_bd = {normalizar_nome(r[1]): {'id': r[0], 'nome': r[1], 'email': r[2]} for r in cursor.fetchall()}
        print(f"\nVendedores no banco: {len(vendedores_bd)}")

        # 2. Identificar vendedores unicos no CSV
        vendedores_csv = df[vend_col].dropna().unique()
        print(f"Vendedores no CSV: {len(vendedores_csv)}")

        # 3. Criar vendedores que nao existem
        vendedores_criados = 0
        mapa_vendedores = {}  # nome_normalizado -> vendedor_id

        for nome_csv in vendedores_csv:
            nome_norm = normalizar_nome(nome_csv)

            if nome_norm in vendedores_bd:
                mapa_vendedores[nome_norm] = vendedores_bd[nome_norm]['id']
            else:
                # Buscar email do CSV se existir
                email_csv = None
                if email_col:
                    emails = df[df[vend_col] == nome_csv][email_col].dropna()
                    if len(emails) > 0:
                        email_csv = emails.iloc[0]

                email = email_csv if email_csv else gerar_email(nome_csv)
                login = gerar_login(nome_csv)

                # Verificar se email ja existe
                cursor.execute("SELECT id FROM crm_vendedores WHERE email = %s", (email,))
                if cursor.fetchone():
                    # Email existe, adicionar numero
                    email = email.replace('@', f'{vendedores_criados+1}@')

                # Criar usuario primeiro
                cursor.execute("""
                    INSERT INTO usuarios (nome, login, email, senha, perfil, ativo)
                    VALUES (%s, %s, %s, '$2b$10$defaulthashforvendedor', 'vendedor', true)
                    ON CONFLICT (login) DO UPDATE SET nome = EXCLUDED.nome
                    RETURNING id
                """, (nome_csv, login, email))
                usuario_id = cursor.fetchone()[0]

                # Criar vendedor
                cursor.execute("""
                    INSERT INTO crm_vendedores (usuario_id, nome, email, ativo)
                    VALUES (%s, %s, %s, true)
                    ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome
                    RETURNING id
                """, (usuario_id, nome_csv, email))
                vendedor_id = cursor.fetchone()[0]

                mapa_vendedores[nome_norm] = vendedor_id
                vendedores_criados += 1
                print(f"  Criado: {nome_csv} -> ID {vendedor_id}")

        conn.commit()
        print(f"\nVendedores criados: {vendedores_criados}")

        # 4. Atualizar propostas com vendedor_id
        print("\nAtualizando propostas com vendedores...")

        df_valid = df[[vend_col, num_col]].dropna()
        df_valid[num_col] = pd.to_numeric(df_valid[num_col], errors='coerce')
        df_valid = df_valid.dropna()
        df_valid[num_col] = df_valid[num_col].astype(int)

        # Pegar ultima ocorrencia de cada proposta
        df_unique = df_valid.drop_duplicates(subset=[num_col], keep='last')

        atualizadas = 0
        nao_encontradas = 0

        for _, row in df_unique.iterrows():
            numero = int(row[num_col])
            vendedor_nome = row[vend_col]
            nome_norm = normalizar_nome(vendedor_nome)

            if nome_norm not in mapa_vendedores:
                continue

            vendedor_id = mapa_vendedores[nome_norm]

            # Atualizar proposta
            cursor.execute("""
                UPDATE crm_propostas
                SET vendedor_id = %s, updated_at = NOW()
                WHERE numero_proposta = %s
                RETURNING id
            """, (vendedor_id, numero))

            result = cursor.fetchone()
            if result:
                # Atualizar oportunidade tambem
                cursor.execute("""
                    UPDATE crm_oportunidades o
                    SET vendedor_id = %s, updated_at = NOW()
                    FROM crm_propostas p
                    WHERE p.oportunidade_id = o.id AND p.numero_proposta = %s
                """, (vendedor_id, numero))
                atualizadas += 1
            else:
                nao_encontradas += 1

        conn.commit()

        print("=" * 68)
        print(f"Propostas atualizadas: {atualizadas}")
        print(f"Nao encontradas: {nao_encontradas}")

        # 5. Verificar resultado
        print("\nPROPOSTAS POR VENDEDOR:")
        print("-" * 68)

        cursor.execute("""
            SELECT v.nome, COUNT(p.id) as total, SUM(p.valor_total) as valor
            FROM crm_vendedores v
            LEFT JOIN crm_propostas p ON p.vendedor_id = v.id
            GROUP BY v.id, v.nome
            HAVING COUNT(p.id) > 0
            ORDER BY total DESC
        """)

        for row in cursor.fetchall():
            valor = float(row[2]) if row[2] else 0
            print(f"   {row[0]:30} {row[1]:4} propostas - R$ {valor:>15,.2f}")

        print("\n" + "=" * 68)
        print("    SINCRONIZACAO DE VENDEDORES CONCLUIDA!")
        print("=" * 68)

    except Exception as e:
        conn.rollback()
        print(f"ERRO: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    main()
