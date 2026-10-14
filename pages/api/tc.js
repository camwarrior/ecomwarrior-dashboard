// Dólar observado del día (mindicador.cl, Banco Central de Chile).
// Solo se usa para mostrar una estimación en CLP en el formulario;
// el TC oficial de cada movimiento lo sigue escribiendo Apps Script en el Sheet.
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false });
  try {
    const r = await fetch("https://mindicador.cl/api/dolar", { cache: "no-store" });
    if (!r.ok) throw new Error(`mindicador ${r.status}`);
    const j = await r.json();
    const ultimo = j && Array.isArray(j.serie) ? j.serie[0] : null;
    if (!ultimo || typeof ultimo.valor !== "number") throw new Error("sin datos");
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.status(200).json({ ok: true, valor: ultimo.valor, fecha: ultimo.fecha });
  } catch (e) {
    return res.status(200).json({ ok: false });
  }
}
