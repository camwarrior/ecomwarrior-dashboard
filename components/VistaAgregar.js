import { useState } from "react";
import { IClip } from "./iconos";
import Selector from "./Selector";
import { hoyChile, fmtCLP } from "../lib/calculos";
import { CUENTAS, categoriasPara, cuentaDeCategoria } from "../lib/categorias";

const TIPOS = [
  { v: "Ingreso", l: "Ingreso" },
  { v: "Aporte", l: "Aporte" },
  { v: "Gasto", l: "Gasto" },
  { v: "Retiro", l: "Retiro" },
  { v: "Transferencia", l: "Transferir" },
];
// Cuenta sugerida por tipo (se puede cambiar)
const PLACEHOLDER_DESC = { Ingreso: "Ej: comisión junio", Aporte: "Ej: aporte de capital", Gasto: "Ej: campaña junio", Retiro: "Ej: retiro de utilidades" };
const CUENTA_SUGERIDA = { Ingreso: "Slash", Aporte: "Slash", Gasto: "Slash", Retiro: "Slash" };

// Al cambiar de tipo: limpia la categoría si ya no corresponde y, si el tipo
// tiene una sola categoría (p. ej. Aporte → Aporte socio), la deja elegida.
// Al editar se conserva la cuenta que ya tenía el movimiento.
function ajustarATipo(f, tipo, categorias, conservarCuenta = false) {
  const validas = categoriasPara(tipo, categorias);
  let categoria = validas.some(c => c.nombre === f.categoria) ? f.categoria : "";
  if (!categoria && validas.length === 1) categoria = validas[0].nombre;
  const cat = validas.find(c => c.nombre === categoria);
  const cuenta = conservarCuenta ? f.cuenta : (cuentaDeCategoria(cat) || CUENTA_SUGERIDA[tipo] || f.cuenta);
  return { ...f, tipo, categoria, cuenta };
}

// "14/10/2026" -> "2026-10-14"
function fechaInput(dmy) {
  const p = String(dmy || "").split("/");
  if (p.length !== 3) return "";
  return `${p[2]}-${p[1].padStart(2, "0")}-${p[0].padStart(2, "0")}`;
}

// Formulario precargado con un movimiento existente
function formDesde(m) {
  return {
    fecha: fechaInput(m.fecha), tipo: m.tipo, categoria: m.categoria || "",
    usd: m.montoUSD ? Math.abs(m.montoUSD).toFixed(2) : "", cuenta: m.cuenta || "Slash",
    desc: m.descripcion || "", agencia: m.agencia || "", notas: m.notas || "",
    cuentaOrigen: "Mercury", cuentaDestino: "Slash",
  };
}

function formInicial(tipo = "Ingreso", categorias = []) {
  const base = {
    fecha: hoyChile(), tipo, categoria: "", usd: "", cuenta: "Slash",
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

// editar (opcional): movimiento existente { fila, id, fecha, tipo, ... } para modificarlo
export default function VistaAgregar({ categorias, agencias, tc, tipoInicial, editar, onGuardado, onCancelar }) {
  const [form, setForm] = useState(() => (editar ? formDesde(editar) : formInicial(tipoInicial, categorias)));
  const editando = !!editar;
  // Una transferencia son dos filas en el Sheet: aquí solo se editan descripción y notas
  const transfEditada = editando && editar.tipo === "Transferencia";
  const [archivo, setArchivo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState(null);
  const [lento, setLento] = useState(false);
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const catsDelTipo = categoriasPara(form.tipo, categorias);

  function cambiarTipo(tipo) {
    setMsg(null);
    setForm(f => (tipo === "Transferencia" ? { ...f, tipo } : ajustarATipo(f, tipo, categorias, editando)));
  }

  // Elegir categoría sugiere su cuenta válida (Meta Ads → Slash), editable después
  function cambiarCategoria(nombre) {
    const cat = catsDelTipo.find(c => c.nombre === nombre);
    setForm(f => ({ ...f, categoria: nombre, cuenta: cuentaDeCategoria(cat) || f.cuenta }));
  }

  const usdNum = parseFloat(String(form.usd).replace(",", "."));
  // Al editar con la misma fecha se usa el TC que ya tiene la fila en el Sheet
  const tcFila = editando && editar.tcDia > 0 && form.fecha === fechaInput(editar.fecha) ? editar.tcDia : null;
  const tcUsado = tcFila || tc;
  const clp = tcUsado && usdNum > 0 ? usdNum * tcUsado : null;

  async function enviar(e) {
    e.preventDefault();
    if (enviando) return;
    if (!form.fecha) { setMsg({ ok: false, text: "Falta la fecha del movimiento." }); return; }
    if (editando && !transfEditada && !(parseFloat(String(form.usd).replace(",", ".")) > 0)) { setMsg({ ok: false, text: "Falta el monto en USD." }); return; }
    if (!editando && form.tipo === "Transferencia" && form.cuentaOrigen === form.cuentaDestino) {
      setMsg({ ok: false, text: "La cuenta de origen y la de destino deben ser distintas." }); return;
    }
    if (!transfEditada && form.tipo !== "Transferencia" && form.categoria && !catsDelTipo.some(c => c.nombre === form.categoria)) {
      setMsg({ ok: false, text: `La categoría "${form.categoria}" no corresponde a un ${form.tipo.toLowerCase()}. Elige otra.` }); return;
    }
    setEnviando(true); setMsg(null); setLento(false);
    const avisoLento = setTimeout(() => setLento(true), 12000);

    // Mismo formato que espera la Web App de Apps Script
    const data = transfEditada ? {
      // Fila de transferencia: se reenvían sus valores tal cual, solo cambian descripción y notas
      fecha: fechaInput(editar.fecha), tipo: "Transferencia", categoria: editar.categoria || "Transferencia interna",
      usd: String(editar.montoUSD), cuenta: editar.cuenta, desc: form.desc, agencia: "", notas: form.notas,
    } : {
      fecha: form.fecha, tipo: form.tipo, categoria: form.categoria,
      usd: String(form.usd).replace(",", "."), cuenta: form.cuenta, desc: form.desc,
      agencia: form.tipo === "Ingreso" ? form.agencia : "", notas: form.notas,
      cuentaOrigen: form.cuentaOrigen, cuentaDestino: form.cuentaDestino,
    };
    // Edición: misma fila del Sheet; "num" (#) permite al script confirmar que es el movimiento correcto
    if (editando) Object.assign(data, { modo: "editar", fila: editar.fila, num: editar.id });
    try {
      if (archivo && !transfEditada) {
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
      // Una respuesta que no es JSON suele ser un corte por tiempo del servidor
      const j = await resp.json().catch(() => ({ ok: false, pendiente: true }));
      if (j.ok) {
        clearTimeout(avisoLento);
        onGuardado();
        return;
      }
      setMsg({ ok: false, text: j.error || (j.pendiente
        ? (editando
          ? "El servidor tardó demasiado en responder. Puede que los cambios se guarden igual: revisa el movimiento en un minuto."
          : "El servidor tardó demasiado en responder. Puede que el movimiento se guarde igual: revisa Movimientos en un minuto antes de enviarlo de nuevo.")
        : "No se pudo guardar. Revisa los datos e intenta de nuevo.") });
    } catch (err) {
      setMsg({ ok: false, text: "Sin conexión con el servidor. Revisa Movimientos antes de intentar de nuevo." });
    }
    clearTimeout(avisoLento);
    setLento(false);
    setEnviando(false);
  }

  const esTransf = form.tipo === "Transferencia";
  const tiposVisibles = editando ? TIPOS.filter(t => t.v !== "Transferencia") : TIPOS;
  const opcCuentas = CUENTAS.map(x => ({ v: x, l: x }));
  const opcCategorias = catsDelTipo.map(c => ({ v: c.nombre, l: c.nombre }));
  const opcAgencias = agencias.map(x => ({ v: x, l: x }));
  const [inputKey, setInputKey] = useState(0);
  function quitarArchivo() { setArchivo(null); setInputKey(k => k + 1); }

  return (
    <form className="ew-formwrap" onSubmit={enviar} noValidate>
      <div className="ew-formhead">
        <button type="button" className="ew-link cancel" style={{ fontSize: 16 }} onClick={onCancelar}>Cancelar</button>
        <h1>{editando ? "Editar movimiento" : "Nuevo movimiento"}</h1>
        <span className="spacer" />
      </div>

      {transfEditada ? (
        <p className="ew-note" style={{ textAlign: "center" }}>
          Transferencia ({editar.montoUSD < 0 ? "salida de" : "entrada a"} {editar.cuenta}). Aquí puedes cambiar la descripción y las notas. Fecha, monto y cuentas se corrigen en el Sheet con <b>Editar transacción</b>, porque son dos filas.
        </p>
      ) : (
      <div className="ew-tipos" role="radiogroup" aria-label="Tipo de movimiento"
        style={{ gridTemplateColumns: `repeat(${tiposVisibles.length}, minmax(0, 1fr))` }}>
        {tiposVisibles.map(t => (
          <button key={t.v} type="button" role="radio" aria-checked={form.tipo === t.v}
            className={form.tipo === t.v ? "on" : ""} onClick={() => cambiarTipo(t.v)}>{t.l}</button>
        ))}
      </div>
      )}

      <div className="ew-amount">
        <label htmlFor="f-usd">Monto en USD</label>
        <div className="row">
          <span className="cur">$</span>
          <input id="f-usd" inputMode="decimal" autoComplete="off" placeholder="0.00" value={form.usd} disabled={transfEditada}
            style={{ width: anchoMonto(form.usd) }}
            onChange={e => setF("usd", e.target.value.replace(/[^0-9.,]/g, ""))} />
        </div>
        <div className="clp num">{clp ? `≈ ${fmtCLP(clp)} CLP con el dólar ${tcFila ? "de ese día" : "de hoy"}` : ""}</div>
      </div>

      {form.tipo === "Retiro" && (
        <p className="ew-note" style={{ textAlign: "center", marginTop: -6 }}>Dinero que retiras de la empresa para ti. Baja el saldo de la cuenta, pero no es gasto: no reduce la utilidad.</p>
      )}

      {msg && <div className={"ew-msg " + (msg.ok ? "ok" : "err")} role="alert">{msg.text}</div>}

      <div className="ew-group">
        <div className="ew-field">
          <label htmlFor="f-fecha">Fecha</label>
          <input id="f-fecha" type="date" value={form.fecha} onChange={e => setF("fecha", e.target.value)} required disabled={transfEditada} />
        </div>

        {transfEditada ? (
          <div className="ew-field">
            <label htmlFor="f-cuenta-fija">Cuenta</label>
            <input id="f-cuenta-fija" value={editar.cuenta} disabled readOnly />
          </div>
        ) : esTransf ? (
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
          <input id="f-desc" type="text" placeholder={PLACEHOLDER_DESC[form.tipo] || "Ej: comisión junio"} value={form.desc} onChange={e => setF("desc", e.target.value)} />
        </div>
        <div className="ew-field col">
          <label htmlFor="f-notas" style={{ fontSize: 14, color: "var(--muted)" }}>Notas (opcional)</label>
          <textarea id="f-notas" rows={2} value={form.notas} onChange={e => setF("notas", e.target.value)} />
        </div>
      </div>

      {editando && editar.comprobante && (
        <div className="ew-filename">
          <span className="k">Comprobante actual</span>
          <span className="v">{editar.comprobante}</span>
        </div>
      )}

      {!transfEditada && (<>
      <label className="ew-file" htmlFor="f-comp">
        <IClip size={20} />
        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 0, textAlign: "left" }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{archivo ? archivo.name : (editando && editar.comprobante ? "Reemplazar comprobante" : "Adjuntar comprobante")}</span>
          <span className="hint">{archivo ? "Se guarda en Drive con un nombre ordenado" : (editando && editar.comprobante ? "Opcional. El archivo anterior queda en Drive" : "Foto o PDF, opcional")}</span>
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

      </>)}

      <p className="ew-note">{editando
        ? (transfEditada ? "Los cambios se guardan en la misma fila del Google Sheet." : "Los cambios se guardan en la misma fila del Google Sheet. Si cambias la fecha, el tipo de cambio se recalcula.")
        : "Se guarda en tu Google Sheet con el tipo de cambio del día, y el comprobante va a Drive en Comprobantes / año / mes."}</p>

      {enviando && lento && (
        <p className="ew-note" role="status" style={{ textAlign: "center" }}>Sigue guardando. Google puede tardar unos segundos con el comprobante y el tipo de cambio. No lo envíes de nuevo.</p>
      )}

      <div className="ew-savebar">
        <button type="submit" className="ew-save" disabled={enviando}>{enviando ? "Guardando…" : (editando ? "Guardar cambios" : "Guardar movimiento")}</button>
      </div>
    </form>
  );
}
