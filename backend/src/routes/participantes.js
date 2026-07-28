const express = require("express");
const pool = require("../db");
const { requireAdmin } = require("../auth");
const asyncHandler = require("../asyncHandler");

const router = express.Router();

// Público — visitante cadastra participante e responde o quiz.
router.post("/", async (req, res) => {
  const { empresa_id, nome, cpf, setor, acertos, total, respostas } = req.body || {};
  if (!empresa_id || !nome || !cpf || !setor || acertos == null || total == null || !respostas) {
    return res.status(400).json({ error: "Campos obrigatórios faltando." });
  }
  try {
    const { rows } = await pool.query(
      `insert into participantes (empresa_id, nome, cpf, setor, acertos, total, respostas)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [empresa_id, nome, cpf, setor, acertos, total, JSON.stringify(respostas)]
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
// Escopado por empresa: CPF só é único dentro da mesma empresa, então
// casar só por CPF poderia acertar o participante errado de outra empresa.
router.post("/marcar-pesquisa", asyncHandler(async (req, res) => {
  const { cpf, empresa_id } = req.body || {};
  if (!cpf || !empresa_id) return res.status(400).json({ error: "CPF e empresa_id são obrigatórios." });
  await pool.query(
    "update participantes set respondeu_pesquisa = true where cpf = $1 and empresa_id = $2",
    [cpf, empresa_id]
  );
  res.status(204).end();
}));

// Admin — lista participantes. ?empresa_id= filtra por empresa (o painel
// sempre manda; sem o filtro, retorna de todas as empresas).
router.get("/", requireAdmin, asyncHandler(async (req, res) => {
  const { empresa_id } = req.query;
  const { rows } = empresa_id
    ? await pool.query("select * from participantes where empresa_id = $1 order by criado_em", [empresa_id])
    : await pool.query("select * from participantes order by criado_em");
  res.json(rows);
}));

// Admin — apaga participantes de uma empresa ("zerar sistema"). Exige
// empresa_id pra nunca apagar todas as empresas de uma vez sem querer.
router.delete("/", requireAdmin, asyncHandler(async (req, res) => {
  const { empresa_id } = req.query;
  if (!empresa_id) return res.status(400).json({ error: "empresa_id é obrigatório." });
  await pool.query("delete from participantes where empresa_id = $1", [empresa_id]);
  res.status(204).end();
}));

// Admin — edita um participante (CRUD do painel).
router.put("/:id", requireAdmin, asyncHandler(async (req, res) => {
  const { empresa_id, nome, cpf, setor, acertos, total, respostas, respondeu_pesquisa } = req.body || {};
  const { rows } = await pool.query(
    `update participantes
        set empresa_id = $2, nome = $3, cpf = $4, setor = $5, acertos = $6, total = $7,
            respostas = $8, respondeu_pesquisa = $9
      where id = $1
      returning *`,
    [req.params.id, empresa_id, nome, cpf, setor, acertos, total, JSON.stringify(respostas), !!respondeu_pesquisa]
  );
  if (!rows[0]) return res.status(404).json({ error: "Participante não encontrado." });
  res.json(rows[0]);
}));

// Admin — apaga um participante específico (CRUD do painel).
router.delete("/:id", requireAdmin, asyncHandler(async (req, res) => {
  await pool.query("delete from participantes where id = $1", [req.params.id]);
  res.status(204).end();
}));

module.exports = router;
