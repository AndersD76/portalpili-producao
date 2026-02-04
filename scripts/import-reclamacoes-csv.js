// Script para importar reclamações de cliente do CSV
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

// Dados extraídos do CSV
const reclamacoes = [
  {
    data_emissao: '02/02/2024',
    emitente: 'Clarice Picoli',
    cliente: 'Olfar',
    opd: '06/2023',
    nf: '8345',
    equipamento: 'PP9030 301 7923 - Tombador 30 M',
    local: 'Porangatu/GO',
    descricao: 'Problema na montagem para colocação dos "U\'s" dos travas chassis',
    acao_imediata: 'Ajustados pelos técnicos de montagem os "U\'s" para realizar a montagem',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '07/02/2024',
    emitente: 'Luiz Dembinski',
    cliente: 'Olfar',
    opd: '06/2023',
    nf: '8345',
    equipamento: 'PP9030 301 7923 - Tombador 30 M',
    local: 'Porangatu GO',
    descricao: 'Ligação elétrica passada por parte da engenharia da Pili não estava funcionando para fazer a ligação nas fechaduras do tombador.',
    acao_imediata: 'Leandro Gerente Industria (elétrica) solicitou orientações explicativas sobre problema ocorrido para solução do mesmo.',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '13/02/2024',
    emitente: 'Clarice Picoli (Júlio)',
    cliente: 'Olfar',
    opd: '07/2023',
    nf: '8373',
    equipamento: 'PP9030 301 7923 - Tombador 30 M',
    local: 'Porangatu GO',
    descricao: 'No teste de um trava pino do tombador 2 foi constado dois vazamento nas soldas da tubulação parte hidráulica montada na empresa.',
    acao_imediata: 'Técnicos fizeram os ajustes necessários para eliminar em zero os vazamentos.',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '15/02/2024',
    emitente: 'Clarice Picoli (Júlio)',
    cliente: 'Olfar',
    opd: '07/2023',
    nf: '8373',
    equipamento: 'PP9030 301 7923 - Tombador 30 M',
    local: 'Porangatu GO',
    descricao: 'Retirado os cabeçotes dos 2 trava pinos tendo que cortar a parte de dentro, pois estavam pegando nas calhas e as danificando.',
    acao_imediata: 'Remoção dos cabeçotes pelos técnicos já fazendo ajustes necessários e reposicionado de volta corretamente.',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '15/02/2024',
    emitente: 'Clarice Picoli (Júlio)',
    cliente: 'Olfar',
    opd: '07/2023',
    nf: '8373',
    equipamento: 'PP9030 301 7923 - Tombador 30 M',
    local: 'Porangatu GO',
    descricao: 'Calço mecânico do tombador 2 fora de alinhamento na base de encaixe.',
    acao_imediata: 'Técnicos fizeram a remoção do calço alinhando ele e fixando novamente.',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '19/02/2024',
    emitente: 'Clarice Picoli (Júlio)',
    cliente: 'Olfar',
    opd: '06/2023',
    nf: '8345',
    equipamento: 'PP9030 301 7923 - Tombador 30 M',
    local: 'Porangatu GO',
    descricao: 'Excesso de comprimento das mangueiras do trava chassis do equipamento tombador 1.',
    acao_imediata: 'Realizados os recortes necessário nas mangueiras para ajustes. A mangueira maior ajustada ficando com 5,50, A mangueira menor ajustada ficando com 4,30. OBS: repassar a engenharia estas medidas ajustadas para análise e possível alteração em projeto.',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '19/02/2024',
    emitente: 'Clarice Picoli (Júlio)',
    cliente: 'Olfar',
    opd: '07/2023',
    nf: '8373',
    equipamento: 'PP9030 301 7923 - Tombador 30 M',
    local: 'Porangatu GO',
    descricao: 'Excesso de comprimento das mangueiras do trava chassis do equipamento tombador 2.',
    acao_imediata: 'Realizados os recortes necessário nas mangueiras para ajustes da seguinte forma: A mangueira maior ajustada ficando com 5,50, A mangueira menor ajustada ficando com 4,30.',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '19/02/2024',
    emitente: 'Clarice Picoli (Júlio)',
    cliente: 'Olfar',
    opd: '08/2023',
    nf: '8390',
    equipamento: 'PP9030 301 7923 - Tombador 30 M',
    local: 'Porangatu GO',
    descricao: 'Excesso de comprimento das mangueiras do trava chassis do equipamento tombador 3.',
    acao_imediata: 'Realizados os recortes necessário nas mangueiras para ajustes.',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '19/02/2024',
    emitente: 'Clarice Picoli (Júlio)',
    cliente: 'Olfar',
    opd: '06/2023',
    nf: '8345',
    equipamento: 'PP9030 301 7923 - Tombador 30 M',
    local: 'Porangatu GO',
    descricao: 'Foi constado em um dos cilindros do trava pino que há uma marca na haste.',
    acao_imediata: 'Utilizado um disco flap e polido a marca na haste para evitar que corte o reparo e ocorra vazamentos.',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '20/02/2024',
    emitente: 'Téc Dalvo Krabbe',
    cliente: 'DoPlantio',
    opd: '91/2020',
    nf: '8542',
    equipamento: 'PP310 M TOMBADOR 11 M',
    local: 'CAMPO ERE SC',
    descricao: 'Falta do pino, das buchas, anel elástico e mão francesas da rampa do tombador.',
    acao_imediata: 'Solicitado a engenharia o desenho das peças, direcionado a fabrica para usinar as mesmas e enviado ao técnico para substituição in loco.',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '21/02/2024',
    emitente: 'Téc Dalvo Krabbe',
    cliente: 'Doplantio',
    opd: '91/2020',
    nf: '8542',
    equipamento: 'PP310 M TOMBADOR 11 M',
    local: 'CAMPO ERE SC',
    descricao: 'Válvula do bloco de controle das rampas com medida de bitolas diferente das demais não conseguindo realizar a conexão da mangueira hidráulica.',
    acao_imediata: 'Separado as conexões exatas e enviado por transportadora para os técnicos fazerem a substituição.',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '06/03/2024',
    emitente: 'Clarice Picoli',
    cliente: 'EDISON FUGIURA',
    opd: '00/2018',
    nf: '4878',
    equipamento: 'PLATAFORMA HIDR. TOMBADOR 18 M CILINDROS EXTERNOS FIXO-PP9021-3017923',
    local: 'AGUAS DE SANTA BARBARA SP',
    descricao: 'CJ CILINDRO ARTICULAÇÃO TRAVA CHASSI DANIFICOU',
    acao_imediata: 'Vendedor solicitou a produção de um cilindro novo a fábrica o qual já foi produzido e enviado ao cliente.',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '12/03/2024',
    emitente: 'Clarice Picoli',
    cliente: 'INTERFAST SERVICOS E ARMAZENAMENTO LTDA',
    opd: '58/2022',
    nf: '7624',
    equipamento: 'PLATAFORMA HIDR. TOMBADOR 26M CILINDRO INTERNO 3 CILINDROS 2 TRAVA CHASSI FIXO-PP9026 Finame(3468029)',
    local: 'UBERLANDIA MG',
    descricao: 'Rompimento da solda na ponta do cilindo com a ligação do equipamento.',
    acao_imediata: 'Já foi direcionado a equipe de manutenção da Pili para fazer a solda consertando o cilindro e instalado novamente no equipamento.',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '15/03/2024',
    emitente: 'Robson Bortoloso',
    cliente: 'Doplantio Com. Produtos Agricolas Ltda',
    opd: '91/20',
    nf: '8542',
    equipamento: 'PLATAFORMA HIDR. TOMBADOR 11 M MOVEL 40 TON PP310M',
    local: 'Campo Ere SC',
    descricao: 'Rompimento das buchas e dobradiças da rampa do tombador junto a plataforma e desalinhamento dos gonzos da chapa de articulação.',
    acao_imediata: 'Foi encaminhado ao cliente novas buchas, dobradiças e pinos para substituição dos mesmos feito pelo técnico da Pili que estava em deslocamento, ajustando tbm o alinhamento dos gonzos.',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '20/03/2024',
    emitente: 'Clarice Picoli',
    cliente: 'COOPERCITRUS COOP DE PRODUTORES RURAIS',
    opd: '65/2023',
    nf: '8496',
    equipamento: 'CONJ COLETOR DE GRÃOS TRADICIONAL ( MODELO - CP 3000 ) ( finame 3472369 )',
    local: 'SANTA CRUZ DAS PALMEIRAS SP',
    descricao: 'No dia da instalação do equipamento a mangueira de sucção do ciclone estava amassada e com pequeno corte em determinado ponto.',
    acao_imediata: 'Foi feito um remendo na mangueira no dia da instalação e posteriormente foi enviado uma mangueira nova para o equipamento e o técnico Pili passou fazer a substituição da mesma!',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '25/03/2024',
    emitente: 'Clarice Picoli',
    cliente: 'Ouro safra',
    opd: '31/2022',
    nf: '7841',
    equipamento: 'Tombador móvel 21 mt',
    local: 'Unai-MG',
    descricao: 'Problema elétrico na soft start, sensor de 40graus não operava descordo depois de cortar o sinal fica tentando acionar os relê',
    acao_imediata: 'Em contato com o Luíz Dembinski e o Leandro foi constatado que a soft não está funcionando e essa já foi substituída anteriormente nesse mesmo equipamento e segundo o Leandro foi azar do cliente',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '08/04/2024',
    emitente: 'Clarice Picoli',
    cliente: 'Coopercitrus',
    opd: '65/2022',
    nf: '8491',
    equipamento: 'Coletor de amostras',
    local: 'Santa Cruz das Palmeiras',
    descricao: 'Mangueira - O cliente encurtou porém não abre todo o curso do braço',
    acao_imediata: 'Enviar mangueira por transportadora urgente o cliente fará a substituição',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '06/03/2024',
    emitente: 'Daniel Elzinga',
    cliente: 'Ype Arm. Gerais',
    opd: '81/2023',
    nf: '8481',
    equipamento: 'Coletor de Grãos CP 3000',
    local: 'Montividiu GO',
    descricao: 'Apresentou vazamento no retentor do pistão central, vasa no movimento da calagem.',
    acao_imediata: 'Foi disponibilizado um cilindro novo ao cliente junto com a equipe técnica da filial de MG para substituir o cilindro, serviço realizado.',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '15/04/2024',
    emitente: 'CLARICE PICOLI',
    cliente: 'YPE ARMAZENS GERAIS LTDA',
    opd: '81/2023',
    nf: '8481',
    equipamento: 'COLETOR DE AMOSTRAS',
    local: 'MONTIVIDIU - GO',
    descricao: 'TUBO DE COLETA FALTANDO UMA SOLDA INTERNA. VAZAMENTO NO CILINDRO DE ELEVAÇÃO (para finalizar a safra o cliente apertou varias vezes a tampa hidráulica). PÉSSIMA PREPARAÇÃO DA CHAPA (soltando a tinta)',
    acao_imediata: 'FAZER A SOLDA NO CLIENTE. SUBSTITUIDO O CILINDRO',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '23/04/2024',
    emitente: 'Ricardo Foletto',
    cliente: 'Doplantio Com Prod. Agricolas',
    opd: '91/2020',
    nf: '8542',
    equipamento: 'PP3510M',
    local: 'Campo Ere SC',
    descricao: 'O cliente relatou que os técnicos tiveram dificuldades em montar o equipamento por causa de divergências do projeto civil, tendo poucas informações detalhadas e claras a respeito demostrando pouco conhecimento na parte da montagem do equipamento.',
    acao_imediata: 'Os técnicos solicitaram aos responsáveis da empresa as informações exatas e específicas para a montagem correta do equipamento.',
    garantia: false,
    procede: false,
    rac: null
  },
  {
    data_emissao: '15/05/2024',
    emitente: 'Ricardo Foletto',
    cliente: 'MEGA CHIP\'S INDUSTRIA E COMERCIO LTDA',
    opd: '72/2023',
    nf: '8665',
    equipamento: 'PP4011',
    local: 'Contagem MG',
    descricao: 'O cliente relatou que os técnicos tiveram dificuldades em montar o equipamento por causa de divergências do projeto civil, tendo poucas informações detalhadas e claras a respeito demostrando pouco conhecimento na parte da montagem do equipamento.',
    acao_imediata: 'Os técnicos solicitaram aos responsáveis da empresa as informações exatas e específicas para a montagem correta do equipamento.',
    garantia: false,
    procede: false,
    rac: null
  },
  {
    data_emissao: '21/06/2024',
    emitente: 'Clarice Picoli',
    cliente: 'EIJI MATSUSHITA',
    opd: '000076/2023',
    nf: '8469',
    equipamento: 'coletor de amostras tradicional',
    local: 'Pilar do Sul - SP',
    descricao: 'Péssimo acabamento. Equipamento não tinha a furação e graxeira de lubrificação da torre (falha de fabricação recorrente), sem chaveta no pino da sonda, soldas sem retoque nenhum de pintura.',
    acao_imediata: 'Equipe técnica da filial de Uberlândia fez as correção, inclusive esse equipamento não tinha a furação e graxeira de lubrificação da torre.',
    garantia: false,
    procede: true,
    rac: '22'
  },
  {
    data_emissao: '29/06/2024',
    emitente: 'Clarice Picoli',
    cliente: 'SIPAL INDUSTRIA E COMERCIO LTDA',
    opd: 'SERIE 1401',
    nf: '8383',
    equipamento: 'CP3000',
    local: 'SIPAL em Campos de Julio - MT',
    descricao: 'cilindro de elevação não aciona. Foi constatado que o embolo se soltou da haste por falta de travamento.',
    acao_imediata: 'Filial de Sinop deslocou um técnico com cilindro reserva para o atendimento rápido (base de troca).',
    garantia: false,
    procede: true,
    rac: '20'
  },
  {
    data_emissao: '02/08/2024',
    emitente: 'Ricardo Foletto',
    cliente: 'CEREALISTA RIGON E CERETTA LTDA',
    opd: '0000912022',
    nf: '007956',
    equipamento: null,
    local: 'SEBERI RS',
    descricao: 'Desplacamento da Pintura, quebrou o tubo do coletor',
    acao_imediata: 'O Sr Luis representante da região, solicitou a análise de refazer a pintura pois desplacou, e o tubo de coleta está quebrado, precisamos enviar o quanto antes outro tubo e definirmos se vamos dar garantia.',
    garantia: false,
    procede: true,
    rac: null
  },
  {
    data_emissao: '12/09/2024',
    emitente: 'RICARDO FOLETTO',
    cliente: 'PALAGRO COMERCIO E SERVIÇOS DE PRODUTOS AGRICOLAS DE PALMEIRA',
    opd: '42/2023',
    nf: '008689',
    equipamento: null,
    local: 'PALMEIRA PR',
    descricao: 'Cliente: Darlei, Gerente da Palagro - Nota: 03 - Projeto elétrico parece amador. Painel elétrico fora das normas, difícil de acessar. Falta de melhorias solicitadas por anos. Dificuldade de comunicação. Falta de proatividade. Possível ruptura comercial. Problemas com atendimento do engenheiro Giovani.',
    acao_imediata: 'Repassado para a direção, para tratativa de plano de ação e melhoria continua.',
    garantia: false,
    procede: true,
    rac: '19'
  },
  {
    data_emissao: '19/11/2024',
    emitente: 'RICARDO FOLETTO',
    cliente: 'PILI',
    opd: '20',
    nf: '2020',
    equipamento: 'PP10030',
    local: 'ERECHIM/RS',
    descricao: 'TRAVA CHASSI, NÃO ACIONA APÓS APERTAR O BOTÃO NO CONTROLE',
    acao_imediata: '1',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '09/12/2024',
    emitente: 'Ederson Rodrigues da Silva',
    cliente: 'TIGRE ARMAZENS GERAIS LTDA',
    opd: '000016/2024',
    nf: '008922',
    equipamento: 'PP9030',
    local: 'CLAUDIA MT',
    descricao: 'Varadas laterais tortas e avariadas, emendas na varanda mal feitas, solda mal feita na emenda do trilho do assoalho.',
    acao_imediata: 'Encaminhado para tomada de ação gestores da fábrica Cristiano, Douglas, Rodrigo e Fernando.',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '10/12/2024',
    emitente: 'RICARDO FOLETTO',
    cliente: 'TIGRE ARMAZENS GERAIS LTDA',
    opd: '000016/2024',
    nf: '008922',
    equipamento: 'PP9030',
    local: 'CLAUDIA - MT',
    descricao: 'Técnicos sem capacidade de descarregar. Equipamento mal montado. Solda porca, sem limpar e mal soldado. Sensor soldado ao invés de parafusado. Respingaram solda em cilindro. Varandas laterais tortas, não encaixam e com ferrugem.',
    acao_imediata: 'Fernanda Qualidade criar plano de ação com todas as áreas',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '16/12/2024',
    emitente: 'LUIS ALBERTO ROOS',
    cliente: 'CASA DE COMERCIO POVEDA C. LTDA',
    opd: '0000472023',
    nf: '008400',
    equipamento: null,
    local: 'EQUADOR',
    descricao: 'Produto adquirido e entregue em 2023, foram montar apenas agora, e não consta no carregamento os chumbadores, precisar ser enviado os mesmos, ou os projetos para orçar por lá com urgência.',
    acao_imediata: 'Qualidade fazer plano de ação.',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '03/02/2025',
    emitente: 'Wagner Barbosa dos Reis',
    cliente: 'GIRASSOL AGRICOLA LTDA',
    opd: '0000792024',
    nf: '009023',
    equipamento: null,
    local: 'Torixoreu - MT',
    descricao: 'Coletor Foi instalado em Janeiro de 2025 e está balançando muito, cliente está com medo que vai quebrar.',
    acao_imediata: 'Qualidade Pili',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '03/02/2025',
    emitente: 'Vinicius Cieslak Mota',
    cliente: 'ADM ENGENHARIA',
    opd: '0000762024',
    nf: null,
    equipamento: null,
    local: 'LAGUNA CARAPÃ MS',
    descricao: 'Enviamos kit chumbador e faltou 2 unidades do código 13807',
    acao_imediata: 'Engenharia, Comercial, Produção e qualidade',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '28/02/2025',
    emitente: 'RICARDO FOLETTO',
    cliente: 'ADM ENGENHARIA - GRUPO PRIMATO',
    opd: '68/2024',
    nf: null,
    equipamento: null,
    local: 'VERA CRUZ',
    descricao: 'Anderson Mariano encarregado operacional contatou a pili reclamando que não estão conseguindo utilizar o coletor pois está trancando os grãos, coletor que foi com 3 polegadas, o necessário para a utilização do cliente é para 4 polegadas, pois eles coletam milho com sabugo. Coletor está embuchando na coleta de soja também.',
    acao_imediata: 'Comercial - Engenharia',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '25/04/2025',
    emitente: 'Graziela dos Anjos',
    cliente: 'CORADINI ALIMENTOS LTDA',
    opd: '45/2022',
    nf: null,
    equipamento: 'PP9021',
    local: 'DOM PEDRITO RS',
    descricao: 'TOMBADOR ESTÁ DANDO ESTALOS E NÃO ERGUE O SUFICIENTE',
    acao_imediata: 'LIGAR PARA O CLIENTE',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '07/05/2025',
    emitente: '023098 PEDRA BRILHANTE TRADING DE GRAOS LTDA',
    cliente: '023098 PEDRA BRILHANTE TRADING DE GRAOS LTDA',
    opd: '70/2024',
    nf: '8912',
    equipamento: 'CP 3000',
    local: 'SÃO MIGUEL DO OESTE/ SC',
    descricao: 'Calador está com vazamento de óleo e soprando muito;',
    acao_imediata: 'Entrar em contato com o cliente para entender o que está acontecendo e verificar a necessidade de enviar uma equipe técnica ou não para reparar o ocorrido. Telefone de contato 44 9929-7850 DOUGLAS',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '15/05/2025',
    emitente: 'Graziela dos Anjos',
    cliente: 'OLFAR S/A – ALIMENTO E ENERGIA',
    opd: '000006/2023',
    nf: null,
    equipamento: 'PP9030',
    local: 'PORANGATU GO',
    descricao: 'Na montagem do tombador em Porangatu foram feitas várias emendas nas instalações elétricas;',
    acao_imediata: 'Não encontrei informações via sistema de como foi resolvido o problema.',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '15/05/2025',
    emitente: 'Graziela dos Anjos',
    cliente: 'ADM ENGENHARIA LTDA',
    opd: '000066/2024',
    nf: null,
    equipamento: 'PP9021',
    local: 'Vera Cruz do Oeste - PR',
    descricao: 'PROJETO CIVIL DIVERGENTE DA ESTRUTURA - Foi passado um projeto executivo de civil o qual não está compatibilizado com o equipamento. As medidas de alojamento do equipamento, tinha um nível para ser seguido, mas quando foi instalado o equipamento ficou acima do piso. Foi preciso retrabalhar os pontos de base do equipamento quebrando estrutura já concretada.',
    acao_imediata: 'Os problemas não foram resolvidos;',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '15/05/2025',
    emitente: 'Graziela dos Anjos',
    cliente: 'ADM ENGENHARIA LTDA',
    opd: '000066/2024',
    nf: null,
    equipamento: 'PP9021',
    local: 'Vera Cruz do Oeste - PR',
    descricao: 'ENVIADO CHUMBADORES A MENOS PARA CLIENTE (ADM-UDG) - Foi enviado anteriormente, os chumbadores que são concretados junto com a viga. Quando a equipe foi pegar os chumbadores, estava faltando um e não dava tempo para esperar e enviar.',
    acao_imediata: 'Foi pego um de outra obra para não perder a janela de execução.',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '15/05/2025',
    emitente: 'Graziela dos Anjos',
    cliente: 'ADM ENGENHARIA LTDA',
    opd: '000067/2024',
    nf: null,
    equipamento: 'PP310',
    local: 'Vera Cruz do Oeste - PR',
    descricao: 'VAZAMENTO NO EQUIPAMENTO (ADM-UDG) - Tivemos problemas de vazamento, e paralização do funcionamento dos equipamentos.',
    acao_imediata: 'Fomos atendimento prontamente e na semana seguinte e o problema foi solucionado.',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '15/05/2025',
    emitente: 'Graziela dos Anjos',
    cliente: 'COOPERATIVA AGRICOLA JAGUARI LTDA - COAGRIJAL',
    opd: '000092/2024',
    nf: 'PEDIDO 000778/2024',
    equipamento: null,
    local: 'JAGUARI/RS',
    descricao: 'FALTA DE INFORMAÇÃO SOBRE A DESCARGA DO EQUIPAMENTO (COAGRIJAL) - O pessoal da Coagrijal reclamou que não sabia que precisaria do Guindaste para descarga e movimentação do tombador;',
    acao_imediata: 'Foi ajustado no dia mesmo.',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '15/05/2025',
    emitente: 'Graziela dos Anjos',
    cliente: 'OLFAR S/A – ALIMENTO E ENERGIA',
    opd: '000007/2023',
    nf: null,
    equipamento: 'PP9030',
    local: 'PORANGATU/GO',
    descricao: 'DURABILIDADE PEÇAS – TRAVA RODAS (OLFAR) - Reclamaram da durabilidade e a robustez da peça – pediram algo mais forte;',
    acao_imediata: 'VERIFICAR AÇÃO COM COMPRAS',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '15/05/2025',
    emitente: 'Graziela dos Anjos',
    cliente: 'ADM ENGENHARIA LTDA',
    opd: '000067/2024',
    nf: null,
    equipamento: 'PP310',
    local: 'Vera Cruz do Oeste - PR',
    descricao: 'Problema com quadro elétrico e um componente do mesmo.',
    acao_imediata: 'Fomos atendimento prontamente e na semana seguinte e o problema foi solucionado.',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '15/05/2025',
    emitente: 'Graziela dos Anjos',
    cliente: 'OLFAR S/A – ALIMENTO E ENERGIA',
    opd: '000008/2023',
    nf: null,
    equipamento: 'PP9030',
    local: 'PORANGATU/GO',
    descricao: 'COMERCIAL - Refazer o layout de propostas técnico/comercial de seus produtos e serviços de forma a deixar claro as obrigações da Pili e as do Cliente; Adotar padrão de propostas no formato .PDF e não editável.',
    acao_imediata: 'Proposta está em alteração',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '15/05/2025',
    emitente: 'Graziela dos Anjos',
    cliente: 'OLFAR S/A – ALIMENTO E ENERGIA',
    opd: '000007/2023',
    nf: null,
    equipamento: 'PP9030',
    local: 'PORUNGATU/GO',
    descricao: 'CRONOGRAMA - Enviar cronograma macro preliminar de fornecimento com as principais etapas da evolução do escopo;',
    acao_imediata: 'A fazer',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '15/05/2025',
    emitente: 'Graziela dos Anjos',
    cliente: 'OURO SAFRA INDUSTRIA E COMERCIO LTDA',
    opd: 'PP8021',
    nf: '000035/2024',
    equipamento: null,
    local: 'CAMPO FLORIDO/MG',
    descricao: 'Treinamento breve',
    acao_imediata: 'Necessário padronizar o treinamento',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '20/05/2025',
    emitente: 'Graziela dos Anjos',
    cliente: 'ROSSATO E TONIAL LTDA',
    opd: '000075/2024',
    nf: '9145',
    equipamento: 'PP8018',
    local: 'COXILHA RS',
    descricao: 'VAZAMENTO NOS PISTÕES; PARTE DE BAIXO DO TOMBADOR PRECISA SER AJUSTADO; PLATAFORMA LEVANTA PENDENDO P/ UM LADO',
    acao_imediata: 'TÉCNICOS RESOLVERAM AS QUESTÕES - FALTA SOMENTE O AJUSTE EMBAIXO DO TOMBADOR',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '21/05/2025',
    emitente: 'Graziela dos Anjos',
    cliente: 'AMAGGI EXPORTAÇÃO E IMPORTAÇÃO LTDA',
    opd: '000009/2024',
    nf: '8840',
    equipamento: 'PP9030',
    local: 'PARANATINGA/MT',
    descricao: 'Equipe desorganizada, ficaram várias pequenas pendências da montagem pra arrumar; Teve uma solda que arrebentou, os sensores não atuaram por falha de instalação e o tanque da UH tinha resíduos de aço e sujeira dentro; O setor de projetos precisa evoluir.',
    acao_imediata: 'Os problemas foram resolvidos, mas com muita discussão. Os de projetos não foram resolvidos. Abandonamos o assunto',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '22/05/2025',
    emitente: 'Graziela dos Anjos',
    cliente: 'COOPERFERTIL COOPERATIVA AGRICOLA',
    opd: '000034/2024',
    nf: '9152',
    equipamento: 'CP3000',
    local: 'ABERLARDO LUZ/SC',
    descricao: 'PARTE QUE FICA DENTRO DO ESCRITÓRIO FICOU ESTETICAMENTE HORRÍVEL',
    acao_imediata: 'Fiquei sabendo apenas na pesquisa.',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '23/05/2025',
    emitente: 'Graziela dos Anjos',
    cliente: 'OURO SAFRA INDUSTRIA E COMERCIO LTDA',
    opd: '000039/2024',
    nf: '8992',
    equipamento: 'CP3000',
    local: 'LUZ MG',
    descricao: 'Nossa sugestão é que as rampas para o tombadores poderiam ser mais alongadas forçando menos a subida das carretas.',
    acao_imediata: 'Foram feitas novas rampas e enviadas aos clientes.',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '13/08/2025',
    emitente: 'CLARICE PICOLI',
    cliente: 'OURO SAFRA INDUSTRIA E COMERCIO LTDA',
    opd: '000040/2024',
    nf: null,
    equipamento: 'PP-8021',
    local: 'CONCEIÇÃO DAS ALAGOAS',
    descricao: 'Motor girando solto, barulho diferente em comparação com o motor que esta ao lado, nao sobe a plataforma.',
    acao_imediata: 'Deslocar o técnico que estava próximo, identificado a necessidade, deslocou ate Uberlândia pegar o acoplamento e retornar para fazer a substituição. Prejuizo 479km, 8h de deslocamento, 4 horas técnicas entre tirar motor, sacar o acoplamento, substituir, testar equipamento.',
    garantia: null,
    procede: null,
    rac: null
  },
  {
    data_emissao: '15/10/2025',
    emitente: 'clarice',
    cliente: 'Ouro Safra',
    opd: '39/2024',
    nf: '8992',
    equipamento: '26183',
    local: 'Luz- MG',
    descricao: 'controle remoto com falha pela 3 x, já foi substituído por 2 modelos com a orientação e acompanhamento do Henrique.',
    acao_imediata: 'substituição por modelo de melhor qualidade, feita a revisão do esquema elétrico para ver se há alguma falha;',
    garantia: true,
    procede: true,
    rac: 'NA'
  }
];

function parseDate(dateStr) {
  if (!dateStr) return null;
  // Formato esperado: DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
}

function determinarTipoReclamacao(descricao) {
  const desc = descricao.toLowerCase();
  if (desc.includes('vazamento') || desc.includes('solda') || desc.includes('cilindro') || desc.includes('pistão')) {
    return 'PRODUTO';
  }
  if (desc.includes('montagem') || desc.includes('instalação') || desc.includes('técnico')) {
    return 'INSTALACAO';
  }
  if (desc.includes('entrega') || desc.includes('transporte') || desc.includes('faltou') || desc.includes('falta')) {
    return 'ENTREGA';
  }
  if (desc.includes('elétric') || desc.includes('projeto') || desc.includes('civil')) {
    return 'SERVICO';
  }
  if (desc.includes('atendimento') || desc.includes('comunicação')) {
    return 'ATENDIMENTO';
  }
  return 'OUTRO';
}

function determinarImpacto(descricao) {
  const desc = descricao.toLowerCase();
  if (desc.includes('paralização') || desc.includes('não funciona') || desc.includes('quebrou') || desc.includes('rompimento')) {
    return 'ALTO';
  }
  if (desc.includes('vazamento') || desc.includes('ajuste') || desc.includes('torta')) {
    return 'MEDIO';
  }
  return 'BAIXO';
}

async function importReclamacoes() {
  const client = await pool.connect();

  try {
    console.log('Iniciando importação de reclamações de cliente...');
    console.log(`Total de registros a importar: ${reclamacoes.length}`);

    // Verificar se a sequência existe, se não criar
    try {
      await client.query("SELECT nextval('seq_reclamacao_cliente')");
    } catch (e) {
      console.log('Criando sequência seq_reclamacao_cliente...');
      await client.query("CREATE SEQUENCE IF NOT EXISTS seq_reclamacao_cliente START 1");
    }

    let importados = 0;
    let erros = 0;

    for (const rec of reclamacoes) {
      try {
        await client.query('BEGIN');

        // Gerar número
        const dataEmissao = parseDate(rec.data_emissao);
        const year = dataEmissao ? dataEmissao.split('-')[0] : new Date().getFullYear();
        const seqResult = await client.query("SELECT nextval('seq_reclamacao_cliente') as seq");
        const seq = seqResult.rows[0].seq.toString().padStart(4, '0');
        const numero = `REC-${year}-${seq}`;

        // Determinar tipo e impacto
        const tipoReclamacao = determinarTipoReclamacao(rec.descricao);
        const impacto = determinarImpacto(rec.descricao);

        // Determinar status
        let status = 'ABERTA';
        if (rec.acao_imediata && rec.acao_imediata.toLowerCase().includes('resolvido')) {
          status = 'FECHADA';
        } else if (rec.acao_imediata && rec.acao_imediata.length > 10) {
          status = 'RESPONDIDA';
        }

        // Inserir reclamação
        await client.query(`
          INSERT INTO reclamacoes_clientes (
            numero, data_reclamacao, cliente_nome, cliente_contato,
            numero_opd, numero_serie, tipo_reclamacao, descricao,
            impacto, procedencia, acao_tomada, status, created, updated
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `, [
          numero,
          dataEmissao || new Date().toISOString().split('T')[0],
          rec.cliente,
          rec.emitente,
          rec.opd,
          rec.equipamento,
          tipoReclamacao,
          rec.descricao,
          impacto,
          rec.procede,
          rec.acao_imediata,
          status,
          new Date().toISOString(),
          new Date().toISOString()
        ]);

        await client.query('COMMIT');
        importados++;
        console.log(`[${importados}/${reclamacoes.length}] Importado: ${numero} - ${rec.cliente}`);

      } catch (error) {
        await client.query('ROLLBACK');
        erros++;
        console.error(`Erro ao importar reclamação de ${rec.cliente}:`, error.message);
      }
    }

    console.log('\n========================================');
    console.log('IMPORTAÇÃO CONCLUÍDA');
    console.log(`Total importados: ${importados}`);
    console.log(`Total de erros: ${erros}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('Erro geral na importação:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar
importReclamacoes();
