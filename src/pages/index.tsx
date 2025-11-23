// src/pages/index.tsx
import React from "react";
import Head from "next/head";
import AutoGradeLanding from "../components/AutoGradeLanding";

const HomePage: React.FC = () => {
  return (
    <>
      <Head>
        <title>AutoGradeHQ</title>

        {/* FlexOffers verification */}
        <meta
          name="fo-verify"
          content="a511f696-e620-46fc-a3de-c2969492ea51"
        />
      </Head>

      <AutoGradeLanding />
    </>
  );
};

export default HomePage;
