// Mesma lógica de classificação usada no PDF (backend/public/index.html) —
// mantida em espelho aqui de propósito. Se mudar os limiares num lugar,
// mude no outro.
function classificarGroPergunta(pctFavoravel) {
  const nota = Math.round(pctFavoravel / 10);
  if (nota <= 4) return { nota, label: "Ruim", ico: "😞", cor: "#b91c1c" };
  if (nota <= 6) return { nota, label: "Regular", ico: "😐", cor: "#a16207" };
  if (nota <= 8) return { nota, label: "Bom", ico: "🙂", cor: "#15803d" };
  return { nota, label: "Excelente", ico: "🤩", cor: "#166534" };
}

function classificarClima(media) {
  if (media == null) return { label: "Sem dados", cor: "#6b7280" };
  if (media >= 9) return { label: "Excelente", cor: "#166534" };
  if (media >= 7) return { label: "Boa", cor: "#15803d" };
  if (media >= 5) return { label: "Razoável", cor: "#a16207" };
  if (media >= 3) return { label: "Ruim", cor: "#c2410c" };
  return { label: "Péssima", cor: "#b91c1c" };
}

// Agrupa participantes por setor com contagem simples.
function participantesPorSetor(participantes) {
  const porSetor = {};
  participantes.forEach(p => { (porSetor[p.setor] = porSetor[p.setor] || []).push(p); });
  return porSetor;
}

// % de acerto por pergunta do quiz — usa "correta" já gravado em cada
// resposta (não depende da lista de perguntas do formulário).
function statsQuiz(participantes) {
  const acc = {};
  participantes.forEach(p => (p.respostas || []).forEach(r => {
    if (!r.pontua) return;
    acc[r.pergunta] = acc[r.pergunta] || { total: 0, acertos: 0 };
    acc[r.pergunta].total++;
    if (r.correta) acc[r.pergunta].acertos++;
  }));
  return Object.entries(acc).map(([pergunta, s]) => ({
    pergunta, total: s.total, acertos: s.acertos,
    pct: Math.round((s.acertos / s.total) * 100),
  })).sort((a, b) => a.pct - b.pct);
}

// % Sim/Eventualmente/Não por pergunta do GRO — usa "fav" já gravado em
// cada resposta (respostas antigas sem fav ficam de fora da classificação).
function statsGro(pesquisaGro) {
  const acc = {};
  pesquisaGro.forEach(r => (r.respostas || []).forEach(a => {
    if (!a.fav) return;
    acc[a.pergunta] = acc[a.pergunta] || { total: 0, sim: 0, nao: 0, eventualmente: 0, fav: a.fav };
    acc[a.pergunta].total++;
    if (a.resposta === "Sim") acc[a.pergunta].sim++;
    else if (a.resposta === "Não") acc[a.pergunta].nao++;
    else if (a.resposta === "Eventualmente") acc[a.pergunta].eventualmente++;
  }));
  return Object.entries(acc).map(([pergunta, s]) => {
    const favoravel = (s.fav === "Sim" ? s.sim : s.nao) + s.eventualmente * 0.5;
    const pctFavoravel = Math.round((favoravel / s.total) * 100);
    return {
      pergunta, total: s.total,
      simPct: Math.round((s.sim / s.total) * 100), simCount: s.sim,
      eventualmentePct: Math.round((s.eventualmente / s.total) * 100), eventualmenteCount: s.eventualmente,
      naoPct: Math.round((s.nao / s.total) * 100), naoCount: s.nao,
      classif: classificarGroPergunta(pctFavoravel),
    };
  }).sort((a, b) => a.classif.nota - b.classif.nota);
}

// Mesmo padrão do frontend (mascararCpf em index.html): só os 2 últimos
// dígitos aparecem.
function mascararCpf(cpf) {
  const digitos = String(cpf || "").replace(/\D/g, "");
  return `***.***.***-${digitos.slice(-2)}`;
}

module.exports = { classificarGroPergunta, classificarClima, participantesPorSetor, statsQuiz, statsGro, mascararCpf };
