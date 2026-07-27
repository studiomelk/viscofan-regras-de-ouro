const express = require("express");
const pool = require("../db");
const { requireAdmin } = require("../auth");
const asyncHandler = require("../asyncHandler");

const router = express.Router();

router.get("/", requireAdmin, asyncHandler(async (_req, res) => {
  const { rows } = await pool.query("select * from metas_setor");
  res.json(rows);
}));

// Upsert de uma meta ({ setor, meta }).
router.put("/", requireAdmin, asyncHandler(async (req, res) => {
  const { setor, meta } = req.body || {};
  if (!setor || meta == null) {
    return res.status(400).json({ error: "setor e meta são obrigatórios." });
  }
  const { rows } = await pool.query(
    `insert into metas_setor (setor, meta, atualizado_em)
     values ($1, $2, now())
     on conflict (setor) do update set meta = excluded.meta, atualizado_em = now()
     returning *`,
    [setor, meta]
  );
  res.json(rows[0]);
}));

// Admin — apaga a meta de um setor (CRUD do painel).
router.delete("/:setor", requireAdmin, asyncHandler(async (req, res) => {
  await pool.query("delete from metas_setor where setor = $1", [req.params.setor]);
  res.status(204).end();
}));

module.exports = router;
