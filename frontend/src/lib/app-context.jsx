import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { format, subDays } from "date-fns";
import { api } from "@/lib/api";

const LS_KEY = "lens:filters:v1";

const defaultRange = () => ({
  from: format(subDays(new Date(), 29), "yyyy-MM-dd"),
  to: format(new Date(), "yyyy-MM-dd"),
});

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [lpId, setLpIdState] = useState("all");
  const [range, setRangeState] = useState(defaultRange());
  const [refreshToken, setRefreshToken] = useState(0);
  const [pages, setPages] = useState([]);
  const [pagesLoading, setPagesLoading] = useState(true);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.lpId) setLpIdState(parsed.lpId);
        if (parsed.range?.from && parsed.range?.to) setRangeState(parsed.range);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ lpId, range }));
    } catch {
      /* ignore */
    }
  }, [lpId, range]);

  // Load pages once + when refresh is triggered
  const fetchPages = useCallback(async () => {
    setPagesLoading(true);
    try {
      const r = await api.get("/landing-pages");
      setPages(r.data);
      // If the currently selected LP no longer exists, reset to "all"
      if (lpId !== "all" && !r.data.find((p) => p.id === lpId)) {
        setLpIdState("all");
      }
    } finally {
      setPagesLoading(false);
    }
  }, [lpId]);

  useEffect(() => {
    fetchPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  const refresh = useCallback(async (clearServerCache = true) => {
    if (clearServerCache) {
      try {
        await api.post("/cache/clear");
      } catch {
        /* ignore */
      }
    }
    setRefreshToken((n) => n + 1);
  }, []);

  const setLpId = useCallback((v) => setLpIdState(v || "all"), []);
  const setRange = useCallback((v) => setRangeState(v), []);

  return (
    <AppContext.Provider
      value={{
        lpId,
        setLpId,
        range,
        setRange,
        refresh,
        refreshToken,
        pages,
        pagesLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
