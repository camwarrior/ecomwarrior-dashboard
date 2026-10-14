import { useEffect, useState } from "react";

// Colores para los gráficos (Recharts necesita valores concretos, no variables CSS).
// Deben coincidir con los tokens de styles/globals.css.
export const PALETAS = {
  claro: { accent: "#2B59FF", gasto: "#FF8A3D", linea: "#101216", grid: "#EEF0F3", base: "#D5D9DF", eje: "#8A909B", ejeFuerte: "#101216", neutro: "#C9CDD4", superficie: "#FFFFFF" },
  oscuro: { accent: "#6A8BFF", gasto: "#FF9A52", linea: "#EEF0F3", grid: "#20242B", base: "#333944", eje: "#727A87", ejeFuerte: "#EEF0F3", neutro: "#4A505B", superficie: "#15181E" },
};

// Sigue el modo del sistema y reacciona si cambia mientras la app está abierta
export function useTema() {
  const [oscuro, setOscuro] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setOscuro(mq.matches);
    update();
    if (mq.addEventListener) mq.addEventListener("change", update);
    else mq.addListener(update); // Safari antiguo
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", update);
      else mq.removeListener(update);
    };
  }, []);
  return oscuro ? PALETAS.oscuro : PALETAS.claro;
}
