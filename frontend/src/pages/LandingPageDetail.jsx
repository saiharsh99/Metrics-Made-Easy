import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, formatNumber } from "@/lib/api";
import DateRangePicker from "@/components/DateRangePicker";
import KpiCard from "@/components/KpiCard";
import {
  TrafficChart,
  ConversionChart,
  SourcesBarChart,
  DeviceDonut,
  FrustrationBars,
  RealtimeMicroChart,
} from "@/components/Charts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pulse, Users } from "@phosphor-icons/react";
import { format, subDays } from "date-fns";

const defaultRange = () => ({
  from: format(subDays(new Date(), 29), "yyyy-MM-dd"),
  to: format(new Date(), "yyyy-MM-dd"),
});

export default function LandingPageDetail() {
  const { id } = useParams();
  const [range, setRange] = useState(defaultRange());
  const [overview, setOverview] = useState(null);
  const [sources, setSources] = useState([]);
  const [devices, setDevices] = useState([]);
  const [countries, setCountries] = useState([]);
  const [realtime, setRealtime] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      api.get(`/analytics/overview`, {
        params: { lp_id: id, start_date: range.from, end_date: range.to },
      }),
      api.get(`/analytics/ga4/traffic-sources`, {
        params: { lp_id: id, start_date: range.from, end_date: range.to },
      }),
      api.get(`/analytics/ga4/devices`, { params: { lp_id: id } }),
      api.get(`/analytics/ga4/countries`, { params: { lp_id: id } }),
      api.get(`/analytics/realtime`, { params: { lp_id: id } }),
    ])
      .then(([o, s, d, c, rt]) => {
        if (!mounted) return;
        setOverview(o.data);
        setSources(s.data.rows);
        setDevices(d.data.rows);
        setCountries(c.data.rows);
        setRealtime(rt.data);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [id, range.from, range.to]);

  useEffect(() => {
    const t = setInterval(() => {
      api.get(`/analytics/realtime`, { params: { lp_id: id } }).then((r) => setRealtime(r.data)).catch(() => {});
    }, 15000);
    return () => clearInterval(t);
  }, [id]);

  const lp = overview?.lp;
  const kpis = overview?.kpis || [];
  const ga = overview?.ga4;
  const clarity = overview?.clarity;

  const timeseries = useMemo(() => ga?.series || [], [ga]);

  if (loading && !overview) {
    return (
      <div className="p-12 text-center text-zinc-500" data-testid="lp-loading">
        Loading landing page analytics…
      </div>
    );
  }

  if (!lp) {
    return (
      <div className="p-12 text-center" data-testid="lp-not-found">
        <div className="display-font text-2xl font-bold">Landing page not found</div>
        <Button asChild className="mt-4">
          <Link to="/landing-pages">Back to list</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="lp-detail-page">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <Link
            to="/landing-pages"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-950 mb-3"
            data-testid="back-link"
          >
            <ArrowLeft size={14} /> All landing pages
          </Link>
          <div className="text-[10px] uppercase tracking-[0.28em] font-bold text-zinc-500 mb-2">
            Landing page
          </div>
          <h1 className="display-font font-black text-4xl md:text-5xl tracking-tighter">
            {lp.name}
          </h1>
          <a
            href={lp.url}
            target="_blank"
            rel="noreferrer"
            className="mono-font text-sm text-zinc-600 hover:text-zinc-950 hover:underline inline-block mt-2"
            data-testid="lp-url-link"
          >
            {lp.url}
          </a>
          {lp.description && (
            <p className="mt-3 text-sm text-zinc-500 max-w-2xl">{lp.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker value={range} onChange={setRange} />
          <Button
            asChild
            variant="outline"
            className="border-zinc-200 hover:bg-zinc-100"
            data-testid="edit-lp-btn"
          >
            <Link to="/landing-pages">Edit page</Link>
          </Button>
        </div>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4" data-testid="kpi-grid">
        {kpis.map((k, i) => (
          <KpiCard key={k.key} kpi={k} testId={`kpi-${k.key}`} />
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-lg p-6" data-testid="traffic-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-1">
                Sessions &amp; pageviews
              </div>
              <h2 className="display-font font-bold text-2xl tracking-tight">Traffic over time</h2>
            </div>
            <div className="flex gap-2 text-xs">
              <LegendDot color="#2563eb" label="Sessions" />
              <LegendDot color="#0ea5e9" label="Pageviews" />
            </div>
          </div>
          <TrafficChart data={timeseries} />
        </div>
        <div className="bg-white border border-zinc-200 rounded-lg p-6" data-testid="realtime-card">
          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500">
              Realtime
            </div>
          </div>
          <div className="display-font font-black text-5xl tracking-tighter leading-none">
            {realtime?.activeUsers ?? 0}
          </div>
          <div className="text-xs text-zinc-500 mt-1">active users right now</div>
          <div className="mt-4">
            <RealtimeMicroChart data={realtime?.perMinute} />
          </div>
          <div className="mt-4 space-y-1.5">
            <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-zinc-500 mb-1">
              By country
            </div>
            {(realtime?.byCountry || []).slice(0, 5).map((c) => (
              <div key={c.country} className="flex items-center justify-between text-xs">
                <span className="text-zinc-600">{c.country}</span>
                <span className="mono-font font-semibold">{c.activeUsers}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-lg p-6" data-testid="conv-card">
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-1">
              Conversions vs bounce
            </div>
            <h2 className="display-font font-bold text-2xl tracking-tight">Quality trend</h2>
          </div>
          <ConversionChart data={timeseries} />
        </div>
        <div className="bg-white border border-zinc-200 rounded-lg p-6" data-testid="device-card">
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-1">
              Device split
            </div>
            <h2 className="display-font font-bold text-2xl tracking-tight">By category</h2>
          </div>
          <DeviceDonut data={devices} />
        </div>
      </section>

      <Tabs defaultValue="sources" className="w-full" data-testid="detail-tabs">
        <TabsList className="bg-zinc-100 border border-zinc-200">
          <TabsTrigger value="sources" data-testid="tab-sources">Traffic sources</TabsTrigger>
          <TabsTrigger value="frustration" data-testid="tab-frustration">User frustration</TabsTrigger>
          <TabsTrigger value="sessions" data-testid="tab-sessions">Session recordings</TabsTrigger>
          <TabsTrigger value="geo" data-testid="tab-geo">Geography</TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-lg p-6" data-testid="sources-card">
              <div className="mb-4">
                <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-1">
                  GA4 · acquisition
                </div>
                <h3 className="display-font font-bold text-xl tracking-tight">Top sources / mediums</h3>
              </div>
              <SourcesBarChart data={sources} />
            </div>
            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden" data-testid="sources-table">
              <div className="px-5 py-3 border-b border-zinc-200 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500">
                  Details
                </span>
                <Badge variant="outline" className="text-[10px]">GA4</Badge>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">
                    <th className="px-4 py-2 text-left">Source / medium</th>
                    <th className="px-4 py-2 text-right">Sessions</th>
                    <th className="px-4 py-2 text-right">Conv.</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.slice(0, 8).map((s) => (
                    <tr key={`${s.source}-${s.medium}`} className="border-t border-zinc-100" data-testid={`source-row-${s.source}`}>
                      <td className="px-4 py-2">
                        <div className="text-zinc-950 font-medium text-xs">{s.source}</div>
                        <div className="text-[11px] text-zinc-500">{s.medium}</div>
                      </td>
                      <td className="px-4 py-2 text-right mono-font text-xs">{formatNumber(s.sessions)}</td>
                      <td className="px-4 py-2 text-right mono-font text-xs text-emerald-700 font-semibold">
                        {formatNumber(s.conversions)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="frustration" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="bg-white border border-zinc-200 rounded-lg p-6" data-testid="frustration-summary">
              <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-3">
                Clarity · frustration
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FrustrationMetric label="Rage" value={clarity?.summary?.rageClicks} color="text-rose-600" />
                <FrustrationMetric label="Dead" value={clarity?.summary?.deadClicks} color="text-amber-600" />
                <FrustrationMetric label="Quick backs" value={clarity?.summary?.quickBacks} color="text-zinc-950" />
                <FrustrationMetric label="Excessive scroll" value={clarity?.summary?.excessiveScroll} color="text-zinc-950" />
                <FrustrationMetric
                  label="Avg scroll depth"
                  value={`${clarity?.summary?.avgScrollDepth?.toFixed(0) || 0}%`}
                  color="text-zinc-950"
                  raw
                />
                <FrustrationMetric
                  label="Engagement time"
                  value={`${clarity?.summary?.avgEngagementTime?.toFixed(0) || 0}s`}
                  color="text-zinc-950"
                  raw
                />
              </div>
            </div>
            <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-lg p-6" data-testid="frustration-hotspots">
              <div className="mb-4">
                <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-1">
                  Hotspots
                </div>
                <h3 className="display-font font-bold text-xl tracking-tight">Where users get stuck</h3>
              </div>
              <FrustrationBars hotspots={clarity?.hotspots} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="mt-6">
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden" data-testid="sessions-table">
            <div className="px-6 py-4 border-b border-zinc-200">
              <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-1">
                Clarity · session recordings
              </div>
              <h3 className="display-font font-bold text-xl tracking-tight">Recent sessions</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 border-b border-zinc-200">
                  <th className="px-6 py-3 text-left">Session</th>
                  <th className="px-4 py-3 text-left">Country</th>
                  <th className="px-4 py-3 text-left">Device</th>
                  <th className="px-4 py-3 text-left">Browser</th>
                  <th className="px-4 py-3 text-right">Duration</th>
                  <th className="px-4 py-3 text-right">Pages</th>
                  <th className="px-4 py-3 text-left">Flags</th>
                </tr>
              </thead>
              <tbody>
                {(clarity?.recordings || []).map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-zinc-100 hover:bg-zinc-50"
                    data-testid={`recording-row-${r.id}`}
                  >
                    <td className="px-6 py-3 mono-font text-xs">{r.id}</td>
                    <td className="px-4 py-3 text-xs">{r.country}</td>
                    <td className="px-4 py-3 text-xs capitalize">{r.device}</td>
                    <td className="px-4 py-3 text-xs">{r.browser}</td>
                    <td className="px-4 py-3 text-right mono-font text-xs">
                      {Math.floor(r.duration / 60)}m {r.duration % 60}s
                    </td>
                    <td className="px-4 py-3 text-right mono-font text-xs">{r.pages}</td>
                    <td className="px-4 py-3 text-xs">
                      {r.hasRage && (
                        <Badge className="bg-rose-50 text-rose-700 border-rose-200 mr-1 text-[10px]">rage</Badge>
                      )}
                      {r.hasDead && (
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">dead</Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {(!clarity?.recordings || clarity.recordings.length === 0) && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">
                      No recordings available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="geo" className="mt-6">
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden" data-testid="geo-table">
            <div className="px-6 py-4 border-b border-zinc-200">
              <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-1">
                GA4 · geography
              </div>
              <h3 className="display-font font-bold text-xl tracking-tight">Users by country</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 border-b border-zinc-200">
                  <th className="px-6 py-3 text-left">Country</th>
                  <th className="px-4 py-3 text-right">Users</th>
                  <th className="px-4 py-3 text-right">Sessions</th>
                  <th className="px-4 py-3 text-left w-1/2">Share</th>
                </tr>
              </thead>
              <tbody>
                {countries.map((c) => {
                  const maxUsers = Math.max(...countries.map((x) => x.users), 1);
                  const pct = (c.users / maxUsers) * 100;
                  return (
                    <tr key={c.country} className="border-t border-zinc-100" data-testid={`country-row-${c.country}`}>
                      <td className="px-6 py-3 font-medium">{c.country}</td>
                      <td className="px-4 py-3 text-right mono-font">{formatNumber(c.users)}</td>
                      <td className="px-4 py-3 text-right mono-font">{formatNumber(c.sessions)}</td>
                      <td className="px-4 py-3">
                        <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-zinc-950"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-zinc-600">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      {label}
    </div>
  );
}

function FrustrationMetric({ label, value, color, raw }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-zinc-500 mb-1">
        {label}
      </div>
      <div className={`display-font font-black text-2xl tracking-tighter ${color}`}>
        {raw ? value : formatNumber(value)}
      </div>
    </div>
  );
}
