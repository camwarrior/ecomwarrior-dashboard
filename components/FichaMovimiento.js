import { useEffect, useRef, useState } from "react";
import { IconoTipo, claseTipo } from "./iconos";
import { fmt2, fmtCLP } from "../lib/calculos";
import { tipoComprobante, urlMiniatura, urlImagenDirecta, urlVisor, anchoFicha } from "../lib/comprobante";

const fmtTC = (n) => "$" + Number(n).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function montoFicha(m) {
  const a = Math.abs(m.montoUSD);
  if (m.tipo === "Gasto" || m.tipo === "Retiro") return { txt: "−" + fmt2(a), cls: "" };
  if (m.tipo === "Ingreso" || m.tipo === "Aporte") return { txt: "+" + fmt2(a), cls: "pos-text" };
  return { txt: fmt2(m.montoUSD), cls: "" };
}

// Vista previa del comprobante. Foto: miniatura de Drive. PDF: visor de Drive,
// con la miniatura de la 1.ª página debajo mientras carga para que nunca quede en blanco.
function VistaComprobante({ m, onAmpliar }) {
  const tipo = tipoComprobante(m.comprobante);
  const ancho = anchoFicha();
  const [src, setSrc] = useState(() => urlMiniatura(m.compId, ancho));
  const [imgLista, setImgLista] = useState(false);
  const [imgFallo, setImgFallo] = useState(false);
  const [visorListo, setVisorListo] = useState(false);

  function falloImagen() {
    // 1.º respaldo: CDN directo de Google; 2.º: visor de Drive
    if (src.startsWith("https://drive.google.com/thumbnail")) setSrc(urlImagenDirecta(m.compId, ancho * 2));
    else setImgFallo(true);
  }

  if (tipo === "pdf" || imgFallo) {
    return (
      <div className="ew-comp pdf">
        {!visorListo && !imgFallo && (
          <img className="ew-comp-bajo" src={src} alt="" aria-hidden="true" decoding="async" onError={falloImagen} />
        )}
        {!visorListo && <div className="ew-comp-cargando" aria-hidden="true"><span className="spin-ring" /></div>}
        <iframe title={`Comprobante ${m.comprobante}`} src={urlVisor(m.compId)} loading="eager"
          className={visorListo ? "listo" : ""} onLoad={() => setVisorListo(true)} allow="fullscreen" />
        <button type="button" className="ew-comp-ampliar" onClick={onAmpliar}>Ampliar</button>
      </div>
    );
  }

  return (
    <button type="button" className={"ew-comp img" + (imgLista ? " listo" : "")} onClick={onAmpliar} aria-label="Ampliar comprobante">
      {!imgLista && <span className="ew-skel ew-comp-skel" aria-hidden="true" />}
      <img src={src} alt={`Comprobante ${m.comprobante}`} decoding="async" fetchpriority="high"
        onLoad={() => setImgLista(true)} onError={falloImagen} />
    </button>
  );
}

// Comprobante a pantalla completa. Foto: tocar alterna ajustar / tamaño grande (con desplazamiento).
function Ampliado({ m, onCerrar }) {
  const tipo = tipoComprobante(m.comprobante);
  const [zoom, setZoom] = useState(false);
  const [fallo, setFallo] = useState(false);
  const cerrarRef = useRef(null);
  useEffect(() => { cerrarRef.current?.focus(); }, []);
  return (
    <div className="ew-amp" role="dialog" aria-modal="true" aria-label={`Comprobante ${m.comprobante}`}>
      <div className="ew-amp-bar">
        <span className="n">{m.comprobante}</span>
        <button ref={cerrarRef} type="button" className="ew-amp-x" onClick={onCerrar}>Cerrar</button>
      </div>
      {tipo === "pdf" || fallo ? (
        <iframe className="ew-amp-visor" title={`Comprobante ${m.comprobante}`} src={urlVisor(m.compId)} allow="fullscreen" />
      ) : (
        <div className={"ew-amp-img" + (zoom ? " zoom" : "")} onClick={() => setZoom(z => !z)}>
          <img src={urlMiniatura(m.compId, 1400)} alt={`Comprobante ${m.comprobante}`} decoding="async" onError={() => setFallo(true)} />
        </div>
      )}
      {tipo !== "pdf" && !fallo && <p className="ew-amp-hint">{zoom ? "Toca para ajustar a la pantalla" : "Toca para acercar"}</p>}
    </div>
  );
}

export default function FichaMovimiento({ m, onCerrar, onEditar }) {
  const [ampliado, setAmpliado] = useState(false);
  const panelRef = useRef(null);
  const tituloId = "ficha-titulo";

  // Escape cierra; el foco entra a la ficha y vuelve al movimiento al cerrar; el fondo no se desplaza
  useEffect(() => {
    const previo = document.activeElement;
    panelRef.current?.focus();
    const html = document.documentElement;
    const overflowPrevio = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = overflowPrevio;
      if (previo && typeof previo.focus === "function") previo.focus();
    };
  }, []);
  useEffect(() => {
    function tecla(e) {
      if (e.key !== "Escape") return;
      if (ampliado) setAmpliado(false); else onCerrar();
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [ampliado, onCerrar]);

  const titulo = m.descripcion || m.categoria || m.tipo;
  const monto = montoFicha(m);
  const esTransf = m.tipo === "Transferencia";
  const filas = [
    ["Fecha", m.fecha],
    ["Tipo", esTransf ? `Transferencia (${m.montoUSD < 0 ? "salida" : "entrada"})` : m.tipo],
    !esTransf && m.categoria ? ["Categoría", m.categoria] : null,
    ["Cuenta", m.cuenta],
    m.tipo === "Ingreso" && m.agencia ? ["Agencia", m.agencia] : null,
    m.tcDia > 0 ? ["TC del día", fmtTC(m.tcDia)] : null,
    m.montoCLP ? ["Monto CLP", (m.montoCLP < 0 ? "−" : "") + fmtCLP(Math.abs(m.montoCLP))] : null,
    m.notas ? ["Notas", m.notas] : null,
  ].filter(Boolean);

  return (
    <>
      <div className="ew-ficha-fondo" onClick={onCerrar} aria-hidden="true" />
      <div className="ew-ficha" role="dialog" aria-modal="true" aria-labelledby={tituloId} ref={panelRef} tabIndex={-1}>
        <div className="ew-ficha-asa" aria-hidden="true" />
        <div className="ew-ficha-head">
          <div className={"ic " + claseTipo(m.tipo)}><IconoTipo tipo={m.tipo} size={18} /></div>
          <button type="button" className="ew-ficha-x" onClick={onCerrar} aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <h2 id={tituloId} className="ew-ficha-titulo">{titulo}</h2>
        <div className={"ew-ficha-monto num " + monto.cls}>{monto.txt} <span>USD</span></div>

        <dl className="ew-ficha-datos">
          {filas.map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>

        <section className="ew-ficha-comp" aria-label="Comprobante">
          <div className="ew-ficha-sub">Comprobante</div>
          {m.compId ? (
            <>
              <VistaComprobante key={m.compId} m={m} onAmpliar={() => setAmpliado(true)} />
              <div className="ew-ficha-archivo">{m.comprobante}</div>
            </>
          ) : m.comprobante ? (
            <div className="ew-ficha-vacio">{m.comprobante}</div>
          ) : (
            <div className="ew-ficha-vacio">Sin comprobante. Puedes adjuntarlo con Editar.</div>
          )}
        </section>

        <div className="ew-ficha-acciones">
          <button type="button" className="ew-save" onClick={() => onEditar(m)}>Editar</button>
        </div>
      </div>
      {ampliado && m.compId && <Ampliado m={m} onCerrar={() => setAmpliado(false)} />}
    </>
  );
}
