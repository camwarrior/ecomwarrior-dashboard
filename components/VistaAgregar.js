import { useState } from "react";
import { IClip } from "./iconos";
import Selector from "./Selector";
import { hoyChile, fmtCLP } from "../lib/calculos";
import { CUENTAS, categoriasPara, cuentaDeCategoria } from "../lib/categorias";

const TIPOS = [
  { v: "Ingreso", l: "Ingreso" },
  { v: "Aporte", l: "Aporte" },
  { v: "Gasto", l: "Gasto" },
  { v: "Transferencia", l: "Transferir" },
];
// Cuenta sugerida por tipo (se puede cambiar)
const CUENTA_SUGERIDA = { Ingreso: "Mercury", Aporte: "Mercury", Gasto: "Slash" };

// Al cambiar de tipo: limpia la categoría si ya no corresponde y, si el tipo
// tiene una sola categoría (p. ej. Aporte → Aporte socio), la deja elegida.
function ajustarATipo(f, tipo, categorias) {
  const validas = categoriasPara(tipo, categorias);
  let categoria = validas.some(c => c.nombre === f.categoria) ? f.categoria : "";
  if (!categoria && validas.length === 1) categoria = validas[0].nombre;
  const cat = validas.find(c => c.nombre === categoria);
  const cuenta = cuentaDeCategoria(cat) || CUENTA_SUGERIDA[tipo] || f.cuenta;
  return { ...f, tipo, categoria, cuenta };
}

function formInicial(tipo = "Ingreso", categorias = []) {
  const base = {
    fecha: hoyChile(), tipo, categoria: "", usd: "", cuenta: "Mercury",
    desc: "", agencia: "", notas: "", cuentaOrigen: "Mercury", cuentaDestino: "Slash",
  };
  return tipo === "Transferencia" ? base : ajustarATipo(base, tipo, categorias);
}

// Ancho del campo de monto ajustado al texto, para que el "$" quede pegado al número
function anchoMonto(v) {
  const t = v || "0.00";
  const digitos = (t.match(/[0-9]/g) || []).length;
  const separadores = t.length - digitos;
  return `calc(${digitos}ch + ${separadores * 0.42}ch + 4px)`;
}

const MIME_EXT = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/heic": "heic", "image/heif": "heif", "image/webp": "webp" };

// Texto seguro para nombre de archivo: sin tildes, sin espacios ni símbolos
function limpiar(t) {
  return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

// Nombre ordenable para Drive, p. ej. 2026-10-13_Gasto_Meta-Ads_USD-184.20_Slash.pdf
export function nombreComprobante(form, archivo) {
  const extOriginal = (archivo.name.match(/\.([A-Za-z0-9]{2,5})$/) || [])[1];
  const ext = (extOriginal || MIME_EXT[archivo.type] || "bin").toLowerCase();
  const usd = parseFloat(String(form.usd).replace(",", "."));
  const monto = usd > 0 ? `USD-${usd.toFixed(2)}` : "";
  let detalle, cuenta;
  if (form.tipo === "Transferencia") {
    detalle = `${form.cuentaOrigen}-a-${form.cuentaDestino}`;
    cuenta = "";
  } else {
    detalle = (form.tipo === "Ingreso" && form.agencia) ? form.agencia : (form.categoria || form.desc || "");
    cuenta = form.cuenta;
  }
  const partes = [form.fecha, form.tipo, limpiar(detalle), monto, limpiar(cuenta)].filter(Boolean);
  return partes.join("_") + "." + ext;
}

export default function VistaAgregar({ categorias, agencias, tc, tipoInicial, onGuardado, onCancelar }) {
  const [form, setForm] = useState(() => formInicial(tipoInicial, categorias));
  const [archivo, setArchivo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState(null);
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const catsDelTipo = categoriasPara(form.tipo, categorias);

  function cambiarTipo(tipo) {
    setMsg(null);
    setForm(f => (tipo === "Transferencia" ? { ...f, tipo } : ajustarATipo(f, tipo, categorias)));
  }

  // Elegir categoría sugiere su cuenta válida (Meta Ads → Slash), editable después
  function cambiarCategoria(nombre) {
    const cat = catsDelTipo.find(c => c.nombre === nombre);
    setForm(f => ({ ...f, categoria: nombre, cuenta: cuentaDeCategoria(cat) || f.cuenta }));
  }

  const usdNum = parseFloat(String(form.usd).replace(",", "."));
  const clp = tc && usdNum > 0 ? usdNum * tc : null;

  async function enviar(e) {
    e.preventDefault();
    if (enviando) return;
    if (!form.fecha) { setMsg({ ok: false, text: "Falta la fecha del movimiento." }); return; }
    if (form.tipo === "Transferencia" && form.cuentaOrigen === form.cuentaDestino) {
      setMsg({ ok: false, text: "La cuenta de origen y la de destino deben ser distintas." }); return;
    }
    if (form.tipo !== "Transferencia" && form.categoria && !catsDelTipo.some(c => c.nombre === form.categoria)) {
      setMsg({ ok: false, text: `La categoría "${form.categoria}" no corresponde a un ${form.tipo.toLowerCase()}. Elige otra.` }); return;
    }
    setEnviando(true); setMsg(null);

    // Mismo formato que espera la Web App de Apps Script
    const data = {
      fecha: form.fecha, tipo: form.tipo, categoria: form.categoria,
      usd: String(form.usd).replace(",", "."), cuenta: form.cuenta, desc: form.desc,
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
        data.comprobante = { bytes, name: nombreComprobante(form, archivo), mime: archivo.type || "application/octet-stream" };
      }
      const resp = await fetch("/api/transaccion", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (resp.status === 401) { window.location.href = "/login"; return; }
      const j = await resp.json().catch(() => ({ ok: false }));
      if (j.ok) {
        onGuardado();
        return;
      }
      setMsg({ ok: false, text: j.error || "No se pudo guardar. Revisa los datos e intenta de nuevo." });
    } catch (err) {
      setMsg({ ok: false, text: "Sin conexión con el servidor. Intenta de nuevo." });
    }
    setEnviando(false);
  }

  const esTransf = form.tipo === "Transferencia";
  const opcCuentas = CUENTAS.map(x => ({ v: x, l: x }));
  const opcCategorias = catsDelTipo.map(c => ({ v: c.nombre, l: c.nombre }));
  const opcAgencias = agencias.map(x => ({ v: x, l: x }));
  const [inputKey, setInputKey] = useState(0);
  function quitarArchivo() { setArchivo(null); setInputKey(k => k + 1); }

  return (
    <form className="ew-formwrap" onSubmit={enviar} noValidate>
      <div className="ew-formhead">
        <button type="button" className="ew-link cancel" style={{ fontSize: 16 }} onClick={onCancelar}>Cancelar</button>
        <h1>Nuevo movimiento</h1>
        <span className="spacer" />
      </div>

      <div className="ew-tipos" role="radiogroup" aria-label="Tipo de movimiento">
        {TIPOS.map(t => (
          <button key={t.v} type="button" role="radio" aria-checked={form.tipo === t.v}
            className={form.tipo === t.v ? "on" : ""} onClick={() => cambiarTipo(t.v)}>{t.l}</button>
        ))}
      </div>

      <div className="ew-amount">
        <label htmlFor="f-usd">Monto en USD</label>
        <div className="row">
          <span className="cur">$</span>
          <input id="f-usd" inputMode="decimal" autoComplete="off" placeholder="0.00" value={form.usd}
            style={{ width: anchoMonto(form.usd) }}
            onChange={e => setF("usd", e.target.value.replace(/[^0-9.,]/g, ""))} />
        </div>
        <div className="clp num">{clp ? `≈ ${fmtCLP(clp)} CLP con el dólar de hoy` : ""}</div>
      </div>

      {msg && <div className={"ew-msg " + (msg.ok ? "ok" : "err")} role="alert">{msg.text}</div>}

      <div className="ew-group">
        <div className="ew-field">
          <label htmlFor="f-fecha">Fecha</label>
          <input id="f-fecha" type="date" value={form.fecha} onChange={e => setF("fecha", e.target.value)} required />
        </div>

        {esTransf ? (
          <>
            <Selector id="f-origen" label="Desde" value={form.cuentaOrigen} onChange={v => setF("cuentaOrigen", v)} options={opcCuentas} />
            <Selector id="f-destino" label="Hacia" value={form.cuentaDestino} onChange={v => setF("cuentaDestino", v)} options={opcCuentas} />
          </>
        ) : (
          <>
            <Selector id="f-cat" label="Categoría" value={form.categoria} onChange={cambiarCategoria} options={opcCategorias}
              vacio={`No hay categorías de tipo ${form.tipo} en la pestaña Categorías del Sheet.`} />
            <Selector id="f-cuenta" label="Cuenta" value={form.cuenta} onChange={v => setF("cuenta", v)} options={opcCuentas} />
          </>
        )}

        {form.tipo === "Ingreso" && (
          <Selector id="f-agencia" label="Agencia" value={form.agencia} onChange={v => setF("agencia", v)} options={opcAgencias} />
        )}

        <div className="ew-field">
          <label htmlFor="f-desc">Descripción</label>
          <input id="f-desc" type="text" placeholder={form.tipo === "Gasto" ? "Ej: campaña junio" : "Ej: comisión junio"} value={form.desc} onChange={e => setF("desc", e.target.value)} />
        </div>
        <div className="ew-field col">
          <label htmlFor="f-notas" style={{ fontSize: 14, color: "var(--muted)" }}>Notas (opcional)</label>
          <textarea id="f-notas" rows={2} value={form.notas} onChange={e => setF("notas", e.target.value)} />
        </div>
      </div>

      <label className="ew-file" htmlFor="f-comp">
        <IClip size={20} />
        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 0, textAlign: "left" }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{archivo ? archivo.name : "Adjuntar comprobante"}</span>
          <span className="hint">{archivo ? "Se guarda en Drive con un nombre ordenado" : "Foto o PDF, opcional"}</span>
        </span>
        <input key={inputKey} id="f-comp" type="file" accept="image/*,application/pdf" onChange={e => setArchivo(e.target.files[0] || null)} />
      </label>
      {archivo && (
        <div className="ew-filename">
          <span className="k">Nombre en Drive</span>
          <span className="v">{nombreComprobante(form, archivo)}</span>
          <button type="button" className="ew-link" onClick={quitarArchivo}>Quitar comprobante</button>
        </div>
      )}

      <p className="ew-note">Se guarda en tu Google Sheet con el tipo de cambio del día, y el comprobante va a Drive en Comprobantes / año / mes.</p>

      <div className="ew-savebar">
        <button type="submit" className="ew-save" disabled={enviando}>{enviando ? "Guardando…" : "Guardar movimiento"}</button>
      </div>
    </form>
  );
}
