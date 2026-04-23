import { formatNumber, formatSignedPercent } from "@/lib/api";
import { ArrowUpRight, ArrowDownRight, Minus } from "@phosphor-icons/react";

const SOURCE_ACCENT = {
  ga4: "bg-blue-600",
  clarity: "bg-emerald-600",
  combined: "bg-zinc-950",
};

export default function KpiCard({ kpi, testId }) {
  const {
    label,
    value,
    format,
    source,
    delta,
    lowerIsBetter,
  } = kpi;

  const hasDelta = typeof delta === "number";
  const positiveMovement = hasDelta
    ? lowerIsBetter
      ? delta < 0
      : delta > 0
    : null;

  const deltaColor =
    !hasDelta || delta === 0
      ? "text-zinc-500"
      : positiveMovement
      ? "text-emerald-700"
      : "text-rose-700";

  const Icon =
    !hasDelta || delta === 0
      ? Minus
      : delta > 0
      ? ArrowUpRight
      : ArrowDownRight;

  return (
    <div
      className="group relative bg-white border border-zinc-200 rounded-lg p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-10px_rgba(9,9,11,0.15)] hover:border-zinc-300 enter-anim"
      data-testid={testId || `kpi-${kpi.key}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${
              SOURCE_ACCENT[source] || "bg-zinc-950"
            }`}
          />
          <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500">
            {label}
          </span>
        </div>
        <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-400 font-medium">
          {source === "ga4" ? "GA4" : source === "clarity" ? "Clarity" : "Combined"}
        </span>
      </div>
      <div className="display-font font-black text-3xl md:text-4xl tracking-tighter text-zinc-950 leading-none">
        {formatNumber(value, format)}
      </div>
      {hasDelta && (
        <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${deltaColor}`}>
          <Icon size={14} weight="bold" />
          <span>{formatSignedPercent(delta)}</span>
          <span className="text-zinc-500 font-normal">vs. previous</span>
        </div>
      )}
    </div>
  );
}
