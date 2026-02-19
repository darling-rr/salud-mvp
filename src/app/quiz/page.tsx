"use client";

import dynamic from "next/dynamic";

const CardioMetabolicApp = dynamic(() => import("../CardioMetabolicApp"), {
  ssr: false,
});

export default function QuizPage() {
  return <CardioMetabolicApp />;
}