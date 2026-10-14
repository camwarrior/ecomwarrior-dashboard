import {
  BarChart, Bar, AreaChart, Area, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { fmt, fmtCorto } from "../lib/calculos";

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="ew-tip">
      {label != null && <div className="l">{label}</div>}
      {payload.map((p, i) => (
        <div className="i" key={i}>
          <span className="ew-dot" style={{ background: p.color || p.fill }} />
          <span className="n">{p.name}</span>
          <span className="v">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

const ejes = (c) => ({
  x: { tick: { fill: c.eje, fontSize: 11 }, axisLine: { stroke: c.base }, tickLine: false, interval: "preserveStartEnd" },
  y: { tickFormatter: fmtCorto, tick: { fill: c.eje, fontSize: 11 }, axisLine: false, tickLine: false, width: 52 },
});

export function BarrasMensuales({ data, c, height = 230 }) {
  const e = ejes(c);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 4, left: -8, bottom: 0 }} barGap={3}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="mes" {...e.x} />
        <YAxis {...e.y} />
        <Tooltip content={<Tip />} cursor={{ fill: c.grid, opacity: 0.6 }} />
        <Bar dataKey="ingresos" name="Ingresos" fill={c.accent} radius={[4, 4, 0, 0]} maxBarSize={16} isAnimationActive={false} />
        <Bar dataKey="gastos" name="Gastos" fill={c.gasto} radius={[4, 4, 0, 0]} maxBarSize={16} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AreaUtilidad({ data, c, height = 150 }) {
  const e = ejes(c);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 6, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="ew-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.accent} stopOpacity={0.22} />
            <stop offset="100%" stopColor={c.accent} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="mes" {...e.x} />
        <YAxis {...e.y} />
        <Tooltip content={<Tip />} />
        <Area type="monotone" dataKey="utilidad" name="Utilidad" stroke={c.accent} strokeWidth={2} fill="url(#ew-area)" isAnimationActive={false}
          dot={false} activeDot={{ r: 4.5, fill: c.accent, stroke: c.superficie, strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function FlujoCompuesto({ data, c, height = 300 }) {
  const e = ejes(c);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 10, right: 4, left: -8, bottom: 0 }} barGap={3}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="mes" {...e.x} />
        <YAxis {...e.y} />
        <Tooltip content={<Tip />} cursor={{ fill: c.grid, opacity: 0.6 }} />
        <Bar dataKey="entradas" name="Entradas" fill={c.accent} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
        <Bar dataKey="salidas" name="Salidas" fill={c.gasto} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
        <Line type="monotone" dataKey="saldo" name="Saldo acumulado" stroke={c.linea} strokeWidth={2} dot={false} isAnimationActive={false}
          activeDot={{ r: 4.5, fill: c.linea, stroke: c.superficie, strokeWidth: 2 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
