// src/components/Seo.tsx
import Head from "next/head";

type Props = {
  title?: string;
  description?: string;
  url?: string;
  image?: string;
};

export default function Seo({
  title = "AutoGrade — Upgrade with confidence",
  description = "Objective scores for automotive upgrades. Fitment confidence, return risk, and real-world performance.",
  url = "https://autogradehq.com",
  image = "/og.jpg",
}: Props) {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Head>
  );
}
