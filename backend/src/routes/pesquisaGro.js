const express = require("express");
const pool = require("../db");
const { requireAdmin } = require("../auth");
const asyncHandler = require("../asyncHandler");

const router = express.Router();

// Público — GRO é anônimo (sem nome/CPF).
router.post("/", asyncHandler(async (req, res) => {
  const { setor, respostas, nota_clima } = req.body || {};
  if (!setor || !respostas) {
    return res.status(400).json({ error: "Campos obrigatórios faltando." });
  }
  const { rows } = await pool.query(
    `insert into pesquisa_gro (setor, respostas, nota_clima)
     values ($1, $2, $3)
     returning *`,
    [setor, JSON.stringify(respostas), nota_clima ?? null]
  );
  res.status(201).json(rows[0]);
}));

// Admin — lista todas as respostas do GRO.
router.get("/", requireAdmin, asyncHandler(async (_req, res) => {
  const { rows } = await pool.query("select * from pesquisa_gro");
  res.json(rows);
}));

// Admin — apaga todas as respostas do GRO.
router.delete("/", requireAdmin, asyncHandler(async (_req, res) => {
  await pool.query("delete from pesquisa_gro");
  res.status(204).end();
}));

module.exports = router;
