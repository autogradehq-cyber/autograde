import Script from "next/script";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

// ...inside the component render:
{GA_ID && (
  <>
    <Script
      id="ga4-src"
      strategy="afterInteractive"
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
    />
    <Script id="ga4-init" strategy="afterInteractive">
      {`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${GA_ID}', { send_page_view: true });
        window.gtag = gtag;
      `}
    </Script>
  </>
)}
