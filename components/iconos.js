// Íconos de trazo, heredan el color del texto (currentColor).
function Svg({ size = 20, sw = 1.9, children, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

export const ILogo = (p) => <Svg sw={1.8} {...p}><path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" /></Svg>;
export const IInicio = (p) => <Svg {...p}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></Svg>;
export const IFlujo = (p) => <Svg {...p}><path d="M7 7h13M16 3l4 4-4 4" /><path d="M17 17H4M8 13l-4 4 4 4" /></Svg>;
export const ILista = (p) => <Svg {...p}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></Svg>;
export const IRenta = (p) => <Svg {...p}><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></Svg>;
export const IMas = (p) => <Svg sw={2.2} {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const IRefrescar = (p) => <Svg sw={1.8} {...p}><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></Svg>;
export const IAbajo = (p) => <Svg sw={2.2} {...p}><path d="m6 9 6 6 6-6" /></Svg>;
export const IClip = (p) => <Svg {...p}><path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7" /></Svg>;
export const ISalida = (p) => <Svg sw={2} {...p}><path d="M7 7 17 17M16 17H7" /><path d="M17 8v9" /></Svg>;
export const IEntrada = (p) => <Svg sw={2} {...p}><path d="M17 17 7 7M8 7h9v9" /></Svg>;
export const IAporte = (p) => <Svg sw={2} {...p}><path d="M12 5v14M5 12l7-7 7 7" /></Svg>;

export function IconoTipo({ tipo, size = 16 }) {
  if (tipo === "Gasto") return <ISalida size={size} />;
  if (tipo === "Ingreso") return <IEntrada size={size} />;
  if (tipo === "Aporte") return <IAporte size={size} />;
  return <IFlujo size={size} sw={2} />;
}

export const claseTipo = (tipo) =>
  tipo === "Gasto" ? "ic-gasto" : tipo === "Ingreso" ? "ic-ingreso" : tipo === "Aporte" ? "ic-aporte" : "ic-trans";
