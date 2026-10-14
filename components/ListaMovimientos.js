import { IconoTipo, claseTipo } from "./iconos";
import { fmt2, fechaCorta } from "../lib/calculos";

function montoTexto(m) {
  const a = Math.abs(m.montoUSD);
  if (m.tipo === "Gasto") return { txt: "−" + fmt2(a), cls: "" };
  if (m.tipo === "Ingreso" || m.tipo === "Aporte") return { txt: "+" + fmt2(a), cls: "pos-text" };
  return { txt: fmt2(m.montoUSD), cls: "muted" };
}

export default function ListaMovimientos({ items, vacio = "Sin movimientos en este año." }) {
  if (!items.length) return <p className="ew-empty">{vacio}</p>;
  return (
    <div>
      {items.map((m, i) => {
        const titulo = m.descripcion || m.categoria || m.tipo;
        const detalle = [fechaCorta(m.fecha), m.cuenta, m.descripcion && m.categoria ? m.categoria : null, m.tipo === "Ingreso" ? m.agencia : null]
          .filter(Boolean).join(" · ");
        const monto = montoTexto(m);
        return (
          <div className="ew-mov" key={(m.id || "") + "-" + i}>
            <div className={"ic " + claseTipo(m.tipo)}><IconoTipo tipo={m.tipo} /></div>
            <div className="tx">
              <div className="t1">{titulo}</div>
              <div className="t2">{detalle}</div>
            </div>
            <div className={"amt " + monto.cls} style={monto.cls === "muted" ? { color: "var(--muted)" } : undefined}>{monto.txt}</div>
          </div>
        );
      })}
    </div>
  );
}
