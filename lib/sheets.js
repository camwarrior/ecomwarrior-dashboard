const API_KEY = process.env.SHEETS_API_KEY;
const SHEET_ID = process.env.SHEET_ID;
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
  if (str.includes("/")) {
    const [d, m, y] = str.split("/");
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  }
  return new Date(str);
}

function parseMonto(str) {
  return parseFloat((str || "0").replace(/[^0-9.-]/g, "")) || 0;
}

export async function getMovimientos() {
  const rows = await fetchRange("Movimientos!A1:M200");
  if (rows.length < 2) return [];
  return rows.slice(1).filter(r => r[1]).map(row => {
    const fecha = parseFecha(row[1]);
    return {
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
      anio:        fecha ? fecha.getFullYear() : 0,
    };
  });
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
