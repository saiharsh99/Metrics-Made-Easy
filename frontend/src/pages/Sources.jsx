import { useEffect, useMemo, useState } from "react";
import { api, formatNumber, formatSignedPercent } from "@/lib/api";
import InsightsFilters from "@/components/InsightsFilters";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO, subDays } from "date-fns";
import { MagnifyingGlass, TrendUp, Funnel } from "@phosphor-icons/react";

const defaultRange = () => ({
  from: format(subDays(new Date(), 29), "yyyy-MM-dd"),
  to: format(new Date(), "yyyy-MM-dd"),
});

const CHANNEL_COLORS = {
  "Organic Search": "#2563eb",
  Direct: "#09090b",
  "Paid Search": "#16a34a",
  "Paid Social": "#db2777",
  "Organic Social": "#7c3aed",
  Email: "#f59e0b",
  Referral: "#0ea5e9",
  Affiliate: "#6366f1",
  Other: "#a1a1aa",
};

export default function Sources() {
  const [pages, setPages] = useState([]);
  const [lpId, setLpId] = useState("all");
  const [range, setRange] = useState(defaultRange());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/landing-pages").then((r) => setPages(r.data));
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .get("/analytics/sources", {
        params: {
          lp_id: lpId === "all" ? undefined : lpId,
          start_date: range.from,
          end_date: range.to,
        },
      })
      .then((r) => mounted && setData(r.data))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [lpId, range.from, range.to]);

  const filteredRows = useMemo(() => {
    if (!data) return [];
    if (!search) return data.bySource;
    const q = search.toLowerCase();
    return data.bySource.filter(
      (r) =>
        r.source.toLowerCase().includes(q) ||
        r.medium.toLowerCase().includes(q) ||
        r.channel.toLowerCase().includes(q)
    );
  }, [data, search]);

  const trendKeys = useMemo(() => {
    if (!data) return [];
    return data.byChannel.slice(0, 5).map((c) => c.channel);
  }, [data]);

  return (
    <div className="space-y-8" data-testid="sources-page">
      <div>
        <div className="text-[10px] uppercase tracking-[0.28em] font-bold text-zinc-500 mb-2">
          Source performance
        </div>
        <h1 className="display-font font-black text-4xl md:text-5xl tracking-tighter">
          Where traffic comes from
        </h1>
        <p className="mt-3 text-sm text-zinc-600 max-w-2xl">
          Aggregate acquisition performance across all landing pages, broken down
          by channel, source and medium.
        </p>
      </div>

      <InsightsFilters
        pages={pages}
        lpId={lpId}
        onLpChange={setLpId}
        range={range}
        onRangeChange={setRange}
      />

      {loading && !data && (
        <div className="p-12 text-center text-zinc-500" data-testid="sources-loading">
          Loading source data…
        </div>
      )}

      {data && (
        <>
          <section
            className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
            data-testid="source-totals"
          >
            <TotalCard
              label="Sessions"
              value={formatNumber(data.totals.sessions)}
              accent="bg-blue-600"
              icon={TrendUp}
            />
            <TotalCard
              label="Users"
              value={formatNumber(data.totals.users)}
              accent="bg-zinc-950"
            />
            <TotalCard
              label="Conversions"
              value={formatNumber(data.totals.conversions)}
              sub={`${data.totals.conversionRate}% CR`}
              accent="bg-emerald-600"
            />
            <TotalCard
              label="Avg bounce"
              value={`${data.totals.bounceRate.toFixed(1)}%`}
              accent="bg-rose-600"
            />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
            <div
              className="lg:col-span-2 bg-white border border-zinc-200 rounded-lg p-6"
              data-testid="channel-mix-card"
            >
              <div className="mb-4">
                <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-1">
                  Channel mix
                </div>
                <h2 className="display-font font-bold text-xl tracking-tight">
                  Sessions by channel
                </h2>
              </div>
              <div className="space-y-3">
                {data.byChannel.map((c) => (
                  <div key={c.channel} data-testid={`channel-row-${c.channel}`}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            background:
                              CHANNEL_COLORS[c.channel] || CHANNEL_COLORS.Other,
                          }}
                        />
                        <span className="font-semibold text-zinc-900">
                          {c.channel}
                        </span>
                      </span>
                      <span className="mono-font text-zinc-500">
                        {formatNumber(c.sessions)} · {c.share}%
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${Math.min(c.share * 2, 100)}%`,
                          background:
                            CHANNEL_COLORS[c.channel] || CHANNEL_COLORS.Other,
                        }}
                      />
                    </div>
                    <div className="flex gap-3 text-[11px] text-zinc-500 mt-1">
                      <span>CR {c.conversionRate}%</span>
                      <span>· {formatNumber(c.users)} users</span>
                      <span>· {formatNumber(c.conversions)} conv.</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="lg:col-span-3 bg-white border border-zinc-200 rounded-lg p-6"
              data-testid="channel-trend-card"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-1">
                    Daily trend
                  </div>
                  <h2 className="display-font font-bold text-xl tracking-tight">
                    Top 5 channels · sessions
                  </h2>
                </div>
              </div>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data.trend.map((t) => ({
                      ...t,
                      label: format(parseISO(t.date), "MMM d"),
                    }))}
                    margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
                  >
                    <CartesianGrid strokeDasharray="2 4" vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatNumber(v)}
                    />
                    <Tooltip formatter={(v) => formatNumber(v)} />
                    <Legend
                      wrapperStyle={{ fontSize: 11 }}
                      iconType="square"
                      iconSize={8}
                    />
                    {trendKeys.map((k) => (
                      <Line
                        key={k}
                        type="monotone"
                        dataKey={k}
                        stroke={CHANNEL_COLORS[k] || CHANNEL_COLORS.Other}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section
            className="bg-white border border-zinc-200 rounded-lg overflow-hidden"
            data-testid="sources-table-section"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 gap-4">
              <div>
                <h2 className="display-font font-bold text-xl tracking-tight">
                  Source / medium detail
                </h2>
                <p className="text-xs text-zinc-500">
                  {filteredRows.length} of {data.bySource.length} rows
                </p>
              </div>
              <div className="relative w-72">
                <MagnifyingGlass
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter source / medium / channel"
                  className="pl-9 h-9"
                  data-testid="source-search"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="sources-table">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.18em] font-semibold text-zinc-500 border-b border-zinc-200 text-left">
                    <th className="px-6 py-3">Source / medium</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3 text-right">Sessions</th>
                    <th className="px-4 py-3 text-right">Users</th>
                    <th className="px-4 py-3 text-right">New %</th>
                    <th className="px-4 py-3 text-right">Conv.</th>
                    <th className="px-4 py-3 text-right">CR</th>
                    <th className="px-4 py-3 text-right">Bounce</th>
                    <th className="px-4 py-3 text-right">Avg dur.</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r, i) => (
                    <tr
                      key={`${r.source}-${r.medium}-${i}`}
                      className="border-b border-zinc-100 hover:bg-zinc-50"
                      data-testid={`source-row-${i}`}
                    >
                      <td className="px-6 py-3">
                        <div className="font-semibold text-zinc-950 text-xs">
                          {r.source}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {r.medium}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className="text-[10px] border-zinc-200"
                          style={{
                            color:
                              CHANNEL_COLORS[r.channel] ||
                              CHANNEL_COLORS.Other,
                          }}
                        >
                          {r.channel}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right mono-font">
                        {formatNumber(r.sessions)}
                      </td>
                      <td className="px-4 py-3 text-right mono-font">
                        {formatNumber(r.users)}
                      </td>
                      <td className="px-4 py-3 text-right mono-font text-xs">
                        {r.users
                          ? `${Math.round((r.newUsers / r.users) * 100)}%`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right mono-font">
                        {formatNumber(r.conversions)}
                      </td>
                      <td className="px-4 py-3 text-right mono-font font-semibold text-emerald-700">
                        {r.conversionRate.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-right mono-font">
                        {r.bounceRate.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-right mono-font text-xs">
                        {Math.round(r.avgSessionDuration)}s
                      </td>
                    </tr>
                  ))}
                  {filteredRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-6 py-8 text-center text-zinc-500"
                      >
                        No matches.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function TotalCard({ label, value, sub, accent }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-5 relative overflow-hidden enter-anim">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent}`} />
      <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-3">
        {label}
      </div>
      <div className="display-font font-black text-3xl md:text-4xl tracking-tighter leading-none">
        {value}
      </div>
      {sub && <div className="mt-2 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}
