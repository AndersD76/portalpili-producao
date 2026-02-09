/**
 * Script para importar usuarios do PDF "USUARIOS PORTAL PILI"
 * para o banco de dados do Portal Pili
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

// Dados do PDF - ID, Nome, Senha
const USUARIOS_PDF = [
  { id: 1, nome: 'ALEXANDRE DE OLIVEIRA', senha: '24001999' },
  { id: 2, nome: 'NAUINI FISCH PILI', senha: '24002998' },
  { id: 3, nome: 'ALEJANDRO RAFAEL DAMAS PEREZ', senha: '24003997' },
  { id: 4, nome: 'ALISSON DANIEL RECH', senha: '24004996' },
  { id: 5, nome: 'ANDERSON MARCOS BEZ', senha: '24005995' },
  { id: 6, nome: 'ANDERSON NOGUEIRA POZZO', senha: '24006994' },
  { id: 7, nome: 'ANDRE GIOVANI BORGES DOS SANTOS', senha: '24007993' },
  { id: 8, nome: 'ARMANDO JOSEA STUDILLO FARIAS', senha: '24008992' },
  { id: 9, nome: 'BRANDALI FATIMA DA ROSA PENA PAINS', senha: '24009991' },
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
  { id: 23, nome: 'EDERSON RODRIGUES DA SILVA', senha: '24023877' },
  { id: 24, nome: 'EDGAR PERACCHI', senha: '24024876' },
  { id: 25, nome: 'EDUARDO DOS SANTOS SOUZA', senha: '24025875' },
  { id: 26, nome: 'EDUARDO GUILHERME SANTOS', senha: '24026874' },
  { id: 27, nome: 'EZEQUIEL MATEUS BORBA', senha: '24027873' },
  { id: 28, nome: 'FERNANDO CAVALETT DA CRUZ', senha: '24028872' },
  { id: 29, nome: 'FRANCISCO ROMARIO LOPES MECCA', senha: '24029871' },
  { id: 30, nome: 'FRANKLIN RAFAEL HERNANDEZ PENALVER', senha: '24030870' },
  { id: 31, nome: 'GILBERTO JOSE KRASUCKI', senha: '24031869' },
  { id: 32, nome: 'GIOVANI PILI', senha: '24032868' },
  { id: 33, nome: 'GUSTAVO HENRIQUE GARCIA ZANCO', senha: '24033867' },
  { id: 34, nome: 'HENRIQUE RADAELLI', senha: '24034866' },
  { id: 35, nome: 'ITAMAR PADILHA', senha: '24035865' },
  { id: 36, nome: 'JOAO LUIZ CERESAJERSAK', senha: '24036864' },
  { id: 37, nome: 'JOAO RICARDO PINHEIRO DE LIMA', senha: '24037863' },
  { id: 38, nome: 'JOICE MARIA DA ROSA', senha: '24038862' },
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
  { id: 54, nome: 'MARCELO LUIS CASTURINO', senha: '24054846' },
  { id: 55, nome: 'MARCIA BEATRIS PILI', senha: '24055845' },
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
  { id: 72, nome: 'TATIANE LAISA ANDRADE', senha: '24072828' },
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
  { id: 86, nome: 'KETLIN VITORIA SEMENUK FLORES', senha: '24086814' },
  { id: 100, nome: 'DANIEL ANDERS', senha: '123456789' },
];

// Gerar email a partir do nome
function gerarEmail(nome) {
  const nomeLimpo = nome.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, '');
  const partes = nomeLimpo.split(/\s+/).filter(p => p);
  if (partes.length >= 2) {
    return `${partes[0]}.${partes[partes.length - 1]}@pili.ind.br`;
  }
  return `${partes[0]}@pili.ind.br`;
}

async function importarUsuarios() {
  const client = await pool.connect();

  try {
    console.log('='.repeat(68));
    console.log('    IMPORTANDO USUARIOS DO PDF PARA O PORTAL PILI');
    console.log('='.repeat(68));

    // Verificar usuarios existentes
    const existentes = await client.query('SELECT id, nome, email, id_funcionario FROM usuarios');
    console.log(`\nUsuarios existentes no banco: ${existentes.rows.length}`);
    existentes.rows.forEach(r => console.log(`  ID ${r.id} - ${r.nome} (${r.email}) func:${r.id_funcionario || '-'}`));

    // Mapa de emails e id_funcionario existentes
    const emailsExistentes = new Set(existentes.rows.map(r => r.email.toLowerCase()));
    const funcsExistentes = new Set(existentes.rows.map(r => r.id_funcionario).filter(Boolean));
    const nomesExistentes = new Map();
    existentes.rows.forEach(r => {
      nomesExistentes.set(r.nome.toUpperCase().trim(), r.id);
    });

    await client.query('BEGIN');

    let criados = 0;
    let atualizados = 0;
    const emailsUsados = new Set(emailsExistentes);

    for (const user of USUARIOS_PDF) {
      const idFunc = String(user.id);

      // Hash da senha
      const hash = await bcrypt.hash(user.senha, 10);

      // Verificar se id_funcionario ja existe
      if (funcsExistentes.has(idFunc)) {
        await client.query(
          'UPDATE usuarios SET password = $1, senha_hash = $1, nome = $2 WHERE id_funcionario = $3',
          [hash, user.nome, idFunc]
        );
        atualizados++;
        console.log(`  [ATUALIZADO] ID ${user.id} - ${user.nome}`);
        continue;
      }

      // Verificar se nome ja existe (ex: DANIEL ANDERS)
      if (nomesExistentes.has(user.nome.toUpperCase().trim())) {
        const existId = nomesExistentes.get(user.nome.toUpperCase().trim());
        await client.query(
          'UPDATE usuarios SET password = $1, senha_hash = $1, id_funcionario = $2 WHERE id = $3',
          [hash, idFunc, existId]
        );
        atualizados++;
        console.log(`  [ATUALIZADO] ID ${user.id} - ${user.nome} (por nome, db_id=${existId})`);
        continue;
      }

      // Gerar email unico
      let email = gerarEmail(user.nome);
      let suffix = 1;
      while (emailsUsados.has(email.toLowerCase())) {
        const base = gerarEmail(user.nome);
        email = base.replace('@', `${suffix}@`);
        suffix++;
      }
      emailsUsados.add(email.toLowerCase());

      // Inserir usuario
      await client.query(`
        INSERT INTO usuarios (nome, email, password, senha_hash, role, active, ativo, id_funcionario, created_at)
        VALUES ($1, $2, $3, $3, 'user', true, true, $4, NOW())
      `, [user.nome, email, hash, idFunc]);

      criados++;
      console.log(`  [CRIADO] ID ${user.id} - ${user.nome} (${email})`);
    }

    await client.query('COMMIT');

    console.log('\n' + '='.repeat(68));
    console.log(`Criados: ${criados}`);
    console.log(`Atualizados: ${atualizados}`);

    // Verificar total final
    const total = await client.query('SELECT COUNT(*) as total FROM usuarios');
    console.log(`Total de usuarios no banco: ${total.rows[0].total}`);
    console.log('='.repeat(68));
    console.log('    IMPORTACAO CONCLUIDA!');
    console.log('='.repeat(68));

  } catch (e) {
    await client.query('ROLLBACK');
    console.error('ERRO:', e.message);
    console.error(e.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

importarUsuarios();
