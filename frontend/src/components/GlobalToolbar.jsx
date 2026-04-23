import { useLocation } from "react-router-dom";
import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import DateRangePicker from "@/components/DateRangePicker";
import { ArrowClockwise, Funnel } from "@phosphor-icons/react";
import { toast } from "sonner";

// Routes where the toolbar should appear + which controls are relevant.
const ROUTE_CONFIG = {
  "/": { lp: false, range: true },
  "/sources": { lp: true, range: true },
  "/audience": { lp: true, range: true },
  "/locations": { lp: true, range: true },
  "/clarity": { lp: true, range: true },
};

function routeConfig(pathname) {
  if (ROUTE_CONFIG[pathname]) return ROUTE_CONFIG[pathname];
  return null;
}

export default function GlobalToolbar() {
  const location = useLocation();
  const cfg = routeConfig(location.pathname);
  const { lpId, setLpId, range, setRange, refresh, pages } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  if (!cfg) return null;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh(true);
      toast.success("Data refreshed");
    } catch {
      toast.error("Refresh failed");
    } finally {
      setTimeout(() => setRefreshing(false), 400);
    }
  };

  return (
    <div
      className="bg-white border-b border-zinc-200 sticky top-16 z-40"
      data-testid="global-toolbar"
    >
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12 py-3 flex flex-wrap items-end gap-4">
        {cfg.lp && (
          <div className="flex-1 min-w-[220px] max-w-sm">
            <Label className="text-[9px] uppercase tracking-[0.22em] font-bold text-zinc-500 flex items-center gap-1.5">
              <Funnel size={10} weight="duotone" />
              Landing page
            </Label>
            <Select value={lpId} onValueChange={setLpId}>
              <SelectTrigger
                className="mt-1 bg-white border-zinc-200 h-9"
                data-testid="global-lp-select"
              >
                <SelectValue placeholder="All landing pages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="global-lp-all">
                  All landing pages
                </SelectItem>
                {pages.map((p) => (
                  <SelectItem
                    key={p.id}
                    value={p.id}
                    data-testid={`global-lp-${p.id}`}
                  >
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {cfg.range && (
          <div>
            <Label className="text-[9px] uppercase tracking-[0.22em] font-bold text-zinc-500 block mb-1">
              Date range
            </Label>
            <DateRangePicker value={range} onChange={setRange} />
          </div>
        )}
        <div className="flex-1" />
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className="border-zinc-200 hover:bg-zinc-100 h-9"
          data-testid="global-refresh"
        >
          <ArrowClockwise
            size={14}
            className={`mr-1.5 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </div>
    </div>
  );
}
