const express = require("express");
const pool = require("../db");
const { requireAdmin } = require("../auth");
const asyncHandler = require("../asyncHandler");

const router = express.Router();

router.get("/", requireAdmin, asyncHandler(async (req, res) => {
  const { empresa_id } = req.query;
  if (!empresa_id) return res.status(400).json({ error: "empresa_id é obrigatório." });
  const { rows } = await pool.query("select * from config_envio where empresa_id = $1", [empresa_id]);
  res.json(rows[0] || null);
}));

router.put("/", requireAdmin, asyncHandler(async (req, res) => {
  const { empresa_id, email1, email2, email3, whatsapp1, whatsapp2, whatsapp3 } = req.body || {};
  if (!empresa_id) return res.status(400).json({ error: "empresa_id é obrigatório." });
  const { rows } = await pool.query(
    `insert into config_envio (empresa_id, email1, email2, email3, whatsapp1, whatsapp2, whatsapp3, atualizado_em)
     values ($1, $2, $3, $4, $5, $6, $7, now())
     on conflict (empresa_id) do update set
       email1 = excluded.email1, email2 = excluded.email2, email3 = excluded.email3,
       whatsapp1 = excluded.whatsapp1, whatsapp2 = excluded.whatsapp2, whatsapp3 = excluded.whatsapp3,
       atualizado_em = now()
     returning *`,
    [empresa_id, email1 || null, email2 || null, email3 || null, whatsapp1 || null, whatsapp2 || null, whatsapp3 || null]
  );
  res.json(rows[0]);
}));

module.exports = router;
