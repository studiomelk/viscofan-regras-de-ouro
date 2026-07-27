const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db");
const { requireAdmin } = require("../auth");
const asyncHandler = require("../asyncHandler");

const router = express.Router();

// Nunca retorna senha_hash em nenhuma resposta.
const COLUNAS_PUBLICAS = "id, email, criado_em";

router.get("/", requireAdmin, asyncHandler(async (_req, res) => {
  const { rows } = await pool.query(`select ${COLUNAS_PUBLICAS} from admin_users order by criado_em`);
  res.json(rows);
}));

router.post("/", requireAdmin, asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
  }
  const hash = await bcrypt.hash(password, 12);
  try {
    const { rows } = await pool.query(
      `insert into admin_users (email, senha_hash) values ($1, $2) returning ${COLUNAS_PUBLICAS}`,
      [email, hash]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Já existe um admin com esse e-mail." });
    }
    throw err;
  }
}));

// Edita e-mail e, opcionalmente, redefine a senha (campo password vazio = mantém a atual).
router.put("/:id", requireAdmin, asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email) return res.status(400).json({ error: "E-mail é obrigatório." });

  const { rows } = password
    ? await pool.query(
        `update admin_users set email = $2, senha_hash = $3 where id = $1 returning ${COLUNAS_PUBLICAS}`,
        [req.params.id, email, await bcrypt.hash(password, 12)]
      )
    : await pool.query(
        `update admin_users set email = $2 where id = $1 returning ${COLUNAS_PUBLICAS}`,
        [req.params.id, email]
      );

  if (!rows[0]) return res.status(404).json({ error: "Admin não encontrado." });
  res.json(rows[0]);
}));

// Impede apagar o último admin (evita lockout do painel).
router.delete("/:id", requireAdmin, asyncHandler(async (req, res) => {
  const { rows: total } = await pool.query("select count(*)::int as total from admin_users");
  if (total[0].total <= 1) {
    return res.status(400).json({ error: "Não é possível apagar o único administrador." });
  }
  await pool.query("delete from admin_users where id = $1", [req.params.id]);
  res.status(204).end();
}));

module.exports = router;
