import Head from "next/head";
import { useState, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { getMovimientos, getResumenMensual } from "../lib/sheets";
import StatCard from "../components/StatCard";
import SectionTitle from "../components/SectionTitle";

const fmt = (n) => `$${Math.round(n).toLocaleString("en-US")}`;
const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const COLORES_AGENCIA = ["#4ade80","#60a5fa","#fbbf24","#c084fc","#f87171","#34d399"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#111", border: "1px solid #2e2e2e", borderRadius: 8,
      padding: "10px 14px", fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
      <p style={{ color: "#888", marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>)}
    </div>
  );
};

export default function Dashboard({ movimientos, lastUpdated }) {
  const anos = useMemo(() => {
    const set = new Set(movimientos.map(m => m.anio).filter(Boolean));
    return [...set].sort((a, b) => b - a);
  }, [movimientos]);

  const [anoSeleccionado, setAnoSeleccionado] = useState(new Date().getFullYear());

  // Movimientos del año seleccionado (para P&L)
  const movsFiltrados = useMemo(() =>
    movimientos.filter(m => m.anio === anoSeleccionado),
    [movimientos, anoSeleccionado]
  );

  // Movimientos hasta el año seleccionado (para saldos acumulados)
  const movsHasta = useMemo(() =>
    movimientos.filter(m => m.anio <= anoSeleccionado),
    [movimientos, anoSeleccionado]
  );

  // P&L del año seleccionado
  const { ingresos, aportes, gastos } = useMemo(() => {
    let ingresos = 0, aportes = 0, gastos = 0;
    movsFiltrados.forEach(m => {
      if (m.tipo === "Ingreso")      ingresos += m.montoUSD;
      else if (m.tipo === "Aporte")  aportes  += m.montoUSD;
      else if (m.tipo === "Gasto")   gastos   += Math.abs(m.montoUSD);
    });
    return { ingresos, aportes, gastos };
  }, [movsFiltrados]);

  const utilidadNeta = ingresos - gastos;

  // Saldos acumulados hasta el año seleccionado
  const saldos = useMemo(() => {
    const s = {};
    movsHasta.forEach(m => {
      if (!s[m.cuenta]) s[m.cuenta] = 0;
      if (m.tipo === "Ingreso" || m.tipo === "Aporte") s[m.cuenta] += m.montoUSD;
      else if (m.tipo === "Gasto")                     s[m.cuenta] -= Math.abs(m.montoUSD);
      else if (m.tipo === "Transferencia")              s[m.cuenta] += m.montoUSD;
    });
    return s;
  }, [movsHasta]);

  const saldoMercury = saldos["Mercury"] || 0;
  const saldoSlash   = saldos["Slash"]   || 0;
  const saldoWise    = saldos["Wise"]    || 0;
  const saldoTotal   = saldoMercury + saldoSlash + saldoWise;

  // Resumen mensual calculado en cliente
  const resumenMensual = useMemo(() => {
    return MESES.map((mes, i) => {
      const mesNum = i + 1;
      const filasMes = movsFiltrados.filter(m => {
        const partes = m.fecha.split("/");
        return partes.length === 3 && parseInt(partes[1]) === mesNum;
      });
      const ing  = filasMes.filter(m => m.tipo === "Ingreso").reduce((s, m) => s + m.montoUSD, 0);
      const gas  = filasMes.filter(m => m.tipo === "Gasto").reduce((s, m) => s + Math.abs(m.montoUSD), 0);
      const metaAds    = filasMes.filter(m => m.categoria === "Meta Ads").reduce((s, m) => s + Math.abs(m.montoUSD), 0);
      const softwareIA = filasMes.filter(m => m.categoria === "Software IA").reduce((s, m) => s + Math.abs(m.montoUSD), 0);
      return { mes, ingresos: ing, totalGastos: gas, utilidad: ing - gas, metaAds, softwareIA };
    });
  }, [movsFiltrados]);

  let acumulado = 0;
  const utilidadAcumulada = resumenMensual.map(r => {
    acumulado += r.utilidad;
    return { mes: r.mes, acumulado };
  });

  const totalMetaAds    = resumenMensual.reduce((s, r) => s + r.metaAds, 0);
  const totalSoftwareIA = resumenMensual.reduce((s, r) => s + r.softwareIA, 0);
  const pieData = [
    { name: "Meta Ads",    value: totalMetaAds,    color: "#f87171" },
    { name: "Software IA", value: totalSoftwareIA, color: "#60a5fa" },
    { name: "Otros",       value: Math.max(0, gastos - totalMetaAds - totalSoftwareIA), color: "#fbbf24" },
  ].filter(d => d.value > 0);

  const agencias = useMemo(() => {
    const totales = {};
    movsFiltrados.filter(m => m.tipo === "Ingreso" && m.agencia).forEach(m => {
      totales[m.agencia] = (totales[m.agencia] || 0) + m.montoUSD;
    });
    return Object.entries(totales).map(([name, value], i) => ({
      name, value, color: COLORES_AGENCIA[i % COLORES_AGENCIA.length]
    }));
  }, [movsFiltrados]);

  const ultimos = [...movsFiltrados].reverse().slice(0, 8);

  return (
    <>
      <Head>
        <title>Ecom Warrior LLC — Dashboard</title>
        <meta name="robots" content="noindex" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        .grid-kpi  { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
        .grid-kpi2 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 40px; }
        .grid-2    { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
        .main-pad  { padding: 24px 40px; }
        .hpad      { padding: 20px 40px; }
        .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .ano-btn { background: transparent; border: 1px solid #2e2e2e; color: #888; padding: 6px 14px; border-radius: 6px; font-family: 'DM Mono', monospace; font-size: 12px; cursor: pointer; transition: all 0.15s; }
        .ano-btn:hover { border-color: #555; color: #e8e8e8; }
        .ano-btn.active { background: #e8e8e8; color: #0a0a0a; border-color: #e8e8e8; font-weight: 600; }
        @media (max-width: 768px) {
          .grid-kpi  { grid-template-columns: repeat(2, 1fr); }
          .grid-kpi2 { grid-template-columns: repeat(2, 1fr); }
          .grid-2    { grid-template-columns: 1fr; }
          .main-pad  { padding: 16px; }
          .hpad      { padding: 16px; }
        }
      `}</style>

      <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#e8e8e8" }}>

        <header className="hpad" style={{
          borderBottom: "1px solid #1a1a1a",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
        }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>Ecom Warrior LLC</h1>
            <p style={{ fontSize: 12, color: "#555", fontFamily: "'DM Mono', monospace", marginTop: 2, marginBottom: 0 }}>
              AT {anoSeleccionado + 1}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {anos.map(a => (
              <button key={a} className={`ano-btn${a === anoSeleccionado ? " active" : ""}`}
                onClick={() => setAnoSeleccionado(a)}>
                {a}
              </button>
            ))}
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 11, color: "#444", fontFamily: "'DM Mono', monospace", margin: 0 }}>Actualizado</p>
            <p style={{ fontSize: 12, color: "#666", fontFamily: "'DM Mono', monospace", margin: 0 }}>{lastUpdated}</p>
          </div>
        </header>

        <main className="main-pad" style={{ maxWidth: 1280, margin: "0 auto" }}>

          {/* KPIs P&L */}
          <div className="grid-kpi">
            <StatCard label="Ingresos reales" value={ingresos} color="green" sub="comisiones agencias" />
            <StatCard label="Aportes capital"  value={aportes}  color="blue"  sub="no tributable" />
            <StatCard label="Gastos totales"   value={gastos}   color="red" />
            <StatCard label="Utilidad neta"    value={utilidadNeta} color={utilidadNeta >= 0 ? "green" : "red"} sub="ingresos − gastos" />
          </div>

          {/* KPIs Saldos hasta año seleccionado */}
          <div className="grid-kpi2">
            <StatCard label="Saldo Mercury" value={saldoMercury} color="blue" />
            <StatCard label="Saldo Slash"   value={Math.abs(saldoSlash)} color="amber"
              sub={saldoSlash < 0 ? "gastos acumulados" : "saldo positivo"} />
            <StatCard label="Saldo Wise"    value={saldoWise} color="default" sub="cuenta inactiva" />
            <StatCard label="Saldo total"   value={saldoTotal} color={saldoTotal >= 0 ? "green" : "red"} sub={`acumulado hasta ${anoSeleccionado}`} />
          </div>

          {/* Ingresos vs Gastos */}
          <div style={{ marginBottom: 40 }}>
            <SectionTitle>Ingresos vs Gastos — {anoSeleccionado}</SectionTitle>
            <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 12, padding: "24px 16px" }}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={resumenMensual} barGap={4}>
                  <XAxis dataKey="mes" tick={{ fill: "#555", fontSize: 11, fontFamily: "'DM Mono'" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#555", fontSize: 11, fontFamily: "'DM Mono'" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toLocaleString()}`} width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Mono'", color: "#666" }} />
                  <Bar dataKey="ingresos"    name="Ingresos" fill="#4ade80" radius={[4,4,0,0]} maxBarSize={28} />
                  <Bar dataKey="totalGastos" name="Gastos"   fill="#f87171" radius={[4,4,0,0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Desglose + Utilidad acumulada */}
          <div className="grid-2">
            <div>
              <SectionTitle>Desglose de gastos — {anoSeleccionado}</SectionTitle>
              <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 12, padding: "24px 16px" }}>
                {pieData.length === 0 ? (
                  <p style={{ color: "#444", fontSize: 13, textAlign: "center", padding: "60px 0", fontFamily: "'DM Mono'" }}>Sin gastos en {anoSeleccionado}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" nameKey="name" paddingAngle={3}>
                        {pieData.map((e, i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Mono'", color: "#666" }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div>
              <SectionTitle>Utilidad acumulada — {anoSeleccionado}</SectionTitle>
              <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 12, padding: "24px 16px" }}>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={utilidadAcumulada}>
                    <XAxis dataKey="mes" tick={{ fill: "#555", fontSize: 11, fontFamily: "'DM Mono'" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#555", fontSize: 11, fontFamily: "'DM Mono'" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toLocaleString()}`} width={60} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="acumulado" name="Utilidad acumulada" stroke="#4ade80" strokeWidth={2} dot={{ fill: "#4ade80", r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Agencias */}
          <div className="grid-2">
            <div>
              <SectionTitle>Ingresos por agencia — {anoSeleccionado}</SectionTitle>
              <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 12, padding: "24px 16px" }}>
                {agencias.length === 0 ? (
                  <p style={{ color: "#444", fontSize: 13, textAlign: "center", padding: "60px 0", fontFamily: "'DM Mono'" }}>Sin ingresos por agencia en {anoSeleccionado}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={agencias} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" nameKey="name" paddingAngle={3}>
                        {agencias.map((e, i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Mono'", color: "#666" }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div>
              <SectionTitle>Detalle por agencia — {anoSeleccionado}</SectionTitle>
              <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 12, overflow: "hidden" }}>
                {agencias.length === 0 ? (
                  <p style={{ color: "#444", fontSize: 13, textAlign: "center", padding: "60px 20px", fontFamily: "'DM Mono'" }}>Se mostrará cuando entren pagos</p>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                        {["Agencia","Total USD","% del total"].map(h => (
                          <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 10,
                            letterSpacing: "0.12em", textTransform: "uppercase", color: "#444", fontFamily: "'DM Mono'", fontWeight: 400 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {agencias.map((a, i) => {
                        const total = agencias.reduce((s, x) => s + x.value, 0);
                        const pct = total > 0 ? ((a.value / total) * 100).toFixed(1) : "0";
                        return (
                          <tr key={i} style={{ borderBottom: "1px solid #161616" }}>
                            <td style={{ ...tdStyle, display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ width: 8, height: 8, borderRadius: "50%", background: a.color, display: "inline-block" }} />
                              {a.name}
                            </td>
                            <td style={{ ...tdStyle, color: "#4ade80", fontFamily: "'DM Mono'" }}>{fmt(a.value)}</td>
                            <td style={{ ...tdStyle, color: "#666", fontFamily: "'DM Mono'" }}>{pct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Últimos movimientos */}
          <div>
            <SectionTitle>Últimos movimientos — {anoSeleccionado}</SectionTitle>
            <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 12, overflow: "hidden" }}>
              {ultimos.length === 0 ? (
                <p style={{ color: "#444", fontSize: 13, textAlign: "center", padding: "40px 0", fontFamily: "'DM Mono'" }}>Sin movimientos en {anoSeleccionado}</p>
              ) : (
                <div className="table-wrap">
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                        {["Fecha","Tipo","Categoría","Monto USD","Cuenta","Descripción"].map(h => (
                          <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 10,
                            letterSpacing: "0.12em", textTransform: "uppercase", color: "#444", fontFamily: "'DM Mono'", fontWeight: 400 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ultimos.map((m, i) => {
                        const esPositivo = m.montoUSD >= 0;
                        const colorTipo =
                          m.tipo === "Ingreso"       ? { bg: "#16391f", text: "#4ade80" } :
                          m.tipo === "Aporte"        ? { bg: "#172038", text: "#60a5fa" } :
                          m.tipo === "Transferencia" ? { bg: "#2d2009", text: "#fbbf24" } :
                                                       { bg: "#3b1a1a", text: "#f87171" };
                        return (
                          <tr key={i} style={{ borderBottom: "1px solid #161616" }}>
                            <td style={tdStyle}>{m.fecha}</td>
                            <td style={tdStyle}>
                              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20,
                                fontFamily: "'DM Mono'", background: colorTipo.bg, color: colorTipo.text }}>
                                {m.tipo}
                              </span>
                            </td>
                            <td style={tdStyle}>{m.categoria}</td>
                            <td style={{ ...tdStyle, color: esPositivo ? "#4ade80" : "#f87171", fontFamily: "'DM Mono'" }}>
                              {esPositivo ? "+" : "-"}{fmt(Math.abs(m.montoUSD))}
                            </td>
                            <td style={{ ...tdStyle, color: "#888", fontFamily: "'DM Mono'", fontSize: 11 }}>{m.cuenta}</td>
                            <td style={{ ...tdStyle, color: "#666", whiteSpace: "nowrap" }}>{m.descripcion}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </main>
      </div>
    </>
  );
}

const tdStyle = { padding: "12px 16px", fontSize: 12, color: "#888", verticalAlign: "middle" };

export async function getServerSideProps() {
  try {
    const movimientos = await getMovimientos();
    return {
      props: {
        movimientos,
        lastUpdated: new Date().toLocaleString("es-CL", {
          day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
        }),
      },
    };
  } catch (e) {
    console.error("Error:", e.message);
    return { props: { movimientos: [], lastUpdated: "—" } };
  }
}
