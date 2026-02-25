const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

(async () => {
  try {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'migrations', 'add_status_checks_tables.sql'), 'utf8');
    await pool.query(sql);
    console.log('Migration executed successfully');

    // Verify tables
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name LIKE 'crm_status_check%'
      ORDER BY table_name
    `);
    console.log('Tables created:', tables.rows.map(r => r.table_name));
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
})();
