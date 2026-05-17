"use client";

import { useEffect, useState } from "react";

type Analysis = {
  id: number;
  risk_level: string;
  summary: string;
  stocks: number;
  gold: number;
  crypto: number;
  cash: number;
  income: number;
  savings: number;
  essentials: number;
  entertainment: number;
  transcript?: string;
};

export default function HistoryPage() {
  const [data, setData] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/analyses", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div style={{ padding: 20 }}>Yükleniyor...</div>;

  return (
    <div style={styles.page}>
      <h1>📊 Geçmiş AI Analizleri</h1>

      <div style={styles.grid}>
        {data.map((item) => (
          <div key={item.id} style={styles.card}>
            <h3>Risk: {item.risk_level}</h3>

            <p style={{ marginTop: 10 }}>{item.summary}</p>

            <div style={styles.row}>
              <span>📈 Hisse: {item.stocks}%</span>
              <span>🥇 Altın: {item.gold}%</span>
              <span>🪙 Kripto: {item.crypto}%</span>
              <span>💵 Nakit: {item.cash}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: any = {
  page: {
    padding: 30,
    background: "#0b1220",
    minHeight: "100vh",
    color: "white",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 20,
    marginTop: 20,
  },
  card: {
    background: "#111827",
    padding: 20,
    borderRadius: 12,
    border: "1px solid #334155",
  },
  row: {
    display: "flex",
    gap: 10,
    marginTop: 10,
    flexWrap: "wrap",
    fontSize: 13,
    opacity: 0.8,
  },
};