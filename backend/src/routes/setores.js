const express = require("express");
const pool = require("../db");
const { requireAdmin } = require("../auth");
const asyncHandler = require("../asyncHandler");

const router = express.Router();

// Público — a tela de cadastro precisa listar os setores da empresa
// escolhida antes do quiz.
router.get("/", asyncHandler(async (req, res) => {
  const { empresa_id } = req.query;
  if (!empresa_id) return res.status(400).json({ error: "empresa_id é obrigatório." });
  const { rows } = await pool.query(
    "select * from setores where empresa_id = $1 order by nome",
    [empresa_id]
  );
  res.json(rows);
}));

router.post("/", requireAdmin, asyncHandler(async (req, res) => {
  const { empresa_id, nome } = req.body || {};
  if (!empresa_id || !nome) return res.status(400).json({ error: "empresa_id e nome são obrigatórios." });
  try {
    const { rows } = await pool.query(
      "insert into setores (empresa_id, nome) values ($1, $2) returning *",
      [empresa_id, nome]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Esse setor já existe nessa empresa." });
    throw err;
  }
}));

router.put("/:id", requireAdmin, asyncHandler(async (req, res) => {
  const { nome } = req.body || {};
  if (!nome) return res.status(400).json({ error: "Nome é obrigatório." });
  const { rows } = await pool.query(
    "update setores set nome = $2 where id = $1 returning *",
    [req.params.id, nome]
  );
  if (!rows[0]) return res.status(404).json({ error: "Setor não encontrado." });
  res.json(rows[0]);
}));

router.delete("/:id", requireAdmin, asyncHandler(async (req, res) => {
  await pool.query("delete from setores where id = $1", [req.params.id]);
  res.status(204).end();
}));

module.exports = router;
