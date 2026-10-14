// Dólar observado del día para mostrar una estimación en CLP en el formulario.
// El TC oficial de cada movimiento lo sigue escribiendo Apps Script en el Sheet.
//
// Fuente principal: API oficial del Banco Central (necesita BCCH_TOKEN en Vercel).
// Respaldo: mindicador.cl. Cada fuente tiene 4 s como máximo para no frenar la app.
const LIMITE_MS = 4000;
const MEMO_MS = 60 * 60 * 1000; // 1 hora en memoria mientras la función siga activa
let memo = null; // { valor, fecha, fuente, t }

const hoyChile = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());

async function bancoCentral() {
  const token = (process.env.BCCH_TOKEN || "").trim();
  if (!token) return null;
  const hasta = hoyChile();
  const d = new Date(hasta + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - 15); // margen para fines de semana largos y feriados
  const desde = d.toISOString().slice(0, 10);
  const url = "https://si3.bcentral.cl/SieteRestWS/SieteRestWS.ashx?token=" + encodeURIComponent(token) +
    "&function=GetSeries&timeseries=F073.TCO.PRE.Z.D&firstdate=" + desde + "&lastdate=" + hasta;
  const r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(LIMITE_MS) });
  if (!r.ok) return null;
  const j = await r.json();
  if (Number(j.Codigo) !== 0) return null;
  const obs = ((j.Series && j.Series.Obs) || []).filter(o => isFinite(parseFloat(o.value)) && parseFloat(o.value) > 0);
  const ult = obs[obs.length - 1];
  if (!ult) return null;
  const [dd, mm, yyyy] = String(ult.indexDateString).split("-");
  return { valor: parseFloat(ult.value), fecha: `${yyyy}-${mm}-${dd}`, fuente: "Banco Central" };
}

async function mindicador() {
  const r = await fetch("https://mindicador.cl/api/dolar", { cache: "no-store", signal: AbortSignal.timeout(LIMITE_MS) });
  if (!r.ok) return null;
  const j = await r.json();
  const ultimo = j && Array.isArray(j.serie) ? j.serie[0] : null;
  if (!ultimo || typeof ultimo.valor !== "number") return null;
  return { valor: ultimo.valor, fecha: String(ultimo.fecha).slice(0, 10), fuente: "mindicador" };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false });
  res.setHeader("Cache-Control", "private, max-age=3600");
  if (memo && Date.now() - memo.t < MEMO_MS) {
    return res.status(200).json({ ok: true, valor: memo.valor, fecha: memo.fecha, fuente: memo.fuente });
  }
  for (const fuente of [bancoCentral, mindicador]) {
    try {
      const r = await fuente();
      if (r) {
        memo = { ...r, t: Date.now() };
        return res.status(200).json({ ok: true, ...r });
      }
    } catch (e) { /* siguiente fuente */ }
  }
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ ok: false });
}
