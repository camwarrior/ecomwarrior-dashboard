import { useState } from "react";
import { IClip, IAbajo } from "./iconos";
import { hoyChile, fmtCLP } from "../lib/calculos";

const TIPOS = [
  { v: "Ingreso", l: "Ingreso" },
  { v: "Aporte", l: "Aporte" },
  { v: "Gasto", l: "Gasto" },
  { v: "Transferencia", l: "Transferir" },
];
const CUENTAS = ["Mercury", "Slash", "Wise"];
// Cuenta sugerida por tipo (se puede cambiar)
const CUENTA_SUGERIDA = { Ingreso: "Mercury", Aporte: "Mercury", Gasto: "Slash" };

function formInicial(tipo = "Ingreso") {
  return {
    fecha: hoyChile(), tipo, categoria: "", usd: "", cuenta: CUENTA_SUGERIDA[tipo] || "Mercury",
    desc: "", agencia: "", notas: "", cuentaOrigen: "Mercury", cuentaDestino: "Slash",
  };
}

// Ancho del campo de monto ajustado al texto, para que el "$" quede pegado al número
function anchoMonto(v) {
  const t = v || "0.00";
  const digitos = (t.match(/[0-9]/g) || []).length;
  const separadores = t.length - digitos;
  return `calc(${digitos}ch + ${separadores * 0.42}ch + 4px)`;
}

function Select({ id, label, value, onChange, children }) {
  return (
    <div className="ew-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={e => onChange(e.target.value)}>{children}</select>
      <IAbajo size={14} className="chev" />
    </div>
  );
}

export default function VistaAgregar({ categorias, agencias, tc, tipoInicial, onGuardado, onCancelar }) {
  const [form, setForm] = useState(() => formInicial(tipoInicial));
  const [archivo, setArchivo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState(null);
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function cambiarTipo(tipo) {
    setForm(f => ({ ...f, tipo, cuenta: CUENTA_SUGERIDA[tipo] || f.cuenta }));
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
        data.comprobante = { bytes, name: archivo.name, mime: archivo.type };
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
            <Select id="f-origen" label="Desde" value={form.cuentaOrigen} onChange={v => setF("cuentaOrigen", v)}>
              {CUENTAS.map(x => <option key={x}>{x}</option>)}
            </Select>
            <Select id="f-destino" label="Hacia" value={form.cuentaDestino} onChange={v => setF("cuentaDestino", v)}>
              {CUENTAS.map(x => <option key={x}>{x}</option>)}
            </Select>
          </>
        ) : (
          <>
            <Select id="f-cat" label="Categoría" value={form.categoria} onChange={v => setF("categoria", v)}>
              <option value="">Elegir</option>
              {categorias.map(x => <option key={x} value={x}>{x}</option>)}
            </Select>
            <Select id="f-cuenta" label="Cuenta" value={form.cuenta} onChange={v => setF("cuenta", v)}>
              {CUENTAS.map(x => <option key={x}>{x}</option>)}
            </Select>
          </>
        )}

        {form.tipo === "Ingreso" && (
          <Select id="f-agencia" label="Agencia" value={form.agencia} onChange={v => setF("agencia", v)}>
            <option value="">Elegir</option>
            {agencias.map(x => <option key={x} value={x}>{x}</option>)}
          </Select>
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
          <span className="hint">{archivo ? "Se sube a Drive al guardar" : "Foto o PDF, opcional"}</span>
        </span>
        <input id="f-comp" type="file" accept="image/*,application/pdf" onChange={e => setArchivo(e.target.files[0] || null)} />
      </label>
      {archivo && (
        <button type="button" className="ew-link" style={{ alignSelf: "center", marginTop: -8 }} onClick={() => setArchivo(null)}>Quitar comprobante</button>
      )}

      <p className="ew-note">Se guarda en tu Google Sheet con el tipo de cambio del día, y el comprobante va a Drive en Comprobantes / año / mes.</p>

      <div className="ew-savebar">
        <button type="submit" className="ew-save" disabled={enviando}>{enviando ? "Guardando…" : "Guardar movimiento"}</button>
      </div>
    </form>
  );
}
