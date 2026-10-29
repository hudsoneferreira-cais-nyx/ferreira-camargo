// Autenticação simples por senha compartilhada (Hudson e Anne).
// Credenciais só no backend; o navegador recebe apenas um cookie HttpOnly.
const crypto = require("crypto");
function token() {
  const p = process.env.APP_PASSWORD || "";
  return crypto.createHash("sha256").update(p + "|ferreira-camargo").digest("hex");
}
function autorizado(req) {
  if (!process.env.APP_PASSWORD) return true; // sem senha definida = acesso liberado
  const c = req.headers.cookie || "";
  const m = c.match(/fc_auth=([a-f0-9]+)/);
  return !!(m && m[1] === token());
}
module.exports = { token, autorizado };
