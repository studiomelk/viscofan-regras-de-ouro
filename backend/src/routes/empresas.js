const express = require("express");
const pool = require("../db");
const { requireAdmin } = require("../auth");
const asyncHandler = require("../asyncHandler");

const router = express.Router();

// Admin — lista todas as empresas (pro seletor de navegação do painel).
router.get("/", asyncHandler(async (_req, res) => {
  const { rows } = await pool.query("select * from empresas order by nome");
  res.json(rows);
}));

// Público — a tela de cadastro do participante não deixa escolher a
// empresa; ela só sabe qual é a empresa ativa e usa essa, sem opção.
router.get("/ativa", asyncHandler(async (_req, res) => {
  const { rows } = await pool.query("select * from empresas where ativa = true limit 1");
  res.json(rows[0] || null);
}));

// Admin — define qual empresa passa a receber as respostas do formulário
// público. Transação: zera todas antes de ativar a escolhida, garantindo
// que só uma fica ativa por vez.
router.post("/:id/ativar", requireAdmin, asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("update empresas set ativa = false where ativa = true");
    const { rows } = await client.query(
      "update empresas set ativa = true where id = $1 returning *",
      [req.params.id]
    );
    if (!rows[0]) {
      await client.query("rollback");
      return res.status(404).json({ error: "Empresa não encontrada." });
    }
    await client.query("commit");
    res.json(rows[0]);
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}));

router.post("/", requireAdmin, asyncHandler(async (req, res) => {
  const { nome } = req.body || {};
  if (!nome) return res.status(400).json({ error: "Nome é obrigatório." });
  try {
    const { rows } = await pool.query(
      "insert into empresas (nome) values ($1) returning *",
      [nome]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Já existe uma empresa com esse nome." });
    throw err;
  }
}));

router.put("/:id", requireAdmin, asyncHandler(async (req, res) => {
  const { nome } = req.body || {};
  if (!nome) return res.status(400).json({ error: "Nome é obrigatório." });
  const { rows } = await pool.query(
    "update empresas set nome = $2 where id = $1 returning *",
    [req.params.id, nome]
  );
  if (!rows[0]) return res.status(404).json({ error: "Empresa não encontrada." });
  res.json(rows[0]);
}));

router.delete("/:id", requireAdmin, asyncHandler(async (req, res) => {
  const { rows: total } = await pool.query("select count(*)::int as total from empresas");
  if (total[0].total <= 1) {
    return res.status(400).json({ error: "Não é possível apagar a única empresa cadastrada." });
  }
  try {
    await pool.query("delete from empresas where id = $1", [req.params.id]);
    res.status(204).end();
  } catch (err) {
    if (err.code === "23503") {
      return res.status(409).json({
        error: "Essa empresa ainda tem participantes, respostas ou metas cadastradas. Apague esses dados primeiro.",
      });
    }
    throw err;
  }
}));

module.exports = router;
