import { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { 
  Menu, X, LayoutDashboard, Users, Briefcase, Settings, PieChart, Zap, ChevronRight, Home, Sun, Moon, Smartphone, MessageSquare, PanelLeftClose, PanelLeftOpen, Cloud, GitBranch, ClipboardCheck, LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NetworkBackground } from "./NetworkBackground";
import { NotificationsPopover } from "@/components/notifications/NotificationsPopover";
import { useAuth } from "@/contexts/AuthContext";
import { appUrl } from "@/lib/basePath";

const BRAND_LOGO_PATH = appUrl("/assets/rhdreams-icon.png");

function BrandLogoMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-visible bg-transparent",
        className
      )}
    >
      <img
        src={BRAND_LOGO_PATH}
        alt="Heavenly Dreams"
        className="h-full w-full object-contain object-center"
      />
    </div>
  );
}

const PATH_MAP: Record<string, string> = {
  "/": "Dashboard",
  "/candidates": "Candidatos",
  "/jobs": "Ofertas de Empleo",
  "/messages": "Mensajes",
  "/agents": "Agentes AI",
  "/ai-workflows": "Flujos IA",
  "/welcome-followup": "Bienvenidas",
  "/whatsapp": "Canales de Chat",
  "/workspace": "Google Workspace",
  "/microsoft": "Microsoft 365",
  "/reports": "Reportes",
  "/settings": "Configuración",
};

const NAV_ITEMS = [
  { name: "Dashboard",        path: "/",                icon: LayoutDashboard, glassIcon: "icon-cyan",    color: "#22d3ee" },
  { name: "Candidatos",       path: "/candidates",      icon: Users,           glassIcon: "icon-sky",     color: "#38bdf8" },
  { name: "Ofertas de Empleo",path: "/jobs",            icon: Briefcase,       glassIcon: "icon-emerald", color: "#34d399" },
  { name: "Mensajes",         path: "/messages",        icon: MessageSquare,   glassIcon: "icon-violet",  color: "#a78bfa" },
  { name: "Agentes AI",       path: "/agents",          icon: Zap,             glassIcon: "icon-amber",   color: "#fbbf24" },
  { name: "Flujos IA",        path: "/ai-workflows",    icon: GitBranch,       glassIcon: "icon-fuchsia", color: "#e879f9" },
  { name: "Bienvenidas",      path: "/welcome-followup",icon: ClipboardCheck,  glassIcon: "icon-lime",    color: "#a3e635" },
  { name: "Canales de Chat",  path: "/whatsapp",        icon: Smartphone,      glassIcon: "icon-cyan",    color: "#22d3ee" },
  { name: "Google Workspace", path: "/workspace",       icon: Cloud,           glassIcon: "icon-sky",     color: "#38bdf8" },
  { name: "Microsoft 365",    path: "/microsoft",       icon: Cloud,           glassIcon: "icon-blue",    color: "#00a4ef" },
  { name: "Reportes",         path: "/reports",         icon: PieChart,        glassIcon: "icon-orange",  color: "#fb923c" },
  { name: "Configuración",    path: "/settings",        icon: Settings,        glassIcon: "icon-rose",    color: "#fb7185" },
];

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const location = useLocation();
  const { user, logout } = useAuth();
  const displayName = user?.displayName || user?.email || "Sin sesión";
  const userLabel = user ? (user.isAnonymous ? "Invitado" : "Usuario") : "Sin autenticar";
  const initials = displayName
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "RH";

  useEffect(() => {
    // Check local storage or default to dark
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'light') {
      setIsDarkMode(false);
      document.body.classList.add('light-theme');
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDarkMode;
    setIsDarkMode(newIsDark);
    if (newIsDark) {
      document.body.classList.remove('light-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.add('light-theme');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <div className="flex flex-col md:flex-row font-sans text-white" style={{ height: '100dvh', overflow: 'hidden', backgroundColor: 'var(--hd-color-bg)' }}>
      <NetworkBackground />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.78)_0%,rgba(0,0,0,0.46)_42%,rgba(0,0,0,0.76)_100%)]" />
      {/* Mobile nav header */}
      <div className="md:hidden flex items-center justify-between glass-panel p-3 shrink-0 m-2 rounded-xl relative z-40">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 font-bold text-white text-lg tracking-tight">
            <BrandLogoMark className="h-9 w-9" />
            <span>RH<span className="text-cyan-300">Dreams</span></span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-2 text-slate-300 hover:text-white transition-colors">
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <NotificationsPopover align="right" direction="down" />
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-zinc-200 transition-colors">
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile nav drawer */}
      {sidebarOpen && (
        <div className="md:hidden fixed top-[72px] left-2 right-2 z-50 glass-panel rounded-xl border border-white/10 shadow-xl overflow-hidden">
          <nav className="flex flex-col p-2 gap-0.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  style={isActive ? { borderColor: `${item.color}40`, borderBottomColor: `${item.color}90` } : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-xl border transition-all font-medium text-sm",
                    isActive
                      ? "bg-white/[0.07] text-white border-b-2"
                      : "border-transparent text-slate-400 hover:text-white hover:bg-white/[0.04]"
                  )}
                >
                  <Icon className={cn("w-4 h-4 shrink-0", item.glassIcon)} />
                  <span>{item.name}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: item.color, boxShadow: `0 0 6px ${item.color}cc` }} />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "glass-panel flex-shrink-0 flex-col relative z-50 md:z-50",
          "fixed inset-y-0 left-0 md:static md:flex",
          "transition-all duration-500 ease-out md:m-4 md:rounded-2xl border-r-0 md:border-r border-cyan-300/30 shadow-[0_0_36px_rgba(34,211,238,0.12)]",
          sidebarOpen ? "translate-x-0 w-72 h-[100dvh] md:h-auto" : "-translate-x-full md:translate-x-0",
          !sidebarOpen && (isCollapsed ? "md:w-20" : "md:w-72")
        )}
      >
        <div className={cn("hidden md:flex flex-col justify-center border-b border-white/5 shrink-0 relative overflow-hidden transition-all duration-300", isCollapsed ? "h-20 px-2" : "h-32 px-5")}>
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/5 to-transparent pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent pointer-events-none" />
          <div className="absolute top-0 right-0 p-16 bg-cyan-400/12 blur-3xl rounded-full opacity-60 pointer-events-none"></div>
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className={cn(
              "absolute z-20 text-slate-300 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10 hidden md:block",
              isCollapsed ? "top-2 right-1/2 translate-x-1/2" : "top-3 right-3"
            )}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>

          <div className={cn("flex items-center gap-3.5 font-bold text-white tracking-tight group cursor-pointer relative z-10 min-w-0", isCollapsed ? "justify-center mt-3" : "")}>
            <BrandLogoMark className={cn("transition-transform duration-300 group-hover:scale-105", isCollapsed ? "h-11 w-11" : "h-14 w-14")} />
            {!isCollapsed && (
              <div className="flex min-w-0 flex-col">
                <span className="whitespace-nowrap font-extrabold tracking-tight text-[24px] leading-none">RH<span className="text-cyan-300">Dreams</span></span>
                <span className="mt-1.5 whitespace-nowrap text-[9px] text-cyan-400/70 uppercase tracking-[0.3em] font-bold">Heavenly Dreams</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-4 styled-scrollbar relative">
          <nav className={cn("flex flex-col gap-0.5", isCollapsed ? "px-2" : "px-3")}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setSidebarOpen(false)}
                  title={isCollapsed ? item.name : undefined}
                  style={isActive ? { borderColor: `${item.color}30`, boxShadow: `0 2px 12px ${item.color}14` } : undefined}
                  className={cn(
                    "flex items-center rounded-xl font-medium transition-all duration-200 group relative overflow-hidden",
                    isCollapsed ? "justify-center w-10 h-10 mx-auto" : "gap-3 px-3 py-2.5",
                    isActive
                      ? "text-white border bg-white/[0.06]"
                      : "text-slate-500 hover:text-slate-200 border border-transparent hover:bg-white/[0.04] hover:border-white/6"
                  )}
                >
                  {isActive && (
                    <span
                      className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                      style={{ background: item.color, boxShadow: `0 0 10px ${item.color}cc` }}
                    />
                  )}
                  <Icon className={cn(
                    "w-4 h-4 relative z-10 transition-all duration-200 shrink-0",
                    item.glassIcon,
                    !isActive && "opacity-55 group-hover:opacity-90"
                  )} />
                  {!isCollapsed && (
                    <span className="relative z-10 text-[13px] whitespace-nowrap font-medium">
                      {item.name}
                    </span>
                  )}
                  {isActive && !isCollapsed && (
                    <span
                      className="ml-auto w-1.5 h-1.5 rounded-full animate-pulse relative z-10 shrink-0"
                      style={{ background: item.color, boxShadow: `0 0 8px ${item.color}dd` }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
          
          {!isCollapsed && (
            <div className="mt-6 px-3">
              <div className="p-3.5 rounded-xl border border-cyan-300/10 bg-gradient-to-br from-cyan-500/6 to-violet-500/6 relative overflow-hidden group hover:border-cyan-300/20 transition-colors">
                <p className="text-[9px] uppercase font-bold text-slate-500 mb-1.5 flex items-center gap-1.5 tracking-widest">
                  <Zap className="w-3 h-3 text-amber-400" /> AI Insights
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">Conecta tus integraciones para activar análisis con datos reales.</p>
              </div>
            </div>
          )}
        </div>
        
        <div className={cn("p-3 border-t border-white/5 shrink-0 bg-black/20 flex items-center transition-all duration-300", isCollapsed ? "flex-col gap-3 justify-center" : "justify-between gap-2")}>
          <div className={cn("flex items-center gap-2.5 p-2 rounded-xl border border-white/5 bg-white/[0.02] group cursor-pointer hover:border-white/10 hover:bg-white/[0.04] transition-all", isCollapsed ? "justify-center w-full" : "flex-1 min-w-0")}>
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 flex shrink-0 items-center justify-center text-zinc-300 font-bold text-xs">
              {initials}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors truncate">{displayName}</span>
                <span className="text-[9px] text-zinc-600 uppercase tracking-widest mt-0.5 truncate">{userLabel}</span>
              </div>
            )}
          </div>
          <div className={cn("flex items-center gap-0.5 shrink-0", isCollapsed ? "flex-col w-full" : "")}>
            <button onClick={toggleTheme} className={cn("p-2 text-slate-300 hover:text-white transition-colors rounded-full hover:bg-white/10", isCollapsed && "w-10 h-10 flex items-center justify-center")}>
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className={cn(isCollapsed && "flex items-center justify-center w-10 h-10")}>
              <NotificationsPopover align="left" direction="right" />
            </div>
            <button
              onClick={logout}
              title="Cerrar sesion"
              className={cn("p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/10", isCollapsed && "w-10 h-10 flex items-center justify-center")}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto w-full relative z-10 styled-scrollbar">
        <div className="p-4 pt-5 md:p-7 md:pt-6 max-w-7xl mx-auto min-w-0 flex flex-col min-h-full">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
            <Link to="/" className="hover:text-white transition-colors flex items-center gap-1">
              <Home className="w-4 h-4" />
            </Link>
            {location.pathname !== "/" && (
              <>
                <ChevronRight className="w-4 h-4 text-cyan-600" />
                <span className="text-slate-200 font-semibold">
                  {PATH_MAP[location.pathname] || location.pathname.split("/").filter(Boolean).pop()}
                </span>
              </>
            )}
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
