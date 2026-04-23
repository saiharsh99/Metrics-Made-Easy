import { useEffect, useState } from "react";
import { api, formatNumber, formatSignedPercent } from "@/lib/api";
import DateRangePicker from "@/components/DateRangePicker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, parseISO } from "date-fns";
import { ArrowsLeftRight } from "@phosphor-icons/react";

export default function Compare() {
  const [pages, setPages] = useState([]);
  const [lpId, setLpId] = useState("");
  const [rangeA, setRangeA] = useState({
    from: format(subDays(new Date(), 13), "yyyy-MM-dd"),
    to: format(subDays(new Date(), 7), "yyyy-MM-dd"),
  });
  const [rangeB, setRangeB] = useState({
    from: format(subDays(new Date(), 6), "yyyy-MM-dd"),
    to: format(new Date(), "yyyy-MM-dd"),
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/landing-pages").then((r) => {
      setPages(r.data);
      if (r.data.length && !lpId) setLpId(r.data[0].id);
    });
  }, []);

  const run = async () => {
    if (!lpId) return;
    setLoading(true);
    try {
      const r = await api.get("/analytics/compare", {
        params: {
          lp_id: lpId,
          period_a_start: rangeA.from,
          period_a_end: rangeA.to,
          period_b_start: rangeB.from,
          period_b_end: rangeB.to,
        },
      });
      setResult(r.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (lpId) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lpId, rangeA.from, rangeA.to, rangeB.from, rangeB.to]);

  const merged = mergeSeries(result?.a?.series, result?.b?.series);

  return (
    <div className="space-y-8" data-testid="compare-page">
      <div>
        <div className="text-[10px] uppercase tracking-[0.28em] font-bold text-zinc-500 mb-2">
          Analysis
        </div>
        <h1 className="display-font font-black text-4xl md:text-5xl tracking-tighter flex items-center gap-3">
          <ArrowsLeftRight size={40} weight="duotone" className="text-zinc-400" />
          Compare two periods
        </h1>
        <p className="mt-3 text-sm text-zinc-600 max-w-2xl">
          Pick a landing page and two date ranges to quantify what changed.
        </p>
      </div>

      <section className="bg-white border border-zinc-200 rounded-lg p-6" data-testid="compare-controls">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <Label className="text-xs uppercase tracking-wider font-semibold">Landing page</Label>
            <Select value={lpId} onValueChange={setLpId}>
              <SelectTrigger className="mt-1.5 bg-white border-zinc-200" data-testid="compare-lp-select">
                <SelectValue placeholder="Select a page" />
              </SelectTrigger>
              <SelectContent>
                {pages.map((p) => (
                  <SelectItem key={p.id} value={p.id} data-testid={`compare-lp-${p.id}`}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider font-semibold">Period A</Label>
            <div className="mt-1.5">
              <DateRangePicker value={rangeA} onChange={setRangeA} />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider font-semibold">Period B</Label>
            <div className="mt-1.5">
              <DateRangePicker value={rangeB} onChange={setRangeB} />
            </div>
          </div>
          <Button
            onClick={run}
            disabled={loading || !lpId}
            className="bg-zinc-950 hover:bg-zinc-800 text-white"
            data-testid="run-compare"
          >
            {loading ? "Analysing…" : "Run analysis"}
          </Button>
        </div>
      </section>

      {result && (
        <>
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4" data-testid="compare-kpis">
            <CompareKpi label="Sessions" a={result.a.summary.sessions} b={result.b.summary.sessions} delta={result.delta.sessions} />
            <CompareKpi label="Users" a={result.a.summary.users} b={result.b.summary.users} delta={result.delta.users} />
            <CompareKpi label="Conversions" a={result.a.summary.conversions} b={result.b.summary.conversions} delta={result.delta.conversions} />
            <CompareKpi
              label="Conv. rate"
              a={`${result.a.summary.conversionRate.toFixed(2)}%`}
              b={`${result.b.summary.conversionRate.toFixed(2)}%`}
              delta={result.delta.conversionRate}
              raw
            />
          </section>

          <section className="bg-white border border-zinc-200 rounded-lg p-6" data-testid="compare-chart-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-1">
                  Overlay
                </div>
                <h2 className="display-font font-bold text-xl tracking-tight">
                  Sessions by day
                </h2>
              </div>
              <div className="flex gap-4 text-xs">
                <LegendDot color="#09090b" label={result.a.label} />
                <LegendDot color="#2563eb" label={result.b.label} />
              </div>
            </div>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={merged} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="x" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} />
                  <Tooltip formatter={(v) => formatNumber(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="a" stroke="#09090b" strokeWidth={2} dot={false} name="Period A" />
                  <Line type="monotone" dataKey="b" stroke="#2563eb" strokeWidth={2} dot={false} name="Period B" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div className="flex items-center gap-1.5 text-zinc-600">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      {label}
    </div>
  );
}

function CompareKpi({ label, a, b, delta, raw }) {
  const positive = delta > 0;
  const color = delta === 0 ? "text-zinc-500" : positive ? "text-emerald-700" : "text-rose-700";
  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-5 enter-anim" data-testid={`compare-kpi-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
      <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-2">
        {label}
      </div>
      <div className="flex items-baseline gap-3">
        <div className="display-font font-black text-3xl tracking-tighter">
          {raw ? b : formatNumber(b)}
        </div>
        <div className={`text-xs font-semibold ${color}`}>{formatSignedPercent(delta)}</div>
      </div>
      <div className="text-[11px] text-zinc-500 mt-1">
        vs {raw ? a : formatNumber(a)} (period A)
      </div>
    </div>
  );
}

function mergeSeries(a, b) {
  const result = [];
  const len = Math.max(a?.length || 0, b?.length || 0);
  for (let i = 0; i < len; i++) {
    result.push({
      x: `Day ${i + 1}`,
      a: a?.[i]?.sessions ?? null,
      b: b?.[i]?.sessions ?? null,
    });
  }
  return result;
}
