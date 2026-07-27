const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const asyncHandler = require("../asyncHandler");

const router = express.Router();

router.post("/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
  }

  const { rows } = await pool.query(
    "select id, email, senha_hash from admin_users where email = $1",
    [email]
  );
  const admin = rows[0];
  const ok = admin && (await bcrypt.compare(password, admin.senha_hash));
  if (!ok) return res.status(401).json({ error: "E-mail ou senha incorretos." });

  const token = jwt.sign({ sub: admin.id, email: admin.email }, process.env.JWT_SECRET, {
    expiresIn: "12h",
  });
  res.json({ token, email: admin.email });
}));

module.exports = router;
