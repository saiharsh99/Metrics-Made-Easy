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
import { GoogleLogo } from "@phosphor-icons/react";
import { mergeSeries, KpiStrip } from "@/pages/MetaAds";
import AdHierarchyTable from "@/components/AdHierarchyTable";

const TYPE_COLORS = {
  search: "#2563eb",
  display: "#0ea5e9",
  demandgen: "#7c3aed",
  pmax: "#16a34a",
};
const TYPE_LABELS = {
  search: "Search",
  display: "Display",
  demandgen: "Demand Gen",
  pmax: "Performance Max",
};
const TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "search", label: "Search" },
  { value: "display", label: "Display" },
  { value: "demandgen", label: "Demand Gen" },
  { value: "pmax", label: "Pmax" },
];

export default function GoogleAds() {
  const { range, refreshToken } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .get("/analytics/ads/google", {
        params: { start_date: range.from, end_date: range.to },
      })
      .then((r) => mounted && setData(r.data))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [range.from, range.to, refreshToken]);

  return (
    <div className="space-y-8" data-testid="google-ads-page">
      <div>
        <div className="text-[10px] uppercase tracking-[0.28em] font-bold text-zinc-500 mb-2 flex items-center gap-2">
          <GoogleLogo size={14} weight="duotone" /> Google Ads
        </div>
        <h1 className="display-font font-black text-4xl md:text-5xl tracking-tighter">
          Search · Display · Demand Gen · Pmax
        </h1>
        <p className="mt-3 text-sm text-zinc-600 max-w-2xl">
          A unified P&amp;L for every Google Ads campaign type — drill from
          campaign to ad group to individual ads to see what's pulling weight.
        </p>
      </div>

      {loading && !data && (
        <div className="p-12 text-center text-zinc-500" data-testid="google-loading">
          Loading Google Ads…
        </div>
      )}

      {data && (
        <>
          <KpiStrip totals={data.totals} testId="google-totals" />

          <section
            className="grid grid-cols-1 lg:grid-cols-4 gap-3 md:gap-4"
            data-testid="google-by-type"
          >
            {data.byType.map((t) => (
              <TypeCard key={t.key} t={t} accent={TYPE_COLORS[t.key]} />
            ))}
          </section>

          <section
            className="bg-white border border-zinc-200 rounded-lg p-6"
            data-testid="google-trend-card"
          >
            <div className="mb-4">
              <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-1">
                Daily spend by campaign type
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
                    {Object.entries(TYPE_COLORS).map(([k, c]) => (
                      <linearGradient key={k} id={`gads-${k}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={c} stopOpacity={0.32} />
                        <stop offset="100%" stopColor={c} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `₹${formatNumber(v)}`} />
                  <Tooltip formatter={(v, n) => [`₹${formatNumber(v)}`, TYPE_LABELS[n] || n]} />
                  <Legend
                    iconType="square"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11 }}
                    formatter={(v) => TYPE_LABELS[v] || v}
                  />
                  {Object.entries(TYPE_COLORS).map(([k, c]) => (
                    <Area
                      key={k}
                      type="monotone"
                      dataKey={k}
                      stackId="1"
                      stroke={c}
                      fill={`url(#gads-${k})`}
                      strokeWidth={2}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <AdHierarchyTable
            campaigns={data.campaigns}
            midLevel={data.adGroups || []}
            ads={data.ads || []}
            midLabel="Ad groups"
            adParentKey="adGroupId"
            testIdPrefix="google"
            typeAccessor={(r) => r.typeKey}
            typeColors={TYPE_COLORS}
            typeLabels={TYPE_LABELS}
            typeFilter={{
              tab,
              setTab,
              options: TYPE_FILTER_OPTIONS,
            }}
          />
        </>
      )}
    </div>
  );
}

function TypeCard({ t, accent }) {
  return (
    <div
      className="bg-white border border-zinc-200 rounded-lg p-5 enter-anim relative overflow-hidden"
      data-testid={`g-type-${t.key}`}
    >
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: accent }}
      />
      <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-zinc-500 mb-1">
        {t.label}
      </div>
      <div className="text-[10px] text-zinc-500 mb-3">
        {t.campaigns} campaigns
      </div>
      <div className="display-font font-black text-2xl tracking-tighter mb-3">
        ₹{formatNumber(t.spend)}
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <Tiny label="Impr." value={formatNumber(t.impressions)} />
        <Tiny label="Clicks" value={formatNumber(t.clicks)} />
        <Tiny label="CTR" value={`${t.ctr}%`} />
        <Tiny label="CPC" value={`₹${t.cpc}`} />
        <Tiny label="Conv." value={formatNumber(t.conversions)} />
        <Tiny label="CPA" value={t.cpa ? `₹${t.cpa}` : "—"} highlight />
        <Tiny label="ROAS" value={t.roas ? `${t.roas}×` : "—"} highlight />
        <Tiny label="Conv rate" value={`${t.convRate}%`} />
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
