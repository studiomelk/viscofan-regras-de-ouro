const fs = require("fs");
const path = require("path");
const pool = require("./db");

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, "..", "migrate.sql"), "utf8");
  await pool.query(sql);
  console.log("Migração concluída.");
  await pool.end();
}

main().catch((err) => {
  console.error("Falha na migração:", err.message);
  process.exit(1);
});
