// Devuelve todos los datos del dashboard en una sola llamada.
// La protege el middleware (cookie de sesión), igual que el resto de /api.
import { getMovimientos, getCategoriasDetalle, getAgencias } from "../../lib/sheets";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Método no permitido" });
  res.setHeader("Cache-Control", "no-store");

  try {
    const [movimientos, categorias, agencias] = await Promise.all([getMovimientos(), getCategoriasDetalle(), getAgencias()]);
    const actualizado = new Date().toLocaleString("es-CL", {
      timeZone: "America/Santiago",
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
    return res.status(200).json({ ok: true, movimientos, categorias, agencias, actualizado });
  } catch (e) {
    console.error("api/datos:", e.message);
    return res.status(502).json({ ok: false, error: "No se pudo leer el Google Sheet. Intenta de nuevo en unos segundos." });
  }
}
