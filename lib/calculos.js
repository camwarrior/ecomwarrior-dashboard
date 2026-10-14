// Cálculos del dashboard. Funciones puras: misma lógica que la versión anterior
// de pages/index.js, extraída para poder reutilizarla y probarla.

export const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export const CUENTAS_INFO = [
  { name: "Mercury", desc: "Recibe ingresos" },
  { name: "Slash", desc: "Paga Meta Ads y software" },
  { name: "Wise", desc: "Inactiva", inactiva: true },
];

export function anosDisponibles(movimientos) {
  const set = new Set(movimientos.map(m => m.anio).filter(Boolean));
  return [...set].sort((a, b) => b - a);
}

export function anoPorDefecto(anos) {
  const cy = new Date().getFullYear();
  return anos.includes(cy) ? cy : (anos[0] || cy);
}

// Retiro de utilidades del socio: sale dinero de la empresa pero no es gasto
// (no baja la utilidad ni se deduce). Se reconoce por tipo "Retiro" o, en filas
// antiguas, por la categoría "Retiro socio".
export const esRetiro = (m) => m.tipo === "Retiro" || m.categoria === "Retiro socio";
const esGasto = (m) => m.tipo === "Gasto" && !esRetiro(m);

// Saldo por cuenta acumulando todos los movimientos recibidos
function saldosPorCuenta(movs) {
  const s = {};
  movs.forEach(m => {
    if (!s[m.cuenta]) s[m.cuenta] = 0;
    if (m.tipo === "Ingreso" || m.tipo === "Aporte") s[m.cuenta] += m.montoUSD;
    else if (esRetiro(m) || m.tipo === "Gasto") s[m.cuenta] -= Math.abs(m.montoUSD);
    else if (m.tipo === "Transferencia") s[m.cuenta] += m.montoUSD;
  });
  return s;
}

function mesDeFecha(fecha) {
  const p = String(fecha || "").split("/");
  return p.length === 3 ? parseInt(p[1]) : NaN;
}

export function calcular(movimientos, ano) {
  const movsAno = movimientos.filter(m => m.anio === ano);
  const movsHasta = movimientos.filter(m => m.anio <= ano);

  let ingresos = 0, aportes = 0, gastos = 0, retiros = 0;
  movsAno.forEach(m => {
    if (m.tipo === "Ingreso") ingresos += m.montoUSD;
    else if (m.tipo === "Aporte") aportes += m.montoUSD;
    else if (esRetiro(m)) retiros += Math.abs(m.montoUSD);
    else if (m.tipo === "Gasto") gastos += Math.abs(m.montoUSD);
  });
  const utilidadNeta = ingresos - gastos;

  // Saldos acumulados hasta el año seleccionado (no solo el año)
  const s = saldosPorCuenta(movsHasta);
  const cuentas = CUENTAS_INFO.map(c => ({ ...c, saldo: s[c.name] || 0 }));
  const saldoTotal = cuentas.reduce((a, c) => a + c.saldo, 0);

  // Saldo real al inicio del año (cierre del año anterior)
  const sIni = saldosPorCuenta(movimientos.filter(m => m.anio < ano));
  const saldoInicial = Object.values(sIni).reduce((a, b) => a + b, 0);

  const resumenMensual = MESES.map((mes, i) => {
    const filas = movsAno.filter(m => mesDeFecha(m.fecha) === i + 1);
    const suma = (fn) => filas.filter(fn).reduce((acc, m) => acc + Math.abs(m.montoUSD), 0);
    return {
      mes,
      ingresos: filas.filter(m => m.tipo === "Ingreso").reduce((acc, m) => acc + m.montoUSD, 0),
      gastos: suma(esGasto),
      retiros: suma(esRetiro),
      aportes: filas.filter(m => m.tipo === "Aporte").reduce((acc, m) => acc + m.montoUSD, 0),
      metaAds: suma(m => m.categoria === "Meta Ads"),
      softwareIA: suma(m => m.categoria === "Software IA"),
    };
  });

  const serieMensual = resumenMensual.filter(r => r.ingresos || r.gastos || r.aportes || r.retiros);

  let ac = 0;
  const utilidadAcumulada = serieMensual.map(r => { ac += r.ingresos - r.gastos; return { mes: r.mes, utilidad: ac }; });

  let saldoAc = saldoInicial;
  const flujo = serieMensual.map(r => {
    const entradas = r.ingresos + r.aportes; // Transferencias excluidas: son internas
    const salidas = r.gastos + r.retiros; // los retiros también sacan dinero de la empresa
    saldoAc += entradas - salidas;
    return { mes: r.mes, entradas, salidas, gastos: r.gastos, retiros: r.retiros, neto: entradas - salidas, saldo: saldoAc };
  });

  const totalMetaAds = resumenMensual.reduce((a, r) => a + r.metaAds, 0);
  const totalSoftwareIA = resumenMensual.reduce((a, r) => a + r.softwareIA, 0);
  const desgloseGastos = [
    { key: "meta", name: "Meta Ads", value: totalMetaAds },
    { key: "ia", name: "Software IA", value: totalSoftwareIA },
    { key: "otros", name: "Otros", value: Math.max(0, gastos - totalMetaAds - totalSoftwareIA) },
  ].filter(d => d.value > 0);
  const totalDesglose = desgloseGastos.reduce((a, b) => a + b.value, 0);

  const t = {};
  movsAno.filter(m => m.tipo === "Ingreso" && m.agencia).forEach(m => { t[m.agencia] = (t[m.agencia] || 0) + m.montoUSD; });
  const agencias = Object.entries(t).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const totalAgencias = agencias.reduce((a, b) => a + b.value, 0);

  const movsAnoRecientes = [...movsAno].reverse();

  return {
    movsAno, movsAnoRecientes, ingresos, aportes, gastos, retiros, utilidadNeta,
    cuentas, saldoTotal, saldoInicial, resumenMensual, serieMensual,
    utilidadAcumulada, flujo, desgloseGastos, totalDesglose, agencias, totalAgencias,
    ultimos: movsAnoRecientes.slice(0, 8),
  };
}

// ---- Formato ----
export const fmt = (n) => (n < 0 ? "−$" : "$") + Math.round(Math.abs(n)).toLocaleString("en-US");
export const fmt2 = (n) => (n < 0 ? "−$" : "$") + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtSigno = (n) => (n > 0 ? "+" : "") + fmt(n);
export const fmtCorto = (n) => {
  const a = Math.abs(n), s = n < 0 ? "−" : "";
  if (a >= 1e6) return s + "$" + (a / 1e6).toFixed(2) + "M";
  if (a >= 1e3) return s + "$" + (a / 1e3).toFixed(1) + "K";
  return s + "$" + Math.round(a);
};
export const fmtCLP = (n) => "$" + Math.round(n).toLocaleString("es-CL");
export const pct = (v, total) => (total > 0 ? Math.round((v / total) * 100) : 0);

const MESES_LARGOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
// "12/10/2026" -> "12 oct"
export function fechaCorta(fecha) {
  const p = String(fecha || "").split("/");
  if (p.length !== 3) return fecha || "";
  const mi = parseInt(p[1]) - 1;
  return `${parseInt(p[0])} ${MESES_LARGOS[mi] || ""}`.trim();
}

// Fecha de hoy en Chile en formato YYYY-MM-DD (para el input date)
export function hoyChile() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return parts; // en-CA ya entrega YYYY-MM-DD
}
