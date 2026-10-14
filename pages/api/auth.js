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
    // SameSite=Lax: la cookie también viaja al abrir el panel desde un link
    // (WhatsApp, Notas, correo). Strict la bloqueaba y forzaba un login extra.
    // Las peticiones POST desde otros sitios siguen sin llevar la cookie.
    res.setHeader(
      "Set-Cookie",
      `auth=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
    );
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ ok: false });
}
