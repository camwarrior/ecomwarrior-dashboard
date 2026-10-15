import Head from "next/head";
import { useCallback, useEffect, useMemo, useState } from "react";
import { anosDisponibles, anoPorDefecto, calcular } from "../lib/calculos";
import { useTema } from "../lib/useTema";
import { ILogo, IInicio, IFlujo, ILista, IRenta, IMas, IAbajo } from "../components/iconos";
import VistaInicio from "../components/VistaInicio";
import VistaFlujo from "../components/VistaFlujo";
import VistaMovimientos from "../components/VistaMovimientos";
import VistaAgregar from "../components/VistaAgregar";

const NAV = [
  { id: "inicio", label: "Inicio", corto: "Inicio", icon: IInicio },
  { id: "flujo", label: "Flujo de caja", corto: "Flujo", icon: IFlujo },
  { id: "movimientos", label: "Movimientos", corto: "Movimientos", icon: ILista },
  { id: "renta", label: "Operación Renta", corto: "Renta", icon: IRenta, pronto: true },
];
const TITULO_MOVIL = { inicio: "Inicio", flujo: "Flujo de caja", movimientos: "Movimientos" };

function Esqueleto() {
  return (
    <div aria-busy="true" aria-label="Cargando datos" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="ew-skel" style={{ height: 96, maxWidth: 420 }} />
      <div className="ew-skel" style={{ height: 96 }} />
      <div className="ew-g2">
        <div className="ew-skel" style={{ height: 280 }} />
        <div className="ew-skel solo-escritorio" style={{ height: 280 }} />
      </div>
      <div className="ew-skel" style={{ height: 200 }} />
    </div>
  );
}

function SelectorAnoMovil({ ano, anos, setAno }) {
  if (!anos.length) return null;
  return (
    <div className="ew-yearsel">
      <label htmlFor="ano-movil" className="sr-only">Año</label>
      <select id="ano-movil" value={ano} onChange={e => setAno(Number(e.target.value))}>
        {anos.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <IAbajo size={14} />
    </div>
  );
}

export default function Dashboard() {
  const paleta = useTema();
  const [datos, setDatos] = useState(null); // { movimientos, categorias, agencias, actualizado }
  const [error, setError] = useState("");
  const [refrescando, setRefrescando] = useState(false);
  const [ano, setAno] = useState(null);
  const [vista, setVista] = useState("inicio");
  const [tipoInicial, setTipoInicial] = useState("Ingreso");
  const [tc, setTc] = useState(null);
  const [toast, setToast] = useState("");
  const [editando, setEditando] = useState(null); // movimiento abierto para editar
  const [volverA, setVolverA] = useState("inicio");

  const cargar = useCallback(async () => {
    setError("");
    try {
      const r = await fetch("/api/datos", { cache: "no-store" });
      if (r.status === 401) { window.location.href = "/login"; return; }
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Error al cargar");
      setDatos(j);
    } catch (e) {
      setError(e.message || "No se pudieron cargar los datos.");
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Dólar del día para la estimación en CLP del formulario (no bloquea nada)
  useEffect(() => {
    fetch("/api/tc").then(r => r.json()).then(j => { if (j.ok) setTc(j.valor); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const movimientos = datos?.movimientos || [];
  const anos = useMemo(() => anosDisponibles(movimientos), [movimientos]);
  useEffect(() => {
    if (datos && (ano === null || !anos.includes(ano))) setAno(anoPorDefecto(anos));
  }, [datos, anos, ano]);
  const anoSel = ano ?? new Date().getFullYear();
  const c = useMemo(() => calcular(movimientos, anoSel), [movimientos, anoSel]);

  // [{ nombre, tipo, cuenta }] desde la pestaña Categorías; si falta, se deduce de los movimientos
  const categorias = useMemo(() => {
    if (datos?.categorias?.length) return datos.categorias;
    const vistos = {};
    movimientos.forEach(m => { if (m.categoria) vistos[m.categoria] = vistos[m.categoria] || new Set(); if (m.categoria) vistos[m.categoria].add(m.tipo); });
    return Object.keys(vistos).sort().map(n => ({ nombre: n, tipo: [...vistos[n]].join("/"), cuenta: "" }));
  }, [datos, movimientos]);
  const agencias = useMemo(() => {
    if (datos?.agencias?.length) return datos.agencias;
    return [...new Set(movimientos.map(m => m.agencia).filter(Boolean))].sort();
  }, [datos, movimientos]);

  async function refrescar() {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }

  function irA(v, tipo) {
    if (v === "agregar") setTipoInicial(tipo || "Ingreso");
    if (v !== "editar") setEditando(null);
    setVista(v);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }

  function abrirEdicion(m) {
    setVolverA(vista);
    setEditando(m);
    setVista("editar");
    window.scrollTo({ top: 0 });
  }

  async function alGuardar() {
    const fueEdicion = vista === "editar";
    setVista(fueEdicion ? volverA : "inicio");
    setEditando(null);
    setToast(fueEdicion ? "Cambios guardados" : "Movimiento guardado");
    window.scrollTo({ top: 0 });
    await cargar();
  }

  // Formulario a pantalla completa: nuevo movimiento o edición
  const agregando = vista === "agregar" || (vista === "editar" && !!editando);

  return (
    <>
      <Head>
        <title>Ecom Warrior LLC</title>
      </Head>

      <div className="ew-app">
        {/* Barra superior (escritorio) */}
        <header className="ew-top">
          <div className="ew-brand"><span className="ew-logo"><ILogo size={18} /></span>Ecom Warrior</div>
          <nav className="ew-nav" aria-label="Secciones">
            {NAV.map(n => (
              <button key={n.id} className={"ew-navlink" + (vista === n.id ? " on" : "")} disabled={n.pronto}
                aria-current={vista === n.id ? "page" : undefined} onClick={() => irA(n.id)}>
                {n.label}{n.pronto && <span className="ew-soon">Pronto</span>}
              </button>
            ))}
          </nav>
          <div className="ew-top-right">
            {anos.length > 0 && (
              <div className="ew-seg" role="group" aria-label="Año">
                {anos.map(y => (
                  <button key={y} className={y === anoSel ? "on" : ""} aria-pressed={y === anoSel} onClick={() => setAno(y)}>{y}</button>
                ))}
              </div>
            )}
            <button className="ew-btn ew-btn-accent" onClick={() => irA("agregar")}>
              <IMas size={16} />Nuevo movimiento
            </button>
          </div>
        </header>

        <main className={"ew-main" + (agregando ? " agregar" : "")}>
          {!agregando && (
            <div className="ew-mhead">
              <div>
                <div className="co">Ecom Warrior LLC</div>
                <h1>{TITULO_MOVIL[vista]}</h1>
              </div>
              <SelectorAnoMovil ano={anoSel} anos={anos} setAno={setAno} />
            </div>
          )}

          {agregando ? (!datos ? <Esqueleto /> :
            <VistaAgregar key={editando ? "editar-" + editando.fila : "nuevo"} categorias={categorias} agencias={agencias} tc={tc}
              tipoInicial={tipoInicial} editar={vista === "editar" ? editando : null}
              onGuardado={alGuardar} onCancelar={() => irA(vista === "editar" ? volverA : "inicio")} />
          ) : error && !datos ? (
            <div className="ew-card" role="alert">
              <h2>No se pudieron cargar los datos</h2>
              <p style={{ color: "var(--muted)", margin: "8px 0 16px" }}>{error}</p>
              <button className="ew-btn ew-btn-primary" onClick={refrescar} disabled={refrescando}>{refrescando ? "Reintentando…" : "Reintentar"}</button>
            </div>
          ) : !datos ? (
            <Esqueleto />
          ) : (
            <>
              {error && <div className="ew-msg err" role="alert">{error}</div>}
              {vista === "inicio" && (
                <VistaInicio c={c} ano={anoSel} actualizado={datos.actualizado} refrescar={refrescar}
                  refrescando={refrescando} paleta={paleta} irA={irA} onEditar={abrirEdicion} />
              )}
              {vista === "flujo" && <VistaFlujo c={c} ano={anoSel} paleta={paleta} />}
              {vista === "movimientos" && <VistaMovimientos c={c} ano={anoSel} onEditar={abrirEdicion} />}
            </>
          )}
        </main>

        {/* Barra inferior (iPhone) */}
        {!agregando && (
          <nav className="ew-tabbar" aria-label="Secciones">
            {NAV.slice(0, 2).map(n => (
              <button key={n.id} className={"ew-tab" + (vista === n.id ? " on" : "")} aria-current={vista === n.id ? "page" : undefined} onClick={() => irA(n.id)}>
                <n.icon size={22} />{n.corto}
              </button>
            ))}
            <button className="ew-fab" aria-label="Nuevo movimiento" onClick={() => irA("agregar")}><IMas size={24} /></button>
            {NAV.slice(2).map(n => (
              <button key={n.id} className={"ew-tab" + (vista === n.id ? " on" : "")} disabled={n.pronto}
                aria-current={vista === n.id ? "page" : undefined} aria-label={n.pronto ? `${n.label}, disponible pronto` : undefined}
                onClick={() => irA(n.id)}>
                <n.icon size={22} />{n.corto}
              </button>
            ))}
          </nav>
        )}

        {toast && <div className="ew-toast" role="status">{toast}</div>}
      </div>
    </>
  );
}
