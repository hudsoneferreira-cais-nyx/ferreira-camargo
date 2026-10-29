const { token } = require("./_auth");
module.exports = (req, res) => {
  res.setHeader("content-type", "application/json");
  if (req.method !== "POST") { res.statusCode = 405; return res.end(JSON.stringify({ ok: false })); }
  let body = "";
  req.on("data", c => (body += c));
  req.on("end", () => {
    let senha = "";
    try { senha = (JSON.parse(body || "{}").senha) || ""; } catch (e) {}
    if (process.env.APP_PASSWORD && senha === process.env.APP_PASSWORD) {
      res.setHeader("Set-Cookie", `fc_auth=${token()}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax; Secure`);
      res.statusCode = 200; res.end(JSON.stringify({ ok: true }));
    } else {
      res.statusCode = 401; res.end(JSON.stringify({ ok: false }));
    }
  });
};
