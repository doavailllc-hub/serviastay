const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });
  try {
    await connection.query(`CREATE TABLE IF NOT EXISTS servia_schema_migrations (
      version VARCHAR(191) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    const directory = path.join(__dirname, "..", "migrations");
    const files = fs.readdirSync(directory).filter((name) => name.endsWith(".sql")).sort();
    for (const file of files) {
      const [existing] = await connection.query(
        "SELECT version FROM servia_schema_migrations WHERE version=? LIMIT 1", [file]
      );
      if (existing.length) continue;
      const sql = fs.readFileSync(path.join(directory, file), "utf8");
      const statements = sql.split(/;\s*(?:\r?\n|$)/).map((item) => item.trim()).filter(Boolean);
      await connection.beginTransaction();
      try {
        for (const statement of statements) {
          try {
            await connection.query(statement);
          } catch (error) {
            if (![1060, 1061].includes(Number(error.errno))) throw error;
          }
        }
        await connection.query("INSERT INTO servia_schema_migrations (version) VALUES (?)", [file]);
        await connection.commit();
        console.log(`Applied ${file}`);
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    }
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
});
