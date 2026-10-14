import { useEffect, useId, useRef, useState } from "react";
import { IAbajo } from "./iconos";

// En pantallas táctiles (iPhone) usa el selector nativo, que abre la rueda de iOS.
// Con mouse (PC/Mac) usa un menú propio con el estilo del panel, porque el menú
// nativo de Chrome/Windows no respeta los colores ni el tamaño del diseño.
function usePunteroTactil() {
  const [tactil, setTactil] = useState(false);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setTactil(mq.matches);
    update();
    if (mq.addEventListener) mq.addEventListener("change", update);
    else mq.addListener(update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", update);
      else mq.removeListener(update);
    };
  }, []);
  return tactil;
}

const ICheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
);

// options: [{ v: "Meta Ads", l: "Meta Ads" }]
export default function Selector({ id, label, value, onChange, options, placeholder = "Elegir" }) {
  const tactil = usePunteroTactil();
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const caja = useRef(null);
  const boton = useRef(null);
  const lista = useRef(null);
  const listId = useId();

  const actual = options.find(o => o.v === value);

  function abrir() {
    const i = Math.max(0, options.findIndex(o => o.v === value));
    setActivo(i);
    setAbierto(true);
  }
  function cerrar(volverFoco = true) {
    setAbierto(false);
    if (volverFoco) boton.current?.focus();
  }
  function elegir(v) {
    onChange(v);
    cerrar();
  }

  // Cierra al hacer clic fuera
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e) => { if (caja.current && !caja.current.contains(e.target)) setAbierto(false); };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  // Enfoca y hace visible la opción activa
  useEffect(() => {
    if (!abierto || !lista.current) return;
    const el = lista.current.querySelector(`[data-i="${activo}"]`);
    if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: "nearest" }); }
  }, [abierto, activo]);

  function teclaBoton(e) {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); abrir(); }
  }
  function teclaLista(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActivo(i => Math.min(options.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActivo(i => Math.max(0, i - 1)); }
    else if (e.key === "Home") { e.preventDefault(); setActivo(0); }
    else if (e.key === "End") { e.preventDefault(); setActivo(options.length - 1); }
    else if (e.key === "Escape") { e.preventDefault(); cerrar(); }
    else if (e.key === "Tab") { setAbierto(false); }
  }

  if (tactil) {
    return (
      <div className="ew-field">
        <label htmlFor={id}>{label}</label>
        <select id={id} value={value} onChange={e => onChange(e.target.value)}>
          {placeholder != null && !options.some(o => o.v === "") && <option value="" disabled={!!value}>{placeholder}</option>}
          {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <IAbajo size={14} className="chev" />
      </div>
    );
  }

  return (
    <div className="ew-field ew-sel" ref={caja}>
      <span className="ew-sel-label" id={id + "-label"}>{label}</span>
      <button type="button" id={id} ref={boton} className={"ew-sel-btn" + (abierto ? " open" : "")}
        aria-haspopup="listbox" aria-expanded={abierto} aria-controls={listId} aria-labelledby={`${id}-label ${id}`}
        onClick={() => (abierto ? cerrar() : abrir())} onKeyDown={teclaBoton}>
        <span className={actual ? "" : "ph"}>{actual ? actual.l : placeholder}</span>
        <IAbajo size={14} />
      </button>
      {abierto && (
        <div className="ew-sel-pop" role="listbox" id={listId} ref={lista} aria-labelledby={id + "-label"} onKeyDown={teclaLista}>
          {options.map((o, i) => {
            const sel = o.v === value;
            return (
              <button type="button" role="option" key={o.v} data-i={i} aria-selected={sel} tabIndex={i === activo ? 0 : -1}
                className={"ew-sel-opt" + (sel ? " sel" : "")}
                onMouseEnter={() => setActivo(i)} onClick={() => elegir(o.v)}>
                <span>{o.l}</span>
                {sel && <ICheck />}
              </button>
            );
          })}
          {!options.length && <div className="ew-sel-empty">Sin opciones. Agrégalas en el Google Sheet.</div>}
        </div>
      )}
    </div>
  );
}
