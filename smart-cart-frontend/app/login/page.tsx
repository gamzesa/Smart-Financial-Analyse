"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json();
      console.log("LOGIN RESPONSE:", data);

      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
        router.push("/home");
      } else {
        setError(data.detail || "Login failed");
      }
} catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
      setError(e.message || "Server error");

    }

    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Giriş Yap</h1>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
        />

        <input
          placeholder="Şifre"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />

        {error && <p style={styles.error}>{error}</p>}

        <button
          onClick={login}
          disabled={loading}
          style={{
            ...styles.button,
            opacity: loading ? 0.6 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>

        {/* 🔥 REGISTER LINK */}
        <p
          onClick={() => router.push("/register")}
          style={styles.registerLink}
        >
          Hesabın yok mu? <b>Kayıt ol</b>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg,#0f172a,#1e293b)",
    color: "white",
  },
  card: {
    width: "340px",
    padding: "25px",
    background: "#111827",
    borderRadius: "14px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
  },
  title: {
    marginBottom: "10px",
  },
  input: {
    width: "100%",
    padding: "10px",
    margin: "8px 0",
    background: "#0b1220",
    border: "1px solid #334155",
    color: "white",
    borderRadius: "8px",
  },
  button: {
    width: "100%",
    padding: "10px",
    marginTop: "10px",
    background: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "8px",
  },
  error: {
    color: "#f87171",
    fontSize: "13px",
    marginTop: "5px",
  },
  registerLink: {
    marginTop: "12px",
    textAlign: "center",
    fontSize: "13px",
    opacity: 0.8,
    cursor: "pointer",
  },
};