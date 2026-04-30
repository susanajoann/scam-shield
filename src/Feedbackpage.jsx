// ─────────────────────────────────────────────────────────────────────────────
// FeedbackPage.jsx
//
// Simple feedback form — saves anonymous messages to Supabase.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function submitFeedback(message) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/feedback`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
}

export default function FeedbackPage({ readScriptRef }) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error

  // Register read script with NavBar 🔊 button
  useEffect(() => {
    if (!readScriptRef) return;
    readScriptRef.current = () =>
      "Share your feedback. We would love to hear what you thought of ScamSavvy — what worked well, what was confusing, or anything you would like to see added. All feedback is anonymous. Type your message in the text box and press Submit feedback.";
  }, []);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setStatus("submitting");
    try {
      await submitFeedback(message.trim());
      setStatus("success");
      setMessage("");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100vw",
        boxSizing: "border-box",
        padding: "40px clamp(16px, 5vw, 64px) 80px",
        fontFamily: "sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 640 }}>
        <h1
          style={{
            fontSize: "clamp(24px, 4vw, 32px)",
            fontWeight: 700,
            color: "#3D1580",
            fontFamily: "Georgia, serif",
            margin: "0 0 8px",
          }}
        >
          Share your feedback
        </h1>
        <p
          style={{
            fontSize: "clamp(15px, 2vw, 17px)",
            color: "#555",
            margin: "0 0 32px",
            lineHeight: 1.7,
          }}
        >
          We would love to hear what you thought of ScamSavvy - what worked
          well, what was confusing, or anything you would like to see added. All
          feedback is anonymous.
        </p>

        {status === "success" ? (
          <div
            style={{
              background: "#D8F3DC",
              border: "1.5px solid #2D6A4F",
              borderRadius: 12,
              padding: "24px 28px",
              maxWidth: 600,
            }}
          >
            <p
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "#1B4332",
                margin: "0 0 6px",
              }}
            >
              Thank you for your feedback!
            </p>
            <p style={{ fontSize: 15, color: "#2D6A4F", margin: 0 }}>
              Your response has been recorded anonymously.
            </p>
            <button
              onClick={() => setStatus("idle")}
              style={{
                marginTop: 16,
                padding: "10px 20px",
                fontSize: 15,
                fontWeight: 600,
                background: "#fff",
                color: "#2D6A4F",
                border: "1.5px solid #2D6A4F",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Submit another response
            </button>
          </div>
        ) : (
          <div style={{ maxWidth: 600 }}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder='Type your feedback here...'
              rows={6}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "16px 18px",
                fontSize: "clamp(15px, 2vw, 17px)",
                fontFamily: "sans-serif",
                color: "#1A0A3C",
                background: "#FAF7FF",
                border: "1.5px solid #C9B8E8",
                borderRadius: 12,
                resize: "vertical",
                outline: "none",
                lineHeight: 1.7,
              }}
            />

            {status === "error" && (
              <p style={{ color: "#9B2335", fontSize: 14, margin: "8px 0 0" }}>
                Something went wrong. Please try again.
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!message.trim() || status === "submitting"}
              style={{
                marginTop: 16,
                width: "100%",
                padding: "18px 24px",
                fontSize: "clamp(16px, 2.5vw, 18px)",
                fontWeight: 600,
                fontFamily: "sans-serif",
                background:
                  !message.trim() || status === "submitting"
                    ? "#D0D8E0"
                    : "#3D1580",
                color:
                  !message.trim() || status === "submitting" ? "#888" : "#fff",
                border: "none",
                borderRadius: 12,
                cursor:
                  !message.trim() || status === "submitting"
                    ? "not-allowed"
                    : "pointer",
                transition: "background 0.2s",
              }}
            >
              {status === "submitting" ? "Submitting..." : "Submit feedback →"}
            </button>

            <p
              style={{
                fontSize: 13,
                color: "#999",
                margin: "16px 0 0",
                lineHeight: 1.6,
              }}
            >
              Your feedback is completely anonymous. No personal information is
              collected.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
