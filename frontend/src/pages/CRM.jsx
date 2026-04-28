import { useEffect, useMemo, useState } from "react";
import { api, formatNumber } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Database, MagnifyingGlass } from "@phosphor-icons/react";

const STAGE_COLORS = {
  new: "#0ea5e9",
  qualified: "#2563eb",
  proposal: "#7c3aed",
  negotiation: "#db2777",
  won: "#16a34a",
  lost: "#71717a",
};

const CURRENCY = (v) => `₹${formatNumber(v)}`;

export default function CRM() {
  const { range, refreshToken } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .get("/analytics/crm", {
        params: { start_date: range.from, end_date: range.to },
      })
      .then((r) => mounted && setData(r.data))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [range.from, range.to, refreshToken]);

  const deals = useMemo(() => {
    if (!data) return [];
    if (!search) return data.deals;
    const q = search.toLowerCase();
    return data.deals.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.company.toLowerCase().includes(q) ||
        d.owner.toLowerCase().includes(q)
    );
  }, [data, search]);

  return (
    <div className="space-y-8" data-testid="crm-page">
      <div>
        <div className="text-[10px] uppercase tracking-[0.28em] font-bold text-zinc-500 mb-2 flex items-center gap-2">
          <Database size={14} weight="duotone" /> CRM data
          <span className="ml-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[9px] tracking-wider">
            DEMO
          </span>
        </div>
        <h1 className="display-font font-black text-4xl md:text-5xl tracking-tighter">
          Pipeline &amp; revenue from your CRM
        </h1>
        <p className="mt-3 text-sm text-zinc-600 max-w-2xl">
          Demo numbers showing how leads, deals and pipeline value will look
          once a CRM is connected. Wire up HubSpot / Salesforce / Pipedrive
          from Settings to flip this to live data.
        </p>
      </div>

      {loading && !data && (
        <div className="p-12 text-center text-zinc-500" data-testid="crm-loading">
          Loading CRM…
        </div>
      )}

      {data && (
        <>
          <KpiStrip totals={data.totals} />

          <section
            className="grid grid-cols-1 lg:grid-cols-3 gap-4"
            data-testid="crm-stage-funnel"
          >
            <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-lg p-6">
              <div className="mb-4">
                <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-1">
                  Pipeline by stage
                </div>
                <h2 className="display-font font-bold text-xl tracking-tight">
                  Where deals are sitting today
                </h2>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byStage} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="2 4" vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `₹${formatNumber(v)}`}
                    />
                    <Tooltip formatter={(v) => CURRENCY(v)} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {data.byStage.map((s) => (
                        <Cell key={s.key} fill={STAGE_COLORS[s.key] || "#71717a"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-3" data-testid="crm-stage-list">
              <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-2">
                Deal counts
              </div>
              {data.byStage.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center justify-between border-b border-zinc-100 pb-2 last:border-0 last:pb-0"
                  data-testid={`crm-stage-${s.key}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: STAGE_COLORS[s.key] }}
                    />
                    <span className="text-sm font-medium text-zinc-950">
                      {s.label}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="mono-font font-semibold text-sm">
                      {formatNumber(s.count)}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {CURRENCY(s.value)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section
            className="bg-white border border-zinc-200 rounded-lg p-6"
            data-testid="crm-trend-card"
          >
            <div className="mb-4">
              <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-1">
                Daily new leads &amp; revenue
              </div>
              <h2 className="display-font font-bold text-xl tracking-tight">
                Lead flow vs closed revenue
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
                    <linearGradient id="crmLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="crmRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16a34a" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} />
                  <YAxis
                    yAxisId="left"
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatNumber(v)}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${formatNumber(v)}`}
                  />
                  <Tooltip
                    formatter={(v, n) =>
                      n === "revenue" ? [CURRENCY(v), "Revenue"] : [formatNumber(v), "Leads"]
                    }
                  />
                  <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="leads"
                    name="Leads"
                    stroke="#2563eb"
                    fill="url(#crmLeads)"
                    strokeWidth={2}
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#16a34a"
                    fill="url(#crmRev)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <Tabs defaultValue="sources" className="w-full">
            <TabsList className="bg-zinc-100 border border-zinc-200">
              <TabsTrigger value="sources" data-testid="crm-tab-sources">
                Sources
              </TabsTrigger>
              <TabsTrigger value="deals" data-testid="crm-tab-deals">
                Deals
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sources" className="mt-6">
              <div
                className="bg-white border border-zinc-200 rounded-lg overflow-hidden"
                data-testid="crm-sources-card"
              >
                <div className="px-6 py-4 border-b border-zinc-200">
                  <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-1">
                    Lead source attribution
                  </div>
                  <h3 className="display-font font-bold text-xl tracking-tight">
                    Where revenue comes from
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-[0.18em] font-semibold text-zinc-500 border-b border-zinc-200 text-left">
                        <th className="px-6 py-3">Source</th>
                        <th className="px-4 py-3 text-right">Leads</th>
                        <th className="px-4 py-3 text-right">Deals</th>
                        <th className="px-4 py-3 text-right">Won</th>
                        <th className="px-4 py-3 text-right">Win rate</th>
                        <th className="px-4 py-3 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.bySource.map((s) => (
                        <tr
                          key={s.source}
                          className="border-b border-zinc-100 hover:bg-zinc-50"
                          data-testid={`crm-source-${s.source}`}
                        >
                          <td className="px-6 py-3 font-semibold text-zinc-950 text-xs">
                            {s.source}
                          </td>
                          <td className="px-4 py-3 text-right mono-font">
                            {formatNumber(s.leads)}
                          </td>
                          <td className="px-4 py-3 text-right mono-font">
                            {formatNumber(s.deals)}
                          </td>
                          <td className="px-4 py-3 text-right mono-font font-semibold text-emerald-700">
                            {formatNumber(s.won)}
                          </td>
                          <td className="px-4 py-3 text-right mono-font">{s.winRate}%</td>
                          <td className="px-4 py-3 text-right mono-font font-semibold">
                            {CURRENCY(s.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="deals" className="mt-6">
              <div
                className="bg-white border border-zinc-200 rounded-lg overflow-hidden"
                data-testid="crm-deals-card"
              >
                <div className="px-6 py-4 border-b border-zinc-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-1">
                      Top deals
                    </div>
                    <h3 className="display-font font-bold text-xl tracking-tight">
                      Highest-value pipeline
                    </h3>
                  </div>
                  <div className="relative w-72">
                    <MagnifyingGlass
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                    />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Filter deals"
                      className="pl-9 h-9"
                      data-testid="crm-deal-search"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-[0.18em] font-semibold text-zinc-500 border-b border-zinc-200 text-left">
                        <th className="px-6 py-3">Deal</th>
                        <th className="px-4 py-3">Stage</th>
                        <th className="px-4 py-3">Owner</th>
                        <th className="px-4 py-3">Source</th>
                        <th className="px-4 py-3 text-right">Value</th>
                        <th className="px-4 py-3 text-right">Prob.</th>
                        <th className="px-4 py-3 text-right">Age</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deals.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-10 text-center text-zinc-500">
                            No deals match the filter.
                          </td>
                        </tr>
                      )}
                      {deals.map((d) => (
                        <tr
                          key={d.id}
                          className="border-b border-zinc-100 hover:bg-zinc-50"
                          data-testid={`crm-deal-${d.id}`}
                        >
                          <td className="px-6 py-3 text-xs font-semibold text-zinc-950">
                            {d.name}
                          </td>
                          <td className="px-4 py-3 text-[10px]">
                            <span
                              className="px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold border"
                              style={{
                                color: STAGE_COLORS[d.stageKey],
                                borderColor: STAGE_COLORS[d.stageKey] + "55",
                                background: STAGE_COLORS[d.stageKey] + "10",
                              }}
                            >
                              {d.stage}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-600">{d.owner}</td>
                          <td className="px-4 py-3 text-xs text-zinc-600">{d.source}</td>
                          <td className="px-4 py-3 text-right mono-font font-semibold">
                            {CURRENCY(d.value)}
                          </td>
                          <td className="px-4 py-3 text-right mono-font">{d.probability}%</td>
                          <td className="px-4 py-3 text-right mono-font text-zinc-500">
                            {d.ageDays}d
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function KpiStrip({ totals }) {
  const items = [
    { label: "New leads", value: formatNumber(totals.leads), accent: "bg-blue-600" },
    { label: "Open deals", value: formatNumber(totals.openDeals), accent: "bg-violet-600" },
    {
      label: "Pipeline value",
      value: `₹${formatNumber(totals.pipeline)}`,
      accent: "bg-zinc-950",
    },
    {
      label: "Won revenue",
      value: `₹${formatNumber(totals.wonRevenue)}`,
      accent: "bg-emerald-600",
    },
    { label: "Win rate", value: `${totals.winRate}%`, accent: "bg-amber-600" },
    {
      label: "Avg deal size",
      value: `₹${formatNumber(totals.avgDealSize)}`,
      accent: "bg-rose-600",
    },
    {
      label: "Sales cycle",
      value: `${totals.salesCycleDays}d`,
      accent: "bg-zinc-700",
    },
  ];
  return (
    <section
      className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4"
      data-testid="crm-totals"
    >
      {items.map((i) => (
        <div
          key={i.label}
          className="bg-white border border-zinc-200 rounded-lg p-4 relative overflow-hidden enter-anim"
        >
          <div className={`absolute top-0 left-0 right-0 h-0.5 ${i.accent}`} />
          <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-2">
            {i.label}
          </div>
          <div className="display-font font-black text-2xl tracking-tighter leading-none">
            {i.value}
          </div>
        </div>
      ))}
    </section>
  );
}
