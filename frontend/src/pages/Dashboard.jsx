import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatNumber, formatSignedPercent } from "@/lib/api";
import DateRangePicker from "@/components/DateRangePicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  ArrowDownRight,
  Pulse,
  WarningCircle,
  Stack,
  TrendUp,
  Plus,
} from "@phosphor-icons/react";
import { subDays, format } from "date-fns";

const defaultRange = () => ({
  from: format(subDays(new Date(), 29), "yyyy-MM-dd"),
  to: format(new Date(), "yyyy-MM-dd"),
});

export default function Dashboard() {
  const [range, setRange] = useState(defaultRange());
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .get("/analytics/summary", {
        params: { start_date: range.from, end_date: range.to },
      })
      .then((r) => mounted && setSummary(r.data))
      .catch((e) => mounted && setError(e.message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [range.from, range.to]);

  const totals = summary?.totals;
  const rows = summary?.rows || [];

  const topRow = useMemo(() => rows[0], [rows]);
  const worstRow = useMemo(
    () => [...rows].sort((a, b) => b.rageClicks - a.rageClicks)[0],
    [rows]
  );

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em] font-bold text-zinc-500 mb-2">
            Control Room
          </div>
          <h1 className="display-font font-black text-4xl md:text-5xl lg:text-6xl tracking-tighter text-zinc-950">
            Landing page performance
          </h1>
          <p className="mt-3 text-zinc-600 max-w-2xl text-sm md:text-base leading-relaxed">
            A unified pulse across every landing page — Google Analytics for the{" "}
            <span className="font-semibold text-blue-700">what</span> and Microsoft
            Clarity for the{" "}
            <span className="font-semibold text-emerald-700">why</span>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            asChild
            className="bg-zinc-950 hover:bg-zinc-800 text-white rounded-md"
            data-testid="btn-add-lp"
          >
            <Link to="/landing-pages">Manage pages</Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="border border-rose-200 bg-rose-50 text-rose-700 text-sm px-4 py-3 rounded-md" data-testid="dashboard-error">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6" data-testid="totals-grid">
        <Stat
          label="Tracked pages"
          value={summary?.landingPageCount}
          icon={Stack}
          accent="bg-zinc-950"
        />
        <Stat
          label="Total sessions"
          value={totals?.sessions}
          icon={Pulse}
          accent="bg-blue-600"
        />
        <Stat
          label="Conversions"
          value={totals?.conversions}
          sub={totals ? `${totals.conversionRate}% CR` : ""}
          icon={TrendUp}
          accent="bg-emerald-600"
        />
        <Stat
          label="Rage + dead clicks"
          value={totals ? totals.rageClicks + totals.deadClicks : 0}
          sub={totals ? `${formatNumber(totals.rageClicks)} rage · ${formatNumber(totals.deadClicks)} dead` : ""}
          icon={WarningCircle}
          accent="bg-rose-600"
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <HighlightCard
          title="Top performer"
          row={topRow}
          badge="by sessions"
          accentClass="bg-blue-50 text-blue-700 border-blue-200"
        />
        <HighlightCard
          title="Needs attention"
          row={worstRow}
          badge="most rage clicks"
          accentClass="bg-rose-50 text-rose-700 border-rose-200"
        />
        <div className="bg-white border border-zinc-200 rounded-lg p-6">
          <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-3">
            Average quality
          </div>
          <div className="grid grid-cols-2 gap-y-4">
            <Metric label="Bounce rate" value={`${totals?.bounceRate || 0}%`} />
            <Metric label="Conversion rate" value={`${totals?.conversionRate || 0}%`} />
            <Metric label="Pageviews" value={formatNumber(totals?.pageviews)} />
            <Metric label="Users" value={formatNumber(totals?.users)} />
          </div>
        </div>
      </section>

      <section className="bg-white border border-zinc-200 rounded-lg overflow-hidden" data-testid="lp-table-section">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <div>
            <h2 className="display-font font-bold text-lg tracking-tight">
              All landing pages
            </h2>
            <p className="text-xs text-zinc-500">
              Combined metrics for the selected date range
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] tracking-[0.18em] uppercase border-zinc-200">
            {rows.length} pages
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="lp-table">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.18em] font-semibold text-zinc-500 border-b border-zinc-200">
                <th className="px-6 py-3">Landing page</th>
                <th className="px-4 py-3 text-right">Sessions</th>
                <th className="px-4 py-3 text-right">Users</th>
                <th className="px-4 py-3 text-right">Conv.</th>
                <th className="px-4 py-3 text-right">CR</th>
                <th className="px-4 py-3 text-right">Bounce</th>
                <th className="px-4 py-3 text-right">Rage</th>
                <th className="px-4 py-3 text-right">Dead</th>
                <th className="px-4 py-3 text-right">Scroll</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-zinc-500" data-testid="lp-table-loading">
                    Loading data…
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors"
                    data-testid={`lp-row-${r.id}`}
                  >
                    <td className="px-6 py-4">
                      <Link
                        to={`/landing-pages/${r.id}`}
                        className="block group"
                        data-testid={`lp-link-${r.id}`}
                      >
                        <div className="font-semibold text-zinc-950 group-hover:underline">
                          {r.name}
                        </div>
                        <div className="text-xs text-zinc-500 mono-font truncate max-w-[320px]">
                          {r.url}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-right mono-font">{formatNumber(r.sessions)}</td>
                    <td className="px-4 py-4 text-right mono-font">{formatNumber(r.users)}</td>
                    <td className="px-4 py-4 text-right mono-font">{formatNumber(r.conversions)}</td>
                    <td className="px-4 py-4 text-right mono-font text-emerald-700 font-semibold">
                      {r.conversionRate.toFixed(2)}%
                    </td>
                    <td className="px-4 py-4 text-right mono-font">{r.bounceRate.toFixed(1)}%</td>
                    <td className="px-4 py-4 text-right mono-font text-rose-600">
                      {formatNumber(r.rageClicks)}
                    </td>
                    <td className="px-4 py-4 text-right mono-font text-amber-600">
                      {formatNumber(r.deadClicks)}
                    </td>
                    <td className="px-4 py-4 text-right mono-font">{r.avgScrollDepth.toFixed(0)}%</td>
                  </tr>
                ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center" data-testid="lp-table-empty">
                    <div className="display-font font-bold text-xl mb-2 text-zinc-950">
                      No landing pages yet
                    </div>
                    <p className="text-sm text-zinc-500 mb-5 max-w-md mx-auto">
                      Add your first real landing page — Lens will pull live GA4 +
                      Clarity data scoped to its URL path.
                    </p>
                    <Button
                      asChild
                      className="bg-zinc-950 hover:bg-zinc-800 text-white"
                      data-testid="empty-state-add-lp"
                    >
                      <Link to="/landing-pages">
                        <Plus size={14} weight="bold" className="mr-2" /> Add a landing page
                      </Link>
                    </Button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, sub, icon: Icon, accent }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-5 relative overflow-hidden enter-anim">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent}`} />
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500">
          {label}
        </span>
        <Icon size={16} weight="duotone" className="text-zinc-400" />
      </div>
      <div className="display-font font-black text-3xl md:text-4xl tracking-tighter leading-none">
        {formatNumber(value)}
      </div>
      {sub && <div className="mt-2 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-500 mb-1">
        {label}
      </div>
      <div className="display-font font-bold text-xl tracking-tight">{value}</div>
    </div>
  );
}

function HighlightCard({ title, row, badge, accentClass }) {
  if (!row) {
    return (
      <div className="bg-white border border-zinc-200 rounded-lg p-6" data-testid={`highlight-${title.toLowerCase().replace(/\s+/g, "-")}`}>
        <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-3">
          {title}
        </div>
        <div className="text-sm text-zinc-500">No data available.</div>
      </div>
    );
  }
  return (
    <Link
      to={`/landing-pages/${row.id}`}
      className="bg-white border border-zinc-200 rounded-lg p-6 block transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-10px_rgba(9,9,11,0.15)] hover:border-zinc-300"
      data-testid={`highlight-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500">
          {title}
        </span>
        <Badge variant="outline" className={`text-[10px] ${accentClass}`}>
          {badge}
        </Badge>
      </div>
      <div className="display-font font-black text-xl md:text-2xl tracking-tight mb-1 text-zinc-950">
        {row.name}
      </div>
      <div className="text-xs text-zinc-500 mono-font truncate mb-4">{row.url}</div>
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <div className="text-zinc-500 uppercase tracking-wider text-[9px] font-semibold">Sessions</div>
          <div className="display-font font-bold text-lg">{formatNumber(row.sessions)}</div>
        </div>
        <div>
          <div className="text-zinc-500 uppercase tracking-wider text-[9px] font-semibold">CR</div>
          <div className="display-font font-bold text-lg text-emerald-700">{row.conversionRate.toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-zinc-500 uppercase tracking-wider text-[9px] font-semibold">Rage</div>
          <div className="display-font font-bold text-lg text-rose-700">{formatNumber(row.rageClicks)}</div>
        </div>
      </div>
    </Link>
  );
}
