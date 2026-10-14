import Head from "next/head";
import localFont from "next/font/local";
import "../styles/globals.css";

// Geist (licencia OFL, ver fonts/Geist-LICENSE.txt) servida desde el mismo dominio:
// sin Google Fonts ni @import que bloqueen la primera carga.
const geist = localFont({
  src: "../fonts/Geist-Variable.woff2",
  weight: "100 900",
  display: "swap",
  fallback: ["Helvetica Neue", "system-ui", "-apple-system", "sans-serif"],
});

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <style jsx global>{`
        :root { --font-sans: ${geist.style.fontFamily}; }
      `}</style>
      <Component {...pageProps} />
    </>
  );
}
