"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import {
  ShieldCheck,
  Car,
  Gauge,
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
import { trackEvent } from "@/lib/gtag";

// ---------- Category cards ----------
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

// ---------- Stat ----------
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

// ---------- Affiliate link helper ----------
type AffiliateLinkProps = {
  href: string;
  children: React.ReactNode;
  sku?: string;
  merchant?: string;
};

export function AffiliateLink({
  href,
  children,
  sku,
  merchant,
}: AffiliateLinkProps) {
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

      if (r.ok) {
        // Softer-intent lead from alerts
        trackEvent("generate_lead", {
          form_type: "price_alert",
          value: 40,
          currency: "USD",
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

// ---------- MAIN LANDING ----------
export default function AutoGradeLanding() {
  const [form, setForm] = useState<{
    year: string;
    make: string;
    model: string;
    trim: string;
  }>({
    year: "",
    make: "",
    model: "",
    trim: "",
  });

  const handleChange = (
    k: "year" | "make" | "model" | "trim",
    v: string
  ) => {
    setForm((prev) => ({ ...prev, [k]: v }));
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // High-intent CTA click
    trackEvent("cta_click", {
      cta_name: "hero_get_recommendations",
      page_path: window.location.pathname,
      form_type: "recommendations",
    });

    // Qualified lead with value
    trackEvent("generate_lead", {
      form_id: "vehicle_form",
      form_type: "recommendations",
      page_path: window.location.pathname,
      value: 75,
      currency: "USD",
    });

    alert(
      `Searching upgrades for ${form.year} ${form.make} ${form.model} ${form.trim}`
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* HEADER */}
      <header className="sticky top-0 z-40 backdrop-blur border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-cyan-300" />
            <span className="font-semibold text-lg">AutoGrade</span>
            <Badge className="ml-2 bg-slate-900 text-cyan-300 border-slate-700 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Early access
            </Badge>
          </div>
          <Button
            className="bg-cyan-500 text-slate-900"
            onClick={() => {
              // Header CTA tracking
              trackEvent("cta_click", {
                cta_name: "header_get_recommendations",
                page_path: window.location.pathname,
                form_type: "recommendations",
              });

              const el = document.getElementById("vehicle-form");
              if (el) {
                el.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }
            }}
          >
            Get Recommendations
          </Button>
        </div>
      </header>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-10">
        {/* LEFT: Copy + Stats */}
        <div>
          <h1 className="text-4xl font-bold">
            Data-backed upgrade picks for{" "}
            <span className="text-cyan-300">your exact vehicle</span>
          </h1>
          <p className="mt-4 text-slate-300">
            AutoGrade analyzes fitment confidence, return risk, and real-world
            performance so you only buy parts that fit, last, and actually
            improve your drive.
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Built for online retailers, marketplaces, and serious DIY
            enthusiasts.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-6">
            <Stat label="Fitment Confidence" value="98%" sub="Top picks" />
            <Stat
              label="Return Risk"
              value="Low"
              sub="Based on real velocities"
            />
            <Stat
              label="Time to Decision"
              value="< 3 min"
              sub="AutoGrade Score™"
            />
          </div>
        </div>

        {/* RIGHT: Vehicle Form */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="text-cyan-300" /> Your Vehicle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              id="vehicle-form"
              onSubmit={onSubmit}
              className="grid grid-cols-2 gap-3"
            >
              <Input
                placeholder="Year (e.g. 2020)"
                onChange={(e) => handleChange("year", e.target.value)}
              />
              <Input
                placeholder="Make (e.g. Toyota)"
                onChange={(e) => handleChange("make", e.target.value)}
              />
              <Input
                placeholder="Model (e.g. Camry)"
                className="col-span-2"
                onChange={(e) => handleChange("model", e.target.value)}
              />
              <Input
                placeholder="Trim (optional)"
                className="col-span-2"
                onChange={(e) => handleChange("trim", e.target.value)}
              />

              <Button
                type="submit"
                className="col-span-2 bg-cyan-500 text-slate-900"
              >
                Get Recommendations <ArrowRight className="ml-1" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      {/* CATEGORIES / DISCOVERY */}
      <section className="max-w-6xl mx-auto px-4 pb-12 grid gap-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-cyan-300" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Live & Upcoming Coverage
          </h2>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Card
              key={cat.title}
              className="bg-slate-900/60 border-slate-800 hover:border-cyan-500/60 transition-colors"
            >
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-slate-200">
                  {cat.icon}
                  <span className="font-medium">{cat.title}</span>
                </div>
                <div className="text-xs text-slate-400">{cat.subtitle}</div>
                <div className="mt-2">
                  <Badge className="bg-slate-900/90 text-cyan-300 border-slate-700 text-[10px]">
                    {cat.cta}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* PRICE ALERTS */}
      <section
        id="alerts"
        className="border-t border-slate-800 py-12 bg-slate-950/70"
      >
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-10">
          <div>
            <h3 className="text-2xl font-semibold">
              Never overpay for upgrades again
            </h3>
            <p className="mt-3 text-slate-300">
              Turn on price alerts for the exact parts that fit your vehicle.
              AutoGrade watches real prices so you buy at the right time.
            </p>
            <PriceAlertForm />
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            <span className="text-slate-400 text-sm mb-2">
              Example signal: LED kit price vs. fitment score
            </span>
            <div className="flex-1 flex items-center justify-center text-slate-600 text-xs">
              [Sparkline / chart placeholder]
            </div>
            <p className="mt-3 text-[10px] text-slate-500">
              AutoGrade ingests catalog, return, and review data to score parts
              for your catalog or build.
            </p>
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
