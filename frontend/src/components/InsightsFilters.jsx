import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DateRangePicker from "@/components/DateRangePicker";

export default function InsightsFilters({
  pages,
  lpId,
  onLpChange,
  range,
  onRangeChange,
  extra,
}) {
  return (
    <section
      className="bg-white border border-zinc-200 rounded-lg p-5 md:p-6 flex flex-col md:flex-row md:items-end gap-4 md:gap-6"
      data-testid="insights-filters"
    >
      <div className="flex-1 min-w-0">
        <Label className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500">
          Landing page
        </Label>
        <Select value={lpId} onValueChange={onLpChange}>
          <SelectTrigger
            className="mt-2 bg-white border-zinc-200 h-10"
            data-testid="insights-lp-select"
          >
            <SelectValue placeholder="All landing pages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="insights-lp-all">
              All landing pages
            </SelectItem>
            {pages.map((p) => (
              <SelectItem
                key={p.id}
                value={p.id}
                data-testid={`insights-lp-${p.id}`}
              >
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500">
          Date range
        </Label>
        <div className="mt-2">
          <DateRangePicker value={range} onChange={onRangeChange} />
        </div>
      </div>
      {extra}
    </section>
  );
}
