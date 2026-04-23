import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatNumber } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash, ArrowRight, Link as LinkIcon } from "@phosphor-icons/react";

const BLANK = {
  name: "",
  url: "",
  description: "",
  ga_property_id: "",
  ga_path_filter: "",
  clarity_project_id: "",
};

export default function LandingPages() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [submitting, setSubmitting] = useState(false);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const r = await api.get("/landing-pages");
      setPages(r.data);
    } catch (e) {
      toast.error("Failed to load landing pages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.url) {
      toast.error("Name and URL are required");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/landing-pages", form);
      toast.success("Landing page added");
      setOpen(false);
      setForm(BLANK);
      fetchPages();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to create");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this landing page?")) return;
    try {
      await api.delete(`/landing-pages/${id}`);
      toast.success("Deleted");
      fetchPages();
    } catch (e) {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="space-y-8" data-testid="landing-pages-page">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em] font-bold text-zinc-500 mb-2">
            Inventory
          </div>
          <h1 className="display-font font-black text-4xl md:text-5xl tracking-tighter">
            Landing pages
          </h1>
          <p className="mt-3 text-sm text-zinc-600 max-w-2xl">
            Every page you want to monitor. Add a GA path filter so metrics are scoped
            to the right URL, and an optional Clarity project ID for that page.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-zinc-950 hover:bg-zinc-800 text-white"
              data-testid="open-add-lp"
            >
              <Plus size={16} weight="bold" className="mr-2" /> Add landing page
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-white" data-testid="add-lp-dialog">
            <DialogHeader>
              <DialogTitle className="display-font tracking-tight">New landing page</DialogTitle>
              <DialogDescription>
                Connect a page you want Lens to track. You can edit these details later.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field
                id="lp-name"
                label="Name"
                required
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                placeholder="Black Friday 2025 LP"
              />
              <Field
                id="lp-url"
                label="URL"
                required
                value={form.url}
                onChange={(v) => setForm({ ...form, url: v })}
                placeholder="https://acme.com/bf-2025"
              />
              <Field
                id="lp-path"
                label="GA4 path filter"
                value={form.ga_path_filter}
                onChange={(v) => setForm({ ...form, ga_path_filter: v })}
                placeholder="/bf-2025"
                hint="Used as a 'contains' filter on pagePath in the GA4 Data API."
              />
              <Field
                id="lp-clarity"
                label="Clarity project ID (optional)"
                value={form.clarity_project_id}
                onChange={(v) => setForm({ ...form, clarity_project_id: v })}
                placeholder="abc123def"
              />
              <div>
                <Label htmlFor="lp-desc" className="text-xs uppercase tracking-wider font-semibold">
                  Description
                </Label>
                <Textarea
                  id="lp-desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Campaign context, hypothesis, goal…"
                  rows={3}
                  className="mt-1.5"
                  data-testid="lp-desc-input"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  data-testid="cancel-add-lp"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-zinc-950 hover:bg-zinc-800 text-white"
                  data-testid="submit-add-lp"
                >
                  {submitting ? "Adding…" : "Add page"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        {loading && (
          <div className="p-12 text-center text-zinc-500" data-testid="pages-loading">
            Loading…
          </div>
        )}
        {!loading && pages.length === 0 && (
          <div className="p-16 text-center" data-testid="pages-empty">
            <div className="display-font text-2xl font-bold mb-2">No pages yet</div>
            <p className="text-sm text-zinc-500 mb-6">
              Add your first landing page to start tracking performance.
            </p>
            <Button
              onClick={() => setOpen(true)}
              className="bg-zinc-950 hover:bg-zinc-800 text-white"
              data-testid="empty-add-lp"
            >
              <Plus size={16} weight="bold" className="mr-2" /> Add landing page
            </Button>
          </div>
        )}
        {!loading && pages.length > 0 && (
          <ul className="divide-y divide-zinc-100">
            {pages.map((p) => (
              <li
                key={p.id}
                className="px-6 py-4 flex items-center gap-4 hover:bg-zinc-50 transition-colors"
                data-testid={`page-item-${p.id}`}
              >
                <div className="w-10 h-10 bg-zinc-100 border border-zinc-200 flex items-center justify-center rounded-md">
                  <LinkIcon size={18} weight="duotone" className="text-zinc-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="display-font font-bold text-lg leading-tight truncate">
                    {p.name}
                  </div>
                  <div className="text-xs mono-font text-zinc-500 truncate">{p.url}</div>
                  {p.description && (
                    <div className="text-xs text-zinc-500 mt-1 truncate max-w-xl">
                      {p.description}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    asChild
                    variant="outline"
                    className="border-zinc-200 hover:bg-zinc-100"
                    data-testid={`view-page-${p.id}`}
                  >
                    <Link to={`/landing-pages/${p.id}`}>
                      View <ArrowRight size={14} className="ml-1" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(p.id)}
                    className="text-zinc-500 hover:text-rose-600 hover:bg-rose-50"
                    data-testid={`delete-page-${p.id}`}
                  >
                    <Trash size={16} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Field({ id, label, value, onChange, placeholder, hint, required }) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs uppercase tracking-wider font-semibold">
        {label} {required && <span className="text-rose-600">*</span>}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5"
        data-testid={`${id}-input`}
      />
      {hint && <p className="text-[11px] text-zinc-500 mt-1">{hint}</p>}
    </div>
  );
}
