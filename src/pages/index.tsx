
// src/pages/index.tsx
import React from "react";
import Head from "next/head";
import AutoGradeLanding from "../components/AutoGradeLanding";

const HomePage: React.FC = () => {
  return (
    <>
      <Head>
        <title>AutoGradeHQ</title>

        {/* FlexOffers Verification */}
        <meta
          name="fo-verify"
          content="a511f696-e620-46fc-a3de-c2969492ea51"
        />
      </Head>

      {/* Main Landing Page */}
      <AutoGradeLanding />
{/* Sovrn Verification Link (TEMPORARILY visible so you can click it) */}
<a
  href="https://sovrn.co/1ecj8lv"
  style={{
    display: "inline-block",
    fontSize: "10px",
    color: "#64748b",
    marginTop: "12px",
  }}
>
  Sovrn verification link (temporary)
</a>

    </>
  );
};

export default HomePage;
