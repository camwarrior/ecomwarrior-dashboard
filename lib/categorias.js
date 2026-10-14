// Reglas de categorías del formulario, tomadas de la pestaña "Categorías" del Sheet:
// la columna Tipo decide en qué tipo de movimiento aparece cada categoría y
// la columna Cuenta válida sugiere la cuenta al elegirla.

// Orden de preferencia: Slash es el medio de pago principal.
export const CUENTAS = ["Slash", "Mercury", "Wise"];

// "Ingresos " -> "ingreso", "Aportes" -> "aporte"
export function normTipo(t) {
  return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .trim().toLowerCase().replace(/s$/, "");
}

// Admite varios tipos en una celda: "Gasto / Ingreso", "Gasto, Aporte"
export function tiposDe(cat) {
  return String(cat.tipo || "").split(/[\/,;|]|\sy\s/i).map(normTipo).filter(Boolean);
}

// Reglas definidas por Camilo que mandan sobre la columna Tipo del Sheet,
// para que el formulario sea correcto aunque esa columna tenga un error:
// - Comisiones: ingreso de afiliados (Skalers Network, Clickbank)
// - Aporte socio: aporte de capital, nunca ingreso ni gasto
// - Transferencia interna: solo transferencias (el formulario no pide categoría)
// - Retiro socio: va aparte, no es gasto de la empresa (pendiente de su propio tipo)
const TIPO_FIJO = {
  "comisiones": ["ingreso"],
  "aporte socio": ["aporte"],
  "transferencia interna": ["transferencia"],
  "retiro socio": ["retiro"],
};
const normNombre = (n) => String(n || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/\s+/g, " ").trim();

export function tiposEfectivos(cat) {
  return TIPO_FIJO[normNombre(cat.nombre)] || tiposDe(cat);
}

// Categorías válidas para un tipo. Una categoría sin Tipo en el Sheet aparece en todos.
export function categoriasPara(tipo, categorias) {
  const t = normTipo(tipo);
  return categorias.filter(c => {
    const ts = tiposEfectivos(c);
    return ts.length === 0 || ts.includes(t);
  });
}

// Cuenta sugerida por la categoría, si es una cuenta concreta ("Ambas" o vacío no sugiere nada)
export function cuentaDeCategoria(cat) {
  if (!cat || !cat.cuenta) return null;
  const c = CUENTAS.find(x => x.toLowerCase() === cat.cuenta.trim().toLowerCase());
  return c || null;
}
