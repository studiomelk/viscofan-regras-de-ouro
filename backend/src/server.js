require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const participantesRoutes = require("./routes/participantes");
const pesquisaGroRoutes = require("./routes/pesquisaGro");
const metasSetorRoutes = require("./routes/metasSetor");
const configEnvioRoutes = require("./routes/configEnvio");
const adminUsersRoutes = require("./routes/adminUsers");
const empresasRoutes = require("./routes/empresas");
const setoresRoutes = require("./routes/setores");
const arquivosRoutes = require("./routes/arquivos");
const relatorioPublicoRoutes = require("./routes/relatorioPublico");
const { router: uploadRoutes, UPLOAD_DIR } = require("./routes/upload");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.set("trust proxy", 1);
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/participantes", participantesRoutes);
app.use("/api/pesquisa-gro", pesquisaGroRoutes);
app.use("/api/metas-setor", metasSetorRoutes);
app.use("/api/config-envio", configEnvioRoutes);
app.use("/api/admin-users", adminUsersRoutes);
app.use("/api/empresas", empresasRoutes);
app.use("/api/setores", setoresRoutes);
app.use("/api/arquivos", arquivosRoutes);
app.use("/relatorio", relatorioPublicoRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/uploads", express.static(UPLOAD_DIR));

// Site (index.html + logo) servido pelo mesmo processo — um único app,
// mesma origem, sem CORS entre frontend e API.
app.use(express.static(path.join(__dirname, "..", "public")));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Erro interno do servidor." });
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => console.log(`Viscofan API rodando na porta ${port}`));
