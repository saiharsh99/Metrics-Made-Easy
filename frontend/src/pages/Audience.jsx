import { useEffect, useState } from "react";
import { api, formatNumber } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import { Badge } from "@/components/ui/badge";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, subDays } from "date-fns";
import { UsersThree, Clock, ChartBar, Smiley, LockKey } from "@phosphor-icons/react";

const DEVICE_COLORS = ["#09090b", "#52525b", "#a1a1aa"];
const BROWSER_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#0ea5e9",
  "#db2777",
  "#16a34a",
  "#f59e0b",
  "#a1a1aa",
];

export default function Audience() {
  const { lpId, range, refreshToken } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .get("/analytics/audience", {
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
  }, [lpId, range.from, range.to, refreshToken]);

  return (
    <div className="space-y-8" data-testid="audience-page">
      <div>
        <div className="text-[10px] uppercase tracking-[0.28em] font-bold text-zinc-500 mb-2">
          Audience insights
        </div>
        <h1 className="display-font font-black text-4xl md:text-5xl tracking-tighter">
          Who visits your pages
        </h1>
        <p className="mt-3 text-sm text-zinc-600 max-w-2xl">
          Understand your audience composition across devices, demographics,
          interests and behaviour.
        </p>
      </div>

      {data?.note && (
        <div
          className="p-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md"
          data-testid="audience-note"
        >
          {data.note}
        </div>
      )}

      {loading && !data && (
        <div className="p-12 text-center text-zinc-500" data-testid="audience-loading">
          Loading audience data…
        </div>
      )}

      {data && (
        <>
          <section
            className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
            data-testid="audience-totals"
          >
            <StatCard
              label="Total users"
              value={formatNumber(data.users.total)}
              icon={UsersThree}
              accent="bg-zinc-950"
            />
            <StatCard
              label="New users"
              value={formatNumber(data.users.new)}
              sub={`${data.users.newShare}% of total`}
              icon={Smiley}
              accent="bg-blue-600"
            />
            <StatCard
              label="Returning"
              value={formatNumber(data.users.returning)}
              sub={`${(100 - data.users.newShare).toFixed(1)}% of total`}
              icon={UsersThree}
              accent="bg-emerald-600"
            />
            <StatCard
              label="Avg session"
              value={`${Math.round(data.engagement.avgSessionDuration)}s`}
              sub={`${data.engagement.avgPagesPerSession} pv/session`}
              icon={Clock}
              accent="bg-amber-600"
            />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <ChartCard
              title="Device split"
              subtitle="Sessions by device category"
              testId="device-card"
            >
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.devices}
                      dataKey="sessions"
                      nameKey="device"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {data.devices.map((_, i) => (
                        <Cell
                          key={i}
                          fill={DEVICE_COLORS[i % DEVICE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v, n, p) => [
                        `${formatNumber(v)} sessions`,
                        p.payload.device,
                      ]}
                    />
                    <Legend
                      iconType="square"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="Browsers"
              subtitle="Top browsers by sessions"
              testId="browser-card"
            >
              <BarList
                rows={data.browsers.map((b) => ({
                  label: b.browser,
                  value: b.sessions,
                  share: b.share,
                }))}
                colors={BROWSER_COLORS}
              />
            </ChartCard>

            <ChartCard
              title="Operating systems"
              subtitle="Platform distribution"
              testId="os-card"
            >
              <BarList
                rows={data.operatingSystems.map((o) => ({
                  label: o.os,
                  value: o.sessions,
                  share: o.share,
                }))}
                colors={["#09090b"]}
              />
            </ChartCard>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <ChartCard
              title="Age &amp; gender"
              subtitle="User distribution"
              testId="age-gender-card"
            >
              {data.ageGender && data.ageGender.length > 0 ? (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.ageGender}
                      margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
                    >
                      <CartesianGrid strokeDasharray="2 4" vertical={false} />
                      <XAxis
                        dataKey="ageRange"
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => formatNumber(v)}
                      />
                      <Tooltip formatter={(v) => formatNumber(v)} />
                      <Legend
                        iconType="square"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 11 }}
                      />
                      <Bar
                        dataKey="male"
                        stackId="a"
                        fill="#2563eb"
                        name="Male"
                      />
                      <Bar
                        dataKey="female"
                        stackId="a"
                        fill="#db2777"
                        name="Female"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <LockedSection
                  title="Demographics are locked"
                  message={
                    data?.notes?.ageGender ||
                    "Enable GA4 Advertising Features on the property to unlock age & gender."
                  }
                  testId="age-gender-locked"
                />
              )}
            </ChartCard>

            <ChartCard
              title="Interests"
              subtitle="Top affinity segments"
              testId="interests-card"
            >
              {data.interests && data.interests.length > 0 ? (
                <div className="space-y-2">
                  {data.interests.slice(0, 8).map((i) => (
                    <div
                      key={i.interest}
                      className="flex items-center gap-3"
                      data-testid={`interest-${i.interest}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-zinc-950 font-medium truncate">
                            {i.interest}
                          </span>
                          <span className="mono-font text-zinc-500">
                            {formatNumber(i.users)} · {i.share}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-zinc-950"
                            style={{ width: `${Math.min(i.share * 4, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <LockedSection
                  title="Interests are locked"
                  message={
                    data?.notes?.interests ||
                    "Enable GA4 Advertising Features on the property to unlock affinity interests."
                  }
                  testId="interests-locked"
                />
              )}
            </ChartCard>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div
              className="lg:col-span-2 bg-white border border-zinc-200 rounded-lg p-6"
              data-testid="new-vs-returning-card"
            >
              <div className="mb-4">
                <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-1">
                  Behaviour
                </div>
                <h3 className="display-font font-bold text-xl tracking-tight">
                  New vs returning users
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {data.newVsReturning.map((r) => (
                  <div
                    key={r.type}
                    className={`border rounded-lg p-5 ${
                      r.type === "new"
                        ? "border-blue-200 bg-blue-50/40"
                        : "border-emerald-200 bg-emerald-50/40"
                    }`}
                    data-testid={`user-type-${r.type}`}
                  >
                    <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-zinc-600 mb-1">
                      {r.type === "new" ? "New visitors" : "Returning visitors"}
                    </div>
                    <div className="display-font font-black text-3xl tracking-tighter mb-2">
                      {formatNumber(r.users)}
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <Kv label="Sessions" value={formatNumber(r.sessions)} />
                      <Kv
                        label="Avg dur."
                        value={`${Math.round(r.avgDuration ?? 0)}s`}
                      />
                      <Kv
                        label="CR"
                        value={`${(r.conversionRate ?? 0).toFixed(2)}%`}
                        highlight={r.type === "returning"}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <ChartCard
              title="Top languages"
              subtitle="By session count"
              testId="languages-card"
            >
              <BarList
                rows={data.languages.slice(0, 8).map((l) => ({
                  label: l.language,
                  value: l.sessions,
                  share: l.share,
                }))}
                colors={["#09090b"]}
              />
            </ChartCard>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, accent }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-5 relative overflow-hidden enter-anim">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent}`} />
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500">
          {label}
        </span>
        <Icon size={16} weight="duotone" className="text-zinc-400" />
      </div>
      <div className="display-font font-black text-3xl tracking-tighter leading-none">
        {value}
      </div>
      {sub && <div className="mt-2 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

function ChartCard({ title, subtitle, children, testId }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-6" data-testid={testId}>
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-1">
          {subtitle}
        </div>
        <h2
          className="display-font font-bold text-xl tracking-tight"
          dangerouslySetInnerHTML={{ __html: title }}
        />
      </div>
      {children}
    </div>
  );
}

function BarList({ rows, colors }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={r.label} className="flex items-center gap-3">
          <div className="w-28 text-xs text-zinc-700 truncate">{r.label}</div>
          <div className="flex-1 h-6 bg-zinc-100 rounded-sm overflow-hidden relative">
            <div
              className="h-full"
              style={{
                width: `${(r.value / max) * 100}%`,
                background: colors[i % colors.length],
              }}
            />
          </div>
          <div className="w-20 text-right mono-font text-xs text-zinc-600">
            {formatNumber(r.value)}
          </div>
          <div className="w-12 text-right mono-font text-[11px] text-zinc-400">
            {r.share}%
          </div>
        </div>
      ))}
    </div>
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

function LockedSection({ title, message, testId }) {
  return (
    <div
      className="flex flex-col items-center justify-center h-[220px] text-center px-6"
      data-testid={testId}
    >
      <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mb-3">
        <LockKey size={18} weight="duotone" className="text-zinc-500" />
      </div>
      <div className="display-font font-bold text-sm text-zinc-950 mb-1">
        {title}
      </div>
      <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
        {message}
      </p>
      <a
        href="https://support.google.com/analytics/answer/9268042"
        target="_blank"
        rel="noreferrer"
        className="text-[11px] text-blue-700 underline mt-2"
      >
        How to enable this in GA4 →
      </a>
    </div>
  );
}
