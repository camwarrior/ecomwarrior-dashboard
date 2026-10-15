// Vista previa de comprobantes guardados en Google Drive.
// Los archivos ya están compartidos como "cualquiera con el link puede ver"
// (lo hace el script al subirlos), así que el navegador los pide directo a Google:
// nada pasa por el servidor de la app y nada se carga hasta abrir la ficha.

// "pdf" o "img" según la extensión del nombre (png, jpg, heic, webp…)
export function tipoComprobante(nombre) {
  const ext = ((String(nombre || "").match(/\.([a-z0-9]{2,5})$/i) || [])[1] || "").toLowerCase();
  return ext === "pdf" ? "pdf" : "img";
}

// Ancho útil de la vista previa dentro de la ficha (panel de 480 px en PC, pantalla completa en iPhone)
export function anchoFicha() {
  if (typeof window === "undefined") return 440;
  return Math.min(window.innerWidth, 480) - 40;
}

// Miniatura generada por Drive (sirve para fotos y para la 1.ª página de un PDF).
// Ancho según la pantalla para no bajar más píxeles de los necesarios.
export function urlMiniatura(id, ancho) {
  const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 3) : 2;
  const w = Math.min(2000, Math.round((ancho || 480) * dpr / 100) * 100 || 1000);
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${w}`;
}

// Respaldo directo al CDN de Google si la miniatura falla
export function urlImagenDirecta(id, ancho) {
  return `https://lh3.googleusercontent.com/d/${encodeURIComponent(id)}=w${Math.round(ancho || 1200)}`;
}

// Visor de Drive (PDF con páginas y zoom)
export function urlVisor(id) {
  return `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`;
}

// Empieza a bajar la miniatura apenas el dedo toca el movimiento (antes de que se abra la ficha)
const yaPedidas = new Set();
export function precargarComprobante(m, ancho) {
  if (!m || !m.compId || typeof window === "undefined") return;
  const url = urlMiniatura(m.compId, ancho);
  if (yaPedidas.has(url)) return;
  yaPedidas.add(url);
  const img = new Image();
  img.decoding = "async";
  img.src = url;
}
