// FILE: src/pages/compatibility.tsx
// Universal Compatibility Finder landing page (any vehicle)

import { FormEvent, useState } from "react";

type LeadPayload = {
  year: string;
  make: string;
  model: string;
  trim: string;
  upgrade: string;
  email: string;
};
function estimateValueForUpgrade(upgrade: string): number {
  const map: Record<string, number> = {
    Exhaust: 60,        // high-margin category
    Wheels: 50,
    "Leveling Kit": 40,
    Suspension: 50,
    Tuning: 35,
    Brakes: 25,
    Lighting: 40,
  };

  // Default if we don't recognize the upgrade:
  return map[upgrade] ?? 20;
}


export default function CompatibilityPage() {
  const [submitting, setSubmitting] = useState(false);

const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  const form = e.currentTarget;  // <-- guaranteed non-null now

  const fd = new FormData(form);

  const payload: LeadPayload = {
    year: String(fd.get("year") || "").trim(),
    make: String(fd.get("make") || "").trim(),
    model: String(fd.get("model") || "").trim(),
    trim: String(fd.get("trim") || "").trim(),
    upgrade: String(fd.get("upgrade") || "").trim(),
    email: String(fd.get("email") || "").trim(),
  };

  const { year, make, model, trim, upgrade, email } = payload;

  if (!year || !make || !model || !trim || !upgrade || !/.+@.+\..+/.test(email)) {
    alert("Please complete all fields with a valid email.");
    return;
  }

  // GA4 event (updated variable name)
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", "generate_lead", {
      form_type: "compatibility_check",
      currency: "USD",
      lead_value: estimateValueForUpgrade(upgrade),  // <--- IMPORTANT
      vehicle_year: year,
      vehicle_make: make,
      vehicle_model: model,
      vehicle_trim: trim,
      upgrade_type: upgrade,
    });
  }

  setSubmitting(true);

  try {
    const res = await fetch("/api/compatibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error("Server returned non-200", res.status);
      alert("Your request was submitted, but the server returned an error.");
      setSubmitting(false);
      return;
    }

    alert("Thanks! Check your inbox for your compatibility results.");

    form.reset();      // <--- now always valid
  } catch (err) {
    console.error(err);
    alert("Network error, but your data was still received.");
  } finally {
    setSubmitting(false);
  }
};


  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <section className="mx-auto max-w-6xl px-6 py-12">
        {/* Hero */}
        <header className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.25em] text-indigo-300">
            AutoGradeHQ · Compatibility Finder
          </p>
          <h1 className="mt-3 text-4xl md:text-5xl font-black tracking-tight">
            Find the <span className="text-indigo-400">Right Upgrade</span> for
            Your Vehicle the First Time
          </h1>
          <p className="mt-4 text-neutral-300">
            Stop guessing fitment. Enter your vehicle details and the upgrade
            you&apos;re considering, and we&apos;ll check it against verified
            data so you avoid returns, wasted time, and bad fits.
          </p>
        </header>

        {/* Form + cards */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)] gap-10 items-start">
          {/* Form */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
            <h2 className="text-lg font-semibold">Check compatibility</h2>
            <p className="mt-1 text-sm text-neutral-400">
              We&apos;ll send your personalized recommendations to your inbox.
            </p>

            <form
              className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4"
              onSubmit={handleSubmit}
            >
              <div>
                <label className="block text-sm mb-1" htmlFor="year">
                  Year
                </label>
                <input
                  id="year"
                  name="year"
                  type="number"
                  min={1990}
                  max={2035}
                  placeholder="2020"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm mb-1" htmlFor="make">
                  Make
                </label>
                <input
                  id="make"
                  name="make"
                  placeholder="Ford, Toyota, BMW..."
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm mb-1" htmlFor="model">
                  Model
                </label>
                <input
                  id="model"
                  name="model"
                  placeholder="F-150, Civic, 3 Series..."
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm mb-1" htmlFor="trim">
                  Trim / Engine
                </label>
                <input
                  id="trim"
                  name="trim"
                  placeholder="Lariat 3.5L EcoBoost, EX-L, M340i..."
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm mb-1" htmlFor="upgrade">
                  Upgrade Type
                </label>
                <select
                  id="upgrade"
                  name="upgrade"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
                >
                  <option value="">Select upgrade</option>
                  <option>Exhaust</option>
                  <option>Wheels</option>
                  <option>Leveling Kit</option>
                  <option>Suspension</option>
                  <option>Tuning</option>
                  <option>Brakes</option>
                  <option>Lighting</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
                />
              </div>

              <div className="sm:col-span-2 mt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-60"
                >
                  {submitting
                    ? "Submitting..."
                    : "Show Me Compatible Upgrades"}
                </button>
                <p className="mt-2 text-xs text-neutral-500">
                  By continuing you agree to receive your results via email. We
                  never sell your data.
                </p>
              </div>
            </form>
          </div>

          {/* Featured upgrades / affiliate-ready cards */}
          <aside className="space-y-4">
            <h3 className="text-sm font-semibold text-neutral-200">
              Popular upgrades we can help verify
            </h3>
            <p className="text-xs text-neutral-400">
              These are example categories. Swap links for your affiliate
              partners when you&apos;re ready.
            </p>

            <div className="grid grid-cols-1 gap-4">
              {[
                {
                  title: "Cat-back Exhaust Systems",
                  cat: "Exhaust",
                  price: 899,
                  img: "https://images.unsplash.com/photo-1581092334718-fbb62a1dfe2d?q=80&w=800&auto=format&fit=crop",
                },
                {
                  title: "Flow-Formed Wheel Sets",
                  cat: "Wheels",
                  price: 1200,
                  img: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop",
                },
                {
                  title: "Leveling Kits & Suspension Upgrades",
                  cat: "Leveling Kit",
                  price: 450,
                  img: "https://images.unsplash.com/photo-1594500734038-6b89b6a33b6a?q=80&w=800&auto=format&fit=crop",
                },
                {
                  title: "ECU Tunes & Programmers",
                  cat: "Tuning",
                  price: 499,
                  img: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?q=80&w=800&auto=format&fit=crop",
                },
              ].map((p) => (
                <a
                  key={p.title}
                  href="#"
                  onClick={() => {
                    if (typeof window !== "undefined" && (window as any).gtag) {
                      (window as any).gtag("event", "affiliate_click", {
                        product_category: p.cat,
                        label: "featured",
                        currency: "USD",
                        value: p.price,
                      });
                    }
                  }}
                  className="group rounded-2xl border border-neutral-800 bg-neutral-900/40 p-3 hover:bg-neutral-900"
                >
                  <img
                    src={p.img}
                    alt={p.title}
                    className="h-32 w-full rounded-xl object-cover"
                  />
                  <div className="mt-2 text-xs text-neutral-400">{p.cat}</div>
                  <div className="text-sm font-semibold text-neutral-50">
                    {p.title}
                  </div>
                  <div className="mt-1 text-xs text-neutral-400">
                    Est. ${p.price}
                  </div>
                </a>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
