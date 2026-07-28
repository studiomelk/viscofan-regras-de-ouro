const express = require("express");
const pool = require("../db");
const { requireAdmin } = require("../auth");
const asyncHandler = require("../asyncHandler");

const router = express.Router();

// Público — a tela de cadastro do participante precisa listar as
// empresas pra oferecer o seletor antes do quiz.
router.get("/", asyncHandler(async (_req, res) => {
  const { rows } = await pool.query("select * from empresas order by nome");
  res.json(rows);
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
