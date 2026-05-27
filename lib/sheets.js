const API_KEY = process.env.NEXT_PUBLIC_SHEETS_API_KEY;
const SHEET_ID = process.env.NEXT_PUBLIC_SHEET_ID;

const BASE = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values`;

async function fetchRange(range) {
  const url = `${BASE}/${encodeURIComponent(range)}?key=${API_KEY}`;
  const res = await fetch(url, { next: { revalidate: 300 } }); // cache 5 min
  if (!res.ok) throw new Error(`Sheets API error: ${res.status}`);
  const data = await res.json();
  return data.values || [];
}

export async function getResumenMensual() {
  const rows = await fetchRange("Resumen mensual!A1:I14");
  if (rows.length < 2) return [];

  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

  return rows.slice(1, 13).map((row, i) => ({
    mes: meses[i],
    ingresos: parseFloat((row[1] || "0").replace(/[^0-9.-]/g, "")) || 0,
    metaAds:  parseFloat((row[2] || "0").replace(/[^0-9.-]/g, "")) || 0,
    softwareIA: parseFloat((row[3] || "0").replace(/[^0-9.-]/g, "")) || 0,
    otrosGastos: parseFloat((row[4] || "0").replace(/[^0-9.-]/g, "")) || 0,
    totalGastos: parseFloat((row[5] || "0").replace(/[^0-9.-]/g, "")) || 0,
    utilidad: parseFloat((row[6] || "0").replace(/[^0-9.-]/g, "")) || 0,
  }));
}

export async function getMovimientos() {
  const rows = await fetchRange("Movimientos!A1:K200");
  if (rows.length < 2) return [];

  return rows.slice(1).filter(r => r[1]).map(row => ({
    id:          row[0] || "",
    fecha:       row[1] || "",
    tipo:        row[2] || "",
    categoria:   row[3] || "",
    montoUSD:    parseFloat((row[4] || "0").replace(/[^0-9.-]/g, "")) || 0,
    montoCLP:    parseFloat((row[5] || "0").replace(/[^0-9.-]/g, "")) || 0,
    cuenta:      row[6] || "",
    descripcion: row[7] || "",
    periodoAT:   row[8] || "",
  }));
}

export async function getConfig() {
  const rows = await fetchRange("Config!A1:B9");
  const config = {};
  rows.forEach(row => {
    if (row[0] && row[1]) config[row[0]] = row[1];
  });
  return {
    tipoCambio: parseFloat(config["Tipo de cambio vigente"]) || 940,
    empresa: config["Empresa"] || "Ecom Warrior LLC",
    anioTributario: config["Año tributario"] || "AT 2026",
  };
}
