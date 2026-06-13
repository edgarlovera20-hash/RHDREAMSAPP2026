import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, Bot, Briefcase, Eye, EyeOff, Lock, MessageSquare, User, Zap } from "lucide-react";
import { DigitalOceanBadge } from "@/components/DigitalOceanBadge";
import { useAuth } from "@/contexts/AuthContext";
import { appUrl } from "@/lib/basePath";

const BRAND_LOGO_PATH = appUrl("/assets/rhdreams-icon.png");
const REMEMBERED_USERNAME_KEY = "rhdreams_remembered_username";

export function Login() {
  const navigate = useNavigate();
  const { loginWithPassword } = useAuth();
  const [username, setUsername] = useState(() => localStorage.getItem(REMEMBERED_USERNAME_KEY) || "");
  const [password, setPassword] = useState("");
  const [rememberUsername, setRememberUsername] = useState(() => Boolean(localStorage.getItem(REMEMBERED_USERNAME_KEY)));
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const success = await loginWithPassword(username, password);
    setSubmitting(false);

    if (success) {
      if (rememberUsername) {
        localStorage.setItem(REMEMBERED_USERNAME_KEY, username.trim());
      } else {
        localStorage.removeItem(REMEMBERED_USERNAME_KEY);
      }
      navigate("/", { replace: true });
      return;
    }

    setError("Usuario o contrasena incorrectos.");
  };

  const FEATURES = [
    { icon: Briefcase, label: "Vacantes", desc: "Gestión de ofertas y pipeline" },
    { icon: MessageSquare, label: "Mensajes", desc: "WhatsApp, Instagram, Email" },
    { icon: Bot, label: "Agentes IA", desc: "Entrevistas y seguimiento auto" },
    { icon: Zap, label: "Flujos", desc: "Automatizaciones de reclutamiento" },
  ];

  return (
    <main
      className="relative min-h-screen overflow-hidden text-slate-100"
      style={{ background: 'linear-gradient(135deg, #0071BC 0%, #0155A1 100%)' }}
    >
      {/* Circuit grid overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(1,238,238,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(1,238,238,0.04)_1px,transparent_1px)] bg-[size:3rem_3rem]" />
      {/* Inner dark vignette so the central panel feels deep */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(9,22,35,0.72)_0%,transparent_70%)]" />

      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-8">
        {/* Main card */}
        <div
          className="grid w-full max-w-5xl overflow-hidden rounded-2xl md:grid-cols-[1fr_420px]"
          style={{
            background: 'radial-gradient(circle at 50% 30%, #0C1928 0%, #091623 60%, #07131F 100%)',
            border: '1px solid #0052CC',
            boxShadow: '0 0 48px rgba(1,238,238,0.30), 0 24px 64px rgba(7,19,31,0.80)',
          }}
        >
          {/* Left panel — only on md+ */}
          <div className="hidden min-h-[580px] flex-col justify-between border-r p-10 md:flex" style={{ borderColor: 'rgba(6,170,177,0.22)' }}>
            <div className="flex items-center gap-3">
              <img src={BRAND_LOGO_PATH} alt="Heavenly Dreams" className="h-14 w-14 object-contain" />
              <div>
                <p className="text-2xl font-bold tracking-tight">
                  RH<span style={{ color: '#0066FF' }}>Dreams</span>
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: 'rgba(1,238,238,0.75)' }}>
                  Heavenly Dreams
                </p>
              </div>
            </div>

            <div className="max-w-sm">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.24em]" style={{ color: '#0066FF' }}>
                Acceso seguro
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-white leading-tight">
                Administra reclutamiento, mensajes y agentes IA.
              </h1>
              <p className="mt-4 text-sm leading-6 text-slate-400">
                Panel privado para operar el flujo de candidatos y automatizaciones desde una sola consola.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {FEATURES.map(({ icon: Icon, label, desc }) => (
                <div
                  key={label}
                  className="rounded-xl px-3 py-3 flex items-start gap-2.5"
                  style={{ background: 'rgba(1,238,238,0.05)', border: '1px solid rgba(6,170,177,0.22)' }}
                >
                  <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#0066FF' }} />
                  <div>
                    <p className="text-xs font-semibold text-white">{label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel — login form */}
          <div className="flex min-h-[580px] flex-col justify-center p-6 sm:p-10">
            {/* Mobile logo */}
            <div className="mb-8 flex items-center gap-3 md:hidden">
              <img src={BRAND_LOGO_PATH} alt="Heavenly Dreams" className="h-12 w-12 object-contain" />
              <div>
                <p className="text-xl font-bold">
                  RH<span style={{ color: '#0066FF' }}>Dreams</span>
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(1,238,238,0.75)' }}>
                  Heavenly Dreams
                </p>
              </div>
            </div>

            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: '#0066FF' }}>Bienvenido</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">Iniciar sesion</h2>
              <p className="mt-2 text-sm text-slate-400">Ingresa tus credenciales para continuar.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  Usuario
                </span>
                <div
                  className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all focus-within:shadow-[0_0_0_2px_rgba(1,238,238,0.45)]"
                  style={{ background: 'rgba(12,25,40,0.8)', border: '1px solid rgba(6,170,177,0.35)' }}
                >
                  <User className="h-5 w-5 shrink-0" style={{ color: '#0066FF' }} />
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                    placeholder="edgarlovera20"
                    autoComplete="username"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  Contraseña
                </span>
                <div
                  className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all focus-within:shadow-[0_0_0_2px_rgba(1,238,238,0.45)]"
                  style={{ background: 'rgba(12,25,40,0.8)', border: '1px solid rgba(6,170,177,0.35)' }}
                >
                  <Lock className="h-5 w-5 shrink-0" style={{ color: '#0066FF' }} />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                    placeholder="Tu contraseña"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="rounded-lg p-1 text-slate-400 transition-colors hover:text-white focus:outline-none"
                    aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              <label
                className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 transition-colors"
                style={{ background: 'rgba(12,25,40,0.5)', border: '1px solid rgba(6,170,177,0.18)' }}
              >
                <span>Recordar usuario en este navegador</span>
                <input
                  type="checkbox"
                  checked={rememberUsername}
                  onChange={(event) => setRememberUsername(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-950 accent-cyan-400"
                />
              </label>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] transition-all disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  background: submitting ? '#004DB3' : '#0052CC',
                  color: '#091623',
                  boxShadow: '0 0 24px rgba(1,238,238,0.35)',
                }}
                onMouseEnter={e => { if (!submitting) (e.currentTarget as HTMLButtonElement).style.background = '#0066FF'; }}
                onMouseLeave={e => { if (!submitting) (e.currentTarget as HTMLButtonElement).style.background = '#0052CC'; }}
              >
                {submitting ? "Validando..." : "Entrar"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
        <DigitalOceanBadge className="mt-5 backdrop-blur-xl" />
      </section>
    </main>
  );
}
