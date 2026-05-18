"use client";

import { useMemo, useState } from "react";

type Allocation = {
  stocks: number;
  gold: number;
  crypto: number;
  cash: number;
};

type AnalyzeResponse = {
  risk_level: "Düşük" | "Orta" | "Yüksek" | string;
  summary: string;
  recommendations: string[];
  allocation: Allocation;
  follow_up_questions: string[];
};

export default function AnalyzePage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [income, setIncome] = useState<string>("");
  const [savings, setSavings] = useState<string>("");
  const [essentials, setEssentials] = useState<string>("");
  const [entertainment, setEntertainment] = useState<string>("");

  const [goal, setGoal] = useState<string>("");
  const [risk, setRisk] = useState<string>("");

  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<number, string>>({});

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const allocationPairs = useMemo(() => {
    if (!result?.allocation) return [];
    const a = result.allocation;
    return [
      { label: "Hisse", value: a.stocks },
      { label: "Altın", value: a.gold },
      { label: "Kripto", value: a.crypto },
      { label: "Nakit", value: a.cash },
    ];
  }, [result]);

  const analyze = async () => {
    if (!token) return;

    const incomeNum = Number(income);
    const savingsNum = Number(savings);
    const essentialsNum = Number(essentials);
    const entertainmentNum = Number(entertainment);

    if (Number.isNaN(incomeNum) || Number.isNaN(savingsNum) || Number.isNaN(essentialsNum) || Number.isNaN(entertainmentNum)) {
      setError("Lütfen sayısal alanları doğru girin.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/analyze", {
        method: "POST",
        // CORS nedeniyle veya network beklenmedik durumda fetch başarısız olabilir.
        // Detaylı hata için response text’i alıyoruz.
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          income: incomeNum,
          savings: savingsNum,
          essentials: essentialsNum,
          entertainment: entertainmentNum,
          goal,
          risk,
        }),
      });

      const text = await res.text().catch(() => "");
      let data: unknown = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { error: text };
      }

      if (!res.ok) {
        const msg =
          (typeof data === "object" && data && "detail" in data
            ? (data as { detail?: unknown }).detail
            : null) ||
          (typeof data === "object" && data && "error" in data
            ? (data as { error?: unknown }).error
            : null) ||
          text ||
          "Analiz başarısız";
        throw new Error(String(msg));
      }


      if (data && typeof data === "object") setResult(data as AnalyzeResponse);
      else throw new Error("Analiz cevabı boş/format dışı");
      setAnswers({});
      setStep(4);
      return;


      setResult(data);
      setAnswers({});
      setStep(4);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err.message || "Sunucu hatası");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <div style={styles.kicker}>FinPilot AI • Kişisel Finans Asistanı</div>
            <h1 style={styles.title}>AI Finans Analizi</h1>
            <p style={styles.subtitle}>
              Gerçek gelir/gider geçmişine göre risk seviyeni ve yatırım dağılımını çıkarıyoruz.
            </p>
          </div>
        </div>

        <div style={styles.card}>
          {/* STEP 1 */}
          {step === 1 && (
            <div style={styles.stepBlock}>
              <h2 style={styles.stepTitle}>1) Aylık gelir</h2>
              <p style={styles.hint}>Gelir bilgini gir. (₺)</p>

              <input
                style={styles.input}
                placeholder="Örn: 60000"
                inputMode="decimal"
                onChange={(e) => setIncome(e.target.value)}
                value={income}
              />

              <button style={styles.primaryBtn} onClick={() => setStep(2)}>
                Devam
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div style={styles.stepBlock}>
              <h2 style={styles.stepTitle}>2) Bütçe dağılımı</h2>
              <p style={styles.hint}>Yüzdeleri gir (örn: 40). Toplam şart değil.</p>

              <div style={styles.grid2}>
                <input
                  style={styles.input}
                  placeholder="Birikim %"
                  inputMode="decimal"
                  onChange={(e) => setSavings(e.target.value)}
                  value={savings}
                />
                <input
                  style={styles.input}
                  placeholder="Zorunlu %"
                  inputMode="decimal"
                  onChange={(e) => setEssentials(e.target.value)}
                  value={essentials}
                />
              </div>

              <div style={styles.grid2}>
                <input
                  style={styles.input}
                  placeholder="Eğlence %"
                  inputMode="decimal"
                  onChange={(e) => setEntertainment(e.target.value)}
                  value={entertainment}
                />
                <input style={styles.input} placeholder="(Boş bırak)" disabled value={""} />
              </div>

              <div style={styles.actionsRow}>
                <button style={styles.secondaryBtn} onClick={() => setStep(1)} disabled={loading}>
                  Geri
                </button>
                <button style={styles.primaryBtn} onClick={() => setStep(3)} disabled={loading}>
                  Devam
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div style={styles.stepBlock}>
              <h2 style={styles.stepTitle}>3) Hedef & risk</h2>
              <p style={styles.hint}>Kısa seçimler yap.</p>

              <div style={styles.grid2}>
                <select style={styles.input} value={goal} onChange={(e) => setGoal(e.target.value)}>
                  <option value="">Hedef</option>
                  <option value="Ev">Ev</option>
                  <option value="Araba">Araba</option>
                  <option value="Eğitim">Eğitim</option>
                  <option value="Emeklilik">Emeklilik</option>
                </select>

                <select style={styles.input} value={risk} onChange={(e) => setRisk(e.target.value)}>
                  <option value="">Risk</option>
                  <option value="Düşük">Düşük</option>
                  <option value="Orta">Orta</option>
                  <option value="Yüksek">Yüksek</option>
                </select>
              </div>

              <div style={styles.actionsRow}>
                <button style={styles.secondaryBtn} onClick={() => setStep(2)} disabled={loading}>
                  Geri
                </button>
                <button style={styles.primaryBtn} onClick={analyze} disabled={loading}>
                  {loading ? "Analiz ediliyor..." : "Analiz Et"}
                </button>
              </div>

              {error && <div style={styles.errorBox}>{error}</div>}
            </div>
          )}

          {/* RESULT */}
          {step === 4 && result && (
            <div>
              <div style={styles.resultTop}>
                <div style={styles.riskPill}>
                  <span style={{ fontWeight: 800 }}>Risk:</span> {result.risk_level}
                </div>

                <button style={styles.secondaryBtn} onClick={() => setStep(3)} disabled={loading}>
                  Yeniden Analiz
                </button>
              </div>

            <div style={styles.summaryBox}>
                <h3 style={styles.sectionTitle}>Kısa Analiz</h3>
                <p style={styles.summaryText}>{result.summary}</p>
              </div>

              <div style={styles.actionsRow}>
                <button
                  style={{
                    ...styles.secondaryBtn,
                    minWidth: 240,
                  }}
                  onClick={() => {
                    // Analiz kaydı zaten backend'de persist ediliyor.
                    // Buton sadece kaydedilmiş analize yönlendirme yapar.
                    try {
                      window.location.href = "/history";
                    } catch {
                      // no-op
                    }
                  }}
                >
                  AI analizlerime ekle
                </button>
              </div>


              <div style={styles.grid2}>
                <div style={styles.sectionBox}>
                  <h3 style={styles.sectionTitle}>Öneriler</h3>
                  <ul style={styles.ul}>
                    {result.recommendations?.map((r, i) => (
                      <li key={i} style={styles.li}>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={styles.sectionBox}>
                  <h3 style={styles.sectionTitle}>Yatırım Dağılımı</h3>
                  <div style={styles.allocList}>
                    {allocationPairs.map((p) => (
                      <div key={p.label} style={styles.allocRow}>
                        <div style={styles.allocLabel}>{p.label}</div>
                        <div style={styles.allocValue}>{p.value}%</div>
                        <div style={styles.bar}>
                          <div style={{ ...styles.barFill, width: `${p.value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={styles.sectionBox}>
                <h3 style={styles.sectionTitle}>Sana Sorular (Cevapla)</h3>
                <p style={styles.hint}>
                  Bu cevaplar bir sonraki adımda daha net öneri üretmek için kullanılacak.
                </p>

                <div style={styles.questions}>
                  {Array.isArray(result.follow_up_questions) &&
                    result.follow_up_questions.map((q, idx) => (
                      <div key={idx} style={styles.questionBlock}>
                        <div style={styles.questionText}>{idx + 1}) {q}</div>
                        <input
                          style={styles.input}
                          placeholder="Cevabını yaz"
                          value={answers[idx] || ""}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [idx]: e.target.value }))}
                        />
                      </div>
                    ))}
                </div>

                <button
                  style={styles.primaryBtn}
                  onClick={() => {
                    // Şimdilik UX; backend tarafında follow-up endpoint'i olmadığı için sadece doğrulama yapıyoruz.
                    const total = (result.follow_up_questions || []).length;
                    const ok = Array.from({ length: total }).every(
                      (_, i) => (answers[i] || "").trim().length > 0
                    );
                    if (!ok) {
                      setError("Lütfen tüm sorulara cevap ver.");
                      return;
                    }

                    setError(null);

                    const answersToSend = Array.from({ length: total }).map(
                      (_, i) => (answers[i] || "").trim()
                    );

                    if (!answersToSend.every((a) => a.length > 0)) {
                      setError("Lütfen tüm sorulara cevap ver.");
                      return;
                    }

                    // backend'e follow-up gönder
                    (async () => {
                      try {
                        setLoading(true);
                        setError(null);

                        if (!token) return;
                        const res = await fetch("http://127.0.0.1:8000/analyze/follow-up", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({
                            follow_up_answers: answersToSend,
                            goal,
                            risk,
                            income: Number(income),
                            savings: Number(savings),
                            essentials: Number(essentials),
                            entertainment: Number(entertainment),
                          }),
                        });

                        const data = await res.json();
                        if (!res.ok) {
                          throw new Error(data?.detail || data?.error || "Follow-up başarısız");
                        }
                        setResult(data);
                      } catch (e) {
                        const err = e instanceof Error ? e : new Error(String(e));
                        setError(err.message || "Sunucu hatası");
                      } finally {
                        setLoading(false);
                      }
                    })();
                  }}
                >
                  Cevapları Gönder
                </button>


                {error && <div style={styles.errorBox}>{error}</div>}
              </div>
            </div>
          )}

          {/* empty state */}
          {step === 4 && !result && (
            <div style={styles.errorBox}>Analiz sonucu bulunamadı.</div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(1200px 800px at 20% 10%, rgba(59,130,246,0.25), transparent), #0b1220",
    color: "#e5e7eb",
    padding: 24,
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial",
  },
  container: {
    maxWidth: 980,
    margin: "0 auto",
  },
  header: {
    marginBottom: 18,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 18,
  },
  kicker: {
    opacity: 0.75,
    fontSize: 12,
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    margin: 0,
  },
  subtitle: {
    opacity: 0.75,
    marginTop: 6,
    lineHeight: 1.4,
  },
  card: {
    background: "rgba(17,24,39,0.9)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 18,
    padding: 18,
  },
  stepBlock: {
    padding: 8,
  },
  stepTitle: {
    fontSize: 18,
    margin: "4px 0 8px",
  },
  hint: {
    opacity: 0.7,
    margin: "0 0 14px",
    fontSize: 13,
  },
  input: {
    width: "100%",
    padding: "12px 12px",
    background: "#0b1220",
    border: "1px solid rgba(148,163,184,0.25)",
    color: "white",
    borderRadius: 12,
    outline: "none",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  primaryBtn: {
    width: "100%",
    marginTop: 14,
    padding: "12px 14px",
    background: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 700,
  },
  secondaryBtn: {
    padding: "10px 14px",
    background: "transparent",
    border: "1px solid rgba(148,163,184,0.28)",
    color: "#e5e7eb",
    borderRadius: 12,
    cursor: "pointer",
  },
  actionsRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 14,
  },
  errorBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    background: "rgba(248,113,113,0.14)",
    border: "1px solid rgba(248,113,113,0.35)",
    color: "#fecaca",
  },
  resultTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    marginBottom: 14,
    flexWrap: "wrap",
  },
  riskPill: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(59,130,246,0.18)",
    border: "1px solid rgba(59,130,246,0.35)",
    fontSize: 14,
  },
  summaryBox: {
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(2,6,23,0.35)",
  },
  sectionBox: {
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(2,6,23,0.35)",
  },
  sectionTitle: {
    margin: 0,
    fontSize: 16,
    marginBottom: 10,
  },
  summaryText: {
    margin: 0,
    opacity: 0.92,
    lineHeight: 1.6,
  },
  resultGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  ul: {
    margin: 0,
    paddingLeft: 18,
  },
  li: {
    marginBottom: 8,
    opacity: 0.95,
  },
  allocList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  allocRow: {
    display: "grid",
    gridTemplateColumns: "110px 70px 1fr",
    gap: 10,
    alignItems: "center",
  },
  allocLabel: {
    fontSize: 13,
    opacity: 0.85,
  },
  allocValue: {
    fontSize: 13,
    fontWeight: 800,
    textAlign: "right",
  },
  bar: {
    height: 10,
    background: "rgba(148,163,184,0.15)",
    borderRadius: 999,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    background: "#22c55e",
    borderRadius: 999,
  },
  questions: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginTop: 6,
  },
  questionBlock: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(2,6,23,0.25)",
  },
  questionText: {
    marginBottom: 8,
    opacity: 0.95,
    fontWeight: 700,
  },
};