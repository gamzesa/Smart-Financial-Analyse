"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Register() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const register = async () => {
    setMessage("");

    // validation
    if (!email || !password) {
      setMessage("Email ve şifre zorunlu");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/register", {
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

      if (res.ok) {
        setMessage("Kayıt başarılı 🎉");

        setTimeout(() => {
          router.push("/login");
        }, 1200);
      } else {
        setMessage(data.detail || "Kayıt başarısız");
      }
    } catch {
      setMessage("Sunucu hatası");
    }


    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Kayıt Ol</h1>

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

        {message && <p style={styles.message}>{message}</p>}

        <button
          onClick={register}
          disabled={loading}
          style={{
            ...styles.button,
            opacity: loading ? 0.6 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Kayıt oluşturuluyor..." : "Kayıt Ol"}
        </button>

        <p
          onClick={() => router.push("/login")}
          style={styles.link}
        >
          Zaten hesabın var mı? Giriş yap
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
    background: "#22c55e",
    color: "white",
    border: "none",
    borderRadius: "8px",
  },
  message: {
    fontSize: "14px",
    marginTop: "8px",
    color: "#facc15",
  },
  link: {
    marginTop: "10px",
    cursor: "pointer",
    fontSize: "13px",
    opacity: 0.8,
  },
};