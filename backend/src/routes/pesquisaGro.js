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

// Admin — edita uma resposta do GRO (CRUD do painel).
router.put("/:id", requireAdmin, asyncHandler(async (req, res) => {
  const { setor, respostas, nota_clima } = req.body || {};
  const { rows } = await pool.query(
    `update pesquisa_gro set setor = $2, respostas = $3, nota_clima = $4
      where id = $1
      returning *`,
    [req.params.id, setor, JSON.stringify(respostas), nota_clima ?? null]
  );
  if (!rows[0]) return res.status(404).json({ error: "Registro não encontrado." });
  res.json(rows[0]);
}));

// Admin — apaga uma resposta específica do GRO (CRUD do painel).
router.delete("/:id", requireAdmin, asyncHandler(async (req, res) => {
  await pool.query("delete from pesquisa_gro where id = $1", [req.params.id]);
  res.status(204).end();
}));

module.exports = router;
