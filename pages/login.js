import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!password) return;
    setLoading(true);
    setError(false);

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/");
    } else {
      setError(true);
      setLoading(false);
      setPassword("");
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <>
      <Head>
        <title>Ecom Warrior LLC — Acceso</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Syne', sans-serif",
      }}>

        {/* Grid de fondo */}
        <div style={{
          position: "fixed", inset: 0, zIndex: 0,
          backgroundImage: "linear-gradient(#1a1a1a 1px, transparent 1px), linear-gradient(90deg, #1a1a1a 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          opacity: 0.4,
        }} />

        <div style={{
          position: "relative", zIndex: 1,
          width: "100%", maxWidth: 400,
          padding: "0 24px",
        }}>

          {/* Logo / marca */}
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48, height: 48,
              borderRadius: 12,
              border: "1px solid #2e2e2e",
              background: "#111",
              marginBottom: 20,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e8e8e8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h1 style={{
              fontSize: 20, fontWeight: 700, color: "#e8e8e8",
              letterSpacing: "-0.03em", margin: "0 0 6px",
            }}>
              Ecom Warrior LLC
            </h1>
            <p style={{
              fontSize: 13, color: "#555",
              fontFamily: "'DM Mono', monospace", margin: 0,
            }}>
              Dashboard financiero
            </p>
          </div>

          {/* Card */}
          <div style={{
            background: "#111",
            border: "1px solid #1e1e1e",
            borderRadius: 16,
            padding: "32px 28px",
          }}>
            <p style={{
              fontSize: 11, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "#444",
              fontFamily: "'DM Mono', monospace",
              marginBottom: 16,
            }}>
              Contraseña de acceso
            </p>

            <div style={{ position: "relative", marginBottom: 12 }}>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(false); }}
                onKeyDown={handleKey}
                placeholder="••••••••"
                autoFocus
                style={{
                  width: "100%",
                  background: "#0a0a0a",
                  border: `1px solid ${error ? "#f87171" : "#2e2e2e"}`,
                  borderRadius: 10,
                  padding: "14px 16px",
                  fontSize: 16,
                  color: "#e8e8e8",
                  fontFamily: "'DM Mono', monospace",
                  letterSpacing: "0.1em",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
              />
            </div>

            {error && (
              <p style={{
                fontSize: 12, color: "#f87171",
                fontFamily: "'DM Mono', monospace",
                marginBottom: 12, marginTop: 4,
              }}>
                Contraseña incorrecta
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || !password}
              style={{
                width: "100%",
                padding: "14px",
                background: loading || !password ? "#1a1a1a" : "#e8e8e8",
                color: loading || !password ? "#444" : "#0a0a0a",
                border: "none",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "'Syne', sans-serif",
                cursor: loading || !password ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                letterSpacing: "-0.01em",
              }}
            >
              {loading ? "Verificando..." : "Ingresar"}
            </button>
          </div>

          <p style={{
            textAlign: "center", marginTop: 24,
            fontSize: 11, color: "#333",
            fontFamily: "'DM Mono', monospace",
          }}>
            AT 2026 · Uso interno
          </p>

        </div>
      </div>
    </>
  );
}
