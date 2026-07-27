const express = require("express");
const pool = require("../db");
const { requireAdmin } = require("../auth");
const asyncHandler = require("../asyncHandler");

const router = express.Router();

// Público — visitante cadastra participante e responde o quiz.
router.post("/", async (req, res) => {
  const { nome, cpf, setor, acertos, total, respostas } = req.body || {};
  if (!nome || !cpf || !setor || acertos == null || total == null || !respostas) {
    return res.status(400).json({ error: "Campos obrigatórios faltando." });
  }
  try {
    const { rows } = await pool.query(
      `insert into participantes (nome, cpf, setor, acertos, total, respostas)
       values ($1, $2, $3, $4, $5, $6)
       returning *`,
      [nome, cpf, setor, acertos, total, JSON.stringify(respostas)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Este CPF já respondeu o quiz." });
    }
    console.error(err);
    res.status(500).json({ error: "Erro ao salvar participante." });
  }
});

// Público — marca que o participante concluiu a pesquisa GRO.
router.post("/marcar-pesquisa", asyncHandler(async (req, res) => {
  const { cpf } = req.body || {};
  if (!cpf) return res.status(400).json({ error: "CPF é obrigatório." });
  await pool.query(
    "update participantes set respondeu_pesquisa = true where cpf = $1",
    [cpf]
  );
  res.status(204).end();
}));

// Admin — lista todos os participantes.
router.get("/", requireAdmin, asyncHandler(async (_req, res) => {
  const { rows } = await pool.query("select * from participantes order by criado_em");
  res.json(rows);
}));

// Admin — apaga todos os participantes ("zerar sistema").
router.delete("/", requireAdmin, asyncHandler(async (_req, res) => {
  await pool.query("delete from participantes");
  res.status(204).end();
}));

module.exports = router;
