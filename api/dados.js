// Lê o Excel mais recente da pasta do Google Drive (por nome), valida e devolve os dados do dashboard.
// Credenciais da conta de serviço ficam SÓ no backend (env). Nada sensível vai ao navegador.
const fs = require("fs");
const { autorizado } = require("./_auth");
const { processarBuffer } = require("../lib/processar");

module.exports = async (req, res) => {
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  if (!autorizado(req)) { res.statusCode = 401; return res.end(JSON.stringify({ ok: false, erros: ["não autorizado"] })); }

  // modo de teste local (sem Drive): LOCAL_XLSX aponta para um arquivo
  if (process.env.LOCAL_XLSX) {
    try {
      const buf = fs.readFileSync(process.env.LOCAL_XLSX);
      const r = processarBuffer(buf);
      r.sincronizado_em = new Date(fs.statSync(process.env.LOCAL_XLSX).mtime).toISOString();
      r.arquivo = { nome: process.env.LOCAL_XLSX.split("/").pop(), origem: "local" };
      res.statusCode = 200; return res.end(JSON.stringify(r));
    } catch (e) { res.statusCode = 200; return res.end(JSON.stringify({ ok: false, erros: ["erro local: " + e.message] })); }
  }

  const folderId = process.env.DRIVE_FOLDER_ID, fileName = process.env.DRIVE_FILE_NAME, sa = process.env.GOOGLE_SA_JSON;
  if (!folderId || !fileName || !sa) {
    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: false, erros: ["integração com o Google Drive ainda não configurada"] }));
  }
  try {
    const { google } = require("googleapis");
    const cred = JSON.parse(Buffer.from(sa, "base64").toString("utf8"));
    const auth = new google.auth.JWT(cred.client_email, null, cred.private_key, ["https://www.googleapis.com/auth/drive.readonly"]);
    const drive = google.drive({ version: "v3", auth });
    // pega o arquivo com aquele nome, o mais recente por modifiedTime (ID novo não atrapalha)
    const q = `'${folderId}' in parents and name = '${String(fileName).replace(/'/g, "\\'")}' and trashed = false`;
    const list = await drive.files.list({ q, orderBy: "modifiedTime desc", fields: "files(id,name,modifiedTime,md5Checksum)", pageSize: 10 });
    const files = (list.data.files) || [];
    if (!files.length) { res.statusCode = 200; return res.end(JSON.stringify({ ok: false, erros: [`nenhum arquivo "${fileName}" na pasta`] })); }
    const alvo = files[0]; // mais recente
    const dl = await drive.files.get({ fileId: alvo.id, alt: "media" }, { responseType: "arraybuffer" });
    const r = processarBuffer(Buffer.from(dl.data));
    r.sincronizado_em = alvo.modifiedTime;
    r.arquivo = { id: alvo.id, nome: alvo.name, versoes_com_mesmo_nome: files.length };
    res.statusCode = 200; return res.end(JSON.stringify(r));
  } catch (e) {
    res.statusCode = 200; return res.end(JSON.stringify({ ok: false, erros: ["erro ao ler o Drive: " + e.message] }));
  }
};
