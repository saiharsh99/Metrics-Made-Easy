import { format, subDays } from "date-fns";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarBlank } from "@phosphor-icons/react";

const PRESETS = [
  { id: "7d", label: "Last 7 days", days: 6 },
  { id: "14d", label: "Last 14 days", days: 13 },
  { id: "30d", label: "Last 30 days", days: 29 },
  { id: "90d", label: "Last 90 days", days: 89 },
];

export default function DateRangePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const fromDate = value?.from ? new Date(value.from) : subDays(new Date(), 29);
  const toDate = value?.to ? new Date(value.to) : new Date();

  const setPreset = (days) => {
    const to = new Date();
    const from = subDays(to, days);
    onChange({ from: format(from, "yyyy-MM-dd"), to: format(to, "yyyy-MM-dd") });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-testid="date-range-trigger"
          className="border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-950 font-medium gap-2"
        >
          <CalendarBlank size={16} weight="duotone" />
          <span className="mono-font text-xs">
            {format(fromDate, "MMM d, yyyy")} — {format(toDate, "MMM d, yyyy")}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 bg-white border border-zinc-200 shadow-lg"
        align="end"
        data-testid="date-range-popover"
      >
        <div className="flex">
          <div className="border-r border-zinc-200 p-3 flex flex-col gap-1 w-40">
            <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-500 mb-2 px-2">
              Quick ranges
            </div>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPreset(p.days);
                  setOpen(false);
                }}
                data-testid={`preset-${p.id}`}
                className="text-left px-2 py-1.5 text-sm rounded-md text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div>
            <Calendar
              mode="range"
              selected={{ from: fromDate, to: toDate }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  onChange({
                    from: format(range.from, "yyyy-MM-dd"),
                    to: format(range.to, "yyyy-MM-dd"),
                  });
                }
              }}
              numberOfMonths={2}
              initialFocus
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
