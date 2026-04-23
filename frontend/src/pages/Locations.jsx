import { useEffect, useMemo, useState } from "react";
import { api, formatNumber } from "@/lib/api";
import InsightsFilters from "@/components/InsightsFilters";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format, subDays } from "date-fns";
import {
  MapPin,
  Globe,
  City,
  MagnifyingGlass,
} from "@phosphor-icons/react";

const defaultRange = () => ({
  from: format(subDays(new Date(), 29), "yyyy-MM-dd"),
  to: format(new Date(), "yyyy-MM-dd"),
});

const FLAG_OFFSET = 127397; // regional indicator offset
const flagForCode = (code) => {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(
    ...code.toUpperCase().split("").map((c) => c.charCodeAt(0) + FLAG_OFFSET)
  );
};

export default function Locations() {
  const [pages, setPages] = useState([]);
  const [lpId, setLpId] = useState("all");
  const [range, setRange] = useState(defaultRange());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/landing-pages").then((r) => setPages(r.data));
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .get("/analytics/locations", {
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
  }, [lpId, range.from, range.to]);

  const filteredCountries = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();
    return data.countries.filter((c) =>
      !q || c.country.toLowerCase().includes(q) || c.countryCode.toLowerCase().includes(q)
    );
  }, [data, search]);

  const maxUsers = Math.max(...(data?.countries || []).map((c) => c.users), 1);

  return (
    <div className="space-y-8" data-testid="locations-page">
      <div>
        <div className="text-[10px] uppercase tracking-[0.28em] font-bold text-zinc-500 mb-2">
          Geography
        </div>
        <h1 className="display-font font-black text-4xl md:text-5xl tracking-tighter">
          Where visitors come from
        </h1>
        <p className="mt-3 text-sm text-zinc-600 max-w-2xl">
          Country and city-level performance. Pair this with Source performance to
          spot geo-channel synergies.
        </p>
      </div>

      <InsightsFilters
        pages={pages}
        lpId={lpId}
        onLpChange={setLpId}
        range={range}
        onRangeChange={setRange}
      />

      {loading && !data && (
        <div className="p-12 text-center text-zinc-500" data-testid="locations-loading">
          Loading location data…
        </div>
      )}

      {data && (
        <>
          <section
            className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
            data-testid="locations-totals"
          >
            <TotalCard
              label="Countries"
              value={data.totals.countries}
              icon={Globe}
              accent="bg-zinc-950"
            />
            <TotalCard
              label="Cities"
              value={data.totals.cities}
              icon={City}
              accent="bg-blue-600"
            />
            <TotalCard
              label="Sessions"
              value={formatNumber(data.totals.sessions)}
              icon={MapPin}
              accent="bg-emerald-600"
            />
            <TotalCard
              label="Conversions"
              value={formatNumber(data.totals.conversions)}
              sub={`${data.totals.conversionRate}% CR`}
              accent="bg-amber-600"
            />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div
              className="lg:col-span-2 bg-white border border-zinc-200 rounded-lg overflow-hidden"
              data-testid="countries-table-card"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-1">
                    Countries
                  </div>
                  <h2 className="display-font font-bold text-xl tracking-tight">
                    Performance by country
                  </h2>
                </div>
                <div className="relative w-56">
                  <MagnifyingGlass
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter country"
                    className="pl-9 h-9"
                    data-testid="country-search"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="countries-table">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-[0.18em] font-semibold text-zinc-500 border-b border-zinc-200 text-left">
                      <th className="px-6 py-3">Country</th>
                      <th className="px-4 py-3 text-right">Users</th>
                      <th className="px-4 py-3 text-right">Sessions</th>
                      <th className="px-4 py-3 text-right">Conv.</th>
                      <th className="px-4 py-3 text-right">CR</th>
                      <th className="px-4 py-3 text-right">Bounce</th>
                      <th className="px-4 py-3">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCountries.slice(0, 20).map((c) => {
                      const pct = (c.users / maxUsers) * 100;
                      return (
                        <tr
                          key={c.countryCode || c.country}
                          className="border-b border-zinc-100 hover:bg-zinc-50"
                          data-testid={`country-${c.countryCode || c.country}`}
                        >
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <span
                                className="text-xl leading-none"
                                aria-hidden
                              >
                                {flagForCode(c.countryCode)}
                              </span>
                              <div>
                                <div className="font-semibold text-zinc-950 text-xs">
                                  {c.country}
                                </div>
                                <div className="mono-font text-[10px] text-zinc-500">
                                  {c.countryCode}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right mono-font">
                            {formatNumber(c.users)}
                          </td>
                          <td className="px-4 py-3 text-right mono-font">
                            {formatNumber(c.sessions)}
                          </td>
                          <td className="px-4 py-3 text-right mono-font">
                            {formatNumber(c.conversions)}
                          </td>
                          <td className="px-4 py-3 text-right mono-font font-semibold text-emerald-700">
                            {c.conversionRate.toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 text-right mono-font">
                            {c.bounceRate.toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 w-48">
                            <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-zinc-950"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredCountries.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-6 py-8 text-center text-zinc-500"
                        >
                          No matches.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div
              className="bg-white border border-zinc-200 rounded-lg p-6"
              data-testid="top-cities-card"
            >
              <div className="mb-4">
                <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 mb-1">
                  Top cities
                </div>
                <h3 className="display-font font-bold text-xl tracking-tight">
                  Biggest metros
                </h3>
              </div>
              <div className="space-y-3">
                {data.cities.slice(0, 12).map((c) => (
                  <div
                    key={`${c.city}-${c.country}`}
                    className="flex items-center gap-3"
                    data-testid={`city-${c.city}`}
                  >
                    <span className="text-xl leading-none" aria-hidden>
                      {flagForCode(c.countryCode)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-zinc-950 text-xs truncate">
                        {c.city}
                      </div>
                      <div className="text-[11px] text-zinc-500 truncate">
                        {c.country}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="mono-font text-xs font-semibold">
                        {formatNumber(c.sessions)}
                      </div>
                      <div className="text-[10px] text-zinc-500">sessions</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section
            className="bg-white border border-zinc-200 rounded-lg p-6"
            data-testid="top-regions-highlight"
          >
            <div className="flex items-center gap-2 mb-4">
              <Badge
                variant="outline"
                className="text-[10px] uppercase tracking-wider border-zinc-200"
              >
                Insights
              </Badge>
              <span className="text-xs text-zinc-500">
                Auto-generated from the selected range
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Insight
                title="Most users"
                country={data.countries[0]}
              />
              <Insight
                title="Best conversion rate"
                country={[...data.countries]
                  .filter((c) => c.sessions > 200)
                  .sort((a, b) => b.conversionRate - a.conversionRate)[0]}
                metric="conversionRate"
              />
              <Insight
                title="Lowest bounce"
                country={[...data.countries]
                  .filter((c) => c.sessions > 200)
                  .sort((a, b) => a.bounceRate - b.bounceRate)[0]}
                metric="bounceRate"
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function TotalCard({ label, value, sub, icon: Icon, accent }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-5 relative overflow-hidden enter-anim">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent}`} />
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500">
          {label}
        </span>
        {Icon && <Icon size={16} weight="duotone" className="text-zinc-400" />}
      </div>
      <div className="display-font font-black text-3xl md:text-4xl tracking-tighter leading-none">
        {typeof value === "number" ? formatNumber(value) : value}
      </div>
      {sub && <div className="mt-2 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

function Insight({ title, country, metric }) {
  if (!country) {
    return (
      <div className="p-4 border border-zinc-200 rounded-md">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mb-1">
          {title}
        </div>
        <div className="text-sm text-zinc-500">No data</div>
      </div>
    );
  }
  const value =
    metric === "conversionRate"
      ? `${country.conversionRate.toFixed(2)}%`
      : metric === "bounceRate"
      ? `${country.bounceRate.toFixed(1)}%`
      : formatNumber(country.users);
  return (
    <div className="p-4 border border-zinc-200 rounded-md" data-testid={`insight-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mb-2">
        {title}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-2xl leading-none">
          {flagForCode(country.countryCode)}
        </span>
        <div className="flex-1">
          <div className="display-font font-bold text-base tracking-tight">
            {country.country}
          </div>
        </div>
        <div className="display-font font-black text-xl tracking-tighter">
          {value}
        </div>
      </div>
    </div>
  );
}
