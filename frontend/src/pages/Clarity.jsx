import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatNumber } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import { FrustrationBars } from "@/components/Charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatDistanceToNow, parseISO } from "date-fns";
import {
  HandTap,
  Cursor,
  Clock,
  ArrowUUpLeft,
  ArrowsOutLineVertical,
  VideoCamera,
  ArrowRight,
  Smiley,
  WarningCircle,
  Lightning,
} from "@phosphor-icons/react";

export default function Clarity() {
  const { lpId, pages, refreshToken } = useApp();
  const [days, setDays] = useState(3);
  const [data, setData] = useState(null); // per-LP clarity result
  const [perLp, setPerLp] = useState([]); // when lpId==="all"
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // recordings filter

  // Fetch clarity data
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    if (lpId === "all") {
      // Aggregate: fetch every LP in parallel
      Promise.all(
        pages.map((p) =>
          api
            .get("/analytics/clarity", { params: { lp_id: p.id, days } })
            .then((res) => ({ lp: p, clarity: res.data }))
            .catch(() => ({ lp: p, clarity: null }))
        )
      )
        .then((all) => {
          if (!mounted) return;
          setPerLp(all);
          setData(null);
        })
        .finally(() => mounted && setLoading(false));
    } else {
      api
        .get("/analytics/clarity", { params: { lp_id: lpId, days } })
        .then((r) => {
          if (!mounted) return;
          setData(r.data);
          setPerLp([]);
        })
        .finally(() => mounted && setLoading(false));
    }
    return () => {
      mounted = false;
    };
  }, [lpId, days, pages, refreshToken]);

  const aggregate = useMemo(() => {
    if (lpId !== "all") return null;
    const totals = {
      sessions: 0,
      rageClicks: 0,
      deadClicks: 0,
      quickBacks: 0,
      excessiveScroll: 0,
      avgScrollDepth: 0,
      avgEngagementTime: 0,
    };
    let n = 0;
    perLp.forEach(({ clarity }) => {
      if (!clarity?.summary) return;
      n += 1;
      totals.sessions += clarity.summary.sessions || 0;
      totals.rageClicks += clarity.summary.rageClicks || 0;
      totals.deadClicks += clarity.summary.deadClicks || 0;
      totals.quickBacks += clarity.summary.quickBacks || 0;
      totals.excessiveScroll += clarity.summary.excessiveScroll || 0;
      totals.avgScrollDepth += clarity.summary.avgScrollDepth || 0;
      totals.avgEngagementTime += clarity.summary.avgEngagementTime || 0;
    });
    if (n > 0) {
      totals.avgScrollDepth = totals.avgScrollDepth / n;
      totals.avgEngagementTime = totals.avgEngagementTime / n;
    }
    return { totals, lpCount: n };
  }, [perLp, lpId]);

  const summary =
    lpId === "all" ? aggregate?.totals : data?.summary || null;
  const hotspots = useMemo(() => {
    if (lpId === "all") {
      // merge hotspots across LPs by selector
      const merged = new Map();
      perLp.forEach(({ clarity }) => {
        (clarity?.hotspots || []).forEach((h) => {
          const cur = merged.get(h.selector) || {
            selector: h.selector,
            rageClicks: 0,
            deadClicks: 0,
          };
          cur.rageClicks += h.rageClicks || 0;
          cur.deadClicks += h.deadClicks || 0;
          merged.set(h.selector, cur);
        });
      });
      return Array.from(merged.values()).sort(
        (a, b) => b.rageClicks + b.deadClicks - (a.rageClicks + a.deadClicks)
      );
    }
    return data?.hotspots || [];
  }, [perLp, data, lpId]);

  const recordings = useMemo(() => {
    let list = [];
    if (lpId === "all") {
      perLp.forEach(({ lp, clarity }) => {
        (clarity?.recordings || []).forEach((r) =>
          list.push({ ...r, lpName: lp.name, lpId: lp.id })
        );
      });
    } else {
      list = (data?.recordings || []).map((r) => ({
        ...r,
        lpName: pages.find((p) => p.id === lpId)?.name,
        lpId,
      }));
    }
    if (filter === "rage") list = list.filter((r) => r.hasRage);
    if (filter === "dead") list = list.filter((r) => r.hasDead);
    if (filter === "frustrated")
      list = list.filter((r) => r.hasRage || r.hasDead);
    return list.sort((a, b) =>
      (b.timestamp || "").localeCompare(a.timestamp || "")
    );
  }, [perLp, data, lpId, pages, filter]);

  return (
    <div className="space-y-8" data-testid="clarity-page">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em] font-bold text-zinc-500 mb-2">
            Microsoft Clarity
          </div>
          <h1 className="display-font font-black text-4xl md:text-5xl tracking-tighter">
            User behaviour signals
          </h1>
          <p className="mt-3 text-sm text-zinc-600 max-w-2xl">
            Rage &amp; dead clicks, scroll depth, engagement time — and the actual
            session recordings behind the numbers.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <Label className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500">
              Window
            </Label>
            <Select
              value={String(days)}
              onValueChange={(v) => setDays(Number(v))}
            >
              <SelectTrigger
                className="mt-2 bg-white border-zinc-200 h-10 w-36"
                data-testid="clarity-days-select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24 hours</SelectItem>
                <SelectItem value="2">Last 48 hours</SelectItem>
                <SelectItem value="3">Last 72 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loading && !summary && (
        <div className="p-12 text-center text-zinc-500" data-testid="clarity-loading">
          Loading Clarity data…
        </div>
      )}

      {pages.length === 0 && !loading && (
        <div
          className="p-16 text-center bg-white border border-zinc-200 rounded-lg"
          data-testid="clarity-empty"
        >
          <div className="display-font font-bold text-2xl mb-2">
            No landing pages yet
          </div>
          <p className="text-sm text-zinc-500 mb-5 max-w-md mx-auto">
            Add your first landing page so Lens knows what to watch in Clarity.
          </p>
          <Button
            asChild
            className="bg-zinc-950 hover:bg-zinc-800 text-white"
            data-testid="clarity-empty-add-lp"
          >
            <Link to="/landing-pages">Add a landing page</Link>
          </Button>
        </div>
      )}

      {summary && (
        <>
          <section
            className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4"
            data-testid="clarity-kpis"
          >
            <Kpi
              label="Sessions"
              value={formatNumber(summary.sessions)}
              icon={Smiley}
              accent="bg-zinc-950"
            />
            <Kpi
              label="Rage clicks"
              value={formatNumber(summary.rageClicks)}
              sub={
                summary.sessions
                  ? `${(
                      (summary.rageClicks / summary.sessions) *
                      100
                    ).toFixed(2)}% of sessions`
                  : ""
              }
              icon={WarningCircle}
              accent="bg-rose-600"
              tone="rose"
            />
            <Kpi
              label="Dead clicks"
              value={formatNumber(summary.deadClicks)}
              sub={
                summary.sessions
                  ? `${(
                      (summary.deadClicks / summary.sessions) *
                      100
                    ).toFixed(2)}% of sessions`
                  : ""
              }
              icon={Cursor}
              accent="bg-amber-600"
              tone="amber"
            />
            <Kpi
              label="Quick backs"
              value={formatNumber(summary.quickBacks)}
              icon={ArrowUUpLeft}
              accent="bg-zinc-700"
            />
            <Kpi
              label="Excessive scroll"
              value={formatNumber(summary.excessiveScroll)}
              icon={ArrowsOutLineVertical}
              accent="bg-zinc-700"
            />
            <Kpi
              label="Avg scroll depth"
              value={`${(summary.avgScrollDepth || 0).toFixed(0)}%`}
              icon={Lightning}
              accent="bg-blue-600"
            />
            <Kpi
              label="Engagement time"
              value={`${(summary.avgEngagementTime || 0).toFixed(0)}s`}
              icon={Clock}
              accent="bg-emerald-600"
            />
          </section>

          <Tabs defaultValue="recordings" className="w-full">
            <TabsList className="bg-zinc-100 border border-zinc-200">
              <TabsTrigger value="recordings" data-testid="tab-recordings">
                Recordings
              </TabsTrigger>
              <TabsTrigger value="hotspots" data-testid="tab-hotspots">
                Frustration hotspots
              </TabsTrigger>
              {lpId === "all" && (
                <TabsTrigger value="byLp" data-testid="tab-by-lp">
                  By landing page
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="recordings" className="mt-6">
              <div
                className="bg-white border border-zinc-200 rounded-lg overflow-hidden"
                data-testid="recordings-card"
              >
                <div className="px-6 py-4 border-b border-zinc-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <VideoCamera
                      size={18}
                      weight="duotone"
                      className="text-zinc-500"
                    />
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500">
                        Session recordings
                      </div>
                      <h2 className="display-font font-bold text-lg tracking-tight">
                        Recent sessions
                      </h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FilterPill
                      label="All"
                      active={filter === "all"}
                      onClick={() => setFilter("all")}
                      count={recordings.length}
                      testId="filter-all"
                    />
                    <FilterPill
                      label="Frustrated"
                      active={filter === "frustrated"}
                      onClick={() => setFilter("frustrated")}
                      tone="rose"
                      testId="filter-frustrated"
                    />
                    <FilterPill
                      label="Rage"
                      active={filter === "rage"}
                      onClick={() => setFilter("rage")}
                      tone="rose"
                      testId="filter-rage"
                    />
                    <FilterPill
                      label="Dead"
                      active={filter === "dead"}
                      onClick={() => setFilter("dead")}
                      tone="amber"
                      testId="filter-dead"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="recordings-table">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-[0.18em] font-semibold text-zinc-500 border-b border-zinc-200 text-left">
                        <th className="px-6 py-3">Session</th>
                        {lpId === "all" && (
                          <th className="px-4 py-3">Landing page</th>
                        )}
                        <th className="px-4 py-3">Country</th>
                        <th className="px-4 py-3">Device</th>
                        <th className="px-4 py-3">Browser</th>
                        <th className="px-4 py-3 text-right">Duration</th>
                        <th className="px-4 py-3 text-right">Pages</th>
                        <th className="px-4 py-3">When</th>
                        <th className="px-4 py-3">Flags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recordings.length === 0 && (
                        <tr>
                          <td
                            colSpan={lpId === "all" ? 9 : 8}
                            className="px-6 py-12 text-center text-zinc-500"
                            data-testid="recordings-empty"
                          >
                            No recordings match the current filter.
                          </td>
                        </tr>
                      )}
                      {recordings.map((r) => (
                        <tr
                          key={`${r.lpId}-${r.id}`}
                          className="border-b border-zinc-100 hover:bg-zinc-50"
                          data-testid={`recording-${r.id}`}
                        >
                          <td className="px-6 py-3 mono-font text-xs">{r.id}</td>
                          {lpId === "all" && (
                            <td className="px-4 py-3">
                              <Link
                                to={`/landing-pages/${r.lpId}`}
                                className="text-xs font-semibold text-zinc-950 hover:underline"
                              >
                                {r.lpName || "—"}
                              </Link>
                            </td>
                          )}
                          <td className="px-4 py-3 text-xs">{r.country}</td>
                          <td className="px-4 py-3 text-xs capitalize">
                            {r.device}
                          </td>
                          <td className="px-4 py-3 text-xs">{r.browser}</td>
                          <td className="px-4 py-3 text-right mono-font text-xs">
                            {Math.floor(r.duration / 60)}m {r.duration % 60}s
                          </td>
                          <td className="px-4 py-3 text-right mono-font text-xs">
                            {r.pages}
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-500">
                            {r.timestamp
                              ? formatDistanceToNow(parseISO(r.timestamp), {
                                  addSuffix: true,
                                })
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {r.hasRage && (
                              <Badge className="bg-rose-50 text-rose-700 border-rose-200 mr-1 text-[10px]">
                                rage
                              </Badge>
                            )}
                            {r.hasDead && (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                                dead
                              </Badge>
                            )}
                            {!r.hasRage && !r.hasDead && (
                              <span className="text-[10px] text-zinc-400">
                                clean
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="hotspots" className="mt-6">
              <div
                className="bg-white border border-zinc-200 rounded-lg p-6"
                data-testid="hotspots-card"
              >
                <div className="mb-4 flex items-center gap-2">
                  <HandTap
                    size={18}
                    weight="duotone"
                    className="text-zinc-500"
                  />
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500">
                      Where users get stuck
                    </div>
                    <h2 className="display-font font-bold text-lg tracking-tight">
                      Top frustration hotspots
                    </h2>
                  </div>
                </div>
                {hotspots.length > 0 ? (
                  <FrustrationBars hotspots={hotspots} />
                ) : (
                  <div className="py-8 text-center text-sm text-zinc-500">
                    No hotspots reported yet.
                  </div>
                )}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {hotspots.slice(0, 6).map((h) => (
                    <div
                      key={h.selector}
                      className="border border-zinc-200 rounded-md p-3 flex items-center gap-3"
                      data-testid={`hotspot-${h.selector}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="mono-font text-xs text-zinc-950 truncate">
                          {h.selector}
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-1">
                          rage{" "}
                          <span className="text-rose-700 font-semibold">
                            {h.rageClicks}
                          </span>{" "}
                          · dead{" "}
                          <span className="text-amber-700 font-semibold">
                            {h.deadClicks}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {lpId === "all" && (
              <TabsContent value="byLp" className="mt-6">
                <div
                  className="bg-white border border-zinc-200 rounded-lg overflow-hidden"
                  data-testid="by-lp-card"
                >
                  <div className="px-6 py-4 border-b border-zinc-200">
                    <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500">
                      Per landing page
                    </div>
                    <h2 className="display-font font-bold text-lg tracking-tight">
                      Clarity signals per LP
                    </h2>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-[0.18em] font-semibold text-zinc-500 border-b border-zinc-200 text-left">
                        <th className="px-6 py-3">Landing page</th>
                        <th className="px-4 py-3 text-right">Sessions</th>
                        <th className="px-4 py-3 text-right">Rage</th>
                        <th className="px-4 py-3 text-right">Dead</th>
                        <th className="px-4 py-3 text-right">Quick backs</th>
                        <th className="px-4 py-3 text-right">Scroll depth</th>
                        <th className="px-4 py-3 text-right">Engagement</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {perLp.map(({ lp, clarity }) => (
                        <tr
                          key={lp.id}
                          className="border-b border-zinc-100 hover:bg-zinc-50"
                          data-testid={`by-lp-row-${lp.id}`}
                        >
                          <td className="px-6 py-3">
                            <div className="font-semibold text-zinc-950 text-xs">
                              {lp.name}
                            </div>
                            <div className="mono-font text-[11px] text-zinc-500 truncate max-w-xs">
                              {lp.url}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right mono-font">
                            {formatNumber(clarity?.summary?.sessions || 0)}
                          </td>
                          <td className="px-4 py-3 text-right mono-font text-rose-700">
                            {formatNumber(clarity?.summary?.rageClicks || 0)}
                          </td>
                          <td className="px-4 py-3 text-right mono-font text-amber-700">
                            {formatNumber(clarity?.summary?.deadClicks || 0)}
                          </td>
                          <td className="px-4 py-3 text-right mono-font">
                            {formatNumber(clarity?.summary?.quickBacks || 0)}
                          </td>
                          <td className="px-4 py-3 text-right mono-font">
                            {(clarity?.summary?.avgScrollDepth || 0).toFixed(0)}%
                          </td>
                          <td className="px-4 py-3 text-right mono-font">
                            {(clarity?.summary?.avgEngagementTime || 0).toFixed(
                              0
                            )}
                            s
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              to={`/landing-pages/${lp.id}`}
                              className="text-xs text-zinc-700 hover:text-zinc-950 inline-flex items-center gap-1"
                            >
                              Open <ArrowRight size={12} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                      {perLp.length === 0 && (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-6 py-10 text-center text-zinc-500"
                          >
                            No landing pages.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, icon: Icon, accent, tone }) {
  const toneClass =
    tone === "rose"
      ? "text-rose-700"
      : tone === "amber"
      ? "text-amber-700"
      : "text-zinc-950";
  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-4 relative overflow-hidden enter-anim">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent}`} />
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-zinc-500">
          {label}
        </span>
        <Icon size={14} weight="duotone" className="text-zinc-400" />
      </div>
      <div
        className={`display-font font-black text-2xl tracking-tighter leading-none ${toneClass}`}
      >
        {value}
      </div>
      {sub && <div className="mt-2 text-[10px] text-zinc-500">{sub}</div>}
    </div>
  );
}

function FilterPill({ label, active, onClick, tone, count, testId }) {
  const base =
    "px-3 py-1.5 text-xs rounded-md border transition-colors font-medium flex items-center gap-1.5";
  let cls = "border-zinc-200 text-zinc-700 hover:bg-zinc-100";
  if (active) {
    cls =
      tone === "rose"
        ? "border-rose-300 bg-rose-50 text-rose-800"
        : tone === "amber"
        ? "border-amber-300 bg-amber-50 text-amber-800"
        : "border-zinc-950 bg-zinc-950 text-white";
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${cls}`}
      data-testid={testId}
    >
      {label}
      {typeof count === "number" && (
        <span className="text-[10px] opacity-70">{count}</span>
      )}
    </button>
  );
}

function Kv({ label, value, highlight }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mb-0.5">
        {label}
      </div>
      <div
        className={`display-font font-bold text-sm ${
          highlight ? "text-emerald-700" : "text-zinc-950"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
