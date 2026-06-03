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
        "relative flex shrink-0 items-center justify-center overflow-visible bg-transparent drop-shadow-[0_0_16px_rgba(34,211,238,0.32)]",
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
  "/reports": "Reportes",
  "/settings": "Configuración",
};

const NAV_ITEMS = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard, glassIcon: "text-cyan-300" },
  { name: "Candidatos", path: "/candidates", icon: Users, glassIcon: "text-sky-300" },
  { name: "Ofertas de Empleo", path: "/jobs", icon: Briefcase, glassIcon: "text-emerald-300" },
  { name: "Mensajes", path: "/messages", icon: MessageSquare, glassIcon: "text-blue-300" },
  { name: "Agentes AI", path: "/agents", icon: Zap, glassIcon: "text-violet-300" },
  { name: "Flujos IA", path: "/ai-workflows", icon: GitBranch, glassIcon: "text-fuchsia-300" },
  { name: "Bienvenidas", path: "/welcome-followup", icon: ClipboardCheck, glassIcon: "text-amber-300" },
  { name: "Canales de Chat", path: "/whatsapp", icon: Smartphone, glassIcon: "text-cyan-300" },
  { name: "Google Workspace", path: "/workspace", icon: Cloud, glassIcon: "text-emerald-300" },
  { name: "Reportes", path: "/reports", icon: PieChart, glassIcon: "text-amber-300" },
  { name: "Configuración", path: "/settings", icon: Settings, glassIcon: "text-slate-300" },
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
    <div className="flex flex-col md:flex-row font-sans text-white" style={{ height: '100dvh', overflow: 'hidden', backgroundColor: '#000000' }}>
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

      {/* Sidebar */}
      <aside
        className={cn(
          "glass-panel flex-shrink-0 flex-col relative z-50 md:z-50",
          "fixed inset-y-0 left-0 md:static md:flex",
          "transition-all duration-500 ease-out md:m-4 md:rounded-2xl border-r-0 md:border-r border-slate-700/50",
          sidebarOpen ? "translate-x-0 w-72 h-[100dvh] md:h-auto" : "-translate-x-full md:translate-x-0",
          !sidebarOpen && (isCollapsed ? "md:w-20" : "md:w-72")
        )}
      >
        <div className={cn("hidden md:flex flex-col justify-center border-b border-white/5 shrink-0 relative overflow-hidden transition-all duration-300", isCollapsed ? "h-20 px-2" : "h-36 px-6")}>
          <div className="absolute top-0 right-0 p-16 bg-white/8 blur-2xl rounded-full opacity-50 pointer-events-none"></div>
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className={cn(
              "absolute z-20 text-slate-300 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10 hidden md:block",
              isCollapsed ? "top-2 right-1/2 translate-x-1/2" : "top-3 right-3"
            )}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>

          <div className={cn("flex items-center gap-4 font-bold text-white text-xl tracking-tight group cursor-pointer relative z-10 min-w-0", isCollapsed ? "justify-center mt-3" : "")}>
            <BrandLogoMark className={cn("transition-transform duration-300 group-hover:scale-105", isCollapsed ? "h-12 w-12" : "h-16 w-16")} />
            {!isCollapsed && (
              <div className="flex min-w-0 flex-col">
                <span className="whitespace-nowrap font-bold tracking-tight text-[27px] leading-none">RH<span className="text-cyan-300">Dreams</span></span>
                <span className="mt-2 whitespace-nowrap text-[11px] text-cyan-300 uppercase tracking-[0.26em] font-bold">Heavenly Dreams</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-6 styled-scrollbar relative">
          <nav className={cn("flex flex-col gap-1.5", isCollapsed ? "px-2" : "px-4")}>
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
                  className={cn(
                    "flex items-center rounded-lg font-medium transition-all duration-300 group relative overflow-hidden",
                    isCollapsed ? "justify-center py-3 px-0 w-10 h-10 mx-auto" : "gap-3 px-4 py-3",
                    isActive 
                      ? "neon-selected text-cyan-50 bg-cyan-500/[0.10] border border-cyan-300/45 shadow-[0_0_18px_rgba(34,211,238,0.20),inset_0_0_14px_rgba(34,211,238,0.08),inset_0_1px_0_rgba(255,255,255,0.16)]" 
                      : "text-slate-400 hover:text-cyan-50 border border-transparent hover:bg-cyan-500/[0.06] hover:border-cyan-300/25 hover:shadow-[0_0_14px_rgba(34,211,238,0.12)]"
                  )}
                >
                  {isActive && (
                    <span className="pointer-events-none absolute inset-0 rounded-lg bg-[radial-gradient(circle_at_20%_50%,rgba(34,211,238,0.20),transparent_42%)] opacity-80" />
                  )}
                  <Icon className={cn("w-5 h-5 relative z-10 transition-all shrink-0", item.glassIcon, isActive ? "opacity-100 scale-105 text-cyan-100 drop-shadow-[0_0_10px_rgba(34,211,238,0.75)]" : "opacity-75 group-hover:opacity-100 group-hover:text-cyan-100 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.35)]")} />
                  {!isCollapsed && <span className={cn("relative z-10 tracking-wide text-[13px] whitespace-nowrap", isActive && "drop-shadow-[0_0_8px_rgba(34,211,238,0.22)]")}>{item.name}</span>}
                  {isActive && !isCollapsed && <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.85),0_0_18px_rgba(14,165,233,0.45)] animate-pulse relative z-10 shrink-0" />}
                </Link>
              );
            })}
          </nav>
          
          {!isCollapsed && (
            <div className="mt-8 px-4">
               <div className="p-4 bg-slate-900/50 rounded-xl border border-white/5 relative overflow-hidden group">
                 <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                 <p className="text-[10px] uppercase font-bold text-slate-300 mb-2 flex items-center gap-2 tracking-widest"><Zap className="w-3 h-3 text-amber-300" /> AI Insights</p>
                 <p className="text-xs text-slate-400 leading-relaxed font-light">Conecta tus integraciones para activar insights con datos reales.</p>
               </div>
            </div>
          )}
        </div>
        
        <div className={cn("p-4 border-t border-white/5 shrink-0 bg-black/10 flex items-center transition-all duration-300", isCollapsed ? "flex-col gap-4 justify-center" : "justify-between")}>
          <div className={cn("flex items-center gap-3 glass-panel p-2 rounded-xl group cursor-pointer hover:border-zinc-300/30 transition-colors", isCollapsed ? "justify-center w-full" : "flex-1 min-w-0")}>
            <div className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-500/60 flex flex-shrink-0 items-center justify-center text-zinc-200 font-bold text-sm shadow-[0_0_10px_rgba(255,255,255,0.08)] group-hover:shadow-[0_0_15px_rgba(255,255,255,0.22)] transition-all">
              {initials}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors truncate">{displayName}</span>
                <span className="text-[10px] text-zinc-300 uppercase tracking-widest mt-0.5 truncate">{userLabel}</span>
              </div>
            )}
          </div>
          <div className={cn("flex items-center gap-1 shrink-0", isCollapsed ? "flex-col w-full" : "ml-2")}>
            <button onClick={toggleTheme} className={cn("p-2 text-slate-300 hover:text-white transition-colors rounded-full hover:bg-white/10", isCollapsed && "w-10 h-10 flex items-center justify-center")}>
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className={cn(isCollapsed && "flex items-center justify-center w-10 h-10")}>
              <NotificationsPopover align={isCollapsed ? "center" : "left"} direction={isCollapsed ? "right" : "up"} />
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
                <ChevronRight className="w-4 h-4" />
                <span className="text-slate-300 font-medium">
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
