import { useMemo, useState } from "react";
import ListaMovimientos from "./ListaMovimientos";

const FILTROS = ["Todos", "Ingreso", "Aporte", "Gasto", "Retiro", "Transferencia"];
const ETIQUETA = { Todos: "Todos", Ingreso: "Ingresos", Aporte: "Aportes", Gasto: "Gastos", Retiro: "Retiros", Transferencia: "Transferencias" };

export default function VistaMovimientos({ c, ano }) {
  const [filtro, setFiltro] = useState("Todos");
  const [busca, setBusca] = useState("");

  const items = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return c.movsAnoRecientes.filter(m =>
      (filtro === "Todos" || m.tipo === filtro) &&
      (!q || [m.descripcion, m.categoria, m.cuenta, m.agencia].some(v => String(v || "").toLowerCase().includes(q)))
    );
  }, [c.movsAnoRecientes, filtro, busca]);

  return (
    <div className="ew-card">
      <div className="ew-cardhead">
        <h2>Movimientos {ano}</h2>
        <span className="meta">{items.length} de {c.movsAno.length}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, margin: "6px 0 8px" }}>
        <div className="ew-chips" role="group" aria-label="Filtrar por tipo">
          {FILTROS.map(f => (
            <button key={f} className={"ew-chip" + (filtro === f ? " on" : "")} aria-pressed={filtro === f} onClick={() => setFiltro(f)}>{ETIQUETA[f]}</button>
          ))}
        </div>
        <label htmlFor="mov-buscar" className="sr-only">Buscar movimientos</label>
        <input id="mov-buscar" type="search" placeholder="Buscar movimientos" value={busca} onChange={e => setBusca(e.target.value)}
          style={{ width: "100%", border: "1px solid var(--line)", background: "var(--bg)", borderRadius: 12, padding: "0 14px", minHeight: 44, fontSize: 16, color: "var(--text)", outline: "none" }} />
      </div>
      <ListaMovimientos items={items} vacio={busca || filtro !== "Todos" ? "Ningún movimiento coincide con el filtro." : `Sin movimientos en ${ano}.`} />
    </div>
  );
}
