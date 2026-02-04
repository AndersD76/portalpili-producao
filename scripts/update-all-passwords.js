require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Mapeamento ID -> Senha do PDF
const senhas = {
  '1': '24001999',
  '2': '24002998',
  '3': '24003997',
  '4': '24004996',
  '5': '24005995',
  '6': '24006994',
  '7': '24007993',
  '8': '24008992',
  '9': '24009991',
  '10': '24010990',
  '11': '24011899',
  '12': '24012898',
  '13': '24013897',
  '14': '24014896',
  '15': '24015895',
  '16': '24016894',
  '17': '24017893',
  '18': '24018892',
  '19': '24019891',
  '20': '24020890',
  '21': '24021879',
  '22': '24022878',
  '23': '24023877',
  '24': '24024876',
  '25': '24025875',
  '26': '24026874',
  '27': '24027873',
  '28': '24028872',
  '29': '24029871',
  '30': '24030870',
  '31': '24031869',
  '32': '24032868',
  '33': '24033867',
  '34': '24034866',
  '35': '24035865',
  '36': '24036864',
  '37': '24037863',
  '38': '24038862',
  '39': '24039861',
  '40': '24040860',
  '41': '24041859',
  '42': '24042858',
  '43': '24043857',
  '44': '24044856',
  '45': '24045855',
  '46': '24046854',
  '47': '24047853',
  '48': '24048852',
  '49': '24049851',
  '50': '24050850',
  '51': '24051849',
  '52': '24052848',
  '53': '24053847',
  '54': '24054846',
  '55': '24055845',
  '56': '24056844',
  '57': '24057843',
  '58': '24058842',
  '59': '24059841',
  '60': '24060840',
  '61': '24061839',
  '62': '24062838',
  '63': '24063837',
  '64': '24064836',
  '65': '24065835',
  '66': '24066834',
  '67': '24067833',
  '68': '24068832',
  '69': '24069831',
  '70': '24070830',
  '71': '24071829',
  '72': '24072828',
  '73': '24073827',
  '74': '24074826',
  '75': '24075825',
  '76': '24076824',
  '77': '24077823',
  '78': '24078822',
  '79': '24079821',
  '80': '24080820',
  '81': '24081819',
  '82': '24082818',
  '83': '24083817',
  '84': '2408416',
  '85': '24085815',
  '86': '24086814',
  '100': '123456789'
};

async function updateAllPasswords() {
  console.log('\n=== Atualizando Senhas de Todos os Usuários ===\n');

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  try {
    for (const [idFuncionario, senha] of Object.entries(senhas)) {
      try {
        // Hash da senha
        const senhaHash = await bcrypt.hash(senha, 10);

        // Atualizar no banco
        const result = await pool.query(`
          UPDATE usuarios
          SET senha_hash = $1, password = $1
          WHERE id_funcionario = $2
          RETURNING nome
        `, [senhaHash, idFuncionario]);

        if (result.rowCount > 0) {
          updated++;
          if (updated <= 10 || updated % 20 === 0) {
            console.log(`✅ [${idFuncionario}] ${result.rows[0].nome}`);
          }
        } else {
          notFound++;
          console.log(`⚠️  [${idFuncionario}] Usuário não encontrado`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ [${idFuncionario}] Erro: ${error.message}`);
      }
    }

    console.log(`\n========================================`);
    console.log(`✅ Atualização concluída!`);
    console.log(`   - Atualizados: ${updated}`);
    console.log(`   - Não encontrados: ${notFound}`);
    console.log(`   - Erros: ${errors}`);
    console.log(`========================================\n`);

    // Verificar DANIEL ANDERS especificamente
    console.log('Verificando DANIEL ANDERS (ID 100):');
    const daniel = await pool.query(`
      SELECT id, nome, id_funcionario, ativo
      FROM usuarios WHERE id_funcionario = '100'
    `);
    if (daniel.rowCount > 0) {
      const u = daniel.rows[0];
      console.log(`  ✅ ${u.nome} - ID Func: ${u.id_funcionario} - Ativo: ${u.ativo}`);

      // Testar a senha
      const testResult = await pool.query(`
        SELECT senha_hash FROM usuarios WHERE id_funcionario = '100'
      `);
      const valido = await bcrypt.compare('123456789', testResult.rows[0].senha_hash);
      console.log(`  Teste de senha '123456789': ${valido ? '✅ OK' : '❌ FALHOU'}`);
    }

  } catch (error) {
    console.error('Erro geral:', error.message);
  } finally {
    await pool.end();
  }
}

updateAllPasswords();
