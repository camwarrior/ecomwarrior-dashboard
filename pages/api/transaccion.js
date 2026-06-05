// Ruta de servidor: recibe el formulario del dashboard y lo reenvía a la
// Web App de Apps Script con el secreto (que nunca viaja al navegador).
export const config = { api: { bodyParser: { sizeLimit: "10mb" } } }; // comprobantes

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Método no permitido" });

  const url = process.env.APPS_SCRIPT_URL;
  const secret = process.env.APPS_SCRIPT_SECRET;
  if (!url || !secret) {
    return res.status(500).json({ ok: false, error: "Falta configuración del servidor" });
  }

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, data: req.body }),
      redirect: "follow",
    });
    const text = await r.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { ok: false, error: "Respuesta no válida de Apps Script" }; }
    return res.status(json.ok ? 200 : 400).json(json);
  } catch (e) {
    return res.status(502).json({ ok: false, error: String(e.message || e) });
  }
}
