const express = require("express");
const pool = require("../db");
const { requireAdmin } = require("../auth");
const asyncHandler = require("../asyncHandler");

const router = express.Router();

// ?empresa_id= é obrigatório — meta é sempre relativa a uma empresa.
router.get("/", requireAdmin, asyncHandler(async (req, res) => {
  const { empresa_id } = req.query;
  if (!empresa_id) return res.status(400).json({ error: "empresa_id é obrigatório." });
  const { rows } = await pool.query("select * from metas_setor where empresa_id = $1", [empresa_id]);
  res.json(rows);
}));

// Upsert de uma meta ({ empresa_id, setor, meta }).
router.put("/", requireAdmin, asyncHandler(async (req, res) => {
  const { empresa_id, setor, meta } = req.body || {};
  if (!empresa_id || !setor || meta == null) {
    return res.status(400).json({ error: "empresa_id, setor e meta são obrigatórios." });
  }
  const { rows } = await pool.query(
    `insert into metas_setor (empresa_id, setor, meta, atualizado_em)
     values ($1, $2, $3, now())
     on conflict (empresa_id, setor) do update set meta = excluded.meta, atualizado_em = now()
     returning *`,
    [empresa_id, setor, meta]
  );
  res.json(rows[0]);
}));

// Admin — apaga a meta de um setor (CRUD do painel). Exige empresa_id
// na query porque a chave agora é composta (empresa_id, setor).
router.delete("/:setor", requireAdmin, asyncHandler(async (req, res) => {
  const { empresa_id } = req.query;
  if (!empresa_id) return res.status(400).json({ error: "empresa_id é obrigatório." });
  await pool.query("delete from metas_setor where empresa_id = $1 and setor = $2", [empresa_id, req.params.setor]);
  res.status(204).end();
}));

module.exports = router;
