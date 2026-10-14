import { BarrasMensuales, AreaUtilidad } from "./graficos";
import ListaMovimientos from "./ListaMovimientos";
import { IRefrescar } from "./iconos";
import { fmt, fmt2, fmtSigno, pct } from "../lib/calculos";

function Dinero({ valor }) {
  const [ent, dec] = fmt2(valor).split(".");
  return <>{ent}<span className="dec">.{dec}</span></>;
}

const COLOR_DESGLOSE = { meta: "var(--gasto)", ia: "var(--accent)", otros: "var(--neutral-bar)" };
const AVATAR = { Mercury: "av-mercury", Slash: "av-slash" };

export default function VistaInicio({ c, ano, actualizado, refrescar, refrescando, paleta, irA }) {
  const utilPos = c.utilidadNeta >= 0;
  const principal = c.desgloseGastos[0];

  return (
    <>
      {/* Saldo: escritorio */}
      <section className="ew-hero solo-escritorio">
        <div>
          <div className="label">Saldo en tus cuentas</div>
          <div className="big num"><Dinero valor={c.saldoTotal} /></div>
          <div className="sub">
            <span className={"ew-pill num " + (utilPos ? "pos" : "neg")}>{fmtSigno(c.utilidadNeta)} utilidad {ano}</span>
            <span>Se declara en Operación Renta {ano + 1}</span>
          </div>
        </div>
        <div className="ew-meta-row">
          <span>Actualizado {actualizado}</span>
          <button className="ew-iconbtn" onClick={refrescar} disabled={refrescando} aria-label="Actualizar datos">
            <IRefrescar size={16} className={refrescando ? "spin" : ""} />
          </button>
        </div>
      </section>

      {/* Saldo: iPhone */}
      <section className="ew-mcard solo-movil" aria-label="Saldo en cuentas">
        <div className="label">Saldo en tus cuentas</div>
        <div className="big"><Dinero valor={c.saldoTotal} /></div>
        <div className="chips">
          {c.cuentas.map(a => (
            <div key={a.name} className={a.inactiva ? "inact" : ""}>
              <div className="n">{a.name}</div>
              <div className="v">{fmt(a.saldo)}</div>
            </div>
          ))}
        </div>
        <div className="upd">
          <span>Actualizado {actualizado}</span>
          <button onClick={refrescar} disabled={refrescando} aria-label="Actualizar datos">
            <IRefrescar size={14} className={refrescando ? "spin" : ""} />{refrescando ? "Actualizando" : "Actualizar"}
          </button>
        </div>
      </section>

      <section className="ew-strip" aria-label={`Resumen ${ano}`}>
        <div><div className="k">Ingresos</div><div className="v num">{fmt(c.ingresos)}</div><div className="s">Comisiones, tributan</div></div>
        <div><div className="k">Aportes de capital</div><div className="v num">{fmt(c.aportes)}</div><div className="s">Tu dinero, no tributa</div></div>
        <div><div className="k">Gastos</div><div className="v num">{fmt(c.gastos)}</div>
          <div className="s">{principal ? `${pct(principal.value, c.totalDesglose)}% en ${principal.name}` : "Operacionales"}</div></div>
        <div><div className="k">Utilidad neta</div><div className={"v num " + (utilPos ? "pos-text" : "neg-text")}>{fmtSigno(c.utilidadNeta)}</div><div className="s">Ingresos menos gastos</div></div>
      </section>

      <section className="ew-g2">
        <div className="ew-card solo-escritorio">
          <div className="ew-cardhead">
            <h2>Ingresos y gastos por mes</h2>
            <div className="ew-legend">
              <span><i className="ew-sw" style={{ background: "var(--accent)" }} />Ingresos</span>
              <span><i className="ew-sw" style={{ background: "var(--gasto)" }} />Gastos</span>
            </div>
          </div>
          {c.serieMensual.length ? <BarrasMensuales data={c.serieMensual} c={paleta} /> : <p className="ew-empty">Sin movimientos en {ano}.</p>}
        </div>

        <div className="ew-card solo-escritorio" style={{ display: "flex", flexDirection: "column" }}>
          <div className="ew-cardhead"><h2>Cuentas</h2><span className="meta num">Total {fmt(c.saldoTotal)}</span></div>
          {c.cuentas.map(a => (
            <div className={"ew-acct" + (a.inactiva ? " ew-inactiva" : "")} key={a.name}>
              <div className={"av " + (AVATAR[a.name] || "av-otra")}>{a.name[0]}</div>
              <div><div className="nm">{a.name}</div><div className="ds">{a.desc}</div></div>
              <div className={"sd" + (a.saldo < 0 ? " neg-text" : "")}>{fmt2(a.saldo)}</div>
            </div>
          ))}
          <button className="ew-btn ew-btn-ghost" style={{ marginTop: "auto", borderRadius: 12 }} onClick={() => irA("agregar", "Transferencia")}>
            Transferir entre cuentas
          </button>
        </div>

        <div className="ew-card solo-movil">
          <div className="ew-cardhead"><h2>Utilidad acumulada</h2><span className="meta">{ano}</span></div>
          {c.utilidadAcumulada.length ? <AreaUtilidad data={c.utilidadAcumulada} c={paleta} /> : <p className="ew-empty">Sin movimientos en {ano}.</p>}
        </div>
      </section>

      <section className="ew-g3">
        <div className="ew-card">
          <h2>En qué se va el dinero</h2>
          <div className="num" style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 14 }}>{fmt(c.gastos)}</div>
          {c.desgloseGastos.length ? (
            <>
              <div className="ew-stack">
                {c.desgloseGastos.map(d => <div key={d.key} style={{ width: `${(d.value / c.totalDesglose) * 100}%`, background: COLOR_DESGLOSE[d.key] }} />)}
              </div>
              <div className="ew-rows">
                {c.desgloseGastos.map(d => (
                  <div className="ew-row" key={d.key}>
                    <i className="ew-dot" style={{ background: COLOR_DESGLOSE[d.key] }} />{d.name}
                    <span className="r1 num">{fmt(d.value)}</span>
                    <span className="r2 num">{pct(d.value, c.totalDesglose)}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="ew-empty">Sin gastos en {ano}.</p>}
        </div>

        <div className="ew-card">
          <h2 style={{ marginBottom: 14 }}>De dónde vienen los ingresos</h2>
          {c.agencias.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {c.agencias.map(a => (
                <div key={a.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14, marginBottom: 8 }}>
                    <span style={{ fontWeight: 500 }}>{a.name}</span><span className="num">{fmt(a.value)}</span>
                  </div>
                  <div className="ew-track"><div style={{ width: `${pct(a.value, c.totalAgencias)}%` }} /></div>
                  <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 6 }}>{pct(a.value, c.totalAgencias)}% del total</div>
                </div>
              ))}
            </div>
          ) : <p className="ew-empty">Sin ingresos por agencia en {ano}.</p>}
        </div>

        <div className="ew-card span-all ultimos">
          <div className="ew-cardhead">
            <h2>Últimos movimientos</h2>
            <button className="ew-link" onClick={() => irA("movimientos")}>Ver todos</button>
          </div>
          <ListaMovimientos items={c.ultimos.slice(0, 5)} vacio={`Sin movimientos en ${ano}.`} />
        </div>
      </section>
    </>
  );
}
