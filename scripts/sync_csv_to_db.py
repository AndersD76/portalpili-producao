# -*- coding: utf-8 -*-
"""
Script para sincronizar dados do CSV do Forms com o banco de dados
"""
import pandas as pd
import psycopg2
import os
import sys

# Fix encoding Windows
sys.stdout.reconfigure(encoding='utf-8')

# Conexao
conn = psycopg2.connect(
    "postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"
)

# Mapeamento de situacao (com variantes de encoding)
MAPEAMENTO = {
    # Com acentos corretos
    'EM NEGOCIAÇÃO': ('EM_NEGOCIACAO', 'EM_NEGOCIACAO', 'ABERTA'),
    'EM ANÁLISE': ('EM_ANALISE', 'EM_ANALISE', 'ABERTA'),
    'SUBSTITUÍDO': ('SUBSTITUIDA', 'SUBSTITUIDO', 'ABERTA'),
    # Com encoding problemático (mojibake)
    'EM NEGOCIAÇÃO': ('EM_NEGOCIACAO', 'EM_NEGOCIACAO', 'ABERTA'),
    'EM ANÁLISE': ('EM_ANALISE', 'EM_ANALISE', 'ABERTA'),
    'SUBSTITUÍDO': ('SUBSTITUIDA', 'SUBSTITUIDO', 'ABERTA'),
    # Sem acentos
    'EM NEGOCIACAO': ('EM_NEGOCIACAO', 'EM_NEGOCIACAO', 'ABERTA'),
    'EM ANALISE': ('EM_ANALISE', 'EM_ANALISE', 'ABERTA'),
    'SUBSTITUIDO': ('SUBSTITUIDA', 'SUBSTITUIDO', 'ABERTA'),
    # Outros
    'FECHADA': ('FECHADA', 'FECHADA', 'GANHA'),
    'PERDIDA': ('PERDIDA', 'PERDIDA', 'PERDIDA'),
    'SUSPENSO': ('SUSPENSO', 'SUSPENSO', 'ABERTA'),
    'TESTE': ('TESTE', 'TESTE', 'ABERTA'),
}

def main():
    print("=" * 68)
    print("    SINCRONIZANDO CSV DO FORMS COM BANCO DE DADOS")
    print("=" * 68)

    # Ler CSV
    csv_path = os.path.join(os.path.dirname(__file__), '..', 'docs',
                            'PROPOSTA COMERCIAL (respostas) - Respostas ao formulário 5 (2).csv')

    df = pd.read_csv(csv_path, encoding='utf-8')
    print(f"\nCSV carregado: {len(df)} registros")

    # Filtrar apenas colunas relevantes
    df_valid = df[['Situacao', 'Numero da proposta']].copy() if 'Situacao' in df.columns else df[['Situa\xe7\xe3o', 'N\xfamero da proposta']].copy()

    # Tentar diferentes nomes de colunas
    sit_col = None
    num_col = None
    for col in df.columns:
        # Pegar a primeira coluna "Situacao" (nao "Situacao da proposta")
        if col.lower().strip() in ['situacao', 'situa\xe7\xe3o'] or col == df.columns[0]:
            if sit_col is None:  # Pegar apenas a primeira
                sit_col = col
        if 'mero da proposta' in col.lower() or 'numero da proposta' in col.lower():
            num_col = col

    # Fallback: primeira coluna geralmente e a situacao
    if sit_col is None:
        sit_col = df.columns[0]

    if not sit_col or not num_col:
        print(f"Colunas encontradas: {df.columns.tolist()}")
        return

    print(f"Usando colunas: {sit_col}, {num_col}")

    df_valid = df[[sit_col, num_col]].dropna(subset=[num_col])

    # Converter para int (pode ser float como 1.0, 2.0)
    df_valid[num_col] = pd.to_numeric(df_valid[num_col], errors='coerce')
    df_valid = df_valid.dropna(subset=[num_col])
    df_valid[num_col] = df_valid[num_col].astype(int)

    # Normalizar situacoes (remover acentos e variantes)
    def normalizar(s):
        if pd.isna(s):
            return ''
        s = str(s).upper().strip()
        # Normalizar variantes comuns
        s = s.replace('Ç', 'C').replace('Ã', 'A').replace('Á', 'A').replace('Í', 'I').replace('Ó', 'O')
        s = s.replace('ç', 'C').replace('ã', 'A').replace('á', 'A').replace('í', 'I').replace('ó', 'O')
        # Mojibake comum
        s = s.replace('Ã‡', 'C').replace('Ãƒ', 'A').replace('Ã', 'A').replace('Â', '')
        return s

    df_valid['situacao_norm'] = df_valid[sit_col].apply(normalizar)

    # Mapeamento normalizado
    MAP_NORM = {
        'EM NEGOCIACAO': ('EM_NEGOCIACAO', 'EM_NEGOCIACAO', 'ABERTA'),
        'EM ANALISE': ('EM_ANALISE', 'EM_ANALISE', 'ABERTA'),
        'FECHADA': ('FECHADA', 'FECHADA', 'GANHA'),
        'PERDIDA': ('PERDIDA', 'PERDIDA', 'PERDIDA'),
        'SUSPENSO': ('SUSPENSO', 'SUSPENSO', 'ABERTA'),
        'SUBSTITUIDO': ('SUBSTITUIDA', 'SUBSTITUIDO', 'ABERTA'),
        'TESTE': ('TESTE', 'TESTE', 'ABERTA'),
    }

    # Filtrar apenas situacoes validas
    situacoes_validas = list(MAP_NORM.keys())
    df_valid = df_valid[df_valid['situacao_norm'].isin(situacoes_validas)]

    # Pegar ultima ocorrencia de cada proposta
    df_unique = df_valid.drop_duplicates(subset=[num_col], keep='last')

    print(f"Propostas validas: {len(df_unique)}")

    # Contar situacoes
    print("\nSituacoes no CSV (normalizadas):")
    for sit, count in df_unique['situacao_norm'].value_counts().items():
        print(f"   {sit}: {count}")

    cursor = conn.cursor()

    try:
        print("\nAtualizando propostas...")

        atualizadas = 0
        nao_encontradas = 0

        for _, row in df_unique.iterrows():
            numero = int(row[num_col])
            situacao_norm = row['situacao_norm']

            if situacao_norm not in MAP_NORM:
                continue

            proposta_sit, estagio, status = MAP_NORM[situacao_norm]

            # Buscar proposta
            cursor.execute(
                "SELECT id, oportunidade_id, situacao FROM crm_propostas WHERE numero_proposta = %s",
                (numero,)
            )
            result = cursor.fetchone()

            if not result:
                nao_encontradas += 1
                continue

            proposta_id, oportunidade_id, situacao_atual = result

            # Atualizar proposta
            cursor.execute(
                "UPDATE crm_propostas SET situacao = %s, updated_at = NOW() WHERE id = %s",
                (proposta_sit, proposta_id)
            )

            # Atualizar oportunidade
            if oportunidade_id:
                cursor.execute(
                    "UPDATE crm_oportunidades SET estagio = %s, status = %s, updated_at = NOW() WHERE id = %s",
                    (estagio, status, oportunidade_id)
                )

            atualizadas += 1

        conn.commit()

        print("=" * 68)
        print(f"Propostas atualizadas: {atualizadas}")
        print(f"Nao encontradas: {nao_encontradas}")

        # Verificar resultado
        print("\nSITUACAO ATUAL NO BANCO:")
        print("-" * 68)

        cursor.execute("""
            SELECT situacao, COUNT(*) as total
            FROM crm_propostas
            GROUP BY situacao
            ORDER BY total DESC
        """)

        for row in cursor.fetchall():
            print(f"   {row[0]}: {row[1]}")

        # Pipeline
        print("\nPIPELINE ATUALIZADO:")
        print("-" * 68)

        cursor.execute("""
            SELECT estagio, status, COUNT(*) as total, SUM(valor_estimado) as valor
            FROM crm_oportunidades
            GROUP BY estagio, status
            ORDER BY
                CASE estagio
                    WHEN 'PROSPECCAO' THEN 1
                    WHEN 'QUALIFICACAO' THEN 2
                    WHEN 'PROPOSTA' THEN 3
                    WHEN 'EM_ANALISE' THEN 4
                    WHEN 'EM_NEGOCIACAO' THEN 5
                    WHEN 'FECHADA' THEN 6
                    WHEN 'PERDIDA' THEN 7
                    WHEN 'SUSPENSO' THEN 8
                    WHEN 'SUBSTITUIDO' THEN 9
                    WHEN 'TESTE' THEN 10
                END
        """)

        for row in cursor.fetchall():
            valor = float(row[3]) if row[3] else 0
            print(f"   {row[0]:15} ({row[1]:10}): {row[2]:4} - R$ {valor:,.2f}")

        print("\n" + "=" * 68)
        print("    SINCRONIZACAO CONCLUIDA!")
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
