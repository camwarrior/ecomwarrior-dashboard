import Head from "next/head";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { getResumenMensual, getMovimientos, getConfig, getSaldosPorCuenta, getIngresosPorAgencia } from "../lib/sheets";
import StatCard from "../components/StatCard";
import SectionTitle from "../components/SectionTitle";

const fmt = (n) => `$${Math.round(n).toLocaleString("en-US")}`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#111", border: "1px solid #2e2e2e", borderRadius: 8,
      padding: "10px 14px", fontFamily: "'DM Mono', monospace", fontSize: 12,
    }}>
      <p style={{ color: "#888", marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  );
};

export default function Dashboard({ resumen, movimientos, config, saldos, agencias, lastUpdated }) {
  const soloIngresos = resumen.reduce((s, r) => s + r.ingresos, 0);
  const soloGastos   = resumen.reduce((s, r) => s + r.totalGastos, 0);
  const utilidadNeta = soloIngresos - soloGastos;
  const totalMetaAds    = resumen.reduce((s, r) => s + r.metaAds, 0);
  const totalSoftwareIA = resumen.reduce((s, r) => s + r.softwareIA, 0);

  const saldoMercury = saldos["Mercury"] || 0;
  const saldoSlash   = saldos["Slash"]   || 0;
  const saldoWise    = saldos["Wise"]    || 0;

  let acumulado = 0;
  const utilidadAcumulada = resumen.map(r => {
    acumulado += r.utilidad;
    return { mes: r.mes, acumulado };
  });

  const pieData = [
    { name: "Meta Ads",    value: totalMetaAds,    color: "#f87171" },
    { name: "Software IA", value: totalSoftwareIA, color: "#60a5fa" },
    { name: "Otros",       value: resumen.reduce((s, r) => s + r.otrosGastos, 0), color: "#fbbf24" },
  ].filter(d => d.value > 0);

  const ultimos = [...movimientos].reverse().slice(0, 8);

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
        .grid-kpi { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 40px; }
        .grid-charts { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
        .grid-agencias { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
        .main-pad { padding: 24px 40px; }
        .header-pad { padding: 20px 40px; }
        .table-scroll { overflow-x: auto; }
        .hide-mobile { display: table-cell; }
        @media (max-width: 768px) {
          .grid-kpi { grid-template-columns: repeat(2, 1fr); }
          .grid-charts { grid-template-columns: 1fr; }
          .grid-agencias { grid-template-columns: 1fr; }
          .main-pad { padding: 16px; }
          .header-pad { padding: 16px; }
          .hide-mobile { display: none; }
        }
        @media (max-width: 480px) {
          .grid-kpi { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#e8e8e8" }}>

        {/* Header */}
        <header className="header-pad" style={{
          borderBottom: "1px solid #1a1a1a",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
              Ecom Warrior LLC
            </h1>
            <p style={{ fontSize: 12, color: "#555", fontFamily: "'DM Mono', monospace", marginTop: 2, marginBottom: 0 }}>
              {config.anioTributario} · TC ${config.tipoCambio.toLocaleString("es-CL")} CLP/USD
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 11, color: "#444", fontFamily: "'DM Mono', monospace", margin: 0 }}>Actualizado</p>
            <p style={{ fontSize: 12, color: "#666", fontFamily: "'DM Mono', monospace", margin: 0 }}>{lastUpdated}</p>
          </div>
        </header>

        <main className="main-pad" style={{ maxWidth: 1280, margin: "0 auto" }}>

          {/* KPIs */}
          <div className="grid-kpi">
            <StatCard label="Ingresos totales" value={soloIngresos} color="green" />
            <StatCard label="Gastos totales"   value={soloGastos}   color="red" />
            <StatCard label="Utilidad neta"    value={utilidadNeta}  color={utilidadNeta >= 0 ? "green" : "red"} />
            <StatCard label="Saldo Mercury"    value={saldoMercury}  color="blue" />
            <StatCard label="Saldo Slash"      value={Math.abs(saldoSlash)} color="amber"
              sub={saldoSlash < 0 ? "gastos acumulados" : "saldo positivo"} />
            <StatCard label="Saldo Wise"       value={saldoWise}     color="default" sub="cuenta inactiva" />
          </div>

          {/* Ingresos vs Gastos */}
          <div style={{ marginBottom: 40 }}>
            <SectionTitle>Ingresos vs Gastos por mes</SectionTitle>
            <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 12, padding: "24px 16px" }}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={resumen} barGap={4}>
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

          {/* Desglose gastos + Utilidad acumulada */}
          <div className="grid-charts">
            <div>
              <SectionTitle>Desglose de gastos</SectionTitle>
              <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 12, padding: "24px 16px" }}>
                {pieData.length === 0 ? (
                  <p style={{ color: "#444", fontSize: 13, textAlign: "center", padding: "60px 0", fontFamily: "'DM Mono'" }}>
                    Sin gastos registrados aún
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                        dataKey="value" nameKey="name" paddingAngle={3}>
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="transparent" />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Mono'", color: "#666" }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div>
              <SectionTitle>Utilidad neta acumulada</SectionTitle>
              <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 12, padding: "24px 16px" }}>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={utilidadAcumulada}>
                    <XAxis dataKey="mes" tick={{ fill: "#555", fontSize: 11, fontFamily: "'DM Mono'" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#555", fontSize: 11, fontFamily: "'DM Mono'" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toLocaleString()}`} width={60} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="acumulado" name="Utilidad acumulada"
                      stroke="#4ade80" strokeWidth={2} dot={{ fill: "#4ade80", r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Ingresos por agencia */}
          <div className="grid-agencias">
            <div>
              <SectionTitle>Ingresos por agencia</SectionTitle>
              <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 12, padding: "24px 16px" }}>
                {agencias.length === 0 ? (
                  <p style={{ color: "#444", fontSize: 13, textAlign: "center", padding: "60px 0", fontFamily: "'DM Mono'" }}>
                    Sin ingresos por agencia aún
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={agencias} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                        dataKey="value" nameKey="name" paddingAngle={3}>
                        {agencias.map((entry, i) => <Cell key={i} fill={entry.color} stroke="transparent" />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Mono'", color: "#666" }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Tabla resumen agencias */}
            <div>
              <SectionTitle>Detalle por agencia</SectionTitle>
              <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 12, overflow: "hidden" }}>
                {agencias.length === 0 ? (
                  <p style={{ color: "#444", fontSize: 13, textAlign: "center", padding: "60px 20px", fontFamily: "'DM Mono'" }}>
                    Se mostrará cuando entren pagos de agencias
                  </p>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                        {["Agencia", "Total USD", "% del total"].map(h => (
                          <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 10,
                            letterSpacing: "0.12em", textTransform: "uppercase",
                            color: "#444", fontFamily: "'DM Mono'", fontWeight: 400 }}>{h}</th>
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
            <SectionTitle>Últimos movimientos</SectionTitle>
            <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 12, overflow: "hidden" }}>
              {ultimos.length === 0 ? (
                <p style={{ color: "#444", fontSize: 13, textAlign: "center", padding: "40px 0", fontFamily: "'DM Mono'" }}>
                  Sin movimientos registrados aún
                </p>
              ) : (
                <div className="table-scroll">
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                        {["Fecha","Tipo","Categoría","Monto USD","Cuenta","Descripción"].map(h => (
                          <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 10,
                            letterSpacing: "0.12em", textTransform: "uppercase",
                            color: "#444", fontFamily: "'DM Mono'", fontWeight: 400 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ultimos.map((m, i) => {
                        const esPositivo = m.montoUSD >= 0;
                        const colorTipo = m.tipo === "Ingreso"
                          ? { bg: "#16391f", text: "#4ade80" }
                          : m.tipo === "Transferencia"
                          ? { bg: "#172038", text: "#60a5fa" }
                          : { bg: "#3b1a1a", text: "#f87171" };
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
                            <td className="hide-mobile" style={{ ...tdStyle, color: "#666", maxWidth: 200,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {m.descripcion}
                            </td>
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

const tdStyle = {
  padding: "12px 16px",
  fontSize: 12,
  color: "#888",
  verticalAlign: "middle",
};

export async function getServerSideProps() {
  try {
    const [resumen, movimientos, config, saldos, agencias] = await Promise.all([
      getResumenMensual(),
      getMovimientos(),
      getConfig(),
      getSaldosPorCuenta(),
      getIngresosPorAgencia(),
    ]);

    return {
      props: {
        resumen, movimientos, config, saldos, agencias,
        lastUpdated: new Date().toLocaleString("es-CL", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        }),
      },
    };
  } catch (e) {
    console.error("Error fetching sheets:", e.message);
    return {
      props: {
        resumen: [], movimientos: [],
        config: { tipoCambio: 940, empresa: "Ecom Warrior LLC", anioTributario: "AT 2026" },
        saldos: {}, agencias: [],
        lastUpdated: "—",
      },
    };
  }
}
