const express = require("express");
const pool = require("../db");
const { requireAdmin } = require("../auth");
const asyncHandler = require("../asyncHandler");

const router = express.Router();

// Admin — fecha o ciclo atual: guarda uma cópia completa dos participantes
// e respostas do GRO da empresa, e limpa as tabelas ativas. Tudo numa
// transação — ou arquiva e limpa os dois, ou não mexe em nada.
router.post("/", requireAdmin, asyncHandler(async (req, res) => {
  const { empresa_id, nome } = req.body || {};
  if (!empresa_id) return res.status(400).json({ error: "empresa_id é obrigatório." });

  const client = await pool.connect();
  try {
    await client.query("begin");

    const { rows: participantes } = await client.query(
      "select * from participantes where empresa_id = $1 order by criado_em", [empresa_id]
    );
    const { rows: pesquisaGro } = await client.query(
      "select * from pesquisa_gro where empresa_id = $1 order by criado_em", [empresa_id]
    );

    if (!participantes.length && !pesquisaGro.length) {
      await client.query("rollback");
      return res.status(400).json({ error: "Não há dados para arquivar nesta empresa." });
    }

    const datas = [
      ...participantes.map(p => new Date(p.criado_em).toISOString().slice(0, 10)),
      ...pesquisaGro.map(p => (p.criado_em instanceof Date ? p.criado_em.toISOString().slice(0, 10) : String(p.criado_em))),
    ].sort();
    const dataInicio = datas[0] || null;
    const dataFim = datas[datas.length - 1] || null;

    const nomeArquivo = nome || `Ciclo até ${new Date().toLocaleDateString("pt-BR")}`;

    const { rows } = await client.query(
      `insert into arquivos
         (empresa_id, nome, data_inicio, data_fim, total_participantes, total_gro, participantes, pesquisa_gro)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning id, empresa_id, nome, data_inicio, data_fim, total_participantes, total_gro, criado_em`,
      [empresa_id, nomeArquivo, dataInicio, dataFim, participantes.length, pesquisaGro.length,
        JSON.stringify(participantes), JSON.stringify(pesquisaGro)]
    );

    await client.query("delete from participantes where empresa_id = $1", [empresa_id]);
    await client.query("delete from pesquisa_gro where empresa_id = $1", [empresa_id]);

    await client.query("commit");
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}));

// Admin — lista arquivos de uma empresa (sem os dados completos, só o resumo).
router.get("/", requireAdmin, asyncHandler(async (req, res) => {
  const { empresa_id } = req.query;
  if (!empresa_id) return res.status(400).json({ error: "empresa_id é obrigatório." });
  const { rows } = await pool.query(
    `select id, empresa_id, nome, data_inicio, data_fim, total_participantes, total_gro, criado_em
       from arquivos where empresa_id = $1 order by criado_em desc`,
    [empresa_id]
  );
  res.json(rows);
}));

// Admin — detalhe de um arquivo, com os dados completos (pra baixar o PDF).
router.get("/:id", requireAdmin, asyncHandler(async (req, res) => {
  const { rows } = await pool.query("select * from arquivos where id = $1", [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: "Arquivo não encontrado." });
  res.json(rows[0]);
}));

// Admin — apaga um arquivo antigo permanentemente (sem volta).
router.delete("/:id", requireAdmin, asyncHandler(async (req, res) => {
  await pool.query("delete from arquivos where id = $1", [req.params.id]);
  res.status(204).end();
}));

module.exports = router;
