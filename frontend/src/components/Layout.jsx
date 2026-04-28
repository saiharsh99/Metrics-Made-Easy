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
  FacebookLogo,
  GoogleLogo,
  MagnifyingGlassPlus,
  Database,
  Megaphone,
  Compass,
  List as ListIcon,
  X,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import GlobalToolbar from "@/components/GlobalToolbar";

const NAV_GROUPS = [
  {
    section: "Landing page Experience",
    icon: Compass,
    items: [
      { to: "/", label: "Overview", icon: ChartLineUp, testId: "nav-overview" },
      { to: "/landing-pages", label: "Pages", icon: Stack, testId: "nav-landing-pages" },
      { to: "/sources", label: "Sources", icon: Broadcast, testId: "nav-sources" },
      { to: "/audience", label: "Audience", icon: UsersThree, testId: "nav-audience" },
      { to: "/locations", label: "Locations", icon: MapPin, testId: "nav-locations" },
      { to: "/clarity", label: "Clarity", icon: VideoCamera, testId: "nav-clarity" },
      { to: "/compare", label: "Compare", icon: ArrowsLeftRight, testId: "nav-compare" },
    ],
  },
  {
    section: "Ad platforms",
    icon: Megaphone,
    items: [
      { to: "/meta-ads", label: "Meta Ads", icon: FacebookLogo, testId: "nav-meta-ads" },
      { to: "/google-ads", label: "Google Ads", icon: GoogleLogo, testId: "nav-google-ads" },
    ],
  },
  {
    section: "Organic updates",
    icon: MagnifyingGlassPlus,
    items: [
      {
        to: "/search-console",
        label: "Search Console",
        icon: MagnifyingGlassPlus,
        testId: "nav-search-console",
      },
    ],
  },
  {
    section: "CRM level data",
    icon: Database,
    items: [
      { to: "/crm", label: "CRM", icon: Database, testId: "nav-crm" },
    ],
  },
];

const SETTINGS_NAV = {
  to: "/settings",
  label: "Settings",
  icon: GearSix,
  testId: "nav-settings",
};

export default function Layout({ children }) {
  const [status, setStatus] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    api.get("/credentials/status").then((r) => setStatus(r.data)).catch(() => {});
  }, [location.pathname]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-zinc-50" data-testid="app-layout">
      {/* Top bar */}
      <header
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-200/80"
        data-testid="app-header"
      >
        <div className="px-4 md:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="md:hidden p-2 -ml-2 text-zinc-700 hover:bg-zinc-100 rounded-md"
              onClick={() => setMobileOpen((v) => !v)}
              data-testid="mobile-nav-toggle"
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X size={18} /> : <ListIcon size={18} />}
            </button>
            <NavLink to="/" className="flex items-center gap-2" data-testid="brand-link">
              <div className="w-7 h-7 bg-zinc-950 flex items-center justify-center">
                <span className="display-font text-white font-black text-sm leading-none">
                  L
                </span>
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
          </div>
          <div className="flex items-center gap-3">
            {status && (
              <div
                className="hidden sm:flex items-center gap-1.5"
                data-testid="connection-badges"
              >
                <ConnBadge label="GA4" connected={status.ga4_connected} testId="ga4-badge" />
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

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed md:sticky top-16 left-0 z-40 bg-white border-r border-zinc-200 w-64 shrink-0 h-[calc(100vh-4rem)] overflow-y-auto transition-transform duration-200 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0`}
          data-testid="app-sidebar"
        >
          <nav className="px-3 py-5 space-y-6" data-testid="main-nav">
            {NAV_GROUPS.map((group) => (
              <div key={group.section}>
                <div
                  className="flex items-center gap-1.5 px-2 mb-2 text-[10px] uppercase tracking-[0.22em] font-bold text-zinc-500"
                  data-testid={`nav-section-${group.section
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`}
                >
                  <group.icon size={11} weight="duotone" />
                  {group.section}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((n) => (
                    <NavLink
                      key={n.to}
                      to={n.to}
                      end={n.to === "/"}
                      data-testid={n.testId}
                      className={({ isActive }) =>
                        `px-3 py-2 text-sm flex items-center gap-2.5 rounded-md transition-all duration-150 ${
                          isActive
                            ? "bg-zinc-950 text-white font-medium"
                            : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
                        }`
                      }
                    >
                      <n.icon size={15} weight="duotone" />
                      <span>{n.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}

            <div className="pt-4 border-t border-zinc-200">
              <NavLink
                to={SETTINGS_NAV.to}
                data-testid={SETTINGS_NAV.testId}
                className={({ isActive }) =>
                  `px-3 py-2 text-sm flex items-center gap-2.5 rounded-md transition-all duration-150 ${
                    isActive
                      ? "bg-zinc-950 text-white font-medium"
                      : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
                  }`
                }
              >
                <SETTINGS_NAV.icon size={15} weight="duotone" />
                <span>{SETTINGS_NAV.label}</span>
              </NavLink>
            </div>
          </nav>
        </aside>

        {/* Mobile backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 top-16 bg-zinc-950/40 z-30 md:hidden"
            onClick={() => setMobileOpen(false)}
            data-testid="mobile-nav-backdrop"
          />
        )}

        {/* Main column */}
        <div className="flex-1 min-w-0">
          <GlobalToolbar />
          <main
            className="px-4 md:px-8 lg:px-10 py-8 md:py-10 max-w-[1400px]"
            data-testid="main-content"
          >
            {children}
          </main>
          <footer className="border-t border-zinc-200 bg-white" data-testid="app-footer">
            <div className="px-4 md:px-8 lg:px-10 py-6 text-xs text-zinc-500 flex flex-wrap gap-4 justify-between items-center">
              <span>
                © {new Date().getFullYear()} Lens · Built with GA4 + Microsoft Clarity
              </span>
              <span className="tracking-[0.2em] uppercase font-medium">
                {status?.demo_mode ? "Demo Mode" : "Live Data"}
              </span>
            </div>
          </footer>
        </div>
      </div>
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
