# Ecom Warrior LLC — Dashboard

Panel financiero de Ecom Warrior LLC. Lee los movimientos desde Google Sheets y escribe
nuevos movimientos a través de una Web App de Google Apps Script. Desplegado en Vercel
(`dashboard.ecomwarriorllc.com`), funciones en São Paulo (`gru1`).

## Variables de entorno (Vercel → Environments → Production y Preview)

Todas son de servidor: ninguna usa el prefijo `NEXT_PUBLIC_`.

| Variable | Uso |
|---|---|
| `DASHBOARD_PASSWORD` | Contraseña de acceso |
| `AUTH_TOKEN` | Valor secreto de la cookie de sesión |
| `SHEETS_API_KEY` | API Key de Google Sheets (solo lectura) |
| `SHEET_ID` | ID del Google Sheet |
| `APPS_SCRIPT_URL` | URL `/exec` de la Web App de Apps Script |
| `APPS_SCRIPT_SECRET` | Secreto compartido con Apps Script (`WEBAPP_SECRET`) |
| `BCCH_TOKEN` | Apikey Token del Banco Central de Chile (estimación CLP del formulario) |

## Desarrollo local

```bash
npm install
npm run dev
```

Crea un `.env.local` con las variables de arriba (no se sube al repo).

## Deploy

- Cada push a una rama crea un preview en Vercel.
- Merge a `main` publica en producción.
- Para volver atrás: Vercel → Deployments → deploy anterior → *Promote*.

## Estructura

```
pages/
  index.js            ← Shell de la app (navegación, año, carga de datos)
  login.js            ← Login
  _app.js, _document.js
  api/
    auth.js           ← Login y cookie de sesión
    datos.js          ← Movimientos, categorías y agencias desde Sheets
    tc.js             ← Dólar observado (Banco Central → mindicador)
    transaccion.js    ← Reenvía el formulario a Apps Script
components/
  VistaInicio.js, VistaFlujo.js, VistaMovimientos.js, VistaAgregar.js
  ListaMovimientos.js, Selector.js, graficos.js, iconos.js
lib/
  calculos.js         ← Cálculos puros y formatos
  categorias.js       ← Reglas de categorías por tipo y cuentas
  sheets.js           ← Lectura de Google Sheets API
  useTema.js          ← Paleta de gráficos claro/oscuro
middleware.js         ← Protección de rutas por cookie
styles/globals.css    ← Tokens de diseño (claro/oscuro según el sistema)
fonts/                ← Geist (licencia incluida)
vercel.json           ← Región de funciones (gru1)
```
