import { useEffect, useState } from "react";
import "./auth.css";

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_BASE}/api/auth${path}`, {
    method,
    credentials: "include", // sends the login cookie
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Something went wrong. Please try again.");
    err.data = data;
    throw err;
  }
  return data;
}

export default function AuthGate({ children }) {
  const [view, setView] = useState("loading"); // loading | login | signup | otp | success | app
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Stay logged in after refresh
  useEffect(() => {
    api("/me")
      .then((d) => {
        setUser(d.user);
        setView("app");
      })
      .catch(() => setView("login"));
  }, []);

  // Resend countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const switchView = (next) => {
    setError("");
    setInfo("");
    setView(next);
  };

  const run = async (fn) => {
    setBusy(true);
    setError("");
    setInfo("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
      if (e.data?.retryAfterSeconds) setCooldown(e.data.retryAfterSeconds);
      if (e instanceof TypeError) setError("Cannot reach the server. Is the backend running?");
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    run(async () => {
      const d = await api("/login", {
        method: "POST",
        body: { email: form.email, password: form.password },
      });
      setUser(d.user);
      setView("app");
    });
  };

  const handleSignup = (e) => {
    e.preventDefault();
    run(async () => {
      const d = await api("/signup", { method: "POST", body: form });
      setCooldown(d.resendAfterSeconds || 60);
      setOtp("");
      setView("otp");
    });
  };

  const handleVerify = (e) => {
    e.preventDefault();
    run(async () => {
      const d = await api("/verify-otp", {
        method: "POST",
        body: { email: form.email, otp },
      });
      setUser(d.user);
      setForm((f) => ({ ...f, password: "" }));
      setView("success");
      setTimeout(() => setView("app"), 1400);
    });
  };

  const handleResend = () => {
    run(async () => {
      const d = await api("/resend-otp", { method: "POST", body: { email: form.email } });
      setCooldown(d.resendAfterSeconds || 60);
      setInfo("A new code has been sent to your email.");
    });
  };

  const handleLogout = async () => {
    try {
      await api("/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    setUser(null);
    setForm({ name: "", email: "", password: "" });
    setView("login");
  };

  if (view === "app") {
    return (
      <>
        <div className="vb-auth-userbar">
          <span>Hi, {user?.name}</span>
          <button type="button" onClick={handleLogout}>
            Log out
          </button>
        </div>
        {children}
      </>
    );
  }

  if (view === "loading") {
    return (
      <div className="vb-auth-page">
        <div className="vb-auth-spinner" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="vb-auth-page">
      <div className="vb-auth-card">
        <div className="vb-auth-brand">
          <span className="vb-auth-mark">VB</span>
          <div>
            <strong>
              voicebridge<span>.ai</span>
            </strong>
            <small>YOUR VOICE. YOUR FUTURE.</small>
          </div>
        </div>

        {view === "login" && (
          <form onSubmit={handleLogin}>
            <h2>Welcome back 👋</h2>
            <p className="vb-auth-sub">Log in to continue your interview practice.</p>

            <label>Email</label>
            <input type="email" required autoComplete="email" value={form.email} onChange={update("email")} placeholder="you@example.com" />

            <label>Password</label>
            <input type="password" required autoComplete="current-password" value={form.password} onChange={update("password")} placeholder="Your password" />

            {error && <div className="vb-auth-error" role="alert">{error}</div>}

            <button className="vb-auth-btn" disabled={busy}>
              {busy ? "Logging in…" : "Log in →"}
            </button>
            <p className="vb-auth-switch">
              New here? <button type="button" onClick={() => switchView("signup")}>Create an account</button>
            </p>
          </form>
        )}

        {view === "signup" && (
          <form onSubmit={handleSignup}>
            <h2>Create your account ✨</h2>
            <p className="vb-auth-sub">We will email you a 6-digit code to verify it is really you.</p>

            <label>Full name</label>
            <input type="text" required minLength={2} maxLength={60} autoComplete="name" value={form.name} onChange={update("name")} placeholder="Your name" />

            <label>Email</label>
            <input type="email" required autoComplete="email" value={form.email} onChange={update("email")} placeholder="you@example.com" />

            <label>Password</label>
            <input type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={form.password} onChange={update("password")} placeholder="At least 8 characters" />

            {error && <div className="vb-auth-error" role="alert">{error}</div>}

            <button className="vb-auth-btn" disabled={busy}>
              {busy ? (<><span className="vb-auth-dot" /> Sending code…</>) : "Send verification code →"}
            </button>
            <p className="vb-auth-switch">
              Already have an account? <button type="button" onClick={() => switchView("login")}>Log in</button>
            </p>
          </form>
        )}

        {view === "otp" && (
          <form onSubmit={handleVerify}>
            <h2>Check your email 📩</h2>
            <p className="vb-auth-sub">
              Enter the 6-digit code sent to <strong>{form.email}</strong>. It expires in 5 minutes.
            </p>

            <input
              className="vb-auth-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="······"
              aria-label="6-digit verification code"
              autoFocus
            />

            {error && <div className="vb-auth-error" role="alert">{error}</div>}
            {info && <div className="vb-auth-info" role="status">{info}</div>}

            <button className="vb-auth-btn" disabled={busy || otp.length !== 6}>
              {busy ? "Verifying…" : "Verify & continue →"}
            </button>

            <div className="vb-auth-row">
              <button type="button" className="vb-auth-link" onClick={handleResend} disabled={busy || cooldown > 0}>
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </button>
              <button type="button" className="vb-auth-link" onClick={() => switchView("signup")}>
                Change email
              </button>
            </div>
          </form>
        )}

        {view === "success" && (
          <div className="vb-auth-success">
            <div className="vb-auth-check">✓</div>
            <h2>Email verified!</h2>
            <p className="vb-auth-sub">Welcome to VoiceBridge, {user?.name}. Opening your workspace…</p>
          </div>
        )}
      </div>
    </div>
  );
}