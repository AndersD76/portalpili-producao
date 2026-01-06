# Instruções para Implementação - Sistema de CQ de Produção

## Visão Geral

Este documento contém as especificações para implementar um sistema de Controle de Qualidade (CQ) de Produção para equipamentos industriais (Tombadores e Coletores de Grãos).

## Estrutura do Sistema

### 1. Fluxo Principal

```
IDENTIFICAÇÃO
    ↓
EQUIPAMENTO (Tombadores / Coletores)
    ↓
PROCESSO (A, B, C, D... ou Ac, Bc, Cc...)
    ↓
ITENS DE VERIFICAÇÃO (CQ1, CQ2, CQ3...)
    ↓
CONDIÇÃO FINAL
    ↓
REGISTRO (Conformidade ou RNC)
```

### 2. Equipamentos

#### TOMBADORES DE GRÃOS (22 processos)
| Código | Processo | Descrição |
|--------|----------|-----------|
| A | CORTE | Corte das vigas |
| B | MONTAGEM SUPERIOR E ESQUADRO | Montagem inicial e esquadro |
| C | CENTRAL HIDRÁULICA | Setor Hidráulica |
| D | SOLDA LADO 01 | Soldagem lado 1 |
| E | SOLDA LADO 02 | Soldagem lado 2 |
| F | MONTAGEM E SOLDA INFERIOR | Montagem inferior |
| G | MONTAGEM ELÉTRICA/HIDRÁULICO | Instalações |
| H | MONTAGEM DAS CALHAS | Calhas |
| I | TRAVADOR DE RODAS LATERAL MÓVEL | Trava rodas |
| J | CAIXA DO TRAVA CHASSI | Caixa trava |
| K | TRAVA CHASSI | Sistema trava chassi |
| L | CAVALETE DO TRAVA CHASSI | Cavalete |
| M | CENTRAL HIDRÁULICA | Setor Subconjuntos |
| N | PAINEL ELÉTRICO | Painel elétrico |
| O | PEDESTAIS | Pedestais |
| P | SOB PLATAFORMA | Instalações sob plataforma |
| Q | SOLDA INFERIOR | Soldagem inferior |
| R | BRAÇOS | Braços mecânicos |
| S | RAMPAS | Rampas |
| T | PINTURA E PREPARAÇÃO | Pintura da plataforma |
| U | MONTAGEM HIDRÁULICA ELÉTRICA | Sob plataforma |
| V | EXPEDIÇÃO | Expedição final |

#### COLETORES DE GRÃOS (8 processos)
| Código | Processo | Descrição |
|--------|----------|-----------|
| Ac | MONTAGEM INICIAL | Montagem inicial |
| Bc | CENTRAL HIDRÁULICA | Central hidráulica |
| Cc | CICLONE | Ciclone |
| Dc | TUBO DE COLETA | Tubo de coleta |
| Ec | COLUNA INFERIOR | Coluna inferior |
| Fc | COLUNA SUPERIOR | Coluna superior |
| Gc | ESCADA, PLATIBANDA E GUARDA CORPO | Acessórios |
| Hc | PINTURA | Pintura |

## Estrutura dos Itens de CQ

Cada item de verificação contém:

```typescript
interface ItemCQ {
  codigo: string;           // Ex: "CQ1-A", "CQ2-B"
  titulo: string;           // Descrição do item
  etapa_processo: string;   // VIGA, MONTAGEM, SOLDA, PINTURA, etc.
  avaliacao: string;        // "100%" ou "Total"
  medida_critica: string;   // O que medir
  metodo_verificacao: string; // Visual, Dimensional, Funcional
  instrumento_medicao: string; // Trena, Esquadro, Torquímetro, etc.
  criterios_aceitacao: string; // +/- 5mm, Sem trinca, Conforme desenho
  tipo_resposta: "selecao_unica" | "texto" | "data" | "arquivo";
  opcoes?: string[];        // ["Conforme", "Não conforme", "Não Aplicável"]
  requer_imagem: boolean;
  label_imagem?: string;
}
```

## Tipos de Campos

### 1. Seleção Única (Radio Buttons)
```html
<fieldset>
  <legend>CONDIÇÃO DO CQ1-A</legend>
  <label><input type="radio" name="cq1_a" value="Conforme"> Conforme</label>
  <label><input type="radio" name="cq1_a" value="Não conforme"> Não conforme</label>
</fieldset>
```

### 2. Seleção com "Não Aplicável"
```html
<fieldset>
  <legend>CONDIÇÃO DO CQ9-B</legend>
  <label><input type="radio" name="cq9_b" value="Conforme"> Conforme</label>
  <label><input type="radio" name="cq9_b" value="Não Conforme"> Não Conforme</label>
  <label><input type="radio" name="cq9_b" value="Não Aplicável"> Não Aplicável</label>
</fieldset>
```

### 3. Texto
```html
<label>NÚMERO DA OPD: *
  <input type="text" name="opd" required>
</label>
```

### 4. Data
```html
<label>DATA DA CONFERÊNCIA:
  <input type="date" name="data_conferencia" required>
</label>
```

### 5. Upload de Imagem
```html
<label>ANEXAR IMAGEM DA IDENTIFICAÇÃO DAS VIGAS
  <input type="file" name="imagem_cq3_a" accept="image/*">
</label>
```

## Critérios de Aceitação Comuns

| Tipo | Exemplos |
|------|----------|
| Dimensional | +/- 5mm, +/- 10mm, +/- 1 grau |
| Visual | Sem trinca, Sem porosidade, Conforme desenho |
| Funcional | Ventoinha girar, Pino funcionar, Tampa movimentar |
| Pressão | 30 BAR +/- 10 BAR, 55 BAR +/- 10 BAR |

## Métodos de Verificação

1. **Visual** - Inspeção visual direta
2. **Dimensional** - Medição com instrumentos
3. **Funcional** - Teste de funcionamento

## Instrumentos de Medição

- Trena
- Esquadro
- Gabarito
- Torquímetro
- Barômetro
- Cronômetro
- N/A (para verificação visual)

## Navegação Condicional (Pulos)

O formulário original usa lógica de pulos baseada nas respostas:

```javascript
// Exemplo de lógica de navegação
if (equipamento === "TOMBADORES") {
  // Mostrar processos A-V
  mostrarProcessosTombadores();
} else if (equipamento === "COLETORES") {
  // Mostrar processos Ac-Hc
  mostrarProcessosColetores();
}

// Condição Final
if (condicaoFinal === "Conforme") {
  irParaRegistroConformidade();
} else {
  irParaRegistroRNC();
}
```

## Banco de Dados Sugerido

### Tabelas

```sql
-- Tabela de OPDs
CREATE TABLE opds (
  id SERIAL PRIMARY KEY,
  numero_opd VARCHAR(50) UNIQUE NOT NULL,
  equipamento ENUM('TOMBADORES', 'COLETORES') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Verificações
CREATE TABLE verificacoes (
  id SERIAL PRIMARY KEY,
  opd_id INTEGER REFERENCES opds(id),
  processo VARCHAR(2) NOT NULL,
  codigo_cq VARCHAR(20) NOT NULL,
  condicao ENUM('Conforme', 'Não conforme', 'Não Aplicável'),
  imagem_url VARCHAR(500),
  observacao TEXT,
  verificado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verificado_por VARCHAR(100)
);

-- Tabela de Condições Finais
CREATE TABLE condicoes_finais (
  id SERIAL PRIMARY KEY,
  opd_id INTEGER REFERENCES opds(id),
  processo VARCHAR(2) NOT NULL,
  condicao ENUM('Conforme', 'Não conforme') NOT NULL,
  data_conferencia DATE NOT NULL,
  conferente VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints Sugeridos

```
POST /api/opd                    # Criar nova OPD
GET  /api/opd/:numero            # Buscar OPD
POST /api/verificacao            # Registrar verificação
POST /api/verificacao/imagem     # Upload de imagem
POST /api/condicao-final         # Registrar condição final
GET  /api/relatorio/:opd         # Gerar relatório
```

## Tecnologias Recomendadas

### Frontend
- React/Next.js com TypeScript
- Tailwind CSS para estilos
- React Hook Form para formulários
- Zod para validação

### Backend
- Node.js/Express ou Next.js API Routes
- PostgreSQL ou Supabase
- Cloudinary ou AWS S3 para imagens

### Mobile (Alternativa)
- React Native ou Flutter
- Supabase para backend

## Implementação por Fases

### Fase 1 - MVP
1. Formulário básico com identificação
2. Seleção de equipamento e processo
3. Itens de verificação (apenas texto)
4. Condição final

### Fase 2 - Completo
1. Upload de imagens
2. Navegação condicional completa
3. Relatórios em PDF
4. Dashboard de acompanhamento

### Fase 3 - Avançado
1. Integração com sistema ERP
2. Notificações automáticas
3. Histórico e rastreabilidade
4. App mobile offline-first

## Arquivo de Dados

O arquivo `cq_producao_formularios.json` contém a estrutura completa de todos os formulários em formato JSON, pronto para ser importado em qualquer sistema.

## Observações Importantes

1. **Campos obrigatórios**: Todos os campos marcados com `*` são obrigatórios
2. **Imagens**: Sempre que `requer_imagem: true`, o upload é esperado
3. **RNC**: Quando condição final é "Não conforme", redirecionar para registro de não conformidade
4. **Validação**: Verificar se todos os itens foram preenchidos antes de liberar condição final
