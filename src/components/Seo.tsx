// src/components/Seo.tsx
import Head from "next/head";

type Props = {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string; // absolute URL preferred
};

export default function Seo({
  title = "AutoGrade — Upgrade with confidence",
  description = "Objective scores for automotive upgrades. Fitment confidence, return risk, and real-world performance.",
  canonical = "https://autogradehq.com",
  image = "https://autogradehq.com/og.jpg",
}: Props) {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />

      {/* Canonical */}
      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Head>
  );
}
