# Ecom Warrior LLC — Dashboard

Dashboard financiero conectado a Google Sheets, desplegado en Vercel.

## Variables de entorno

Configura estas variables en Vercel (Settings → Environment Variables):

```
NEXT_PUBLIC_SHEETS_API_KEY=tu_api_key
NEXT_PUBLIC_SHEET_ID=tu_sheet_id
```

## Desarrollo local

```bash
npm install
npm run dev
```

## Deploy en Vercel

1. Sube este proyecto a un repositorio GitHub
2. Importa en vercel.com → New Project
3. Agrega las variables de entorno
4. Deploy

## Estructura

```
pages/
  index.js          ← Dashboard principal
  _app.js           ← Entry point
lib/
  sheets.js         ← Conexión a Google Sheets API
components/
  StatCard.js       ← Tarjeta de métrica
  SectionTitle.js   ← Título de sección
styles/
  globals.css       ← Design system oscuro
```
