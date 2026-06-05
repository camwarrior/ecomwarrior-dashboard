export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { password } = req.body || {};
  const correct = process.env.DASHBOARD_PASSWORD;
  const token = process.env.AUTH_TOKEN;

  // Falla cerrado: si faltan las variables, no autentica a nadie
  if (!correct || !token) {
    return res.status(500).json({ ok: false, error: "Faltan variables de entorno" });
  }

  if (typeof password === "string" && password === correct) {
    res.setHeader(
      "Set-Cookie",
      `auth=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60 * 24 * 30}`
    );
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ ok: false });
}
