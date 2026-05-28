const API_KEY = process.env.NEXT_PUBLIC_SHEETS_API_KEY;
const SHEET_ID = process.env.NEXT_PUBLIC_SHEET_ID;
const BASE = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values`;

async function fetchRange(range) {
  const url = `${BASE}/${encodeURIComponent(range)}?key=${API_KEY}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Sheets API error: ${res.status}`);
  const data = await res.json();
  return data.values || [];
}

function parseFecha(str) {
  if (!str) return null;
  // DD/MM/YYYY
  if (str.includes("/")) {
    const [d, m, y] = str.split("/");
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  }
  return new Date(str);
}

function parseMonto(str) {
  return parseFloat((str || "0").replace(/[^0-9.-]/g, "")) || 0;
}

export async function getResumenMensual() {
  const rows = await fetchRange("Resumen mensual!A1:I14");
  if (rows.length < 2) return [];
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return rows.slice(1, 13).map((row, i) => ({
    mes:         meses[i],
    ingresos:    parseMonto(row[1]),
    metaAds:     parseMonto(row[2]),
    softwareIA:  parseMonto(row[3]),
    otrosGastos: parseMonto(row[4]),
    totalGastos: parseMonto(row[5]),
    utilidad:    parseMonto(row[6]),
  }));
}

export async function getMovimientos() {
  const rows = await fetchRange("Movimientos!A1:M200");
  if (rows.length < 2) return [];
  return rows.slice(1).filter(r => r[1]).map(row => ({
    id:          row[0] || "",
    fecha:       row[1] || "",
    tipo:        (row[2] || "").trim(),
    categoria:   row[3] || "",
    montoUSD:    parseMonto(row[4]),
    montoCLP:    parseMonto(row[5]),
    cuenta:      row[6] || "",
    descripcion: row[7] || "",
    periodoAT:   row[8] || "",
    agencia:     row[11] || "",
    tcDia:       parseMonto(row[12]),
  }));
}

export async function getSaldosPorCuenta() {
  const rows = await fetchRange("Movimientos!A1:M200");
  if (rows.length < 2) return {};
  const saldos = {};
  rows.slice(1).filter(r => r[1] && r[6]).forEach(row => {
    const tipo   = (row[2] || "").trim();
    const monto  = parseMonto(row[4]);
    const cuenta = row[6] || "";
    if (!saldos[cuenta]) saldos[cuenta] = 0;
    if (tipo === "Ingreso" || tipo === "Aporte") saldos[cuenta] += monto;
    else if (tipo === "Gasto")                   saldos[cuenta] -= Math.abs(monto);
    else if (tipo === "Transferencia")            saldos[cuenta] += monto;
  });
  return saldos;
}

export async function getTotalesAnuales() {
  const rows = await fetchRange("Movimientos!A1:M200");
  if (rows.length < 2) return { ingresos: 0, aportes: 0, gastos: 0 };
  const anioActual = new Date().getFullYear();
  let ingresos = 0, aportes = 0, gastos = 0;

  rows.slice(1).filter(r => r[1]).forEach(row => {
    const fecha = parseFecha(row[1]);
    if (!fecha || fecha.getFullYear() !== anioActual) return;
    const tipo  = (row[2] || "").trim();
    const monto = parseMonto(row[4]);
    if (tipo === "Ingreso")      ingresos += monto;
    else if (tipo === "Aporte")  aportes  += monto;
    else if (tipo === "Gasto")   gastos   += Math.abs(monto);
  });
  return { ingresos, aportes, gastos };
}

export async function getIngresosPorAgencia() {
  const rows = await fetchRange("Movimientos!A1:M200");
  if (rows.length < 2) return [];
  const totales = {};
  const anioActual = new Date().getFullYear();
  rows.slice(1).filter(r => r[1] && r[2] === "Ingreso" && r[11]).forEach(row => {
    const fecha = parseFecha(row[1]);
    if (!fecha || fecha.getFullYear() !== anioActual) return;
    const agencia = row[11];
    const monto = parseMonto(row[4]);
    totales[agencia] = (totales[agencia] || 0) + monto;
  });
  const colores = ["#4ade80", "#60a5fa", "#fbbf24", "#c084fc", "#f87171", "#34d399"];
  return Object.entries(totales).map(([name, value], i) => ({ name, value, color: colores[i % colores.length] }));
}
