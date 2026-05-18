"use client";

import { useState } from "react";

export default function Page() {
  const [income, setIncome] = useState("");
  const [savings, setSavings] = useState("");
  const [entertainment, setEntertainment] = useState("");

  const [result, setResult] = useState("");

  const handleAnalyze = () => {
    // FAKE AI LOGIC
    const incomeNum = Number(income);

    let risk = "Low";
    let message = "";

    if (Number(entertainment) > 30) {
      risk = "High";
      message =
        "You have high impulse spending tendency. Be careful with emotional purchases.";
    } else if (Number(savings) < 15) {
      risk = "Medium";
      message =
        "Your savings rate is low. You may struggle to reach financial goals.";
    } else {
      risk = "Low";
      message =
        "Good financial balance. You are on track with your goals.";
    }

    setResult(
      `AI Analysis:\nRisk Level: ${risk}\n\n${message}\n\nIncome: ${incomeNum}`
    );
  };

  return (
    <main style={{ padding: 40, color: "black", background: "white", minHeight: "100vh" }}>
      <h1>FinPilot AI</h1>

      <p>Financial Profile Setup</p>

      <input
        placeholder="Monthly income"
        value={income}
        onChange={(e) => setIncome(e.target.value)}
        style={{ display: "block", margin: 10 }}
      />

      <input
        placeholder="Savings goal %"
        value={savings}
        onChange={(e) => setSavings(e.target.value)}
        style={{ display: "block", margin: 10 }}
      />

      <input
        placeholder="Entertainment budget %"
        value={entertainment}
        onChange={(e) => setEntertainment(e.target.value)}
        style={{ display: "block", margin: 10 }}
      />

      <button onClick={handleAnalyze} style={{ marginTop: 10 }}>
        Analyze
      </button>

      <pre style={{ marginTop: 20, background: "#eee", padding: 10 }}>
        {result}
      </pre>
    </main>
  );
}