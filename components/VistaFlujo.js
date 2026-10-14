import { FlujoCompuesto } from "./graficos";
import { fmt } from "../lib/calculos";

export default function VistaFlujo({ c, ano, paleta }) {
  const cierre = c.flujo.length ? c.flujo[c.flujo.length - 1].saldo : c.saldoInicial;
  const totEntradas = c.flujo.reduce((a, f) => a + f.entradas, 0);
  const totSalidas = c.flujo.reduce((a, f) => a + f.salidas, 0);

  return (
    <>
      <section className="ew-strip" aria-label={`Flujo ${ano}`}>
        <div><div className="k">Saldo inicial</div><div className="v num">{fmt(c.saldoInicial)}</div><div className="s">Cierre {ano - 1}</div></div>
        <div><div className="k">Entradas</div><div className="v num">{fmt(totEntradas)}</div><div className="s">Ingresos y aportes</div></div>
        <div><div className="k">Salidas</div><div className="v num">{fmt(totSalidas)}</div><div className="s">Gastos</div></div>
        <div><div className="k">Saldo actual</div><div className={"v num" + (cierre < 0 ? " neg-text" : "")}>{fmt(cierre)}</div><div className="s">Transferencias internas excluidas</div></div>
      </section>

      <div className="ew-card">
        <div className="ew-cardhead">
          <h2>Movimiento mensual y saldo</h2>
          <div className="ew-legend">
            <span><i className="ew-sw" style={{ background: "var(--accent)" }} />Entradas</span>
            <span><i className="ew-sw" style={{ background: "var(--gasto)" }} />Salidas</span>
            <span><i className="ew-sw" style={{ background: "var(--text)", height: 3, borderRadius: 2 }} />Saldo</span>
          </div>
        </div>
        {c.flujo.length ? <FlujoCompuesto data={c.flujo} c={paleta} /> : <p className="ew-empty">Sin movimientos en {ano}.</p>}
      </div>

      <div className="ew-card">
        <div className="ew-cardhead"><h2>Detalle mensual</h2><span className="meta">USD</span></div>

        {/* Escritorio: tabla */}
        <div className="ew-tablewrap solo-escritorio">
          <table className="ew-table">
            <thead><tr><th>Período</th><th>Entradas</th><th>Salidas</th><th>Neto</th><th>Saldo acumulado</th></tr></thead>
            <tbody>
              <tr className="ini">
                <td>Saldo inicial<span className="ew-tag">Apertura · cierre {ano - 1}</span></td>
                <td style={{ color: "var(--faint)" }}>—</td><td style={{ color: "var(--faint)" }}>—</td><td style={{ color: "var(--faint)" }}>—</td>
                <td style={{ fontWeight: 600 }} className={c.saldoInicial < 0 ? "neg-text" : "pos-text"}>{fmt(c.saldoInicial)}</td>
              </tr>
              <tr className="sep"><td colSpan={5}>Movimientos {ano}</td></tr>
              {c.flujo.map(f => (
                <tr key={f.mes}>
                  <td>{f.mes}</td>
                  <td>{fmt(f.entradas)}</td>
                  <td>{fmt(f.salidas)}</td>
                  <td className={f.neto < 0 ? "neg-text" : ""}>{fmt(f.neto)}</td>
                  <td style={{ fontWeight: 600 }}>{fmt(f.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* iPhone: lista */}
        <div className="solo-movil">
          <div className="ew-mes" style={{ background: "var(--pos-soft)", borderRadius: 12, padding: "12px", borderBottom: "none", marginBottom: 6 }}>
            <span className="m">Saldo inicial</span>
            <span className={"sa " + (c.saldoInicial < 0 ? "neg-text" : "pos-text")}>{fmt(c.saldoInicial)}</span>
            <span className="d">Apertura · cierre {ano - 1}</span>
          </div>
          {c.flujo.map(f => (
            <div className="ew-mes" key={f.mes}>
              <span className="m">{f.mes}</span>
              <span className="sa">{fmt(f.saldo)}</span>
              <span className="d">Entradas {fmt(f.entradas)} · Salidas {fmt(f.salidas)} · Neto {fmt(f.neto)}</span>
            </div>
          ))}
          {!c.flujo.length && <p className="ew-empty">Sin movimientos en {ano}.</p>}
        </div>
      </div>
    </>
  );
}
