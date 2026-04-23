import { NavLink, useLocation } from "react-router-dom";
import {
  ChartLineUp,
  GearSix,
  Stack,
  ArrowsLeftRight,
  Broadcast,
  UsersThree,
  MapPin,
  VideoCamera,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import GlobalToolbar from "@/components/GlobalToolbar";

const NAV = [
  { to: "/", label: "Overview", icon: ChartLineUp, testId: "nav-overview" },
  { to: "/landing-pages", label: "Pages", icon: Stack, testId: "nav-landing-pages" },
  { to: "/sources", label: "Sources", icon: Broadcast, testId: "nav-sources" },
  { to: "/audience", label: "Audience", icon: UsersThree, testId: "nav-audience" },
  { to: "/locations", label: "Locations", icon: MapPin, testId: "nav-locations" },
  { to: "/clarity", label: "Clarity", icon: VideoCamera, testId: "nav-clarity" },
  { to: "/compare", label: "Compare", icon: ArrowsLeftRight, testId: "nav-compare" },
  { to: "/settings", label: "Settings", icon: GearSix, testId: "nav-settings" },
];

export default function Layout({ children }) {
  const [status, setStatus] = useState(null);
  const location = useLocation();

  useEffect(() => {
    api.get("/credentials/status").then((r) => setStatus(r.data)).catch(() => {});
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-zinc-50" data-testid="app-layout">
      <header
        className="sticky top-0 z-50 bg-white/75 backdrop-blur-xl border-b border-zinc-200/80"
        data-testid="app-header"
      >
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <NavLink to="/" className="flex items-center gap-2" data-testid="brand-link">
              <div className="w-7 h-7 bg-zinc-950 flex items-center justify-center">
                <span className="display-font text-white font-black text-sm leading-none">L</span>
              </div>
              <div>
                <div className="display-font font-black text-[15px] leading-none tracking-tight">
                  Lens
                </div>
                <div className="text-[10px] tracking-[0.25em] uppercase text-zinc-500 font-medium leading-none mt-0.5">
                  LP Analytics
                </div>
              </div>
            </NavLink>
            <nav className="hidden md:flex items-center gap-1" data-testid="main-nav">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.to === "/"}
                  data-testid={n.testId}
                  className={({ isActive }) =>
                    `px-3 py-1.5 text-sm flex items-center gap-2 rounded-md transition-all duration-200 ${
                      isActive
                        ? "bg-zinc-950 text-white"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                    }`
                  }
                >
                  <n.icon size={16} weight="duotone" />
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {status && (
              <div className="flex items-center gap-1.5" data-testid="connection-badges">
                <ConnBadge
                  label="GA4"
                  connected={status.ga4_connected}
                  testId="ga4-badge"
                />
                <ConnBadge
                  label="Clarity"
                  connected={status.clarity_connected}
                  testId="clarity-badge"
                />
              </div>
            )}
          </div>
        </div>
      </header>
      <GlobalToolbar />
      <main className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12 py-8 md:py-10" data-testid="main-content">
        {children}
      </main>
      <footer className="border-t border-zinc-200 bg-white" data-testid="app-footer">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12 py-6 text-xs text-zinc-500 flex flex-wrap gap-4 justify-between items-center">
          <span>
            © {new Date().getFullYear()} Lens · Built with GA4 Data API + Microsoft Clarity
          </span>
          <span className="tracking-[0.2em] uppercase font-medium">
            {status?.demo_mode ? "Demo Mode" : "Live Data"}
          </span>
        </div>
      </footer>
    </div>
  );
}

function ConnBadge({ label, connected, testId }) {
  return (
    <Badge
      variant="outline"
      data-testid={testId}
      className={`px-2 py-1 text-[10px] uppercase tracking-wider font-semibold border ${
        connected
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-zinc-100 text-zinc-500 border-zinc-200"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          connected ? "bg-emerald-500" : "bg-zinc-400"
        }`}
      />
      {label} {connected ? "live" : "demo"}
    </Badge>
  );
}
