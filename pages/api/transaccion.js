// Ruta de servidor: recibe el formulario del dashboard y lo reenvía a la
// Web App de Apps Script con el secreto (que nunca viaja al navegador).
export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } }, // comprobantes
  maxDuration: 60,
};

// Si Apps Script no responde en este tiempo, se avisa al usuario en vez de dejarlo esperando.
// Ojo: Apps Script puede terminar de guardar igual después de este corte.
const LIMITE_MS = 50000;

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
      signal: AbortSignal.timeout(LIMITE_MS),
    });
    const text = await r.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { ok: false, error: "Google Apps Script respondió con un formato inesperado. Revisa en Movimientos si se guardó antes de reintentar." }; }
    return res.status(json.ok ? 200 : 400).json(json);
  } catch (e) {
    const tiempo = e && (e.name === "TimeoutError" || e.name === "AbortError");
    return res.status(504).json({
      ok: false,
      pendiente: tiempo,
      error: tiempo
        ? "Google tardó más de 50 segundos en responder. Puede que el movimiento se guarde igual: revisa Movimientos en un minuto antes de enviarlo de nuevo."
        : "No se pudo conectar con Google Apps Script. Intenta de nuevo en unos segundos.",
    });
  }
}
