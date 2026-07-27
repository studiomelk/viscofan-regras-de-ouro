const bcrypt = require("bcryptjs");
const pool = require("./db");

async function main() {
  const email = process.argv[2] || process.env.ADMIN_EMAIL;
  const password = process.argv[3] || process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("Uso: node src/createAdmin.js <email> <senha>");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    `insert into admin_users (email, senha_hash)
     values ($1, $2)
     on conflict (email) do update set senha_hash = excluded.senha_hash`,
    [email, hash]
  );

  console.log(`Admin criado/atualizado: ${email}`);
  await pool.end();
}

main().catch((err) => {
  console.error("Falha ao criar admin:", err.message);
  process.exit(1);
});
