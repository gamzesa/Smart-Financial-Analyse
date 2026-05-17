"use client";

import { useEffect, useMemo, useState } from "react";

type Transaction = {
  id?: number;
  title: string;
  amount: number;
  type: "income" | "expense";
  category: "zorunlu" | "eğlence" | "yatırım";
  created_at?: string;
};

async function authFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(typeof options.headers === "object" && options.headers
      ? (options.headers as Record<string, string>)
      : {}),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res.json();
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export default function Transactions() {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState<"zorunlu" | "eğlence" | "yatırım">(
    "zorunlu"
  );
  const [txDate, setTxDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  });

  // filtre: Gün/Ay/Yıl seçimi
  const [scope, setScope] = useState<"day" | "month" | "year">("day");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  });

  const [selectedYear, setSelectedYear] = useState<string>(() => String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState<string>(() => String(new Date().getMonth() + 1)); // 1-12

  const [list, setList] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scopeLabel = useMemo(() => {
    if (scope === "day") return `Gün: ${selectedDate}`;
    if (scope === "month") return `Ay: ${selectedYear}-${pad2(Number(selectedMonth))}`;
    return `Yıl: ${selectedYear}`;
  }, [scope, selectedDate, selectedMonth, selectedYear]);

  const loadTransactions = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const params = new URLSearchParams();
      if (scope === "day") {
        params.set("date", selectedDate);
      } else if (scope === "month") {
        params.set("year", selectedYear);
        params.set("month", selectedMonth);
      } else {
        params.set("year", selectedYear);
      }

      const query = params.toString();
      const url = `http://127.0.0.1:8000/transactions?${query}`;
      const data = await authFetch(url);

      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err.message || "Veri alınamadı");
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  // başlangıç yükle
  useEffect(() => {
    void (async () => {
      await loadTransactions();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // filtre değişince yeniden yükle
  useEffect(() => {
    void (async () => {
      await loadTransactions();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, selectedDate, selectedYear, selectedMonth]);

  const addTransaction = async () => {
    if (!title || !amount) return;

    try {
      setError(null);
      setLoading(true);

      const res = await authFetch(
        "http://127.0.0.1:8000/transactions",
        {
          method: "POST",
          body: JSON.stringify({
            title,
            amount: Number(amount),
            type,
            category,
            date: txDate, // seçilen tarih
          }),
        }
      );

      await res;

      // tabloyu yeniden getir
      await loadTransactions();

      setTitle("");
      setAmount("");
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err.message || "İşlem eklenemedi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>💸 Gelir & Gider Yönetimi</h2>
          <div style={{ opacity: 0.7, fontSize: 12, textAlign: "right" }}>{scopeLabel}</div>
        </div>

        <p style={{ opacity: 0.6, marginTop: 6 }}>
          Takvimden gün/ay/yıl seç → o dönemin kayıtlarını gör. Ekleme işlemi de seçtiğin tarihe kaydolur.
        </p>

        {/* FILTER */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>🗓️ Görüntüleme</div>

          <div style={styles.grid2}>
<select
              value={scope}
              onChange={(e) => setScope(e.target.value as "day" | "month" | "year")}
              style={styles.input}
            >
              <option value="day">Gün</option>
              <option value="month">Ay</option>
              <option value="year">Yıl</option>
            </select>

            {scope === "day" ? (
              <input
                style={styles.input}
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            ) : scope === "month" ? (
              <>
                <input
                  style={styles.input}
                  type="number"
                  placeholder="Yıl"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                />
                <input
                  style={styles.input}
                  type="number"
                  min={1}
                  max={12}
                  placeholder="Ay (1-12)"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </>
            ) : (
              <input
                style={styles.input}
                type="number"
                placeholder="Yıl"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              />
            )}
          </div>

          <button onClick={loadTransactions} style={{ ...styles.button, marginTop: 10 }} disabled={loading}>
            {loading ? "Yükleniyor..." : "Yenile"}
          </button>
        </div>

        {/* ADD */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>➕ Kayıt Ekle</div>

          <div style={styles.grid2}>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "income" | "expense")}
              style={styles.input}
            >
              <option value="expense">🔴 Gider</option>
              <option value="income">🟢 Gelir</option>
            </select>

            <input style={styles.input} type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} />
          </div>

          <input
            placeholder="Açıklama (örn: market, maaş, kira)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={styles.input}
          />

          <input
            placeholder="Tutar"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={styles.input}
          />

<select
            value={category}
            onChange={(e) => setCategory(e.target.value as "zorunlu" | "eğlence" | "yatırım")}
            style={styles.input}
          >
            <option value="zorunlu">🏠 Zorunlu</option>
            <option value="eğlence">🎮 Eğlence</option>
            <option value="yatırım">📈 Yatırım</option>
          </select>

          <button onClick={addTransaction} style={styles.button} disabled={loading}>
            ➕ Ekle
          </button>
        </div>

        {/* LIST */}
        <div style={{ marginTop: 18 }}>
          <h3>📋 Kayıtlar</h3>

          {error && <div style={styles.error}>{error}</div>}
          {!loading && list.length === 0 && <p style={{ opacity: 0.5 }}>Bu dönemde kayıt yok</p>}

          {list.map((item) => (
            <div key={item.id ?? `${item.title}-${item.created_at}-${item.amount}`} style={styles.item}>
              <div>
                <b>{item.title}</b>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {item.category} {item.created_at ? `• ${item.created_at}` : ""}
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    color: item.type === "income" ? "#22c55e" : "#ef4444",
                    fontWeight: "bold",
                  }}
                >
                  {item.type === "income" ? "+" : "-"}
                  {item.amount}₺
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0f172a",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    color: "white",
    fontFamily: "Arial",
    padding: 20,
  },

  card: {
    width: "560px",
    padding: 20,
    background: "#111827",
    borderRadius: 14,
  },

  section: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    background: "#0b1220",
    border: "1px solid #1f2a44",
  },

  sectionTitle: {
    marginBottom: 10,
    fontWeight: 800,
    opacity: 0.95,
    fontSize: 13,
  },

  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },

  input: {
    width: "100%",
    padding: "10px",
    margin: "6px 0",
    background: "#0b1220",
    border: "1px solid #334155",
    color: "white",
    borderRadius: 8,
  },

  button: {
    width: "100%",
    padding: "10px",
    marginTop: 10,
    background: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },

  item: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "12px 12px",
    background: "rgba(2,6,23,0.35)",
    borderRadius: 14,
    marginTop: 10,
    border: "1px solid rgba(148,163,184,0.16)",
    boxShadow: "0 10px 22px rgba(0,0,0,0.22)",
    alignItems: "center",
  },


  error: {
    margin: "10px 0",
    padding: 10,
    borderRadius: 10,
    background: "rgba(248,113,113,0.14)",
    border: "1px solid rgba(248,113,113,0.35)",
    color: "#fecaca",
    fontSize: 13,
  },
};

