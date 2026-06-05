import Head from "next/head";
import { useState, useMemo } from "react";
import { useRouter } from "next/router";
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import {
  Wallet, Building2, TrendingUp, Landmark, Receipt,
  LayoutDashboard, ArrowLeftRight, PlusCircle, FileText, RefreshCw
} from "lucide-react";
import { getMovimientos, getCategorias, getAgencias } from "../lib/sheets";

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const PIE_COLORS = ["#ff6b6b", "#22d3ee", "#fbbf24", "#a78bfa", "#64748b"];
const TIPO_COLOR = { Ingreso: "#34d399", Aporte: "#22d3ee", Gasto: "#ff6b6b", Transferencia: "#fbbf24" };

const fmt = (n) => "$" + Math.round(n).toLocaleString("en-US");
const fmtC = (n) => {
  const a = Math.abs(n);
  if (a >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  if (a >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
  return "$" + Math.round(n);
};

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(18,20,23,0.96)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 12px", backdropFilter: "blur(8px)", fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
      {label != null && <div style={{ color: "#8a9099", marginBottom: 6 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, color: "#e8eaed" }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: p.color || p.fill }} />
          <span style={{ color: "#8a9099" }}>{p.name}:</span>
          <span style={{ marginLeft: "auto", fontWeight: 500 }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function KPI({ label, value, sub, accent, icon: Icon, i }) {
  return (
    <div className="card stagger" style={{ animationDelay: `${i * 55}ms` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="klabel">{label}</span>
        <span className="iconchip" style={{ color: accent }}><Icon size={15} /></span>
      </div>
      <div className="bignum" style={{ color: accent || "#e8eaed" }}>{value}</div>
      <span className="ksub">{sub}</span>
    </div>
  );
}

export default function Dashboard({ movimientos, lastUpdated, categorias = [], agenciasLista = [] }) {
  const anos = useMemo(() => {
    const set = new Set(movimientos.map(m => m.anio).filter(Boolean));
    return [...set].sort((a, b) => b - a);
  }, [movimientos]);

  const [ano, setAno] = useState(() => {
    const cy = new Date().getFullYear();
    return anos.includes(cy) ? cy : (anos[0] || cy);
  });
  const [vista, setVista] = useState("resumen");
  const router = useRouter();

  // ---- Formulario "Agregar transacción" ----
  const formVacio = { fecha: "", tipo: "Ingreso", categoria: "", usd: "", cuenta: "Mercury", desc: "", agencia: "", notas: "", cuentaOrigen: "Mercury", cuentaDestino: "Slash" };
  const [form, setForm] = useState(formVacio);
  const [archivo, setArchivo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState(null); // {ok, text}
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const [refrescando, setRefrescando] = useState(false);
  async function refrescar() {
    setRefrescando(true);
    await router.replace(router.asPath, undefined, { scroll: false });
    setRefrescando(false);
  }

  const categoriasVistas = useMemo(() =>
    [...new Set(movimientos.map(m => m.categoria).filter(Boolean))].sort(), [movimientos]);
  const catOpciones = categorias.length ? categorias : categoriasVistas;
  const agenciasVistas = useMemo(() =>
    [...new Set(movimientos.map(m => m.agencia).filter(Boolean))].sort(), [movimientos]);
  const ageOpciones = agenciasLista.length ? agenciasLista : agenciasVistas;

  async function enviarTransaccion() {
    if (!form.fecha) { setMsg({ ok: false, text: "La fecha es obligatoria." }); return; }
    setEnviando(true); setMsg(null);
    const data = {
      fecha: form.fecha, tipo: form.tipo, categoria: form.categoria,
      usd: form.usd, cuenta: form.cuenta, desc: form.desc,
      agencia: form.tipo === "Ingreso" ? form.agencia : "", notas: form.notas,
      cuentaOrigen: form.cuentaOrigen, cuentaDestino: form.cuentaDestino,
    };
    try {
      if (archivo) {
        const bytes = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(String(r.result).split(",")[1]);
          r.onerror = rej;
          r.readAsDataURL(archivo);
        });
        data.comprobante = { bytes, name: archivo.name, mime: archivo.type };
      }
      const resp = await fetch("/api/transaccion", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const j = await resp.json();
      if (j.ok) {
        setMsg({ ok: true, text: "Transacción agregada correctamente." });
        setForm(formVacio); setArchivo(null);
        router.replace(router.asPath, undefined, { scroll: false });
      } else {
        setMsg({ ok: false, text: j.error || "No se pudo agregar." });
      }
    } catch (e) {
      setMsg({ ok: false, text: "Error de conexión: " + (e.message || e) });
    } finally {
      setEnviando(false);
    }
  }

  const movsAno = useMemo(() => movimientos.filter(m => m.anio === ano), [movimientos, ano]);
  const movsHasta = useMemo(() => movimientos.filter(m => m.anio <= ano), [movimientos, ano]);

  const { ingresos, aportes, gastos } = useMemo(() => {
    let ingresos = 0, aportes = 0, gastos = 0;
    movsAno.forEach(m => {
      if (m.tipo === "Ingreso") ingresos += m.montoUSD;
      else if (m.tipo === "Aporte") aportes += m.montoUSD;
      else if (m.tipo === "Gasto") gastos += Math.abs(m.montoUSD);
    });
    return { ingresos, aportes, gastos };
  }, [movsAno]);
  const utilidadNeta = ingresos - gastos;

  const saldos = useMemo(() => {
    const s = {};
    movsHasta.forEach(m => {
      if (!s[m.cuenta]) s[m.cuenta] = 0;
      if (m.tipo === "Ingreso" || m.tipo === "Aporte") s[m.cuenta] += m.montoUSD;
      else if (m.tipo === "Gasto") s[m.cuenta] -= Math.abs(m.montoUSD);
      else if (m.tipo === "Transferencia") s[m.cuenta] += m.montoUSD;
    });
    return s;
  }, [movsHasta]);
  const cuentas = [
    { name: "Mercury", saldo: saldos["Mercury"] || 0, color: "#34d399", desc: "Ingresos afiliados" },
    { name: "Slash", saldo: saldos["Slash"] || 0, color: "#22d3ee", desc: "Gastos · cashback" },
    { name: "Wise", saldo: saldos["Wise"] || 0, color: "#64748b", desc: "Inactiva" },
  ];
  const saldoTotal = cuentas.reduce((a, c) => a + c.saldo, 0);

  // Saldo real al inicio del año seleccionado (cierre del año anterior)
  const saldoInicial = useMemo(() => {
    const s = {};
    movimientos.filter(m => m.anio < ano).forEach(m => {
      if (!s[m.cuenta]) s[m.cuenta] = 0;
      if (m.tipo === "Ingreso" || m.tipo === "Aporte") s[m.cuenta] += m.montoUSD;
      else if (m.tipo === "Gasto") s[m.cuenta] -= Math.abs(m.montoUSD);
      else if (m.tipo === "Transferencia") s[m.cuenta] += m.montoUSD;
    });
    return Object.values(s).reduce((a, b) => a + b, 0);
  }, [movimientos, ano]);

  const resumenMensual = useMemo(() => MESES.map((mes, i) => {
    const mesNum = i + 1;
    const filas = movsAno.filter(m => {
      const p = m.fecha.split("/");
      return p.length === 3 && parseInt(p[1]) === mesNum;
    });
    const ing = filas.filter(m => m.tipo === "Ingreso").reduce((s, m) => s + m.montoUSD, 0);
    const gas = filas.filter(m => m.tipo === "Gasto").reduce((s, m) => s + Math.abs(m.montoUSD), 0);
    const apo = filas.filter(m => m.tipo === "Aporte").reduce((s, m) => s + m.montoUSD, 0);
    const metaAds = filas.filter(m => m.categoria === "Meta Ads").reduce((s, m) => s + Math.abs(m.montoUSD), 0);
    const softwareIA = filas.filter(m => m.categoria === "Software IA").reduce((s, m) => s + Math.abs(m.montoUSD), 0);
    return { mes, ingresos: ing, gastos: gas, aportes: apo, metaAds, softwareIA };
  }), [movsAno]);

  const serieMensual = resumenMensual.filter(r => r.ingresos || r.gastos || r.aportes);

  let ac = 0;
  const utilidadAcumulada = serieMensual.map(r => { ac += r.ingresos - r.gastos; return { mes: r.mes, utilidad: ac }; });

  let saldoAc = saldoInicial;
  const flujo = serieMensual.map(r => {
    const entradas = r.ingresos + r.aportes;
    const salidas = r.gastos;
    saldoAc += entradas - salidas;
    return { mes: r.mes, entradas, salidas, neto: entradas - salidas, saldo: saldoAc };
  });

  const totalMetaAds = resumenMensual.reduce((s, r) => s + r.metaAds, 0);
  const totalSoftwareIA = resumenMensual.reduce((s, r) => s + r.softwareIA, 0);
  const pieData = [
    { name: "Meta Ads", value: totalMetaAds },
    { name: "Software IA", value: totalSoftwareIA },
    { name: "Otros", value: Math.max(0, gastos - totalMetaAds - totalSoftwareIA) },
  ].filter(d => d.value > 0);
  const totalGastosCat = pieData.reduce((a, b) => a + b.value, 0) || 1;

  const agencias = useMemo(() => {
    const t = {};
    movsAno.filter(m => m.tipo === "Ingreso" && m.agencia).forEach(m => { t[m.agencia] = (t[m.agencia] || 0) + m.montoUSD; });
    return Object.entries(t).map(([name, value]) => ({ name, value }));
  }, [movsAno]);
  const totalAgencias = agencias.reduce((a, b) => a + b.value, 0) || 1;

  const ultimos = [...movsAno].reverse().slice(0, 8);

  const NAV = [
    { id: "resumen", label: "Resumen", icon: LayoutDashboard },
    { id: "flujo", label: "Flujo de caja", icon: ArrowLeftRight },
    { id: "agregar", label: "Agregar transacción", icon: PlusCircle },
    { id: "renta", label: "Operación Renta", icon: FileText, soon: true },
  ];

  return (
    <>
      <Head>
        <title>Ecom Warrior LLC — Dashboard</title>
        <meta name="robots" content="noindex" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="root">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&display=swap');
          * { box-sizing: border-box; }
          body { margin: 0; }
          .root {
            --surface:#121417; --surface2:#16191d; --border:rgba(255,255,255,0.07);
            --text:#e8eaed; --dim:#8a9099;
            color-scheme: dark;
            background:
              radial-gradient(1100px 500px at 85% -10%, rgba(52,211,153,0.07), transparent 60%),
              radial-gradient(900px 500px at 5% 0%, rgba(34,211,238,0.05), transparent 55%), #0a0b0d;
            min-height:100vh; color:var(--text);
            font-family:'Hanken Grotesk', ui-sans-serif, system-ui, sans-serif; display:flex;
          }
          .num { font-family:'DM Mono', monospace; font-variant-numeric:tabular-nums; }
          .sidebar { width:236px; flex-shrink:0; border-right:1px solid var(--border); padding:24px 16px;
            display:flex; flex-direction:column; gap:26px; position:sticky; top:0; align-self:flex-start; min-height:100vh; }
          .brand { display:flex; align-items:center; gap:13px; padding:0 6px; }
          .logo { width:42px; height:42px; border-radius:12px; display:grid; place-items:center; flex-shrink:0;
            background:linear-gradient(135deg,#34d399,#0f9b6c); color:#06120c; box-shadow:0 6px 18px rgba(52,211,153,0.22); }
          .brand h1 { font-family:'Syne',sans-serif; font-weight:800; font-size:18px; margin:0; line-height:1.15; letter-spacing:-0.01em; }
          .brand p { margin:2px 0 0; font-size:11px; color:var(--dim); }
          .navsec { font-size:10.5px; text-transform:uppercase; letter-spacing:0.09em; color:var(--dim); font-weight:600; padding:0 8px 10px; }
          .nav { display:flex; flex-direction:column; gap:3px; }
          .navitem { display:flex; align-items:center; gap:11px; padding:10px 12px; border-radius:10px; color:var(--dim);
            font-size:13.5px; font-weight:500; cursor:pointer; border:none; background:transparent; width:100%; text-align:left; transition:.16s; }
          .navitem:hover { color:var(--text); background:rgba(255,255,255,0.03); }
          .navitem.on { color:var(--text); background:rgba(52,211,153,0.1); box-shadow:inset 2px 0 0 #34d399; }
          .navitem.soon { opacity:.5; cursor:default; }
          .soontag { margin-left:auto; font-size:9.5px; font-family:'DM Mono',monospace; color:var(--dim); border:1px solid var(--border); border-radius:99px; padding:1px 7px; }
          .yrs { display:flex; flex-direction:column; gap:4px; }
          .yr { display:flex; align-items:center; gap:9px; border:none; background:transparent; cursor:pointer; color:var(--dim);
            font-family:'DM Mono',monospace; font-size:13px; padding:9px 12px; border-radius:9px; text-align:left; width:100%; transition:.16s; }
          .yr:hover { color:var(--text); background:rgba(255,255,255,0.03); }
          .yr.on { color:var(--text); background:var(--surface2); border:1px solid var(--border); }
          .yrdot { width:7px; height:7px; border-radius:99px; background:#3a3f45; }
          .yr.on .yrdot { background:#34d399; box-shadow:0 0 8px #34d399; }
          .side-foot { margin-top:auto; padding:0 8px; font-size:10.5px; color:var(--dim); line-height:1.5; }
          .main { flex:1; min-width:0; padding:30px clamp(18px,3vw,40px) 48px; }
          .pagehead { margin-bottom:26px; }
          .pagehead h2 { font-family:'Syne',sans-serif; font-weight:800; font-size:30px; margin:0; letter-spacing:-0.02em; line-height:1.1; }
          .pagehead .meta { margin-top:8px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; font-size:12.5px; color:var(--dim); }
          .pill { display:inline-flex; align-items:center; gap:6px; font-family:'DM Mono',monospace; font-size:11.5px; color:var(--dim); border:1px solid var(--border); border-radius:99px; padding:3px 10px; }
          .live { width:6px; height:6px; border-radius:99px; background:#34d399; box-shadow:0 0 7px #34d399; }
          .refbtn { display:inline-flex; align-items:center; gap:6px; background:transparent; border:1px solid var(--border);
            color:var(--dim); border-radius:99px; padding:3px 11px; font-size:11.5px; cursor:pointer; font-family:'DM Mono',monospace; transition:.16s; }
          .refbtn:hover { color:var(--text); border-color:#34d399; }
          .refbtn:disabled { opacity:.6; cursor:default; }
          .spin { animation: spin .8s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
          .grid { display:grid; gap:14px; }
          .kpis { grid-template-columns:repeat(4,1fr); }
          .mid { grid-template-columns:1.9fr 1fr; }
          .low { grid-template-columns:1.4fr 1fr; }
          @media (max-width:1024px){ .kpis{grid-template-columns:repeat(2,1fr);} .mid,.low{grid-template-columns:1fr;} }
          @media (max-width:760px){
            .root{flex-direction:column;}
            .sidebar{width:100%; min-height:0; flex-direction:row; flex-wrap:wrap; align-items:center; position:static; gap:14px; padding:16px;}
            .navsec,.side-foot{display:none;} .nav{flex-direction:row; flex-wrap:wrap;} .yrs{flex-direction:row;}
            .main{padding:20px 16px 40px;}
          }
          .card { background:linear-gradient(180deg,var(--surface2),var(--surface)); border:1px solid var(--border); border-radius:16px; padding:18px; }
          .card.pad { padding:20px 22px; }
          .klabel { font-size:11.5px; color:var(--dim); text-transform:uppercase; letter-spacing:0.08em; font-weight:600; }
          .iconchip { width:28px; height:28px; border-radius:8px; display:grid; place-items:center; background:rgba(255,255,255,0.04); }
          .bignum { font-family:'DM Mono',monospace; font-variant-numeric:tabular-nums; font-size:25px; font-weight:500; margin:12px 0 9px; letter-spacing:-0.02em; }
          .ksub { font-size:11.5px; color:var(--dim); }
          .ct { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
          .ct h3 { font-family:'Syne',sans-serif; font-size:15px; font-weight:700; margin:0; }
          .ct span { font-size:11.5px; color:var(--dim); }
          .acct { display:flex; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid var(--border); }
          .acct:last-child { border-bottom:none; }
          .acct .nm { font-weight:600; font-size:13.5px; } .acct .ds { font-size:11px; color:var(--dim); }
          .acct .sd { margin-left:auto; font-family:'DM Mono',monospace; font-size:14px; font-variant-numeric:tabular-nums; }
          table { width:100%; border-collapse:collapse; }
          th { text-align:left; font-size:10.5px; text-transform:uppercase; letter-spacing:0.07em; color:var(--dim); font-weight:600; padding:0 8px 10px; }
          td { padding:11px 8px; border-top:1px solid var(--border); font-size:13px; }
          .badge { font-size:10.5px; font-weight:600; padding:3px 9px; border-radius:99px; }
          .amt { font-family:'DM Mono',monospace; font-variant-numeric:tabular-nums; text-align:right; }
          .legend { display:flex; flex-direction:column; gap:9px; margin-top:6px; }
          .lg { display:flex; align-items:center; gap:9px; font-size:12.5px; }
          .lg .nm { color:var(--dim); } .lg .vl { margin-left:auto; font-family:'DM Mono',monospace; font-variant-numeric:tabular-nums; }
          .tablewrap { overflow-x:auto; -webkit-overflow-scrolling:touch; }
          .field { margin-bottom:14px; }
          .field label { display:block; font-size:11.5px; color:var(--dim); text-transform:uppercase; letter-spacing:0.06em; font-weight:600; margin-bottom:6px; }
          .field input, .field select, .field textarea {
            width:100%; background:#0d0f12; border:1px solid var(--border); border-radius:9px; padding:10px 12px;
            color:var(--text); font-size:14px; font-family:inherit; outline:none; }
          .field input:focus, .field select:focus, .field textarea:focus { border-color:#34d399; }
          .field textarea { resize:vertical; min-height:54px; }
          .row2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
          @media (max-width:560px){ .row2{grid-template-columns:1fr;} }
          .btnsend { background:#34d399; color:#06120c; border:none; border-radius:10px; padding:12px 20px;
            font-weight:700; font-size:14px; cursor:pointer; font-family:'Syne',sans-serif; transition:.16s; }
          .btnsend:hover { background:#2bbf8a; } .btnsend:disabled { opacity:.5; cursor:default; }
          .formmsg { padding:11px 14px; border-radius:9px; font-size:13px; margin-bottom:14px; }
          .stagger { opacity:0; transform:translateY(10px); animation:rise .5s cubic-bezier(.2,.7,.3,1) forwards; }
          @keyframes rise { to { opacity:1; transform:none; } }
        `}</style>

        <aside className="sidebar">
          <div className="brand">
            <div className="logo"><TrendingUp size={22} /></div>
            <div><h1>Ecom<br/>Warrior LLC</h1><p>Panel financiero</p></div>
          </div>
          <div>
            <div className="navsec">Módulos</div>
            <nav className="nav">
              {NAV.map(n => (
                <button key={n.id} className={"navitem" + (vista === n.id ? " on" : "") + (n.soon ? " soon" : "")}
                  onClick={() => !n.soon && setVista(n.id)}>
                  <n.icon size={16} />{n.label}{n.soon && <span className="soontag">Pronto</span>}
                </button>
              ))}
            </nav>
          </div>
          <div>
            <div className="navsec">Año tributario</div>
            <div className="yrs">
              {anos.map(y => (
                <button key={y} className={"yr" + (y === ano ? " on" : "")} onClick={() => setAno(y)}>
                  <span className="yrdot" />{y}<span style={{ marginLeft: "auto", fontSize: 10, color: "var(--dim)" }}>AT {y + 1}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="side-foot">Ecom Warrior LLC · US<br/>Operación Renta · SII Chile</div>
        </aside>

        <main className="main">
          {vista === "resumen" && (
            <>
              <div className="pagehead">
                <h2>Resumen {ano}</h2>
                <div className="meta">
                  <span className="pill"><span className="live" />En vivo</span>
                  <span>Actualizado · {lastUpdated} (hora de Chile)</span>
                  <button className="refbtn" onClick={refrescar} disabled={refrescando}>
                    <RefreshCw size={12} className={refrescando ? "spin" : ""} />{refrescando ? "Actualizando…" : "Actualizar"}
                  </button>
                </div>
              </div>

              <div className="grid kpis" style={{ marginBottom: 14 }}>
                <KPI i={0} label="Ingresos reales" value={fmt(ingresos)} sub="comisiones tributables" accent="#34d399" icon={TrendingUp} />
                <KPI i={1} label="Aportes capital" value={fmt(aportes)} sub="no tributable" accent="#22d3ee" icon={Landmark} />
                <KPI i={2} label="Gastos totales" value={fmt(gastos)} sub="operacionales" accent="#ff6b6b" icon={Receipt} />
                <KPI i={3} label="Utilidad neta" value={fmt(utilidadNeta)} sub="ingresos − gastos" accent={utilidadNeta >= 0 ? "#e8eaed" : "#ff6b6b"} icon={Wallet} />
              </div>

              <div className="grid mid" style={{ marginBottom: 14 }}>
                <div className="card pad stagger" style={{ animationDelay: "240ms" }}>
                  <div className="ct"><h3>Utilidad neta acumulada</h3><span>USD · {ano}</span></div>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={utilidadAcumulada} margin={{ top: 10, right: 6, left: -8, bottom: 0 }}>
                      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="mes" tick={{ fill: "#8a9099", fontSize: 11, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={fmtC} tick={{ fill: "#8a9099", fontSize: 11, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} width={52} />
                      <Tooltip content={<Tip />} />
                      <Area type="monotone" dataKey="utilidad" name="Utilidad" stroke="#34d399" strokeWidth={2.4} fill="url(#g)" dot={false} activeDot={{ r: 4, fill: "#34d399" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="card pad stagger" style={{ animationDelay: "300ms" }}>
                  <div className="ct"><h3>Desglose de gastos</h3></div>
                  <div style={{ position: "relative", height: 158 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={74} paddingAngle={2} stroke="none">
                          {pieData.map((e, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<Tip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 10.5, color: "var(--dim)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Total</div>
                        <div className="num" style={{ fontSize: 16, fontWeight: 500 }}>{fmtC(gastos)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="legend">
                    {pieData.map((e, i) => (
                      <div className="lg" key={i}>
                        <span style={{ width: 9, height: 9, borderRadius: 99, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="nm">{e.name}</span>
                        <span className="vl">{Math.round((e.value / totalGastosCat) * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid low" style={{ marginBottom: 14 }}>
                <div className="card pad stagger" style={{ animationDelay: "360ms" }}>
                  <div className="ct"><h3>Ingresos vs Gastos</h3><span>por mes · USD</span></div>
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={serieMensual} margin={{ top: 10, right: 6, left: -8, bottom: 0 }} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="mes" tick={{ fill: "#8a9099", fontSize: 11, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={fmtC} tick={{ fill: "#8a9099", fontSize: 11, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} width={52} />
                      <Tooltip content={<Tip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                      <Bar dataKey="ingresos" name="Ingresos" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={18} />
                      <Bar dataKey="gastos" name="Gastos" fill="#ff6b6b" radius={[4, 4, 0, 0]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="card pad stagger" style={{ animationDelay: "420ms" }}>
                    <div className="ct"><h3>Saldos por cuenta</h3><span className="num">{fmtC(saldoTotal)}</span></div>
                    {cuentas.map(c => (
                      <div className="acct" key={c.name}>
                        <span style={{ width: 9, height: 9, borderRadius: 99, background: c.color }} />
                        <div><div className="nm">{c.name}</div><div className="ds">{c.desc}</div></div>
                        <span className="sd" style={{ color: c.saldo < 0 ? "#ff6b6b" : "var(--text)" }}>{fmt(c.saldo)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="card pad stagger" style={{ animationDelay: "470ms" }}>
                    <div className="ct"><h3>Ingresos por agencia</h3></div>
                    {agencias.length === 0 ? (
                      <p style={{ fontSize: 12, color: "var(--dim)", margin: "6px 0 0" }}>Sin ingresos por agencia este año.</p>
                    ) : (
                      <div className="legend">
                        {agencias.map((a, i) => (
                          <div key={a.name}>
                            <div className="lg" style={{ marginBottom: 5 }}>
                              <Building2 size={13} style={{ color: i ? "#22d3ee" : "#34d399" }} />
                              <span style={{ color: "var(--text)" }}>{a.name}</span>
                              <span className="vl">{Math.round((a.value / totalAgencias) * 100)}%</span>
                            </div>
                            <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.05)" }}>
                              <div style={{ height: "100%", borderRadius: 99, width: `${(a.value / totalAgencias) * 100}%`, background: i ? "#22d3ee" : "#34d399" }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="card pad stagger" style={{ animationDelay: "520ms" }}>
                <div className="ct"><h3>Últimos movimientos</h3><span>{ano}</span></div>
                <div className="tablewrap">
                  <table>
                    <thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Cuenta</th><th style={{ textAlign: "right" }}>USD</th></tr></thead>
                    <tbody>
                      {ultimos.map((m, i) => (
                        <tr key={i}>
                          <td className="num" style={{ color: "var(--dim)" }}>{m.fecha}</td>
                          <td><span className="badge" style={{ color: TIPO_COLOR[m.tipo] || "#e8eaed", background: (TIPO_COLOR[m.tipo] || "#e8eaed") + "1a" }}>{m.tipo}</span></td>
                          <td>{m.descripcion}</td>
                          <td style={{ color: "var(--dim)" }}>{m.cuenta}</td>
                          <td className="amt" style={{ color: m.montoUSD < 0 ? "#ff6b6b" : "#34d399" }}>{fmt(m.montoUSD)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {vista === "flujo" && (
            <>
              <div className="pagehead">
                <h2>Flujo de caja {ano}</h2>
                <div className="meta">
                  <span className="pill"><ArrowLeftRight size={12} />Entradas · Salidas · Saldo</span>
                  <span>Actualizado · {lastUpdated} (hora de Chile)</span>
                  <button className="refbtn" onClick={refrescar} disabled={refrescando}>
                    <RefreshCw size={12} className={refrescando ? "spin" : ""} />{refrescando ? "Actualizando…" : "Actualizar"}
                  </button>
                </div>
              </div>

              <div className="card pad stagger" style={{ marginBottom: 14 }}>
                <div className="ct"><h3>Movimiento mensual y saldo acumulado</h3><span>USD</span></div>
                {flujo.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--dim)", margin: "10px 0" }}>Sin movimientos este año.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={flujo} margin={{ top: 10, right: 6, left: -8, bottom: 0 }} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="mes" tick={{ fill: "#8a9099", fontSize: 11, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={fmtC} tick={{ fill: "#8a9099", fontSize: 11, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} width={52} />
                      <Tooltip content={<Tip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                      <Bar dataKey="entradas" name="Entradas" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={20} />
                      <Bar dataKey="salidas" name="Salidas" fill="#ff6b6b" radius={[4, 4, 0, 0]} maxBarSize={20} />
                      <Line type="monotone" dataKey="saldo" name="Saldo acum." stroke="#fbbf24" strokeWidth={2.4} dot={false} activeDot={{ r: 4, fill: "#fbbf24" }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="card pad stagger" style={{ animationDelay: "120ms" }}>
                <div className="ct"><h3>Detalle mensual</h3></div>
                <div className="tablewrap">
                  <table>
                    <thead><tr><th>Mes</th><th style={{ textAlign: "right" }}>Entradas</th><th style={{ textAlign: "right" }}>Salidas</th><th style={{ textAlign: "right" }}>Neto</th><th style={{ textAlign: "right" }}>Saldo acum.</th></tr></thead>
                    <tbody>
                      <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                        <td className="num" style={{ color: "var(--dim)", fontStyle: "italic" }}>Saldo inicial</td>
                        <td className="amt" style={{ color: "var(--dim)" }}>—</td>
                        <td className="amt" style={{ color: "var(--dim)" }}>—</td>
                        <td className="amt" style={{ color: "var(--dim)" }}>—</td>
                        <td className="amt" style={{ fontWeight: 600, color: saldoInicial >= 0 ? "#34d399" : "#ff6b6b" }}>{fmt(saldoInicial)}</td>
                      </tr>
                      {flujo.map((f, i) => (
                        <tr key={i}>
                          <td className="num" style={{ color: "var(--dim)" }}>{f.mes}</td>
                          <td className="amt" style={{ color: "#34d399" }}>{fmt(f.entradas)}</td>
                          <td className="amt" style={{ color: "#ff6b6b" }}>{fmt(f.salidas)}</td>
                          <td className="amt" style={{ color: f.neto >= 0 ? "var(--text)" : "#ff6b6b" }}>{fmt(f.neto)}</td>
                          <td className="amt" style={{ fontWeight: 500 }}>{fmt(f.saldo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {vista === "agregar" && (
            <>
              <div className="pagehead">
                <h2>Agregar transacción</h2>
                <div className="meta">
                  <span className="pill"><PlusCircle size={12} />Se guarda en el Sheet y Drive</span>
                  <span>Solo la fecha es obligatoria</span>
                </div>
              </div>

              <div className="card pad stagger" style={{ maxWidth: 640 }}>
                {msg && (
                  <div className="formmsg" style={{ background: msg.ok ? "rgba(52,211,153,0.12)" : "rgba(255,107,107,0.12)", color: msg.ok ? "#34d399" : "#ff6b6b" }}>
                    {msg.text}
                  </div>
                )}

                <div className="row2">
                  <div className="field">
                    <label>Fecha *</label>
                    <input type="date" value={form.fecha} onChange={e => setF("fecha", e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Tipo</label>
                    <select value={form.tipo} onChange={e => setF("tipo", e.target.value)}>
                      <option>Ingreso</option><option>Aporte</option><option>Gasto</option><option>Transferencia</option>
                    </select>
                  </div>
                </div>

                {form.tipo === "Transferencia" ? (
                  <div className="row2">
                    <div className="field">
                      <label>Cuenta origen</label>
                      <select value={form.cuentaOrigen} onChange={e => setF("cuentaOrigen", e.target.value)}>
                        <option>Mercury</option><option>Slash</option><option>Wise</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Cuenta destino</label>
                      <select value={form.cuentaDestino} onChange={e => setF("cuentaDestino", e.target.value)}>
                        <option>Mercury</option><option>Slash</option><option>Wise</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="row2">
                    <div className="field">
                      <label>Categoría</label>
                      <select value={form.categoria} onChange={e => setF("categoria", e.target.value)}>
                        <option value="">— Selecciona —</option>
                        {catOpciones.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Cuenta</label>
                      <select value={form.cuenta} onChange={e => setF("cuenta", e.target.value)}>
                        <option>Mercury</option><option>Slash</option><option>Wise</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="row2">
                  <div className="field">
                    <label>Monto USD</label>
                    <input type="number" step="0.01" value={form.usd} onChange={e => setF("usd", e.target.value)} placeholder="Ej: 250" />
                  </div>
                  <div className="field">
                    <label>Descripción</label>
                    <input type="text" value={form.desc} onChange={e => setF("desc", e.target.value)} placeholder="Ej: Comisión junio" />
                  </div>
                </div>

                {form.tipo === "Ingreso" && (
                  <div className="field">
                    <label>Agencia</label>
                    <select value={form.agencia} onChange={e => setF("agencia", e.target.value)}>
                      <option value="">— Selecciona —</option>
                      {ageOpciones.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                )}

                <div className="field">
                  <label>Notas (opcional)</label>
                  <textarea value={form.notas} onChange={e => setF("notas", e.target.value)} />
                </div>

                <div className="field">
                  <label>Comprobante (opcional)</label>
                  <input type="file" onChange={e => setArchivo(e.target.files[0] || null)} />
                </div>

                <button className="btnsend" onClick={enviarTransaccion} disabled={enviando}>
                  {enviando ? "Guardando…" : "Agregar transacción"}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}

export async function getServerSideProps() {
  try {
    const [movimientos, categorias, agenciasLista] = await Promise.all([getMovimientos(), getCategorias(), getAgencias()]);
    return {
      props: {
        movimientos,
        categorias,
        agenciasLista,
        lastUpdated: new Date().toLocaleString("es-CL", {
          timeZone: "America/Santiago",
          day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
        }),
      },
    };
  } catch (e) {
    console.error("Error:", e.message);
    return { props: { movimientos: [], categorias: [], agenciasLista: [], lastUpdated: "—" } };
  }
}
