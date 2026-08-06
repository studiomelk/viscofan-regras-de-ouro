const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const asyncHandler = require("../asyncHandler");
const { participantesPorSetor, statsQuiz, statsGro, mascararCpf } = require("../reportStats");

const router = express.Router();
router.use(express.urlencoded({ extended: false }));

const MIN_RESPONDENTES = 3;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  return Object.fromEntries(header.split(";").map(c => {
    const i = c.indexOf("=");
    return [c.slice(0, i).trim(), decodeURIComponent(c.slice(i + 1).trim())];
  }));
}

function setAuthCookie(req, res, empresaId) {
  const token = jwt.sign({ e: empresaId, purpose: "relatorio" }, process.env.JWT_SECRET, { expiresIn: "30d" });
  const secure = req.secure || req.headers["x-forwarded-proto"] === "https";
  res.setHeader("Set-Cookie",
    `rel_${empresaId}=${token}; HttpOnly; Path=/relatorio/${empresaId}; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure ? "; Secure" : ""}`
  );
}

function estaAutenticado(req, empresaId) {
  const cookies = parseCookies(req);
  const token = cookies["rel_" + empresaId];
  if (!token) return false;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return payload.purpose === "relatorio" && payload.e === empresaId;
  } catch {
    return false;
  }
}

function paginaBase(titulo, corpo) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(titulo)}</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>.bg-viscoblue{background-color:#146187}.text-viscoblue{color:#146187}.bg-viscorange{background-color:#FF5919}</style>
</head>
<body class="bg-gray-50 min-h-screen">
${corpo}
</body>
</html>`;
}

function paginaSenha(empresaNome, empresaId, erro) {
  return paginaBase(`Relatório — ${empresaNome}`, `
  <div class="max-w-sm mx-auto mt-16 md:mt-24 p-6">
    <div class="bg-white border rounded-xl shadow p-6 text-center">
      <h1 class="text-lg font-black text-viscoblue mb-1">🔒 Relatório — ${esc(empresaNome)}</h1>
      <p class="text-xs text-gray-500 mb-4">Este link mostra sempre os dados mais recentes. Digite a senha para continuar.</p>
      ${erro ? `<p class="text-xs text-red-600 font-bold mb-3">${esc(erro)}</p>` : ""}
      <form method="POST" action="/relatorio/${esc(empresaId)}" class="space-y-3">
        <input type="password" name="senha" placeholder="Senha do relatório" required autofocus
               class="w-full border rounded-lg p-3 text-sm text-center">
        <button type="submit" class="w-full bg-viscoblue text-white font-bold p-3 rounded-lg uppercase text-sm hover:bg-blue-900">Entrar</button>
      </form>
    </div>
  </div>`);
}

function paginaSemSenhaConfigurada(empresaNome) {
  return paginaBase(`Relatório — ${empresaNome}`, `
  <div class="max-w-sm mx-auto mt-24 p-6 text-center">
    <p class="text-sm text-gray-600">O link do relatório de <strong>${esc(empresaNome)}</strong> ainda não tem senha configurada.</p>
    <p class="text-xs text-gray-400 mt-2">Peça ao administrador para definir uma senha em "Contatos para envio" no painel.</p>
  </div>`);
}

function tabela(headers, linhas, corHead = "#146187") {
  return `<table class="w-full text-xs border-collapse mb-1">
    <thead><tr>${headers.map(h => `<th class="text-left p-2 text-white font-bold" style="background:${corHead}">${esc(h)}</th>`).join("")}</tr></thead>
    <tbody>${linhas.map((l, i) => `<tr class="${i % 2 ? "bg-gray-50" : "bg-white"}">${l.map(c => `<td class="p-2 border-b border-gray-100">${c}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>`;
}

async function renderRelatorio(req, res, empresaId, empresaNome) {
  const [{ rows: participantes }, { rows: pesquisaGro }] = await Promise.all([
    pool.query("select * from participantes where empresa_id = $1 order by criado_em", [empresaId]),
    pool.query("select * from pesquisa_gro where empresa_id = $1", [empresaId]),
  ]);

  const porSetor = participantesPorSetor(participantes);
  const setoresOrd = Object.keys(porSetor).sort();
  const sQuiz = statsQuiz(participantes);
  const sGro = statsGro(pesquisaGro).filter(l => l.total >= MIN_RESPONDENTES);

  const resumoSetor = tabela(["Setor", "Participantes"],
    setoresOrd.map(s => [esc(s), String(porSetor[s].length)])
  );

  const listaConfirmacao = setoresOrd.map(sec => {
    const lista = porSetor[sec].slice().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    return `<h3 class="text-xs font-bold text-viscoblue uppercase mt-4 mb-1">${esc(sec)} (${lista.length})</h3>` +
      tabela(["Nome", "CPF"], lista.map(p => [esc(p.nome), esc(mascararCpf(p.cpf))]), "#8fa3b0");
  }).join("");

  const quizTabela = sQuiz.length ? tabela(["Pergunta", "% Acerto", "Acertos"],
    sQuiz.map(l => [esc(l.pergunta), `<strong>${l.pct}%</strong>`, `${l.acertos}/${l.total}`])
  ) : `<p class="text-xs text-gray-400">Sem dados ainda.</p>`;

  const groTabela = sGro.length ? tabela(["Pergunta", "Sim", "Eventualmente", "Não", "Classificação"],
    sGro.map(l => [esc(l.pergunta), `${l.simPct}% (${l.simCount})`, `${l.eventualmentePct}% (${l.eventualmenteCount})`, `${l.naoPct}% (${l.naoCount})`, `${l.classif.ico} ${l.classif.label}`])
  ) : `<p class="text-xs text-gray-400">Sem dados suficientes ainda (mínimo ${MIN_RESPONDENTES} respostas por pergunta).</p>`;

  const dadosPdf = { empresaNome, geradoEm: new Date().toISOString(), participantes, pesquisaGro };

  res.send(paginaBase(`Relatório — ${empresaNome}`, `
  <div class="max-w-3xl mx-auto p-4 md:p-8">
    <div class="bg-viscoblue text-white rounded-t-xl p-5 flex justify-between items-center flex-wrap gap-2">
      <div>
        <h1 class="font-black text-lg">Relatório Gerencial — ${esc(empresaNome)}</h1>
        <p class="text-xs opacity-80">Atualizado automaticamente a cada acesso · ${new Date().toLocaleString("pt-BR")}</p>
      </div>
      <button onclick="gerarPDF()" class="bg-viscorange hover:bg-orange-700 text-white font-bold px-4 py-2 rounded text-xs uppercase shadow shrink-0">📄 Gerar PDF</button>
    </div>
    <div class="bg-white border border-t-0 rounded-b-xl p-5 space-y-6">
      <div>
        <h2 class="font-bold text-sm text-gray-700 uppercase mb-2">👥 Participantes por setor</h2>
        ${resumoSetor}
        <p class="text-xs text-gray-500 mt-1">Total: <strong>${participantes.length}</strong> avaliações · <strong>${pesquisaGro.length}</strong> respostas GRO</p>
      </div>
      <div>
        <h2 class="font-bold text-sm text-gray-700 uppercase mb-2">✅ Lista de confirmação de participação</h2>
        ${listaConfirmacao || '<p class="text-xs text-gray-400">Nenhum participante ainda.</p>'}
      </div>
      <div>
        <h2 class="font-bold text-sm text-gray-700 uppercase mb-2">🛠️ Avaliação técnica — acertos por pergunta</h2>
        ${quizTabela}
      </div>
      <div>
        <h2 class="font-bold text-sm text-gray-700 uppercase mb-2">🧠 GRO — respostas por pergunta</h2>
        ${groTabela}
        <p class="text-xs text-gray-400 mt-1">Dados anônimos e agregados. Perguntas com menos de ${MIN_RESPONDENTES} respostas ficam ocultas para preservar o anonimato.</p>
      </div>
    </div>
  </div>

  <script src="https://unpkg.com/jspdf@latest/dist/jspdf.umd.min.js"></script>
  <script src="https://unpkg.com/jspdf-autotable@latest/dist/jspdf.plugin.autotable.min.js"></script>
  <script>
    const DADOS = ${JSON.stringify(dadosPdf)};
    function gerarPDF(){
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
      const W = doc.internal.pageSize.getWidth();
      const AZUL = [20,97,135];
      let y = 18;

      doc.setFillColor(...AZUL); doc.rect(0,0,W,24,"F");
      doc.setTextColor(255,255,255); doc.setFontSize(13); doc.setFont("helvetica","bold");
      doc.text("Relatório Gerencial — " + DADOS.empresaNome, W/2, 12, {align:"center"});
      doc.setFontSize(8); doc.setFont("helvetica","normal");
      doc.text("Gerado em " + new Date(DADOS.geradoEm).toLocaleString("pt-BR"), W/2, 19, {align:"center"});
      doc.setTextColor(0,0,0);
      y = 32;

      const porSetor = {};
      DADOS.participantes.forEach(p => { (porSetor[p.setor] = porSetor[p.setor] || []).push(p); });
      const setores = Object.keys(porSetor).sort();

      doc.setFontSize(10); doc.setFont("helvetica","bold");
      doc.text("Participantes por setor", 14, y); y += 4;
      doc.autoTable({
        startY: y, margin:{left:14,right:14},
        head:[["Setor","Participantes"]],
        body: setores.map(s => [s, String(porSetor[s].length)]),
        foot:[["TOTAL", String(DADOS.participantes.length)]],
        headStyles:{fillColor:AZUL, fontSize:8}, bodyStyles:{fontSize:8},
        footStyles:{fillColor:[230,230,230], textColor:[0,0,0], fontStyle:"bold", fontSize:8}
      });
      y = doc.lastAutoTable.finalY + 8;

      doc.setFont("helvetica","bold"); doc.text("Lista de confirmação de participação", 14, y); y += 5;
      setores.forEach(sec => {
        const lista = porSetor[sec].slice().sort((a,b) => a.nome.localeCompare(b.nome,"pt-BR"));
        if(y > 265){ doc.addPage(); y = 18; }
        doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.setTextColor(...AZUL);
        doc.text(sec.toUpperCase() + " (" + lista.length + ")", 14, y); y += 4;
        doc.setTextColor(0,0,0);
        doc.autoTable({
          startY: y, margin:{left:14,right:14},
          head:[["Nome","CPF"]],
          body: lista.map(p => [p.nome, "***.***.***-" + String(p.cpf||"").replace(/\\D/g,"").slice(-2)]),
          headStyles:{fillColor:[200,210,220], textColor:[0,0,0], fontSize:7.5}, bodyStyles:{fontSize:7.5}
        });
        y = doc.lastAutoTable.finalY + 5;
      });

      doc.addPage(); y = 18;
      doc.setFontSize(10); doc.setFont("helvetica","bold");
      doc.text("Avaliação técnica — acertos por pergunta", 14, y); y += 4;
      const accQuiz = {};
      DADOS.participantes.forEach(p => (p.respostas||[]).forEach(r => {
        if(!r.pontua) return;
        accQuiz[r.pergunta] = accQuiz[r.pergunta] || {total:0, acertos:0};
        accQuiz[r.pergunta].total++;
        if(r.correta) accQuiz[r.pergunta].acertos++;
      }));
      const statsQuizPdf = Object.entries(accQuiz).map(([q,s]) => ({q, ...s, pct: Math.round(s.acertos/s.total*100)})).sort((a,b)=>a.pct-b.pct);
      doc.autoTable({
        startY:y, margin:{left:14,right:14},
        head:[["Pergunta","% Acerto","Acertos"]],
        body: statsQuizPdf.map(l => [l.q, l.pct+"%", l.acertos+"/"+l.total]),
        headStyles:{fillColor:AZUL, fontSize:7}, bodyStyles:{fontSize:7}
      });
      y = doc.lastAutoTable.finalY + 8;

      const accGro = {};
      DADOS.pesquisaGro.forEach(r => (r.respostas||[]).forEach(a => {
        if(!a.fav) return;
        accGro[a.pergunta] = accGro[a.pergunta] || {total:0, sim:0, nao:0, eventualmente:0, fav:a.fav};
        accGro[a.pergunta].total++;
        if(a.resposta === "Sim") accGro[a.pergunta].sim++;
        else if(a.resposta === "Não") accGro[a.pergunta].nao++;
        else if(a.resposta === "Eventualmente") accGro[a.pergunta].eventualmente++;
      }));
      const statsGroPdf = Object.entries(accGro).filter(([,s]) => s.total >= ${MIN_RESPONDENTES}).map(([q,s]) => {
        const fav = (s.fav==="Sim" ? s.sim : s.nao) + s.eventualmente*0.5;
        return { q, simPct:Math.round(s.sim/s.total*100), simCount:s.sim,
          evPct:Math.round(s.eventualmente/s.total*100), evCount:s.eventualmente,
          naoPct:Math.round(s.nao/s.total*100), naoCount:s.nao,
          nota: Math.round(Math.round(fav/s.total*100)/10) };
      });
      if(y > 260){ doc.addPage(); y = 18; }
      doc.setFontSize(10); doc.setFont("helvetica","bold");
      doc.text("GRO — respostas por pergunta", 14, y); y += 4;
      doc.autoTable({
        startY:y, margin:{left:14,right:14},
        head:[["Pergunta","Sim","Eventualmente","Não","Nota"]],
        body: statsGroPdf.map(l => [l.q, l.simPct+"% ("+l.simCount+")", l.evPct+"% ("+l.evCount+")", l.naoPct+"% ("+l.naoCount+")", String(l.nota)]),
        headStyles:{fillColor:AZUL, fontSize:7}, bodyStyles:{fontSize:7}
      });

      doc.save("Relatorio_" + DADOS.empresaNome.replace(/\\s+/g,"_") + ".pdf");
    }
  </script>
  `));
}

router.get("/:empresaId", asyncHandler(async (req, res) => {
  const { empresaId } = req.params;
  const { rows: empresas } = await pool.query("select nome from empresas where id = $1", [empresaId]);
  if (!empresas[0]) return res.status(404).send(paginaBase("Não encontrado", `<p class="text-center mt-24 text-sm text-gray-500">Link inválido.</p>`));
  const empresaNome = empresas[0].nome;

  const { rows: cfg } = await pool.query("select relatorio_senha_hash from config_envio where empresa_id = $1", [empresaId]);
  if (!cfg[0] || !cfg[0].relatorio_senha_hash) return res.send(paginaSemSenhaConfigurada(empresaNome));

  if (estaAutenticado(req, empresaId)) return renderRelatorio(req, res, empresaId, empresaNome);
  res.send(paginaSenha(empresaNome, empresaId, null));
}));

router.post("/:empresaId", asyncHandler(async (req, res) => {
  const { empresaId } = req.params;
  const { senha } = req.body || {};
  const { rows: empresas } = await pool.query("select nome from empresas where id = $1", [empresaId]);
  if (!empresas[0]) return res.status(404).send(paginaBase("Não encontrado", `<p class="text-center mt-24 text-sm text-gray-500">Link inválido.</p>`));
  const empresaNome = empresas[0].nome;

  const { rows: cfg } = await pool.query("select relatorio_senha_hash from config_envio where empresa_id = $1", [empresaId]);
  if (!cfg[0] || !cfg[0].relatorio_senha_hash) return res.send(paginaSemSenhaConfigurada(empresaNome));

  const ok = senha && await bcrypt.compare(senha, cfg[0].relatorio_senha_hash);
  if (!ok) return res.status(401).send(paginaSenha(empresaNome, empresaId, "Senha incorreta."));

  setAuthCookie(req, res, empresaId);
  return renderRelatorio(req, res, empresaId, empresaNome);
}));

module.exports = router;
