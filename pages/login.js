import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

function Logo({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" />
    </svg>
  );
}

export default function Login() {
  const [password, setPassword] = useState("");
  const [ver, setVer] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        // El panel abre al instante y carga los datos después
        router.replace("/");
        return;
      }
      setError(res.status === 401 ? "Contraseña incorrecta. Vuelve a intentarlo." : "El servidor no respondió bien. Intenta en unos segundos.");
    } catch {
      setError("Sin conexión. Revisa tu internet y vuelve a intentarlo.");
    }
    setLoading(false);
    setPassword("");
  }

  return (
    <>
      <Head>
        <title>Ecom Warrior LLC · Acceso</title>
      </Head>
      <div className="lg-page">
        <style jsx>{`
          .lg-page {
            min-height: 100vh; min-height: 100dvh; display: flex; align-items: center; justify-content: center;
            padding: calc(24px + var(--safe-top)) 24px calc(24px + var(--safe-bottom)); background: var(--surface);
          }
          .lg-box { width: 100%; max-width: 380px; display: flex; flex-direction: column; }
          .lg-logo { width: 56px; height: 56px; border-radius: 16px; background: var(--primary); color: var(--on-primary); display: grid; place-items: center; }
          h1 { margin: 28px 0 8px; font-size: 32px; font-weight: 600; letter-spacing: -0.035em; line-height: 1.1; }
          .lg-sub { margin: 0; font-size: 16px; color: var(--muted); line-height: 1.45; }
          form { display: flex; flex-direction: column; gap: 12px; margin-top: 32px; }
          .lg-label { font-size: 14px; font-weight: 500; color: var(--muted); }
          .lg-input {
            display: flex; align-items: center; background: var(--surface); border: 1.5px solid var(--line); border-radius: 14px;
            padding: 0 6px 0 16px; min-height: 56px; transition: border-color 0.15s, box-shadow 0.15s;
          }
          .lg-input:focus-within { border-color: var(--accent); box-shadow: 0 0 0 4px var(--accent-ring); }
          .lg-input.err { border-color: var(--neg); }
          .lg-input input { flex: 1; min-width: 0; border: none; background: transparent; font-size: 17px; color: var(--text); outline: none; padding: 14px 0; }
          .lg-eye { width: 44px; height: 44px; border: none; background: transparent; color: var(--muted); display: grid; place-items: center; border-radius: 10px; }
          .lg-err { font-size: 14px; color: var(--neg); margin: 0; }
          .lg-btn { margin-top: 6px; border: none; background: var(--primary); color: var(--on-primary); font-size: 17px; font-weight: 600; min-height: 54px; border-radius: 14px; display: inline-flex; align-items: center; justify-content: center; gap: 10px; }
          .lg-btn:disabled { opacity: 0.55; }
          .lg-info { display: flex; gap: 12px; align-items: flex-start; margin-top: 22px; padding: 14px 16px; background: var(--bg); border: 1px solid var(--line-soft); border-radius: 14px; font-size: 14px; line-height: 1.45; color: var(--muted); }
          .lg-info svg { flex-shrink: 0; margin-top: 1px; color: var(--accent-text); }
          .lg-foot { margin-top: 36px; text-align: center; font-size: 13px; color: var(--faint); }
        `}</style>

        <div className="lg-box">
          <div className="lg-logo"><Logo /></div>
          <h1>Entra a tu panel</h1>
          <p className="lg-sub">Ecom Warrior LLC. Finanzas y Operación Renta en un solo lugar.</p>

          <form onSubmit={handleSubmit} noValidate>
            {/* Usuario fijo e invisible: permite que el llavero de iCloud guarde la contraseña y la complete con Face ID */}
            <input type="text" name="username" autoComplete="username" value="ecomwarrior" readOnly tabIndex={-1} aria-hidden="true" className="sr-only" />
            <label htmlFor="password" className="lg-label">Contraseña</label>
            <div className={"lg-input" + (error ? " err" : "")}>
              <input
                id="password"
                name="password"
                type={ver ? "text" : "password"}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                value={password}
                onChange={e => { setPassword(e.target.value); if (error) setError(""); }}
                aria-invalid={!!error}
                aria-describedby={error ? "login-error" : undefined}
                autoFocus
              />
              <button type="button" className="lg-eye" onClick={() => setVer(v => !v)} aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}>
                {ver ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18" /><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
            {error && <p id="login-error" className="lg-err" role="alert">{error}</p>}
            <button type="submit" className="lg-btn" disabled={loading || !password}>
              {loading && (
                <svg className="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.2-8.6" /></svg>
              )}
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>

          <div className="lg-info">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M9 9v1M15 9v1M12 9v4h-1M9 16c1.5 1 4.5 1 6 0" /></svg>
            <span>Guarda la contraseña en tu llavero y la próxima vez entras con Face ID. La sesión dura 30 días en este dispositivo.</span>
          </div>

          <div className="lg-foot">Uso interno · dashboard.ecomwarriorllc.com</div>
        </div>
      </div>
    </>
  );
}
