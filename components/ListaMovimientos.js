import { IconoTipo, claseTipo } from "./iconos";
import { fmt2, fechaCorta } from "../lib/calculos";
import { precargarComprobante, anchoFicha } from "../lib/comprobante";

function montoTexto(m) {
  const a = Math.abs(m.montoUSD);
  if (m.tipo === "Gasto" || m.tipo === "Retiro") return { txt: "−" + fmt2(a), cls: "" };
  if (m.tipo === "Ingreso" || m.tipo === "Aporte") return { txt: "+" + fmt2(a), cls: "pos-text" };
  return { txt: fmt2(m.montoUSD), cls: "muted" };
}

// onSelect (opcional): al tocar un movimiento se abre su ficha
export default function ListaMovimientos({ items, vacio = "Sin movimientos en este año.", onSelect }) {
  if (!items.length) return <p className="ew-empty">{vacio}</p>;
  return (
    <div>
      {items.map((m, i) => {
        const titulo = m.descripcion || m.categoria || m.tipo;
        const detalle = [fechaCorta(m.fecha), m.cuenta, m.descripcion && m.categoria ? m.categoria : null, m.tipo === "Ingreso" ? m.agencia : null]
          .filter(Boolean).join(" · ");
        const monto = montoTexto(m);
        const contenido = (
          <>
            <div className={"ic " + claseTipo(m.tipo)}><IconoTipo tipo={m.tipo} /></div>
            <div className="tx">
              <div className="t1">{titulo}</div>
              <div className="t2">{detalle}</div>
            </div>
            <div className={"amt " + monto.cls} style={monto.cls === "muted" ? { color: "var(--muted)" } : undefined}>{monto.txt}</div>
          </>
        );
        const key = (m.fila || m.id || "") + "-" + i;
        return onSelect && m.fila ? (
          <button type="button" className="ew-mov sel" key={key} onClick={() => onSelect(m)}
            onPointerDown={() => precargarComprobante(m, anchoFicha())}
            aria-label={`Ver detalle: ${titulo}, ${monto.txt}, ${fechaCorta(m.fecha)}`}>{contenido}</button>
        ) : (
          <div className="ew-mov" key={key}>{contenido}</div>
        );
      })}
    </div>
  );
}
