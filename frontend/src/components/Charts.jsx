import {
  AreaChart,
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNumber } from "@/lib/api";
import { format, parseISO } from "date-fns";

export function TrafficChart({ data }) {
  const chartData = (data || []).map((d) => ({
    ...d,
    label: d.date ? format(parseISO(d.date), "MMM d") : "",
  }));
  return (
    <div className="h-[320px] w-full" data-testid="traffic-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="sessionsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="pvFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} />
          <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} />
          <Tooltip
            formatter={(value, name) => [formatNumber(value), name]}
            cursor={{ stroke: "#09090b", strokeOpacity: 0.3, strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="sessions"
            stroke="#2563eb"
            strokeWidth={2}
            fill="url(#sessionsFill)"
            name="Sessions"
          />
          <Area
            type="monotone"
            dataKey="pageviews"
            stroke="#0ea5e9"
            strokeWidth={2}
            fill="url(#pvFill)"
            name="Pageviews"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ConversionChart({ data }) {
  const chartData = (data || []).map((d) => ({
    ...d,
    label: d.date ? format(parseISO(d.date), "MMM d") : "",
  }));
  return (
    <div className="h-[260px] w-full" data-testid="conversion-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} />
          <YAxis yAxisId="left" axisLine={false} tickLine={false} />
          <YAxis
            yAxisId="right"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="conversions"
            stroke="#16a34a"
            strokeWidth={2}
            dot={false}
            name="Conversions"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="bounceRate"
            stroke="#dc2626"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            name="Bounce rate %"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SourcesBarChart({ data }) {
  const chartData = (data || []).slice(0, 8).map((d) => ({
    ...d,
    label: `${d.source}${d.medium ? " / " + d.medium : ""}`,
  }));
  return (
    <div className="h-[320px] w-full" data-testid="sources-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 120 }}
        >
          <CartesianGrid strokeDasharray="2 4" horizontal={false} />
          <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} />
          <YAxis
            dataKey="label"
            type="category"
            axisLine={false}
            tickLine={false}
            width={120}
            tick={{ fontSize: 11 }}
          />
          <Tooltip formatter={(v) => formatNumber(v)} />
          <Bar dataKey="sessions" fill="#2563eb" radius={[0, 2, 2, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DeviceDonut({ data }) {
  const colors = ["#09090b", "#52525b", "#a1a1aa"];
  return (
    <div className="h-[260px] w-full" data-testid="device-donut">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data || []}
            dataKey="sessions"
            nameKey="device"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={2}
            strokeWidth={0}
          >
            {(data || []).map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v, n, p) => [`${formatNumber(v)} sessions`, p.payload.device]} />
          <Legend
            verticalAlign="bottom"
            iconType="square"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FrustrationBars({ hotspots }) {
  return (
    <div className="h-[280px] w-full" data-testid="frustration-bars">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={(hotspots || []).slice(0, 7)}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 120 }}
        >
          <CartesianGrid strokeDasharray="2 4" horizontal={false} />
          <XAxis type="number" axisLine={false} tickLine={false} />
          <YAxis
            dataKey="selector"
            type="category"
            axisLine={false}
            tickLine={false}
            width={120}
            tick={{ fontSize: 11 }}
          />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="rageClicks" stackId="a" fill="#dc2626" name="Rage" radius={[0, 0, 0, 0]} />
          <Bar dataKey="deadClicks" stackId="a" fill="#f59e0b" name="Dead" radius={[0, 2, 2, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RealtimeMicroChart({ data }) {
  return (
    <div className="h-[120px] w-full" data-testid="realtime-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data || []} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <XAxis dataKey="minutesAgo" hide />
          <YAxis hide />
          <Tooltip formatter={(v) => [`${v} active users`, ""]} labelFormatter={(l) => `${l}m ago`} />
          <Bar dataKey="activeUsers" fill="#09090b" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
