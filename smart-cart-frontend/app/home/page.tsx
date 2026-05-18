"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";

type Tx = {
  id?: number;
  title: string;
  amount: number;
  type: "income" | "expense";
  category: "zorunlu" | "eğlence" | "yatırım";
  created_at?: string;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function safeDate(d: unknown): Date | null {
  if (!d) return null;
  const dt = new Date(d as string);
  if (!Number.isNaN(dt.getTime())) return dt;
  return null;
}

export default function Home() {
  const router = useRouter();

  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token =
    typeof window !== "undefined"
      ? (localStorage.getItem("token") || "")
      : "";

  useEffect(() => {
    if (!token) return;

    void (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("http://127.0.0.1:8000/transactions", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data: unknown = await res.json();
        setTransactions(Array.isArray(data) ? (data as Tx[]) : []);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Veri alınamadı";
        setError(msg);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const t of transactions) {
      if (t.type === "income") income += Number(t.amount || 0);
      else expense += Number(t.amount || 0);
    }

    return {
      income,
      expense,
      savings: income - expense,
      savingsRate: income > 0 ? ((income - expense) / income) * 100 : 0,
    };
  }, [transactions]);

  const chartData = useMemo(() => {
    const map = new Map<string, { day: string; income: number; expense: number }>();

    for (const t of transactions) {
      const dt = safeDate(t.created_at);
      const day = dt
        ? `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`
        : "N/A";

      const cur = map.get(day) || { day, income: 0, expense: 0 };

      if (t.type === "income") cur.income += Number(t.amount || 0);
      else cur.expense += Number(t.amount || 0);

      map.set(day, cur);
    }

    return Array.from(map.values())
      .filter((x) => x.day !== "N/A")
      .sort((a, b) => (a.day < b.day ? -1 : 1));
  }, [transactions]);

  const lineData = useMemo(() => chartData.slice(-14), [chartData]);

  const formatTRY = (v: number) => {
    try {
      return new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
        maximumFractionDigits: 0,
      }).format(v);
    } catch {
      return `${v}₺`;
    }
  };

  return (
    <div style={styles.wrapper}>
      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <div style={styles.brand}>💰 FinPilot AI</div>

        <button onClick={() => router.push("/")} style={styles.navBtn}>
          👤 Kullanıcı
        </button>

        <button onClick={() => router.push("/transactions")} style={styles.navBtn}>
          💸 Harcamalar
        </button>

        <button onClick={() => router.push("/analyze")} style={styles.navBtn}>
          🧠 AI Analiz
        </button>

        {/* ✅ HISTORY EKLENDİ */}
        <button onClick={() => router.push("/history")} style={styles.navBtn}>
          📜 Geçmiş Analizler
        </button>

        <div style={styles.sidebarFooter}>
          {transactions.length} kayıt
        </div>
      </div>

      {/* MAIN */}
      <div style={styles.main}>
        <div style={styles.hero}>
          <div>
            <h1 style={styles.h1}>Dashboard</h1>
            <p style={styles.sub}>
              Gelir ve giderlerini gün bazlı takip edebilirsin.
            </p>
          </div>
        </div>

        {/* SUMMARY */}
        <div style={styles.cardsRow}>
          <div style={{ ...styles.summaryCard, borderColor: "#22c55e" }}>
            <div style={styles.summaryLabel}>Toplam Gelir</div>
            <div style={styles.summaryValue}>{formatTRY(totals.income)}</div>
          </div>

          <div style={{ ...styles.summaryCard, borderColor: "#ef4444" }}>
            <div style={styles.summaryLabel}>Toplam Gider</div>
            <div style={styles.summaryValue}>{formatTRY(totals.expense)}</div>
          </div>

          <div style={{ ...styles.summaryCard, borderColor: "#3b82f6" }}>
            <div style={styles.summaryLabel}>Tasarruf</div>
            <div style={styles.summaryValue}>{formatTRY(totals.savings)}</div>

            <div style={styles.smallText}>
              Oran: {totals.savingsRate.toFixed(1)}%
            </div>
          </div>
        </div>

        {loading && <p style={styles.muted}>Loading...</p>}
        {error && <p style={styles.error}>{error}</p>}

        {/* CHART */}
        {!loading && (
          <div style={styles.chartGrid}>
            <div style={styles.chartCard}>
              <div style={styles.chartTitle}>📊 Günlük Gelir / Gider</div>

              {lineData.length === 0 ? (
                <p style={styles.muted}>Henüz kayıt yok.</p>
              ) : (
                <div style={{ width: "100%", height: 320 }}>
                  <ResponsiveContainer>
                    <LineChart data={lineData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="income" stroke="#22c55e" />
                      <Line type="monotone" dataKey="expense" stroke="#ef4444" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* LATEST */}
            <div style={styles.chartCard}>
              <div style={styles.chartTitle}>🧾 Son Kayıtlar</div>

              {transactions.length === 0 ? (
                <p style={styles.muted}>Henüz kayıt yok.</p>
              ) : (
                <div style={styles.txList}>
                  {transactions.slice(0, 8).map((t) => (
                    <div key={t.id ?? t.title} style={styles.txItem}>
                      <div>
                        <div style={styles.txTitle}>{t.title}</div>
                        <div style={styles.txMeta}>
                          {t.category} • {t.created_at}
                        </div>
                      </div>

                      <div
                        style={{
                          fontWeight: 800,
                          color: t.type === "income" ? "#22c55e" : "#ef4444",
                        }}
                      >
                        {t.type === "income" ? "+" : "-"}
                        {formatTRY(t.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= UI ================= */

const styles: any = {
  wrapper: {
    display: "flex",
    minHeight: "100vh",
    background: "#0b1220",
    color: "white",
    fontFamily: "Arial",
  },
  sidebar: {
    width: 250,
    padding: 20,
    background: "#0f172a",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  brand: {
    fontWeight: 900,
    padding: 10,
    background: "rgba(59,130,246,0.2)",
    borderRadius: 10,
  },
  navBtn: {
    padding: 10,
    borderRadius: 10,
    border: "1px solid #334155",
    background: "transparent",
    color: "white",
    cursor: "pointer",
    textAlign: "left",
  },
  sidebarFooter: {
    marginTop: "auto",
    opacity: 0.7,
    fontSize: 12,
  },
  main: {
    flex: 1,
    padding: 30,
  },
  hero: {
    marginBottom: 20,
  },
  h1: {
    margin: 0,
    fontSize: 28,
  },
  sub: {
    opacity: 0.7,
  },
  cardsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 15,
    marginBottom: 20,
  },
  summaryCard: {
    padding: 15,
    borderRadius: 12,
    border: "1px solid #334155",
  },
  summaryLabel: {
    opacity: 0.7,
    fontSize: 12,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 800,
  },
  smallText: {
    marginTop: 5,
    fontSize: 12,
    opacity: 0.7,
  },
  chartGrid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: 15,
  },
  chartCard: {
    padding: 15,
    borderRadius: 12,
    background: "#111827",
  },
  chartTitle: {
    fontWeight: 800,
    marginBottom: 10,
  },
  txList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  txItem: {
    display: "flex",
    justifyContent: "space-between",
    padding: 10,
    border: "1px solid #334155",
    borderRadius: 10,
  },
  txTitle: {
    fontWeight: 700,
  },
  txMeta: {
    fontSize: 12,
    opacity: 0.6,
  },
  muted: {
    opacity: 0.6,
  },
  error: {
    color: "red",
  },
};