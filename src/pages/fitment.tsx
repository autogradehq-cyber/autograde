// src/pages/fitment.tsx
import React, { useState, FormEvent } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";

// ---------- GA4 helper ----------
const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window === "undefined") return;
  // @ts-ignore
  if (typeof window.gtag !== "function") return;

  // Force debug mode so it always shows in DebugView
  // @ts-ignore
  window.gtag("event", eventName, {
    ...(params || {}),
    debug_mode: true,
  });
};

// ---------- Types ----------
type UserType = "driver" | "shop";

type FitmentForm = {
  // vehicle
  year: string;
  make: string;
  model: string;
  trim: string;

  // tires / wheels
  stockTire: string; // e.g. 265/65R17
  newTire: string; // e.g. 285/70R17
  wheelWidth: string; // in inches
  wheelOffset: string; // in mm (new wheel offset vs stock)

  // usage
  drivingStyle: string;

  // single UI mode toggle
  userType: UserType;

  // (kept for future; not used in UI in this cleaned version)
  shopName: string;
  techName: string;
  workOrder: string;
  partType: string;
  partNumber: string;
  supplier: string;
};

type FitmentResult = {
  ok: boolean;
  stockDiameterIn?: number;
  newDiameterIn?: number;
  diameterChangePct?: number;
  widthChangeMm?: number;
  speedometerErrorPct?: number;
  rubRiskLabel: string;
  installerNotes: string;
};

const initialForm: FitmentForm = {
  year: "",
  make: "",
  model: "",
  trim: "",

  stockTire: "",
  newTire: "",
  wheelWidth: "",
  wheelOffset: "",

  drivingStyle: "",

  userType: "driver",
  shopName: "",
  techName: "",
  workOrder: "",
  partType: "",
  partNumber: "",
  supplier: "",
};

// ---------- Simple tire math helpers ----------
type TireParse = {
  widthMm: number;
  aspect: number;
  wheelIn: number;
};

function parseTireSize(size: string): TireParse | null {
  const cleaned = size.trim().toUpperCase();
  const m = cleaned.match(/(\d{3})\/(\d{2})R(\d{2})/);
  if (!m) return null;
  const widthMm = parseInt(m[1], 10);
  const aspect = parseInt(m[2], 10);
  const wheelIn = parseInt(m[3], 10);
  if (!widthMm || !aspect || !wheelIn) return null;
  return { widthMm, aspect, wheelIn };
}

function tireDiameterIn(tire: TireParse): number {
  const sidewallMm = (tire.widthMm * tire.aspect) / 100;
  const diaMm = tire.wheelIn * 25.4 + 2 * sidewallMm;
  return diaMm / 25.4;
}

function estimateFitment(
  stockSize: string,
  newSize: string,
  newWheelWidthIn?: number,
  newOffsetMm?: number
): FitmentResult {
  const stock = parseTireSize(stockSize);
  const fresh = parseTireSize(newSize);

  if (!stock || !fresh) {
    return {
      ok: false,
      rubRiskLabel: "Unknown",
      installerNotes:
        "We couldn’t read one of the tire sizes. Please use a format like 265/65R17.",
    };
  }
function estimateConfidence(result: FitmentResult): "High" | "Medium" | "Low" {
  const dia = Math.abs(result.diameterChangePct ?? 0);
  const w = Math.abs(result.widthChangeMm ?? 0);

  // Conservative thresholds (tweak later)
  if (dia <= 2 && w <= 10) return "High";
  if (dia <= 5 && w <= 25) return "Medium";
  return "Low";
}

function confidenceCopy(level: "High" | "Medium" | "Low"): string {
  if (level === "High") return "Typical change range";
  if (level === "Medium") return "Common upgrade range";
  return "Large change — verify carefully";
}

  const stockDia = tireDiameterIn(stock);
  const newDia = tireDiameterIn(fresh);
  const diaDiffPct = ((newDia - stockDia) / stockDia) * 100;

  const widthChangeMm = fresh.widthMm - stock.widthMm;
  const speedErrorPct = ((newDia - stockDia) / stockDia) * 100;

  let rubRiskLabel = "Low";
  let installerNotes =
    "This setup is within a mild change range. Always double-check on-vehicle clearance at full lock and full compression.";

  if (Math.abs(diaDiffPct) > 6 || Math.abs(widthChangeMm) > 30) {
    rubRiskLabel = "High";
    installerNotes =
      "Large overall change. Expect a careful fitment check, possible trimming, and alignment. Pay close attention at full lock and full compression.";
  } else if (Math.abs(diaDiffPct) > 3 || Math.abs(widthChangeMm) > 15) {
    rubRiskLabel = "Medium";
    installerNotes =
      "Noticeable size change. Many vehicles will be fine, but some may need minor trimming or careful offset choice. Check inner clearance and fender contact.";
  }

  if (typeof newOffsetMm === "number" && !Number.isNaN(newOffsetMm)) {
    if (newOffsetMm < 0) {
      installerNotes +=
        " New wheel has more poke (lower offset). Watch outer fender and bumper clearance.";
    } else if (newOffsetMm > 0) {
      installerNotes +=
        " New wheel has more inward tuck (higher offset). Watch inner fender liner and suspension clearance.";
    }
  }

  return {
    ok: true,
    stockDiameterIn: Number(stockDia.toFixed(2)),
    newDiameterIn: Number(newDia.toFixed(2)),
    diameterChangePct: Number(diaDiffPct.toFixed(2)),
    widthChangeMm,
    speedometerErrorPct: Number(speedErrorPct.toFixed(2)),
    rubRiskLabel,
    installerNotes,
  };
}

// ---------- Page component ----------
const FitmentPage: NextPage = () => {
  const [form, setForm] = useState<FitmentForm>(initialForm);
  const [result, setResult] = useState<FitmentResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  // Mechanic lookup state (Shop/Mechanic mode)
  const [partNumber, setPartNumber] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");

  const [lookupStatus, setLookupStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [lookupMessage, setLookupMessage] = useState("");
  const [lookupAffiliateUrl, setLookupAffiliateUrl] = useState<string | null>(
    null
  );
  const [lookupVendor, setLookupVendor] = useState<string | null>(null);
  const [lookupFitmentStatus, setLookupFitmentStatus] = useState<
    "FOUND" | "NO_VEHICLE_MATCH" | null
  >(null);

  const isShopMode = form.userType === "shop";

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  async function runPartLookup() {
    setLookupStatus("idle");
    setLookupMessage("");
    setLookupAffiliateUrl(null);
    setLookupVendor(null);
    setLookupFitmentStatus(null);

    if (!partNumber || !vehicleYear || !vehicleMake || !vehicleModel) {
      setLookupStatus("error");
      setLookupMessage("Enter part number, year, make, and model.");
      return;
    }

    setLookupStatus("loading");

    try {
      const res = await fetch("/api/parts/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partNumber,
          year: vehicleYear,
          make: vehicleMake,
          model: vehicleModel,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Lookup failed");
      }

      const statusSafe =
        data.status === "FOUND" || data.status === "NO_VEHICLE_MATCH"
          ? data.status
          : "FOUND";

      setLookupStatus("success");
      setLookupMessage(data.summary || "");
      setLookupFitmentStatus(statusSafe);
      setLookupAffiliateUrl(data.affiliateUrl ?? null);
      setLookupVendor(data.vendor ?? null);

      trackEvent("mechanic_part_lookup", {
        status: statusSafe,
        year: vehicleYear,
        make: vehicleMake,
        model: vehicleModel,
        part_number: partNumber,
        vendor: data.vendor ?? undefined,
      });
    } catch (err: any) {
      setLookupStatus("error");
      setLookupMessage(err?.message || "Lookup failed");
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Consumer-only submit (check)
    if (isShopMode) return;

    setStatus("idle");
    setMessage("");
    setResult(null);

    if (!form.year || !form.make || !form.model || !form.stockTire || !form.newTire) {
      setStatus("error");
      setMessage(
        "Please enter year, make, model, stock tire size, and new tire size."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const offsetNumber = form.wheelOffset
        ? Number.parseFloat(form.wheelOffset)
        : undefined;
      const widthNumber = form.wheelWidth
        ? Number.parseFloat(form.wheelWidth)
        : undefined;

      const fitment = estimateFitment(
        form.stockTire,
        form.newTire,
        widthNumber,
        offsetNumber
      );
      setResult(fitment);

      trackEvent("fitment_check", {
        user_type: form.userType,
        year: form.year,
        make: form.make,
        model: form.model,
        trim: form.trim || undefined,
        stock_tire: form.stockTire,
        new_tire: form.newTire,
        wheel_width_in: widthNumber,
        wheel_offset_mm: offsetNumber,
        driving_style: form.drivingStyle || undefined,
        rub_risk: fitment.rubRiskLabel,
      });
    } catch (err) {
      console.error("[fitment] error calculating fitment:", err);
      setStatus("error");
      setMessage("Something went wrong running this check. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const vehicleLabel = [form.year, form.make, form.model].filter(Boolean).join(" ");

  return (
    <>
      <Head>
        <title>AutoGradeHQ – Fitment Tool</title>
        <meta
          name="description"
          content="Driver/DIY: compare stock vs new tire setup. Shop/Mechanic: verified part-number fitment lookup."
        />
      </Head>

      <main className="min-h-screen bg-slate-950 text-slate-50">
        <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
          {/* Header */}
          <header className="mb-8">
            <p className="text-xs font-semibold text-cyan-300 mb-2">
              AutoGrade Fitment Tool
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-50 mb-4">
              Quick fitment check — before you order parts.
            </h1>

            {/* Single toggle (the only one) */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-300">
                Who is this tool for?
              </span>
              <div className="inline-flex rounded-full bg-slate-950/80 border border-slate-700 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, userType: "driver" }));
                    // reset mechanic UI state when switching away
                    setLookupStatus("idle");
                    setLookupMessage("");
                    setLookupAffiliateUrl(null);
                    setLookupVendor(null);
                    setLookupFitmentStatus(null);
                  }}
                  className={
                    "px-3 py-1 rounded-full text-[11px] font-semibold transition-colors " +
                    (!isShopMode
                      ? "bg-cyan-500 text-slate-950"
                      : "text-slate-300 hover:text-slate-100")
                  }
                >
                  Driver / DIY
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, userType: "shop" }));
                    // reset consumer result when switching away
                    setResult(null);
                    setStatus("idle");
                    setMessage("");
                  }}
                  className={
                    "px-3 py-1 rounded-full text-[11px] font-semibold transition-colors " +
                    (isShopMode
                      ? "bg-cyan-500 text-slate-950"
                      : "text-slate-300 hover:text-slate-100")
                  }
                >
                  Shop / Mechanic
                </button>
              </div>
            </div>

            <p className="text-sm sm:text-base text-slate-400 max-w-2xl">
              {!isShopMode
                ? "Compare your stock tire size to a new setup and get a rough gauge of diameter change, speedometer error, and rub risk."
                : "Enter a part number and vehicle info to confirm fitment using the AutoGrade verified dataset."}
            </p>
          </header>

          {/* ============================
    SHOP / MECHANIC MODE (COMING SOON)
============================ */}
{isShopMode && (
  <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-sm sm:text-base font-semibold text-slate-50">
          Mechanic Mode: Part number fitment verification
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Coming soon. We’re finishing the consumer upgrade experience first.
          Mechanic Mode will launch as a paid feature with verified notes,
          confidence levels, and shop workflow tools.
        </p>
      </div>

      <span className="shrink-0 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold text-cyan-200">
        Coming soon
      </span>
    </div>

    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
      <p className="text-[11px] text-slate-300 font-semibold mb-2">
        Planned features:
      </p>
      <ul className="text-[11px] text-slate-400 space-y-1 list-disc pl-4">
        <li>Part number lookup against AutoGrade’s verified fitment dataset</li>
        <li>Confidence badges: Verified / Conditional / Unknown</li>
        <li>Mechanic notes (clearance, trimming, alignment, supporting mods)</li>
        <li>Shop workflow: RO logging, technician notes, and history</li>
      </ul>

      <p className="mt-3 text-[11px] text-slate-500">
        For now, use Driver / DIY mode for quick fitment guidance.
      </p>
    </div>
  </section>
)}

          {/* ============================
              DRIVER / DIY MODE
          ============================ */}
          {!isShopMode && (
            <>
            {/* Driver / DIY guidance */}
<div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
  <h2 className="text-sm font-semibold text-slate-100 mb-1">
    Find upgrades that actually fit — before you order.
  </h2>

  <p className="text-xs text-slate-400 max-w-2xl">
    AutoGrade helps everyday drivers compare stock and upgraded setups to
    understand size changes, clearance risk, and common fitment considerations.
    This tool is designed to reduce returns, wasted time, and guesswork when
    choosing parts.
  </p>

  <p className="mt-2 text-[11px] text-slate-500">
    Results are guidance-based and should always be verified against manufacturer
    specifications and on-vehicle clearances.
  </p>
</div>

          <div className="grid gap-8 lg:grid-cols-[3fr,2fr] items-start">
              {/* LEFT: Form */}
              <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Vehicle */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        Year
                      </label>
                      <input
                        name="year"
                        type="text"
                        value={form.year}
                        onChange={handleChange}
                        placeholder="e.g. 2020"
                        className="w-full rounded-md bg-slate-950/80 border border-slate-700 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/70"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        Make
                      </label>
                      <input
                        name="make"
                        type="text"
                        value={form.make}
                        onChange={handleChange}
                        placeholder="e.g. Toyota"
                        className="w-full rounded-md bg-slate-950/80 border border-slate-700 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/70"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        Model
                      </label>
                      <input
                        name="model"
                        type="text"
                        value={form.model}
                        onChange={handleChange}
                        placeholder="e.g. Tacoma"
                        className="w-full rounded-md bg-slate-950/80 border border-slate-700 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/70"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        Trim (optional)
                      </label>
                      <input
                        name="trim"
                        type="text"
                        value={form.trim}
                        onChange={handleChange}
                        placeholder="e.g. TRD Off-Road"
                        className="w-full rounded-md bg-slate-950/80 border border-slate-700 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/70"
                      />
                    </div>
                  </div>

                  {/* Tire sizes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        Stock tire size
                      </label>
                      <input
                        name="stockTire"
                        type="text"
                        value={form.stockTire}
                        onChange={handleChange}
                        placeholder="e.g. 265/65R17"
                        className="w-full rounded-md bg-slate-950/80 border border-slate-700 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/70"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        New tire size
                      </label>
                      <input
                        name="newTire"
                        type="text"
                        value={form.newTire}
                        onChange={handleChange}
                        placeholder="e.g. 285/70R17"
                        className="w-full rounded-md bg-slate-950/80 border border-slate-700 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/70"
                      />
                    </div>
                  </div>

                  {/* Wheel / driving */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        New wheel width (in, optional)
                      </label>
                      <input
                        name="wheelWidth"
                        type="text"
                        value={form.wheelWidth}
                        onChange={handleChange}
                        placeholder="e.g. 8.5"
                        className="w-full rounded-md bg-slate-950/80 border border-slate-700 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/70"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        New wheel offset (mm, optional)
                      </label>
                      <input
                        name="wheelOffset"
                        type="text"
                        value={form.wheelOffset}
                        onChange={handleChange}
                        placeholder="e.g. -10"
                        className="w-full rounded-md bg-slate-950/80 border border-slate-700 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/70"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        Driving style (optional)
                      </label>
                      <input
                        name="drivingStyle"
                        type="text"
                        value={form.drivingStyle}
                        onChange={handleChange}
                        placeholder="e.g. daily + light off-road"
                        className="w-full rounded-md bg-slate-950/80 border border-slate-700 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/70"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center rounded-md bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 hover:bg-cyan-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting
                      ? "Running fitment check…"
                      : "Run fitment check"}
                  </button>

                  {status === "error" && (
                    <p className="text-xs text-red-400">{message}</p>
                  )}

                  <p className="text-[11px] text-slate-500">
                    This tool provides an estimate, not a guarantee. Always check
                    clearances on the vehicle at full lock and full compression
                    before finalizing any install.
                  </p>
                </form>
              </section>

              {/* RIGHT: Result */}
              <section className="space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
                  <h2 className="text-sm sm:text-base font-semibold text-slate-50 mb-1">
                    Fitment summary
                  </h2>
                  <p className="text-xs text-slate-400 mb-3">
                    We’ll compare your stock and new tire sizes and highlight
                    where you might expect issues.
                  </p>

                  {!result && (
                    <p className="text-xs text-slate-500">
                      Enter your vehicle and tire sizes on the left, then run
                      the check to see a quick fitment summary here.
                    </p>
                  )}

                  {result && (
                    <div className="space-y-4">
                      <div className="grid gap-3 text-[11px] sm:grid-cols-3">
                        <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-2">
                          <p className="text-slate-400 mb-0.5">Vehicle</p>
                          <p className="text-slate-50 font-semibold">
                            {vehicleLabel || "Your vehicle"}
                          </p>
                        </div>
                        <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-2">
                          <p className="text-slate-400 mb-0.5">Diameter change</p>
                          <p className="text-slate-50 font-semibold">
                            {result.diameterChangePct != null
                              ? `${result.diameterChangePct.toFixed(2)}%`
                              : "—"}
                          </p>
                        </div>
                        <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-2">
                          <p className="text-slate-400 mb-0.5">Rub risk</p>
                          <p className="text-slate-50 font-semibold">
                            {result.rubRiskLabel}
                          </p>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-300 space-y-1.5">
                        {result.stockDiameterIn != null &&
                          result.newDiameterIn != null && (
                            <p>
                              Approx. stock diameter:{" "}
                              <span className="font-semibold">
                                {result.stockDiameterIn}"{" "}
                              </span>
                              → new diameter:{" "}
                              <span className="font-semibold">
                                {result.newDiameterIn}".
                              </span>
                            </p>
                          )}
                        {result.widthChangeMm != null && (
                          <p>
                            Section width change:{" "}
                            <span className="font-semibold">
                              {result.widthChangeMm > 0 ? "+" : ""}
                              {result.widthChangeMm} mm
                            </span>
                            .
                          </p>
                        )}
                        {result.speedometerErrorPct != null && (
                          <p>
                            Speedometer error estimate:{" "}
                            <span className="font-semibold">
                              {result.speedometerErrorPct.toFixed(2)}%
                            </span>{" "}
                            (if your speedo reads 60 mph, you'd be going roughly{" "}
                            {result.speedometerErrorPct > 0 ? "faster" : "slower"}{" "}
                            than that).
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-300 mb-1">
                          Installer notes
                        </p>
                        <p className="text-xs text-slate-300">
                          {result.installerNotes}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-[11px] text-slate-400 space-y-2">
                  <p className="font-semibold text-slate-200">
                    Next steps with AutoGrade
                  </p>
                  <p>
                    Once you’re comfortable with this setup, you can use the Best
                    Upgrades Planner to see what other upgrades make sense for
                    this vehicle and driving style.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link
                      href="/best-upgrades"
                      className="inline-flex items-center rounded-md border border-cyan-400/70 px-3 py-1.5 font-semibold text-cyan-200 hover:bg-cyan-400/10 transition-colors"
                    >
                      Open Best Upgrades Planner
                    </Link>
                    <Link
                      href="/compatibility"
                      className="inline-flex items-center rounded-md border border-slate-600 px-3 py-1.5 font-semibold text-slate-200 hover:bg-slate-800/80 transition-colors"
                    >
                      Run a full compatibility check
                    </Link>
                  </div>
                </div>
              </section>
            </div>
          </>
          )}
        </div>
      </main>
    </>
  );
};

export default FitmentPage;
