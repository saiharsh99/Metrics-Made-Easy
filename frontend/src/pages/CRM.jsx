import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lock, Database, ArrowRight } from "@phosphor-icons/react";

const PLANNED = [
  {
    name: "HubSpot",
    description:
      "Pull contacts, deal stages, deal value and lifecycle changes for end-to-end attribution.",
  },
  {
    name: "Salesforce",
    description:
      "Sync leads, opportunities and pipeline value back to landing-page sources.",
  },
  {
    name: "Pipedrive",
    description: "Map deals and revenue to the originating LP + ad campaign.",
  },
  {
    name: "Custom CRM",
    description:
      "Webhook ingestion for any internal CRM — push lead/deal events to /api/crm/events.",
  },
];

export default function CRMPlaceholder() {
  return (
    <div className="space-y-8" data-testid="crm-page">
      <div>
        <div className="text-[10px] uppercase tracking-[0.28em] font-bold text-zinc-500 mb-2 flex items-center gap-2">
          <Database size={14} weight="duotone" /> CRM data
        </div>
        <h1 className="display-font font-black text-4xl md:text-5xl tracking-tighter">
          Close the loop with your CRM
        </h1>
        <p className="mt-3 text-sm text-zinc-600 max-w-2xl">
          Once leads and deals from your CRM are connected, every other
          dashboard in Lens — landing pages, ad campaigns, organic queries —
          gets a real revenue attribution column. Coming up next.
        </p>
      </div>

      <section
        className="bg-white border border-zinc-200 rounded-lg p-6 flex items-start gap-4"
        data-testid="crm-coming-soon"
      >
        <div className="w-10 h-10 bg-zinc-950 text-white flex items-center justify-center rounded-md shrink-0">
          <Lock size={18} weight="duotone" />
        </div>
        <div>
          <div className="display-font font-bold text-lg mb-1">
            CRM integrations are scheduled for the next release
          </div>
          <p className="text-sm text-zinc-600 max-w-2xl">
            We're shipping in waves: ad platforms first, organic next, CRM last
            — because CRM data is most valuable once you can already see traffic
            and ad context. If you want to skip the queue, drop us a note in
            Settings and we'll prioritise the integration you need most.
          </p>
        </div>
      </section>

      <section data-testid="crm-planned">
        <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-zinc-500 mb-3">
          Planned integrations
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PLANNED.map((p) => (
            <div
              key={p.name}
              className="bg-white border border-zinc-200 rounded-lg p-5"
            >
              <div className="display-font font-bold text-lg mb-1">{p.name}</div>
              <p className="text-sm text-zinc-600">{p.description}</p>
            </div>
          ))}
        </div>
      </section>

      <Button
        asChild
        variant="outline"
        className="border-zinc-200 hover:bg-zinc-100"
        data-testid="crm-back-to-dashboard"
      >
        <Link to="/">
          Back to overview <ArrowRight size={14} className="ml-1" />
        </Link>
      </Button>
    </div>
  );
}
