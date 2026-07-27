const express = require("express");
const pool = require("../db");
const { requireAdmin } = require("../auth");
const asyncHandler = require("../asyncHandler");

const router = express.Router();

router.get("/", requireAdmin, asyncHandler(async (_req, res) => {
  const { rows } = await pool.query("select * from config_envio where id = 1");
  res.json(rows[0] || null);
}));

router.put("/", requireAdmin, asyncHandler(async (req, res) => {
  const { email1, email2, email3, whatsapp1, whatsapp2, whatsapp3 } = req.body || {};
  const { rows } = await pool.query(
    `insert into config_envio (id, email1, email2, email3, whatsapp1, whatsapp2, whatsapp3, atualizado_em)
     values (1, $1, $2, $3, $4, $5, $6, now())
     on conflict (id) do update set
       email1 = excluded.email1, email2 = excluded.email2, email3 = excluded.email3,
       whatsapp1 = excluded.whatsapp1, whatsapp2 = excluded.whatsapp2, whatsapp3 = excluded.whatsapp3,
       atualizado_em = now()
     returning *`,
    [email1 || null, email2 || null, email3 || null, whatsapp1 || null, whatsapp2 || null, whatsapp3 || null]
  );
  res.json(rows[0]);
}));

module.exports = router;
