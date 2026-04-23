import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, XCircle, Trash, ShieldCheck, Info } from "@phosphor-icons/react";

export default function Settings() {
  const [status, setStatus] = useState(null);
  const [ga, setGa] = useState({ json: "", property_id: "" });
  const [clarity, setClarity] = useState({ token: "" });
  const [savingGa, setSavingGa] = useState(false);
  const [savingClarity, setSavingClarity] = useState(false);

  const refresh = async () => {
    const r = await api.get("/credentials/status");
    setStatus(r.data);
  };

  useEffect(() => {
    refresh();
  }, []);

  const saveGa = async () => {
    if (!ga.json || !ga.property_id) {
      toast.error("Service account JSON and property ID are required");
      return;
    }
    setSavingGa(true);
    try {
      // Validate JSON
      try {
        JSON.parse(ga.json);
      } catch {
        toast.error("Service account JSON is not valid JSON");
        setSavingGa(false);
        return;
      }
      await api.post("/credentials", {
        provider: "ga4",
        ga_service_account_json: ga.json,
        ga_default_property_id: ga.property_id,
      });
      toast.success("Google Analytics connected");
      setGa({ json: "", property_id: "" });
      refresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save");
    } finally {
      setSavingGa(false);
    }
  };

  const saveClarity = async () => {
    if (!clarity.token) {
      toast.error("Clarity API token is required");
      return;
    }
    setSavingClarity(true);
    try {
      await api.post("/credentials", {
        provider: "clarity",
        clarity_api_token: clarity.token,
      });
      toast.success("Microsoft Clarity connected");
      setClarity({ token: "" });
      refresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save");
    } finally {
      setSavingClarity(false);
    }
  };

  const disconnect = async (provider) => {
    if (!window.confirm(`Disconnect ${provider}?`)) return;
    try {
      await api.delete(`/credentials/${provider}`);
      toast.success("Disconnected");
      refresh();
    } catch (e) {
      toast.error("Failed");
    }
  };

  return (
    <div className="space-y-8" data-testid="settings-page">
      <div>
        <div className="text-[10px] uppercase tracking-[0.28em] font-bold text-zinc-500 mb-2">
          Integrations
        </div>
        <h1 className="display-font font-black text-4xl md:text-5xl tracking-tighter">
          Connect your data
        </h1>
        <p className="mt-3 text-sm text-zinc-600 max-w-2xl">
          Connect Google Analytics and Microsoft Clarity to pull live data.
          Until both are connected, Lens shows realistic demo data so you can
          explore the experience.
        </p>
      </div>

      <div className="bg-white border border-zinc-200 rounded-lg p-5 flex items-start gap-4" data-testid="demo-banner">
        <div className="w-10 h-10 flex items-center justify-center bg-zinc-950 text-white rounded-md shrink-0">
          <ShieldCheck size={20} weight="duotone" />
        </div>
        <div>
          <div className="display-font font-bold text-sm">
            Status: {status?.demo_mode ? "Demo data" : "Live analytics"}
          </div>
          <p className="text-xs text-zinc-600 mt-1">
            Credentials are stored in your own MongoDB. They are never sent to
            third-parties beyond the official GA4 and Clarity APIs.
          </p>
        </div>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* GA4 */}
        <div className="bg-white border border-zinc-200 rounded-lg p-6" data-testid="ga4-settings-card">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500">
                  Google Analytics 4
                </span>
              </div>
              <h2 className="display-font font-bold text-2xl tracking-tight mt-2">
                GA4 Data API
              </h2>
            </div>
            {status?.ga4_connected ? (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1" data-testid="ga4-connected-badge">
                <CheckCircle size={12} weight="fill" /> Connected
              </Badge>
            ) : (
              <Badge className="bg-zinc-100 text-zinc-600 border-zinc-200 gap-1" data-testid="ga4-disconnected-badge">
                <XCircle size={12} weight="fill" /> Not connected
              </Badge>
            )}
          </div>

          {status?.ga4_connected ? (
            <div className="space-y-3">
              <div className="text-sm">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mb-1">
                  Property ID
                </div>
                <div className="mono-font font-semibold">{status.ga4_property_id}</div>
              </div>
              <Button
                variant="outline"
                onClick={() => disconnect("ga4")}
                data-testid="disconnect-ga4"
                className="border-rose-200 text-rose-600 hover:bg-rose-50"
              >
                <Trash size={14} className="mr-1.5" /> Disconnect
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Instructions
                testId="ga4-instructions"
                steps={[
                  "Go to Google Cloud Console → create or select a project.",
                  "Enable the Google Analytics Data API for that project.",
                  "Create a Service Account, download its JSON key.",
                  "In GA4 → Admin → Property Access Management, add the service-account email as a Viewer.",
                  "Find your Property ID: GA4 → Admin → Property Settings.",
                ]}
              />
              <div>
                <Label className="text-xs uppercase tracking-wider font-semibold">
                  Property ID
                </Label>
                <Input
                  value={ga.property_id}
                  onChange={(e) => setGa({ ...ga, property_id: e.target.value })}
                  placeholder="123456789"
                  className="mt-1.5 mono-font"
                  data-testid="ga4-property-id-input"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider font-semibold">
                  Service account JSON
                </Label>
                <Textarea
                  value={ga.json}
                  onChange={(e) => setGa({ ...ga, json: e.target.value })}
                  placeholder='{"type": "service_account", ...}'
                  className="mt-1.5 mono-font text-xs"
                  rows={7}
                  data-testid="ga4-json-input"
                />
              </div>
              <Button
                onClick={saveGa}
                disabled={savingGa}
                className="bg-zinc-950 hover:bg-zinc-800 text-white"
                data-testid="connect-ga4-btn"
              >
                {savingGa ? "Connecting…" : "Connect GA4"}
              </Button>
            </div>
          )}
        </div>

        {/* Clarity */}
        <div className="bg-white border border-zinc-200 rounded-lg p-6" data-testid="clarity-settings-card">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500">
                  Microsoft Clarity
                </span>
              </div>
              <h2 className="display-font font-bold text-2xl tracking-tight mt-2">
                Data Export API
              </h2>
            </div>
            {status?.clarity_connected ? (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1" data-testid="clarity-connected-badge">
                <CheckCircle size={12} weight="fill" /> Connected
              </Badge>
            ) : (
              <Badge className="bg-zinc-100 text-zinc-600 border-zinc-200 gap-1" data-testid="clarity-disconnected-badge">
                <XCircle size={12} weight="fill" /> Not connected
              </Badge>
            )}
          </div>

          {status?.clarity_connected ? (
            <div className="space-y-3">
              <div className="text-sm text-zinc-600">API token saved.</div>
              <Button
                variant="outline"
                onClick={() => disconnect("clarity")}
                data-testid="disconnect-clarity"
                className="border-rose-200 text-rose-600 hover:bg-rose-50"
              >
                <Trash size={14} className="mr-1.5" /> Disconnect
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Instructions
                testId="clarity-instructions"
                steps={[
                  "Open your project in clarity.microsoft.com.",
                  "Go to Settings → Data Export.",
                  "Click “Generate new API token” (4–32 chars, no spaces or special chars).",
                  "Copy the token immediately — it will not be shown again.",
                  "Note: Clarity allows 10 API requests per project per day. Lens caches responses for 2 hours.",
                ]}
              />
              <div>
                <Label className="text-xs uppercase tracking-wider font-semibold">
                  API token
                </Label>
                <Input
                  type="password"
                  value={clarity.token}
                  onChange={(e) => setClarity({ token: e.target.value })}
                  placeholder="Paste your Clarity API token"
                  className="mt-1.5 mono-font"
                  data-testid="clarity-token-input"
                />
              </div>
              <Button
                onClick={saveClarity}
                disabled={savingClarity}
                className="bg-zinc-950 hover:bg-zinc-800 text-white"
                data-testid="connect-clarity-btn"
              >
                {savingClarity ? "Connecting…" : "Connect Clarity"}
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Instructions({ steps, testId }) {
  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-md p-4" data-testid={testId}>
      <div className="flex items-center gap-2 mb-2">
        <Info size={14} className="text-zinc-500" />
        <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500">
          How to get credentials
        </span>
      </div>
      <ol className="text-xs text-zinc-700 space-y-1.5 list-decimal list-inside leading-relaxed">
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </div>
  );
}
