// Reglas de categorías del formulario, tomadas de la pestaña "Categorías" del Sheet:
// la columna Tipo decide en qué tipo de movimiento aparece cada categoría y
// la columna Cuenta válida sugiere la cuenta al elegirla.

export const CUENTAS = ["Mercury", "Slash", "Wise"];

// "Ingresos " -> "ingreso", "Aportes" -> "aporte"
export function normTipo(t) {
  return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .trim().toLowerCase().replace(/s$/, "");
}

// Admite varios tipos en una celda: "Gasto / Ingreso", "Gasto, Aporte"
export function tiposDe(cat) {
  return String(cat.tipo || "").split(/[\/,;|]|\sy\s/i).map(normTipo).filter(Boolean);
}

// Categorías válidas para un tipo. Una categoría sin Tipo en el Sheet aparece en todos.
export function categoriasPara(tipo, categorias) {
  const t = normTipo(tipo);
  return categorias.filter(c => {
    const ts = tiposDe(c);
    return ts.length === 0 || ts.includes(t);
  });
}

// Cuenta sugerida por la categoría, si es una cuenta concreta ("Ambas" o vacío no sugiere nada)
export function cuentaDeCategoria(cat) {
  if (!cat || !cat.cuenta) return null;
  const c = CUENTAS.find(x => x.toLowerCase() === cat.cuenta.trim().toLowerCase());
  return c || null;
}
