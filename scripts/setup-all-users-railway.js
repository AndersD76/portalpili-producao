const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Database URL do Railway/Neon
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const usuarios = [
  { id: 1, nome: 'ALEXANDRE DE OLIVEIRA', senha: '24001999' },
  { id: 2, nome: 'NAUINI FISCH PILI', senha: '24002998' },
  { id: 3, nome: 'ALEJANDRO RAFAEL DAMAS PEREZ', senha: '24003997' },
  { id: 4, nome: 'ALISSON DANIEL RECH', senha: '24004996' },
  { id: 5, nome: 'ANDERSON MARCOS BEZ', senha: '24005995' },
  { id: 6, nome: 'ANDERSON NOGUEIRAPOZZO', senha: '24006994' },
  { id: 7, nome: 'ANDRE GIOVANI BORGES DOS SANTOS', senha: '24007993' },
  { id: 8, nome: 'ARMANDO JOSEA STUDILLO FARIAS', senha: '24008992' },
  { id: 9, nome: 'BRANDALI FATIMADA ROSA PENA PAINS', senha: '24009991' },
  { id: 10, nome: 'BRENDOW DE CASTRO FALCAO', senha: '24010990' },
  { id: 11, nome: 'BRENO EDUARDO CHIAPETTI SOUZA', senha: '24011899' },
  { id: 12, nome: 'BRUNO SILVEIRA BORGES', senha: '24012898' },
  { id: 13, nome: 'CARLOS FERNANDO DEGARAIS', senha: '24013897' },
  { id: 14, nome: 'CELSO PAROT DE OLIVEIRA', senha: '24014896' },
  { id: 15, nome: 'CLARICE PICOLI', senha: '24015895' },
  { id: 16, nome: 'CRISTIANO PEREIRA', senha: '24016894' },
  { id: 17, nome: 'DALVO SEVALDO KRABBE', senha: '24017893' },
  { id: 18, nome: 'DANIEL ELZINGA', senha: '24018892' },
  { id: 19, nome: 'DIRCEU PEROCHINI', senha: '24019891' },
  { id: 20, nome: 'DOUGLAS RIBEIRO PULTER', senha: '24020890' },
  { id: 21, nome: 'DOUGLAS VITOR SEGHETO DE MORAES', senha: '24021879' },
  { id: 22, nome: 'EDEMAR JOSE LAZZARETTI', senha: '24022878' },
  { id: 23, nome: 'ÉDERSON RODRIGUES DA SILVA', senha: '24023877' },
  { id: 24, nome: 'EDGAR PERACCHI', senha: '24024876' },
  { id: 25, nome: 'EDUARDO DOS SANTOS SOUZA', senha: '24025875' },
  { id: 26, nome: 'EDUARDO GUILHERME SANTOS', senha: '24026874' },
  { id: 27, nome: 'EZEQUIEL MATEUS BORBA', senha: '24027873' },
  { id: 28, nome: 'FERNANDO CAVALETT DACRUZ', senha: '24028872' },
  { id: 29, nome: 'FRANCISCO ROMARIO LOPES MECCA', senha: '24029871' },
  { id: 30, nome: 'FRANKLIN RAFAEL HERNANDEZ PENALVER', senha: '24030870' },
  { id: 31, nome: 'GILBERTO JOSE KRASUCKI', senha: '24031869' },
  { id: 32, nome: 'GIOVANI PILI', senha: '24032868' },
  { id: 33, nome: 'GUSTAVO HENRIQUE GARCIA ZANCO', senha: '24033867' },
  { id: 34, nome: 'HENRIQUE RADAELLI', senha: '24034866' },
  { id: 35, nome: 'ITAMAR PADILHA', senha: '24035865' },
  { id: 36, nome: 'JOAO LUIZ CERESAJERSAK', senha: '24036864' },
  { id: 37, nome: 'JOAO RICARDO PINHEIRO DE LIMA', senha: '24037863' },
  { id: 38, nome: 'JOICE MARIADA ROSA', senha: '24038862' },
  { id: 39, nome: 'JOSE FABIO TORRES DA SILVA', senha: '24039861' },
  { id: 40, nome: 'JUAN PABLO PICOLI', senha: '24040860' },
  { id: 41, nome: 'JULIO CESAR BASTOS CHAVES SLEUMER', senha: '24041859' },
  { id: 42, nome: 'JULIO VASILUK', senha: '24042858' },
  { id: 43, nome: 'JUNIOR JONAIKER CORDERO SEIJA', senha: '24043857' },
  { id: 44, nome: 'KAUA NISEGHATTI BARBOSA', senha: '24044856' },
  { id: 45, nome: 'LAURA PILI PIRAN', senha: '24045855' },
  { id: 46, nome: 'LUAN RICARDO MARTINS', senha: '24046854' },
  { id: 47, nome: 'LUCIA SAURIN', senha: '24047853' },
  { id: 48, nome: 'LUIS ALBERTO ROOS', senha: '24048852' },
  { id: 49, nome: 'LUIS FERNANDO CHAVES BARBOSA', senha: '24049851' },
  { id: 50, nome: 'LUISALGIMIRO TORRES CANDURIN', senha: '24050850' },
  { id: 51, nome: 'LUIZ DEMBINSKI', senha: '24051849' },
  { id: 52, nome: 'MANUEL AGUSTIN SALAZAR HERNANDEZ', senha: '24052848' },
  { id: 53, nome: 'MARCELO COSTAMILAN', senha: '24053847' },
  { id: 54, nome: 'MARCELO LUÍS CASTURINO', senha: '24054846' },
  { id: 55, nome: 'MÁRCIA BEATRIS PILI', senha: '24055845' },
  { id: 56, nome: 'MARCOS KOVALESKI', senha: '24056844' },
  { id: 57, nome: 'MARCOS SULIGO', senha: '24057843' },
  { id: 58, nome: 'MARCOS ANTONIO SULIGO', senha: '24058842' },
  { id: 59, nome: 'MIGUEL ANTONIO GUTIERREZ GOMEZ', senha: '24059841' },
  { id: 60, nome: 'MOISES EDUARDO SANTOS', senha: '24060840' },
  { id: 61, nome: 'NOMAR DE JESUS ALBERTO PALMA SALAZAR', senha: '24061839' },
  { id: 62, nome: 'PATRICIA BEAL', senha: '24062838' },
  { id: 63, nome: 'PAULO RICARDO TAVARES', senha: '24063837' },
  { id: 64, nome: 'RAFAEL SPINELLI', senha: '24064836' },
  { id: 65, nome: 'RICARDO FOLETTO', senha: '24065835' },
  { id: 66, nome: 'ROBSON LUIS RODRIGUES', senha: '24066834' },
  { id: 67, nome: 'ROBSON ALEX BORTOLOSO', senha: '24067833' },
  { id: 68, nome: 'RODRIGO SBRUZZI', senha: '24068832' },
  { id: 69, nome: 'RONEY FERNANDO ROSSETTO', senha: '24069831' },
  { id: 70, nome: 'RUDIVON CARRARO FIM', senha: '24070830' },
  { id: 71, nome: 'TAINAN DA COSTA GONCALVES', senha: '24071829' },
  { id: 72, nome: 'TATIANE LAÍSA ANDRADE', senha: '24072828' },
  { id: 73, nome: 'TIAGO GEVINSKI', senha: '24073827' },
  { id: 74, nome: 'VALDECIR SEMENUK', senha: '24074826' },
  { id: 75, nome: 'VICENTE DE APUL MARTINEZ', senha: '24075825' },
  { id: 76, nome: 'VINICIUS MOTA', senha: '24076824' },
  { id: 77, nome: 'LUCIANO MICHEL DA COSTA', senha: '24077823' },
  { id: 78, nome: 'JAIR D AGUSTIN', senha: '24078822' },
  { id: 79, nome: 'WILIAN INSAUBRAL DE MELO', senha: '24079821' },
  { id: 80, nome: 'WAGNER BARBOSA DOS REIS', senha: '24080820' },
  { id: 81, nome: 'VICENTE DE PAUL MARTINEZ', senha: '24081819' },
  { id: 82, nome: 'FERNANDA PONSONI', senha: '24082818' },
  { id: 83, nome: 'COMERCIAL AGROINTER', senha: '24083817' },
  { id: 84, nome: 'CRISTIANE CARDOSO', senha: '2408416' },
  { id: 85, nome: 'MATHEUS ALVES', senha: '24085815' },
  { id: 86, nome: 'KETLIN VITÓRIA SEMENUK FLORES', senha: '24086814' },
  { id: 100, nome: 'DANIEL ANDERS', senha: '123456789', role: 'admin' }
];

async function setupAllUsers() {
  const client = await pool.connect();

  try {
    console.log('🚀 Conectando ao banco de dados Railway/Neon...\n');

    let sucessos = 0;
    let erros = 0;

    for (const usuario of usuarios) {
      try {
        // Gerar hash da senha
        const senhaHash = await bcrypt.hash(usuario.senha, 10);

        // Gerar email baseado no nome
        const email = `${usuario.nome.toLowerCase().replace(/\s+/g, '.').normalize('NFD').replace(/[\u0300-\u036f]/g, '')}@pili.com.br`;

        // Verifica se usuário existe
        const existing = await client.query(
          'SELECT id FROM usuarios WHERE id = $1 OR id_funcionario = $2',
          [usuario.id, String(usuario.id)]
        );

        if (existing.rows.length > 0) {
          // Atualizar
          await client.query(`
            UPDATE usuarios
            SET nome = $1,
                email = $2,
                id_funcionario = $3,
                senha_hash = $4,
                role = $5,
                ativo = true
            WHERE id = $6 OR id_funcionario = $3
          `, [
            usuario.nome,
            email,
            String(usuario.id),
            senhaHash,
            usuario.role || 'user',
            usuario.id
          ]);
        } else {
          // Inserir
          await client.query(`
            INSERT INTO usuarios (nome, email, id_funcionario, senha_hash, cargo, role, ativo)
            VALUES ($1, $2, $3, $4, $5, $6, true)
          `, [
            usuario.nome,
            email,
            String(usuario.id),
            senhaHash,
            'Funcionário',
            usuario.role || 'user'
          ]);
        }

        sucessos++;
        console.log(`✓ ${usuario.id} - ${usuario.nome}`);
      } catch (err) {
        erros++;
        console.error(`✗ Erro ao inserir ${usuario.nome}:`, err.message);
      }
    }

    console.log(`\n🎉 Concluído!`);
    console.log(`   ✓ ${sucessos} usuários inseridos/atualizados com sucesso`);
    if (erros > 0) {
      console.log(`   ✗ ${erros} erros`);
    }

    // Mostrar alguns exemplos de login
    console.log('\n📋 Exemplos de credenciais:');
    console.log('   ID: 100 | Senha: 123456789 (Admin)');
    console.log('   ID: 1   | Senha: 24001999');
    console.log('   ID: 2   | Senha: 24002998');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

setupAllUsers();
