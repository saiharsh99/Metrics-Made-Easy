import { useEffect, useMemo, useState } from "react";
import { api, formatNumber } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { MagnifyingGlass, MagnifyingGlassPlus } from "@phosphor-icons/react";

const FLAG_OFFSET = 127397;
const flagForCode = (code) => {
  if (!code || code.length !== 2 || code === "ZZ") return "🌐";
  return String.fromCodePoint(
    ...code.toUpperCase().split("").map((c) => c.charCodeAt(0) + FLAG_OFFSET)
  );
};

export default function SearchConsole() {
  const { range, refreshToken } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qSearch, setQSearch] = useState("");
  const [pSearch, setPSearch] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .get("/analytics/organic/search-console", {
        params: { start_date: range.from, end_date: range.to },
      })
      .then((r) => mounted && setData(r.data))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [range.from, range.to, refreshToken]);

  const queries = useMemo(() => {
    if (!data) return [];
    return qSearch
      ? data.queries.filter((q) =>
          q.query.toLowerCase().includes(qSearch.toLowerCase())
        )
      : data.queries;
  }, [data, qSearch]);

  const pages = useMemo(() => {
    if (!data) return [];
    return pSearch
      ? data.pages.filter((p) =>
          p.page.toLowerCase().includes(pSearch.toLowerCase())
        )
      : data.pages;
  }, [data, pSearch]);

  return (
    <div className="space-y-8" data-testid="search-console-page">
      <div>
        <div className="text-[10px] uppercase tracking-[0.28em] font-bold text-zinc-500 mb-2 flex items-center gap-2">
          <MagnifyingGlassPlus size={14} weight="duotone" /> Google Search Console
        </div>
        <h1 className="display-font font-black text-4xl md:text-5xl tracking-tighter">
          Organic search performance
        </h1>
        <p className="mt-3 text-sm text-zinc-600 max-w-2xl">
          What you rank for, where you rank, and what's actually clicked. Pair
          this with the Sources dashboard to see how SEO converts on-site.
        </p>
      </div>

      {loading && !data && (
        <div className="p-12 text-center text-zinc-500" data-testid="gsc-loading">
          Loading Search Console…
        </div>
      )}

      {data && (
        <>
          <section
            className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
            data-testid="gsc-totals"
          >
            <Total label="Total clicks" value={formatNumber(data.totals.clicks)} accent="bg-blue-600" />
            <Total label="Impressions" value={formatNumber(data.totals.impressions)} accent="bg-zinc-950" />
            <Total label="Avg CTR" value={`${data.totals.ctr}%`} accent="bg-emerald-600" />
            <Total label="Avg position" value={data.totals.position.toFixed(1)} accent="bg-amber-600" />
          </section>

          <section
            className="bg-white border border-zinc-200 rounded-lg p-6"
            data-testid="gsc-trend-card"
          >
            <div className="mb-4">
              <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-1">
                Daily performance
              </div>
              <h2 className="display-font font-bold text-xl tracking-tight">
                Clicks &amp; impressions over time
              </h2>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.trend.map((d) => ({
                    ...d,
                    label: d.date ? format(parseISO(d.date), "MMM d") : "",
                  }))}
                  margin={{ top: 8, right: 8, bottom: 0, left: -10 }}
                >
                  <defs>
                    <linearGradient id="gscClicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.32} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gscImpr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.16} />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatNumber(v)}
                  />
                  <Tooltip formatter={(v) => formatNumber(v)} />
                  <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="clicks"
                    name="Clicks"
                    stroke="#2563eb"
                    fill="url(#gscClicks)"
                    strokeWidth={2}
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="impressions"
                    name="Impressions"
                    stroke="#0ea5e9"
                    fill="url(#gscImpr)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <Tabs defaultValue="queries" className="w-full">
            <TabsList className="bg-zinc-100 border border-zinc-200">
              <TabsTrigger value="queries" data-testid="gsc-tab-queries">Queries</TabsTrigger>
              <TabsTrigger value="pages" data-testid="gsc-tab-pages">Pages</TabsTrigger>
              <TabsTrigger value="devices" data-testid="gsc-tab-devices">Devices</TabsTrigger>
              <TabsTrigger value="countries" data-testid="gsc-tab-countries">Countries</TabsTrigger>
            </TabsList>

            <TabsContent value="queries" className="mt-6">
              <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden" data-testid="gsc-queries-card">
                <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-1">
                      Top queries
                    </div>
                    <h3 className="display-font font-bold text-xl tracking-tight">
                      What people searched
                    </h3>
                  </div>
                  <div className="relative w-72">
                    <MagnifyingGlass
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                    />
                    <Input
                      value={qSearch}
                      onChange={(e) => setQSearch(e.target.value)}
                      placeholder="Filter queries"
                      className="pl-9 h-9"
                      data-testid="gsc-query-search"
                    />
                  </div>
                </div>
                <PerfTable rows={queries} keyField="query" col1="Query" />
              </div>
            </TabsContent>

            <TabsContent value="pages" className="mt-6">
              <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden" data-testid="gsc-pages-card">
                <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-1">
                      Top pages
                    </div>
                    <h3 className="display-font font-bold text-xl tracking-tight">
                      Which pages drive organic clicks
                    </h3>
                  </div>
                  <div className="relative w-72">
                    <MagnifyingGlass
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                    />
                    <Input
                      value={pSearch}
                      onChange={(e) => setPSearch(e.target.value)}
                      placeholder="Filter pages"
                      className="pl-9 h-9"
                      data-testid="gsc-page-search"
                    />
                  </div>
                </div>
                <PerfTable rows={pages} keyField="page" col1="Page" />
              </div>
            </TabsContent>

            <TabsContent value="devices" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="gsc-devices-cards">
                {data.devices.map((d) => (
                  <div
                    key={d.device}
                    className="bg-white border border-zinc-200 rounded-lg p-5 enter-anim"
                  >
                    <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-zinc-500 mb-3">
                      {d.device}
                    </div>
                    <div className="display-font font-black text-3xl tracking-tighter mb-2">
                      {formatNumber(d.clicks)}
                    </div>
                    <div className="text-xs text-zinc-500 mb-3">
                      {formatNumber(d.impressions)} impressions · {d.ctr}% CTR
                    </div>
                    <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-zinc-950"
                        style={{ width: `${d.share}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1">{d.share}% share</div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="countries" className="mt-6">
              <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden" data-testid="gsc-countries-card">
                <div className="px-6 py-4 border-b border-zinc-200">
                  <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-1">
                    Geography
                  </div>
                  <h3 className="display-font font-bold text-xl tracking-tight">
                    Organic clicks by country
                  </h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-[0.18em] font-semibold text-zinc-500 border-b border-zinc-200 text-left">
                      <th className="px-6 py-3">Country</th>
                      <th className="px-4 py-3 text-right">Clicks</th>
                      <th className="px-4 py-3 text-right">Impressions</th>
                      <th className="px-4 py-3 text-right">CTR</th>
                      <th className="px-4 py-3 text-right">Avg pos.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.countries.map((c) => (
                      <tr
                        key={c.countryCode}
                        className="border-b border-zinc-100 hover:bg-zinc-50"
                      >
                        <td className="px-6 py-3 flex items-center gap-2">
                          <span className="text-xl leading-none">
                            {flagForCode(c.countryCode)}
                          </span>
                          <span className="font-semibold text-zinc-950 text-xs">
                            {c.country}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right mono-font font-semibold">
                          {formatNumber(c.clicks)}
                        </td>
                        <td className="px-4 py-3 text-right mono-font">
                          {formatNumber(c.impressions)}
                        </td>
                        <td className="px-4 py-3 text-right mono-font">{c.ctr}%</td>
                        <td className="px-4 py-3 text-right mono-font">
                          {c.position.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function Total({ label, value, accent }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-5 relative overflow-hidden enter-anim">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent}`} />
      <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-2">
        {label}
      </div>
      <div className="display-font font-black text-3xl md:text-4xl tracking-tighter leading-none">
        {value}
      </div>
    </div>
  );
}

function PerfTable({ rows, keyField, col1 }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.18em] font-semibold text-zinc-500 border-b border-zinc-200 text-left">
            <th className="px-6 py-3">{col1}</th>
            <th className="px-4 py-3 text-right">Clicks</th>
            <th className="px-4 py-3 text-right">Impressions</th>
            <th className="px-4 py-3 text-right">CTR</th>
            <th className="px-4 py-3 text-right">Avg pos.</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                No matches.
              </td>
            </tr>
          )}
          {rows.slice(0, 50).map((r) => (
            <tr
              key={r[keyField]}
              className="border-b border-zinc-100 hover:bg-zinc-50"
              data-testid={`gsc-row-${r[keyField]}`}
            >
              <td className="px-6 py-3 text-xs">
                {keyField === "page" ? (
                  <span className="mono-font text-zinc-950">{r[keyField]}</span>
                ) : (
                  <span className="text-zinc-950 font-medium">{r[keyField]}</span>
                )}
              </td>
              <td className="px-4 py-3 text-right mono-font font-semibold text-blue-700">
                {formatNumber(r.clicks)}
              </td>
              <td className="px-4 py-3 text-right mono-font">
                {formatNumber(r.impressions)}
              </td>
              <td className="px-4 py-3 text-right mono-font">{r.ctr}%</td>
              <td className="px-4 py-3 text-right mono-font">
                {r.position.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
