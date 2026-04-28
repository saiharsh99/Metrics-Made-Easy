import { useEffect, useState } from "react";
import { api, formatNumber } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { FacebookLogo } from "@phosphor-icons/react";
import AdHierarchyTable from "@/components/AdHierarchyTable";

const CURRENCY = (v) => `₹${formatNumber(v)}`;

const OBJ_COLORS = {
  reach: "#0ea5e9",
  leadgen: "#16a34a",
  conversions: "#db2777",
  ctwa: "#22c55e",
};

const OBJ_LABELS = {
  reach: "Reach",
  leadgen: "Lead form",
  conversions: "Conversion",
  ctwa: "Click-to-WhatsApp",
};

const OBJ_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "reach", label: "Reach" },
  { value: "leadgen", label: "Leads" },
  { value: "conversions", label: "Conversion" },
  { value: "ctwa", label: "CTWA" },
];

export default function MetaAds() {
  const { range, refreshToken } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .get("/analytics/ads/meta", {
        params: { start_date: range.from, end_date: range.to },
      })
      .then((r) => mounted && setData(r.data))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [range.from, range.to, refreshToken]);

  return (
    <div className="space-y-8" data-testid="meta-ads-page">
      <div>
        <div className="text-[10px] uppercase tracking-[0.28em] font-bold text-zinc-500 mb-2 flex items-center gap-2">
          <FacebookLogo size={14} weight="duotone" /> Meta Ads
        </div>
        <h1 className="display-font font-black text-4xl md:text-5xl tracking-tighter">
          Facebook &amp; Instagram performance
        </h1>
        <p className="mt-3 text-sm text-zinc-600 max-w-2xl">
          Reach, leads, conversions and Click-to-WhatsApp campaigns — drill
          from campaign down to ad set and individual ad creative.
        </p>
      </div>

      {loading && !data && (
        <div className="p-12 text-center text-zinc-500" data-testid="meta-loading">
          Loading Meta Ads…
        </div>
      )}

      {data && (
        <>
          <KpiStrip totals={data.totals} testId="meta-totals" />

          <section
            className="grid grid-cols-1 lg:grid-cols-4 gap-3 md:gap-4"
            data-testid="meta-by-objective"
          >
            {data.byObjective.map((o) => (
              <ObjectiveCard key={o.key} obj={o} accent={OBJ_COLORS[o.key]} />
            ))}
          </section>

          <section
            className="bg-white border border-zinc-200 rounded-lg p-6"
            data-testid="meta-trend-card"
          >
            <div className="mb-4">
              <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-1">
                Daily spend by objective
              </div>
              <h2 className="display-font font-bold text-xl tracking-tight">
                Where your budget is going
              </h2>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={mergeSeries(data.trend, "spend").map((d) => ({
                    ...d,
                    label: d.date ? format(parseISO(d.date), "MMM d") : "",
                  }))}
                  margin={{ top: 8, right: 8, bottom: 0, left: -10 }}
                >
                  <defs>
                    {Object.entries(OBJ_COLORS).map(([k, c]) => (
                      <linearGradient key={k} id={`meta-${k}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={c} stopOpacity={0.32} />
                        <stop offset="100%" stopColor={c} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `₹${formatNumber(v)}`} />
                  <Tooltip formatter={(v, n) => [CURRENCY(v), OBJ_LABELS[n] || n]} />
                  <Legend
                    iconType="square"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11 }}
                    formatter={(v) => OBJ_LABELS[v] || v}
                  />
                  {Object.entries(OBJ_COLORS).map(([k, c]) => (
                    <Area
                      key={k}
                      type="monotone"
                      dataKey={k}
                      stackId="1"
                      stroke={c}
                      fill={`url(#meta-${k})`}
                      strokeWidth={2}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <AdHierarchyTable
            campaigns={data.campaigns}
            midLevel={data.adsets || []}
            ads={data.ads || []}
            midLabel="Ad sets"
            adParentKey="adsetId"
            testIdPrefix="meta"
            typeAccessor={(r) => r.objectiveKey}
            typeColors={OBJ_COLORS}
            typeLabels={OBJ_LABELS}
            typeFilter={{
              tab,
              setTab,
              options: OBJ_FILTER_OPTIONS,
            }}
            showLeadsCol
          />
        </>
      )}
    </div>
  );
}

function ObjectiveCard({ obj, accent }) {
  return (
    <div
      className="bg-white border border-zinc-200 rounded-lg p-5 enter-anim relative overflow-hidden"
      data-testid={`meta-obj-${obj.key}`}
    >
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: accent }}
      />
      <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-zinc-500 mb-1">
        {obj.label}
      </div>
      <div className="text-[10px] text-zinc-500 mb-3">
        {obj.campaigns} campaigns
      </div>
      <div className="display-font font-black text-2xl tracking-tighter mb-3">
        ₹{formatNumber(obj.spend)}
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <Tiny label="Impr." value={formatNumber(obj.impressions)} />
        <Tiny label="Clicks" value={formatNumber(obj.clicks)} />
        <Tiny label="CTR" value={`${obj.ctr}%`} />
        <Tiny label="CPC" value={`₹${obj.cpc}`} />
        {obj.leads > 0 && (
          <>
            <Tiny label="Leads" value={formatNumber(obj.leads)} />
            <Tiny label="CPL" value={`₹${obj.cpl}`} highlight />
          </>
        )}
        {obj.conversions > 0 && obj.key !== "leadgen" && (
          <>
            <Tiny label="Conv." value={formatNumber(obj.conversions)} />
            <Tiny label="CPA" value={`₹${obj.cpa}`} highlight />
          </>
        )}
        {obj.roas > 0 && <Tiny label="ROAS" value={`${obj.roas}x`} highlight />}
      </div>
    </div>
  );
}

function Tiny({ label, value, highlight }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold">
        {label}
      </div>
      <div
        className={`mono-font font-semibold ${
          highlight ? "text-emerald-700" : "text-zinc-950"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function KpiStrip({ totals, testId }) {
  const items = [
    { label: "Spend", value: `₹${formatNumber(totals.spend)}`, accent: "bg-zinc-950" },
    { label: "Impressions", value: formatNumber(totals.impressions), accent: "bg-blue-600" },
    { label: "Clicks", value: formatNumber(totals.clicks), sub: `${totals.ctr}% CTR`, accent: "bg-zinc-700" },
    { label: "CPC", value: `₹${totals.cpc}`, accent: "bg-zinc-700" },
    {
      label: "Leads",
      value: formatNumber(totals.leads || 0),
      sub: totals.cpl ? `₹${totals.cpl} CPL` : null,
      accent: "bg-emerald-600",
    },
    {
      label: "Conversions",
      value: formatNumber(totals.conversions || 0),
      sub: totals.cpa ? `₹${totals.cpa} CPA` : null,
      accent: "bg-rose-600",
    },
    {
      label: "Revenue",
      value: `₹${formatNumber(totals.revenue || 0)}`,
      sub: totals.roas ? `${totals.roas}× ROAS` : null,
      accent: "bg-amber-600",
    },
  ];
  return (
    <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4" data-testid={testId}>
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
          {i.sub && <div className="text-[10px] text-zinc-500 mt-2">{i.sub}</div>}
        </div>
      ))}
    </section>
  );
}

function mergeSeries(byKey, metric) {
  const dateMap = new Map();
  Object.entries(byKey).forEach(([k, list]) => {
    list.forEach((row) => {
      if (!dateMap.has(row.date)) dateMap.set(row.date, { date: row.date });
      dateMap.get(row.date)[k] = row[metric];
    });
  });
  return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export { mergeSeries, KpiStrip };
