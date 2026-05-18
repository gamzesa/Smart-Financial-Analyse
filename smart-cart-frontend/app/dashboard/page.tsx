"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";


export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) router.push("/login");
  }, [router]);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1>💰 FinPilot AI </h1>
        <p>Finansal Dashboard</p>

        <div style={styles.grid}>
          <button onClick={() => router.push("/analyze")} style={styles.button}>
            📊 Analiz Yap
          </button>

          <button onClick={() => router.push("/history")} style={styles.button}>
            📈 Geçmiş
          </button>
        </div>


      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg,#0f172a,#111827)",
    color: "white",
  },
  card: {
    width: "420px",
    padding: "30px",
    background: "#111827",
    borderRadius: "16px",
    textAlign: "center",
    boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
  },
  grid: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginTop: "20px",
  },
  button: {
    padding: "12px",
    background: "#3b82f6",
    border: "none",
    borderRadius: "10px",
    color: "white",
    cursor: "pointer",
  },

};

