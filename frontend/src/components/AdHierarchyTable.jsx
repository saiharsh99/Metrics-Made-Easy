import { useMemo, useState } from "react";
import { formatNumber } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  MagnifyingGlass,
  CaretRight,
  X,
} from "@phosphor-icons/react";

const CURRENCY = (v) => `₹${formatNumber(v)}`;

/**
 * 3-level hierarchy: Campaign → (Ad set | Ad group) → Ad.
 * Props:
 *   campaigns, midLevel (adsets|adGroups), ads
 *   midLabel: "Ad sets" | "Ad groups"
 *   midKeyName: "campaignId" (parent ref already on each row)
 *   adParentKey: "adsetId" | "adGroupId"
 *   testIdPrefix: "meta" | "google"
 *   typeAccessor: row => row.objectiveKey OR row.typeKey  (used for badge color/label)
 *   typeColors: { key: hex }
 *   typeLabels: { key: text }
 *   typeFilter: { tab, setTab, options } (top-level filter object)
 *   showLeadsCol: boolean (Meta only)
 */
export default function AdHierarchyTable({
  campaigns,
  midLevel,
  ads,
  midLabel,
  adParentKey,
  testIdPrefix,
  typeAccessor,
  typeColors,
  typeLabels,
  typeFilter,
  showLeadsCol = false,
}) {
  const [level, setLevel] = useState("campaigns");
  const [drill, setDrill] = useState({ campaignId: null, midId: null });
  const [search, setSearch] = useState("");

  // Reset drill when leaving a level
  const goLevel = (next) => {
    setLevel(next);
    if (next === "campaigns") setDrill({ campaignId: null, midId: null });
    else if (next === "mid") setDrill((d) => ({ ...d, midId: null }));
  };

  const drillIntoCampaign = (c) => {
    setDrill({ campaignId: c.id, midId: null });
    setLevel("mid");
  };
  const drillIntoMid = (m) => {
    setDrill((d) => ({ ...d, midId: m.id }));
    setLevel("ads");
  };

  const filteredCampaigns = useMemo(() => {
    let list = campaigns;
    if (typeFilter.tab !== "all")
      list = list.filter((c) => typeAccessor(c) === typeFilter.tab);
    if (search)
      list = list.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [campaigns, typeFilter.tab, search, typeAccessor]);

  const filteredMid = useMemo(() => {
    let list = midLevel;
    if (drill.campaignId) list = list.filter((m) => m.campaignId === drill.campaignId);
    if (typeFilter.tab !== "all")
      list = list.filter((m) => typeAccessor(m) === typeFilter.tab);
    if (search)
      list = list.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [midLevel, drill.campaignId, typeFilter.tab, search, typeAccessor]);

  const filteredAds = useMemo(() => {
    let list = ads;
    if (drill.campaignId) list = list.filter((a) => a.campaignId === drill.campaignId);
    if (drill.midId) list = list.filter((a) => a[adParentKey] === drill.midId);
    if (typeFilter.tab !== "all")
      list = list.filter((a) => typeAccessor(a) === typeFilter.tab);
    if (search)
      list = list.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [ads, drill, typeFilter.tab, search, typeAccessor, adParentKey]);

  // Lookups for breadcrumb labels
  const campaignName = useMemo(
    () => campaigns.find((c) => c.id === drill.campaignId)?.name,
    [campaigns, drill.campaignId]
  );
  const midName = useMemo(
    () => midLevel.find((m) => m.id === drill.midId)?.name,
    [midLevel, drill.midId]
  );

  const rows =
    level === "campaigns"
      ? filteredCampaigns
      : level === "mid"
      ? filteredMid
      : filteredAds;

  return (
    <section
      className="bg-white border border-zinc-200 rounded-lg overflow-hidden"
      data-testid={`${testIdPrefix}-campaigns-card`}
    >
      <div className="px-6 py-4 border-b border-zinc-200 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-1">
              Performance hierarchy
            </div>
            <h2 className="display-font font-bold text-xl tracking-tight">
              Drill from campaign down to ad
            </h2>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Tabs value={level} onValueChange={goLevel}>
              <TabsList className="bg-zinc-100 border border-zinc-200">
                <TabsTrigger
                  value="campaigns"
                  data-testid={`${testIdPrefix}-level-campaigns`}
                >
                  Campaigns
                </TabsTrigger>
                <TabsTrigger value="mid" data-testid={`${testIdPrefix}-level-mid`}>
                  {midLabel}
                </TabsTrigger>
                <TabsTrigger value="ads" data-testid={`${testIdPrefix}-level-ads`}>
                  Ads
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={typeFilter.tab} onValueChange={typeFilter.setTab}>
              <TabsList className="bg-zinc-100 border border-zinc-200">
                {typeFilter.options.map((opt) => (
                  <TabsTrigger
                    key={opt.value}
                    value={opt.value}
                    data-testid={`${testIdPrefix}-tab-${opt.value}`}
                  >
                    {opt.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="relative w-56">
              <MagnifyingGlass
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <Input
                placeholder="Filter by name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
                data-testid={`${testIdPrefix}-search`}
              />
            </div>
          </div>
        </div>

        {(drill.campaignId || drill.midId) && (
          <div
            className="flex items-center gap-2 flex-wrap text-xs"
            data-testid={`${testIdPrefix}-breadcrumb`}
          >
            <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-semibold">
              Filtered by:
            </span>
            {drill.campaignId && campaignName && (
              <Crumb
                label="Campaign"
                value={campaignName}
                onClear={() =>
                  setDrill({ campaignId: null, midId: null })
                }
                testId={`${testIdPrefix}-crumb-campaign`}
              />
            )}
            {drill.midId && midName && (
              <Crumb
                label={midLabel.replace(/s$/, "")}
                value={midName}
                onClear={() => setDrill((d) => ({ ...d, midId: null }))}
                testId={`${testIdPrefix}-crumb-mid`}
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] h-6 px-2 text-zinc-500 hover:text-zinc-950"
              onClick={() => {
                setDrill({ campaignId: null, midId: null });
                setLevel("campaigns");
              }}
              data-testid={`${testIdPrefix}-crumb-reset`}
            >
              Reset
            </Button>
          </div>
        )}
      </div>

      <LevelTable
        level={level}
        rows={rows}
        midLabel={midLabel}
        testIdPrefix={testIdPrefix}
        typeAccessor={typeAccessor}
        typeColors={typeColors}
        typeLabels={typeLabels}
        showLeadsCol={showLeadsCol}
        onDrill={(row) => {
          if (level === "campaigns") drillIntoCampaign(row);
          else if (level === "mid") drillIntoMid(row);
        }}
        canDrill={level !== "ads"}
      />
    </section>
  );
}

function Crumb({ label, value, onClear, testId }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 bg-zinc-100 border border-zinc-200 rounded-full px-2.5 py-1"
      data-testid={testId}
    >
      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
        {label}
      </span>
      <span className="font-semibold text-zinc-950 text-[11px]">{value}</span>
      <button
        type="button"
        onClick={onClear}
        className="text-zinc-400 hover:text-zinc-950 ml-1"
        aria-label={`Clear ${label} filter`}
      >
        <X size={11} weight="bold" />
      </button>
    </span>
  );
}

function LevelTable({
  level,
  rows,
  midLabel,
  testIdPrefix,
  typeAccessor,
  typeColors,
  typeLabels,
  showLeadsCol,
  onDrill,
  canDrill,
}) {
  const firstColLabel =
    level === "campaigns" ? "Campaign" : level === "mid" ? midLabel.replace(/s$/, "") : "Ad";
  const parentColLabel = level === "mid" ? "Campaign" : level === "ads" ? midLabel.replace(/s$/, "") : null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.18em] font-semibold text-zinc-500 border-b border-zinc-200 text-left">
            <th className="px-6 py-3">{firstColLabel}</th>
            {parentColLabel && <th className="px-4 py-3">{parentColLabel}</th>}
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Spend</th>
            <th className="px-4 py-3 text-right">Impr.</th>
            <th className="px-4 py-3 text-right">Clicks</th>
            <th className="px-4 py-3 text-right">CTR</th>
            <th className="px-4 py-3 text-right">CPC</th>
            {showLeadsCol && <th className="px-4 py-3 text-right">Leads</th>}
            <th className="px-4 py-3 text-right">Conv.</th>
            <th className="px-4 py-3 text-right">CPA</th>
            <th className="px-4 py-3 text-right">ROAS</th>
            {canDrill && <th className="px-2 py-3" />}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={13}
                className="px-6 py-10 text-center text-zinc-500"
                data-testid={`${testIdPrefix}-${level}-empty`}
              >
                Nothing matches the current filters.
              </td>
            </tr>
          )}
          {rows.map((r) => {
            const typeKey = typeAccessor(r);
            const parent =
              level === "mid"
                ? r.campaignName
                : level === "ads"
                ? r.adsetName || r.adGroupName
                : null;
            return (
              <tr
                key={r.id}
                className={`border-b border-zinc-100 ${
                  canDrill ? "hover:bg-zinc-50 cursor-pointer" : "hover:bg-zinc-50"
                }`}
                onClick={canDrill ? () => onDrill(r) : undefined}
                data-testid={`${testIdPrefix}-row-${level}-${r.id}`}
              >
                <td className="px-6 py-3 font-semibold text-zinc-950 text-xs">
                  {r.name}
                </td>
                {parent !== null && parent !== undefined && (
                  <td className="px-4 py-3 text-[11px] text-zinc-600">
                    {parent}
                  </td>
                )}
                <td className="px-4 py-3 text-xs">
                  <Badge
                    variant="outline"
                    className="text-[10px] border-zinc-200"
                    style={{ color: typeColors[typeKey] || "#09090b" }}
                  >
                    {typeLabels[typeKey] || typeKey}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-[10px]">
                  <span
                    className={`px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold ${
                      r.status === "ACTIVE" || r.status === "ENABLED"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : r.status === "PAUSED"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right mono-font">{CURRENCY(r.spend)}</td>
                <td className="px-4 py-3 text-right mono-font">
                  {formatNumber(r.impressions)}
                </td>
                <td className="px-4 py-3 text-right mono-font">
                  {formatNumber(r.clicks)}
                </td>
                <td className="px-4 py-3 text-right mono-font">{r.ctr}%</td>
                <td className="px-4 py-3 text-right mono-font">₹{r.cpc}</td>
                {showLeadsCol && (
                  <td className="px-4 py-3 text-right mono-font text-emerald-700 font-semibold">
                    {formatNumber(r.leads || 0)}
                  </td>
                )}
                <td className="px-4 py-3 text-right mono-font">
                  {formatNumber(r.conversions || 0)}
                </td>
                <td className="px-4 py-3 text-right mono-font">
                  {r.cpa ? `₹${r.cpa}` : "—"}
                </td>
                <td className="px-4 py-3 text-right mono-font font-semibold text-amber-700">
                  {r.roas ? `${r.roas}×` : "—"}
                </td>
                {canDrill && (
                  <td className="px-2 py-3 text-zinc-400">
                    <CaretRight size={14} />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
