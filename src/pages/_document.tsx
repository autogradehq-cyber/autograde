// src/pages/_document.tsx
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* 
          Explicitly disable favicon requests.
          This prevents the browser from requesting /favicon.ico
          and eliminates the 404 console error.
        */}
        <link rel="icon" href="data:," />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
