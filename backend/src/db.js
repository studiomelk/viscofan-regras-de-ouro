require("dotenv").config();
const { Pool } = require("pg");

const sslMode = (process.env.PGSSLMODE || "disable").toLowerCase();
// rejectUnauthorized:false porque a maioria dos Postgres em VPS usa
// certificado autoassinado — ainda criptografa a conexão, só não valida
// a cadeia de CA. IMPORTANTE: não passar sslmode dentro de DATABASE_URL
// junto com esta opção — a lib pg interpreta sslmode=require como
// verify-full e ignora este objeto, derrubando a conexão com certificado
// autoassinado (bug detectado ao testar contra db.servrobmar.site).
const ssl = sslMode === "disable" ? false : { rejectUnauthorized: false };

// Monta a config sempre a partir das variáveis PG* discretas — nunca via
// connectionString — para que o "ssl" acima seja sempre respeitado.
let connectionConfig = {
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
};

if (!connectionConfig.host && process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  connectionConfig = {
    host: url.hostname,
    port: Number(url.port) || 5432,
    database: url.pathname.replace(/^\//, ""),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
  };
}

const pool = new Pool({ ...connectionConfig, ssl });

module.exports = pool;
