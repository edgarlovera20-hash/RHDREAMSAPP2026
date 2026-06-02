import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, User } from "lucide-react";
import { NetworkBackground } from "@/components/layout/NetworkBackground";
import { useAuth } from "@/contexts/AuthContext";
import { appUrl } from "@/lib/basePath";

const BRAND_LOGO_PATH = appUrl("/assets/heavenly-dreams-logo-square.png");
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

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0c1d31] text-slate-100">
      <NetworkBackground />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_34%)]" />

      <section className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 shadow-2xl shadow-cyan-950/20 backdrop-blur-2xl md:grid-cols-[1fr_420px]">
          <div className="hidden min-h-[560px] flex-col justify-between border-r border-white/10 p-10 md:flex">
            <div className="flex items-center gap-3">
              <img
                src={BRAND_LOGO_PATH}
                alt="Heavenly Dreams"
                className="h-14 w-14 object-contain drop-shadow-[0_0_16px_rgba(34,211,238,0.45)]"
              />
              <div>
                <p className="text-2xl font-bold tracking-tight">
                  RH<span className="text-cyan-400">Dreams</span>
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300/80">
                  Heavenly Dreams
                </p>
              </div>
            </div>

            <div className="max-w-md">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">
                Acceso seguro
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-white">
                Inicia sesion para administrar reclutamiento, mensajes y agentes IA.
              </h1>
              <p className="mt-5 text-sm leading-6 text-slate-400">
                Panel privado de RH Dreams para operar el flujo de candidatos y automatizaciones desde una sola consola.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs text-slate-400">
              {["Candidatos", "Mensajes", "Agentes IA"].map((item) => (
                <div key={item} className="rounded-lg border border-cyan-400/15 bg-cyan-400/5 px-3 py-3">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="flex min-h-[560px] flex-col justify-center p-6 sm:p-10">
            <div className="mb-8 flex items-center gap-3 md:hidden">
              <img src={BRAND_LOGO_PATH} alt="Heavenly Dreams" className="h-12 w-12 object-contain" />
              <div>
                <p className="text-xl font-bold">
                  RH<span className="text-cyan-400">Dreams</span>
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300/80">
                  Heavenly Dreams
                </p>
              </div>
            </div>

            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">Bienvenido</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">Iniciar sesion</h2>
              <p className="mt-2 text-sm text-slate-400">Ingresa tus credenciales para continuar.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  Usuario
                </span>
                <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-900/70 px-4 py-3 transition-colors focus-within:border-cyan-400/70">
                  <User className="h-5 w-5 text-cyan-300" />
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
                  Contrasena
                </span>
                <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-900/70 px-4 py-3 transition-colors focus-within:border-cyan-400/70">
                  <Lock className="h-5 w-5 text-cyan-300" />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                    placeholder="Tu contrasena"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="rounded-md p-1 text-slate-400 transition-colors hover:bg-white/5 hover:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                    aria-label={showPassword ? "Ocultar contrasena" : "Ver contrasena"}
                    title={showPassword ? "Ocultar contrasena" : "Ver contrasena"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </label>

              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-900/40 px-4 py-3 text-sm text-slate-300 transition-colors hover:border-cyan-400/30 hover:bg-cyan-400/5">
                <span>Recordar usuario en este navegador</span>
                <input
                  type="checkbox"
                  checked={rememberUsername}
                  onChange={(event) => setRememberUsername(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-cyan-400 accent-cyan-400"
                />
              </label>

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-slate-950 transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Validando..." : "Entrar"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
