
"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Car,
  Gauge,
  ShieldCheck,
  Search,
  Sparkles,
  ArrowRight,
  Flame,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trackEvent } from "@/lib/gtag"; // ✅ import GA helper

// ---------- Category card data ----------
const categories: Array<{
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  icon: ReactNode;
}> = [
  {
    title: "LED Headlights",
    subtitle: "Beam • Thermal • Fitment",
    cta: "Explore H11 & 9005",
    href: "/lighting/headlight-bulbs",
    icon: <Zap className="w-5 h-5" />,
  },
  {
    title: "Dash Cams",
    subtitle: "Parking Mode • Heat • Cloud",
    cta: "Find a reliable cam",
    href: "/dash-cams",
    icon: <Gauge className="w-5 h-5" />,
  },
  {
    title: "OBD-II Scanners",
    subtitle: "ABS • SRS • TPMS • Apps",
    cta: "See best picks",
    href: "/obd2",
    icon: <Search className="w-5 h-5" />,
  },
  {
    title: "Brake Kits (soon)",
    subtitle: "Dust • Noise • Style",
    cta: "Get notified",
    href: "/brakes",
    icon: <Flame className="w-5 h-5" />,
  },
];

// ---------- Small stat card component ----------
type StatProps = {
  label: string;
  value: string | number | ReactNode;
  sub?: string;
};

function Stat({ label, value, sub }: StatProps) {
  return (
    <div className="flex flex-col items-start">
      <div className="text-3xl font-semibold text-cyan-400">{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

// ---------- Affiliate click helper ----------
type AffiliateLinkProps = {
  href: string;
  children: React.ReactNode;
  sku?: string;
  merchant?: string;
};
export function AffiliateLink({ href, children, sku, merchant }: AffiliateLinkProps) {
  const onClick = () => {
    try {
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).dataLayer.push({
        event: "affiliate_click",
        sku,
        merchant,
        href,
        ts: Date.now(),
      });
    } catch {
      // noop
    }
  };

  return (
    <a
      href={href}
      onClick={onClick}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center rounded-xl px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-medium"
    >
      {children}
    </a>
  );
}

// ---------- JSON-LD helper ----------
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// ---------- Price Alerts ----------
type PriceStatus = "idle" | "loading" | "ok" | "error";

export function PriceAlertForm() {
  const [email, setEmail] = useState<string>("");
  const [status, setStatus] = useState<PriceStatus>("idle");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");

    try {
      const r = await fetch("/api/price-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, category: "lighting" }),
      });
      setStatus(r.ok ? "ok" : "error");

      // ✅ track successful lead submission
      if (r.ok) {
        trackEvent("generate_lead", {
          form_id: "price_alert_form",
          page_path: window.location.pathname,
        });
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 flex items-center gap-3">
      <Input
        placeholder="you@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="bg-slate-900 border-slate-800 max-w-sm"
      />
      <Button
        type="submit"
        className="bg-cyan-500 hover:bg-cyan-400 text-slate-900"
        disabled={status === "loading"}
      >
        {status === "loading" ? "Adding…" : "Get Alerts"}
      </Button>
      {status === "ok" && (
        <span className="text-xs text-green-400">Added! Check your inbox.</span>
      )}
      {status === "error" && (
        <span className="text-xs text-red-400">Something went wrong.</span>
      )}
    </form>
  );
}

// ---------- MAIN COMPONENT ----------
export default function AutoGradeLanding() {
  const [form, setForm] = useState<{ year: string; make: string; model: string; trim: string }>({
    year: "",
    make: "",
    model: "",
    trim: "",
  });

  const handleChange = (k: "year" | "make" | "model" | "trim", v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  // ✅ updated onSubmit handler with GA4 tracking
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  // 1️⃣ Fire CTA click event (tracks engagement)
  trackEvent("cta_click", {
    cta_name: "hero_get_recommendations",
    page_path: window.location.pathname,
    form_data: form,
    form_type: "recommendations",
  });

  // 2️⃣ Fire lead event with value (tracks conversions)
  trackEvent("generate_lead", {
    form_id: "vehicle_form",
    form_type: "recommendations",
    page_path: window.location.pathname,
    value: 75, // estimated $75 per high-intent lead
    currency: "USD",
  });

  // 3️⃣ Keep existing user feedback
  alert(
    `Searching upgrades for ${form.year} ${form.make} ${form.model} ${form.trim}`
  );
};


  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* HEADER */}
      <header className="sticky top-0 z-40 backdrop-blur border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-cyan-300" />
            <span className="font-semibold text-lg">AutoGrade</span>
          </div>
          <Button className="bg-cyan-500 text-slate-900">Get Recommendations</Button>
        </div>
      </header>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-10">
        <div>
          <h1 className="text-4xl font-bold">
            Find the right upgrade — <span className="text-cyan-300">the first time</span>
          </h1>
          <p className="mt-4 text-slate-300">
            AutoGrade scores parts using fitment confidence, return risk, and real-world
            performance so you upgrade with confidence.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-6">
            <Stat label="Fitment Confidence" value="98%" sub="top picks" />
            <Stat label="Return Risk" value="Low" sub="based on velocity" />
            <Stat label="Time to Decision" value="< 3 min" sub="AutoGrade Score™" />
          </div>
        </div>

        {/* VEHICLE FORM */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="text-cyan-300" /> Your Vehicle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3">
              <Input placeholder="Year" onChange={(e) => handleChange("year", e.target.value)} />
              <Input placeholder="Make" onChange={(e) => handleChange("make", e.target.value)} />
              <Input
                placeholder="Model"
                className="col-span-2"
                onChange={(e) => handleChange("model", e.target.value)}
              />
              <Input
                placeholder="Trim (optional)"
                className="col-span-2"
                onChange={(e) => handleChange("trim", e.target.value)}
              />

              <Button type="submit" className="col-span-2 bg-cyan-500 text-slate-900">
                Get Recommendations <ArrowRight className="ml-1" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      {/* PRICE ALERTS */}
      <section id="alerts" className="border-t border-slate-800 py-12">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-10">
          <div>
            <h3 className="text-2xl font-semibold">Never Overpay Again</h3>
            <p className="mt-3 text-slate-300">
              Enable price alerts for the exact parts that fit your vehicle.
            </p>
            <PriceAlertForm />
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <span className="text-slate-400 text-sm">[Sparkline Chart Placeholder]</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 py-10 text-center text-slate-500 text-xs">
        © {new Date().getFullYear()} AutoGrade. All rights reserved.
      </footer>
    </div>
  );
}
