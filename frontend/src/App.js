import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import LandingPages from "@/pages/LandingPages";
import LandingPageDetail from "@/pages/LandingPageDetail";
import Settings from "@/pages/Settings";
import Compare from "@/pages/Compare";
import Sources from "@/pages/Sources";
import Audience from "@/pages/Audience";
import Locations from "@/pages/Locations";
import Clarity from "@/pages/Clarity";

function App() {
  return (
    <div className="App min-h-screen bg-zinc-50 text-zinc-950" data-testid="app-root">
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/landing-pages" element={<LandingPages />} />
            <Route path="/landing-pages/:id" element={<LandingPageDetail />} />
            <Route path="/sources" element={<Sources />} />
            <Route path="/audience" element={<Audience />} />
            <Route path="/locations" element={<Locations />} />
            <Route path="/clarity" element={<Clarity />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
      <Toaster richColors position="top-right" />
    </div>
  );
}

export default App;
