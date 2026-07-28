const express = require("express");
const pool = require("../db");
const { requireAdmin } = require("../auth");
const asyncHandler = require("../asyncHandler");

const router = express.Router();

// Público — GRO é anônimo (sem nome/CPF), mas sabe de qual empresa é.
router.post("/", asyncHandler(async (req, res) => {
  const { empresa_id, setor, respostas, nota_clima } = req.body || {};
  if (!empresa_id || !setor || !respostas) {
    return res.status(400).json({ error: "Campos obrigatórios faltando." });
  }
  const { rows } = await pool.query(
    `insert into pesquisa_gro (empresa_id, setor, respostas, nota_clima)
     values ($1, $2, $3, $4)
     returning *`,
    [empresa_id, setor, JSON.stringify(respostas), nota_clima ?? null]
  );
  res.status(201).json(rows[0]);
}));

// Admin — lista respostas do GRO. ?empresa_id= filtra por empresa.
router.get("/", requireAdmin, asyncHandler(async (req, res) => {
  const { empresa_id } = req.query;
  const { rows } = empresa_id
    ? await pool.query("select * from pesquisa_gro where empresa_id = $1", [empresa_id])
    : await pool.query("select * from pesquisa_gro");
  res.json(rows);
}));

// Admin — apaga respostas do GRO de uma empresa. Exige empresa_id.
router.delete("/", requireAdmin, asyncHandler(async (req, res) => {
  const { empresa_id } = req.query;
  if (!empresa_id) return res.status(400).json({ error: "empresa_id é obrigatório." });
  await pool.query("delete from pesquisa_gro where empresa_id = $1", [empresa_id]);
  res.status(204).end();
}));

// Admin — edita uma resposta do GRO (CRUD do painel).
router.put("/:id", requireAdmin, asyncHandler(async (req, res) => {
  const { empresa_id, setor, respostas, nota_clima } = req.body || {};
  const { rows } = await pool.query(
    `update pesquisa_gro set empresa_id = $2, setor = $3, respostas = $4, nota_clima = $5
      where id = $1
      returning *`,
    [req.params.id, empresa_id, setor, JSON.stringify(respostas), nota_clima ?? null]
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
