import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="es">
      <Head>
        <meta name="color-scheme" content="light dark" />
        {/* La barra de Safari toma el color del fondo en cada modo */}
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#F5F6F8" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0C0E12" />
        {/* Permite usarlo como app desde "Agregar a pantalla de inicio" en iPhone */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Ecom Warrior" />
        {/* Evita que iOS convierta montos en links de teléfono */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="robots" content="noindex" />
        {/* Conexión anticipada a Google Drive: el comprobante abre más rápido en la ficha */}
        <link rel="preconnect" href="https://drive.google.com" />
        <link rel="preconnect" href="https://lh3.googleusercontent.com" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
