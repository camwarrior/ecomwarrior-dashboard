import crypto from "crypto";

const API_KEY = process.env.SHEETS_API_KEY;
const SHEET_ID = process.env.SHEET_ID;
const BASE = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values`;

// ---- Acceso al Sheet ----
// Con GOOGLE_SERVICE_ACCOUNT (el JSON de la clave de la cuenta de servicio, tal
// cual o en base64) el dashboard lee el Sheet como esa cuenta y el Sheet puede
// ser privado. Sin esa variable usa SHEETS_API_KEY (Sheet público por enlace).
// Si la variable existe pero está mal, falla en vez de volver a la API key,
// para que el problema se note.
const SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
let cuentaServicio; // undefined = sin leer; null = no configurada
let tokenCache = { token: null, vence: 0 };

function leerCuentaServicio() {
  if (cuentaServicio !== undefined) return cuentaServicio;
  const raw = (process.env.GOOGLE_SERVICE_ACCOUNT || "").trim();
  if (!raw) return (cuentaServicio = null);
  let json;
  try {
    json = JSON.parse(raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT no es un JSON válido");
  }
  if (!json.client_email || !json.private_key) throw new Error("GOOGLE_SERVICE_ACCOUNT sin client_email o private_key");
  // Si la clave se pegó con los saltos de línea escritos como \n, se normalizan
  return (cuentaServicio = { email: json.client_email, key: json.private_key.replace(/\\n/g, "\n") });
}

const b64url = (v) => Buffer.from(v).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

async function tokenDeAcceso(sa) {
  const ahora = Math.floor(Date.now() / 1000);
  if (tokenCache.token && tokenCache.vence - 60 > ahora) return tokenCache.token;
  const cabecera = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const cuerpo = b64url(JSON.stringify({ iss: sa.email, scope: SCOPE, aud: "https://oauth2.googleapis.com/token", iat: ahora, exp: ahora + 3600 }));
  const firma = crypto.createSign("RSA-SHA256").update(`${cabecera}.${cuerpo}`).sign(sa.key);
  const jwt = `${cabecera}.${cuerpo}.${b64url(firma)}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google token error: ${res.status}`);
  const data = await res.json();
  tokenCache = { token: data.access_token, vence: ahora + (data.expires_in || 3600) };
  return tokenCache.token;
}

// render = "FORMULA" devuelve las fórmulas (p. ej. el HYPERLINK del comprobante)
async function fetchRange(range, render) {
  const sa = leerCuentaServicio();
  const params = new URLSearchParams();
  if (render) params.set("valueRenderOption", render);
  const headers = {};
  if (sa) headers.Authorization = `Bearer ${await tokenDeAcceso(sa)}`;
  else params.set("key", API_KEY);
  const res = await fetch(`${BASE}/${encodeURIComponent(range)}?${params}`, { headers, cache: "no-store" });
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

// ID del archivo de Drive dentro de =HYPERLINK("https://drive.google.com/file/d/ID/view…","nombre")
function idDrive(formula) {
  const m = String(formula || "").match(/\/d\/([\w-]{20,})|[?&]id=([\w-]{20,})/);
  return m ? (m[1] || m[2]) : "";
}

export async function getMovimientos() {
  // Valores y fórmulas de la columna Comprobante en paralelo (no suma tiempo de espera)
  const [rows, formulas] = await Promise.all([
    fetchRange("Movimientos!A1:M"),
    fetchRange("Movimientos!J1:J", "FORMULA").catch(() => []),
  ]);
  if (rows.length < 2) return [];
  // fila = número de fila real en el Sheet (para poder editar ese movimiento)
  return rows.slice(1).map((row, i) => ({ row, fila: i + 2 })).filter(x => x.row[1]).map(({ row, fila }) => {
    const fecha = parseFecha(row[1]);
    return {
      fila,
      id:          row[0] || "",
      fecha:       row[1] || "",
      tipo:        (row[2] || "").trim(),
      categoria:   row[3] || "",
      montoUSD:    parseMonto(row[4]),
      montoCLP:    parseMonto(row[5]),
      cuenta:      row[6] || "",
      descripcion: row[7] || "",
      periodoAT:   row[8] || "",
      comprobante: row[9] || "",
      compId:      idDrive(formulas[fila - 1] && formulas[fila - 1][0]),
      notas:       row[10] || "",
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

export async function getCategorias() {
  const rows = await fetchRange("Categorías!A1:A100");
  if (rows.length < 2) return [];
  return rows.slice(1).map(r => (r[0] || "").trim()).filter(Boolean);
}

// Categorías con su Tipo (col B) y Cuenta válida (col C), para filtrar el formulario
export async function getCategoriasDetalle() {
  const rows = await fetchRange("Categorías!A1:C100");
  if (rows.length < 2) return [];
  return rows.slice(1)
    .map(r => ({ nombre: (r[0] || "").trim(), tipo: (r[1] || "").trim(), cuenta: (r[2] || "").trim() }))
    .filter(c => c.nombre);
}

export async function getAgencias() {
  const rows = await fetchRange("Agencias!A1:A100");
  if (rows.length < 2) return [];
  return rows.slice(1).map(r => (r[0] || "").trim()).filter(Boolean);
}
