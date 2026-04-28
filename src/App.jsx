// ─────────────────────────────────────────────────────────────────────────────
// App.jsx
// Root component with nav bar, routing, and audio controls.
// Audio state lives here so the 🔊 button can sit in the NavBar permanently.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import HomeScreen from "./homeScreen";
import QuizScreen from "./quizScreen";
import AnalyticsPage from "./AnalyticsPage";

// ─── Audio state helpers ──────────────────────────────────────────────────────

const SPEECH_SPEEDS = [
  { label: "Slow", rate: 0.65 },
  { label: "Normal", rate: 0.88 },
  { label: "Fast", rate: 1.1 },
];
const SPEECH_SPEED_KEY = "scamshield_speech_speed";
const AUTO_READ_KEY = "scamshield_auto_read";

function getSpeechRate() {
  try {
    const s = localStorage.getItem(SPEECH_SPEED_KEY);
    return s ? parseFloat(s) : 0.88;
  } catch {
    return 0.88;
  }
}
function saveSpeechRate(rate) {
  try {
    localStorage.setItem(SPEECH_SPEED_KEY, String(rate));
  } catch {}
}
function getAutoRead() {
  try {
    return localStorage.getItem(AUTO_READ_KEY) === "true";
  } catch {
    return false;
  }
}
function saveAutoRead(value) {
  try {
    localStorage.setItem(AUTO_READ_KEY, value ? "true" : "false");
  } catch {}
}

// ─── Nav bar ──────────────────────────────────────────────────────────────────

function NavBar({
  onLogoClick,
  speechRate,
  setSpeechRate,
  autoRead,
  setAutoRead,
}) {
  const [audioOpen, setAudioOpen] = useState(false);

  const handleSpeedChange = (rate) => {
    setSpeechRate(rate);
    saveSpeechRate(rate);
  };

  const handleAutoReadToggle = () => {
    const next = !autoRead;
    setAutoRead(next);
    saveAutoRead(next);
  };

  return (
    <nav
      style={{
        width: "100%",
        boxSizing: "border-box",
        background: "#fff",
        borderBottom: "2px solid #E8E0F5",
        padding: "0 clamp(12px, 4vw, 48px)",
        display: "flex",
        alignItems: "center",
        gap: 0,
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <NavLink
        to='/'
        onClick={() => onLogoClick?.()}
        style={{
          textDecoration: "none",
          marginRight: "auto",
          padding: "12px 0",
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        <span
          style={{
            fontSize: "clamp(22px, 3.5vw, 28px)",
            fontWeight: 700,
            fontFamily: "Georgia, serif",
            letterSpacing: "-0.5px",
            lineHeight: 1,
          }}
        >
          <span style={{ color: "#3D1580" }}>Scam</span>
          <span style={{ color: "#C8952A" }}>Savvy</span>
        </span>
        <span
          style={{
            fontSize: "clamp(0px, 1.2vw, 11px)",
            color: "#7A5FAA",
            fontFamily: "sans-serif",
            letterSpacing: "1.5px",
            lineHeight: 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          KNOW THE SCAM BEFORE IT KNOWS YOU
        </span>
      </NavLink>

      {/* Quiz tab */}
      <NavLink
        to='/'
        end
        style={({ isActive }) => ({
          padding: "16px clamp(8px, 2.5vw, 20px)",
          fontSize: "clamp(13px, 3vw, 16px)",
          fontFamily: "sans-serif",
          fontWeight: 600,
          color: isActive ? "#3D1580" : "#7A5FAA",
          textDecoration: "none",
          borderBottom: isActive
            ? "3px solid #3D1580"
            : "3px solid transparent",
          transition: "color 0.15s, border-color 0.15s",
          whiteSpace: "nowrap",
        })}
      >
        Quiz
      </NavLink>

      {/* Analytics tab */}
      <NavLink
        to='/analytics'
        style={({ isActive }) => ({
          padding: "16px clamp(8px, 2.5vw, 20px)",
          fontSize: "clamp(13px, 3vw, 16px)",
          fontFamily: "sans-serif",
          fontWeight: 600,
          color: isActive ? "#3D1580" : "#7A5FAA",
          textDecoration: "none",
          borderBottom: isActive
            ? "3px solid #C8952A"
            : "3px solid transparent",
          transition: "color 0.15s, border-color 0.15s",
          whiteSpace: "nowrap",
        })}
      >
        Research Data
      </NavLink>

      {/* Audio button — lives in the nav bar, right side */}
      <div
        style={{ position: "relative", marginLeft: "clamp(8px, 2vw, 16px)" }}
      >
        <button
          onClick={() => setAudioOpen((o) => !o)}
          style={{
            background: audioOpen ? "#EDE8F8" : "none",
            border: "1.5px solid #C9B8E8",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 18,
            cursor: "pointer",
            lineHeight: 1,
          }}
          title='Audio settings'
          aria-label='Audio settings'
        >
          🔊
        </button>

        {/* Dropdown panel */}
        {audioOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              background: "#fff",
              border: "1.5px solid #C9B8E8",
              borderRadius: 12,
              padding: "14px 16px",
              zIndex: 200,
              width: "min(220px, calc(100vw - 24px))",
              boxShadow: "0 4px 20px rgba(61,21,128,0.15)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#7A5FAA",
                margin: 0,
                fontFamily: "sans-serif",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
              }}
            >
              Speed
            </p>
            <div style={{ display: "flex", gap: 6 }}>
              {SPEECH_SPEEDS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => handleSpeedChange(s.rate)}
                  style={{
                    flex: 1,
                    padding: "7px 6px",
                    fontSize: 13,
                    fontWeight: 600,
                    border: "1.5px solid #3D1580",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontFamily: "sans-serif",
                    background: speechRate === s.rate ? "#3D1580" : "#fff",
                    color: speechRate === s.rate ? "#fff" : "#3D1580",
                    transition: "background 0.15s",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleAutoReadToggle}
              style={{
                padding: "8px 12px",
                fontSize: 13,
                fontWeight: 600,
                border: "1.5px solid #2D6A4F",
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: "sans-serif",
                background: autoRead ? "#2D6A4F" : "#fff",
                color: autoRead ? "#fff" : "#2D6A4F",
                transition: "background 0.15s",
              }}
            >
              {autoRead ? "Auto-read ON ✓" : "Auto-read OFF"}
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

// ─── Quiz flow ────────────────────────────────────────────────────────────────

function QuizFlow({ resetRef }) {
  const [screen, setScreen] = useState("home");
  const [quizProps, setQuizProps] = useState(null);

  const goHome = () => {
    setQuizProps(null);
    setScreen("home");
  };
  if (resetRef) resetRef.current = goHome;

  const handleStart = (
    difficulty,
    shuffledScams,
    ageRange,
    sessionId,
    startedAt,
  ) => {
    setQuizProps({ difficulty, shuffledScams, ageRange, sessionId, startedAt });
    setScreen("quiz");
  };

  if (screen === "home") return <HomeScreen onStart={handleStart} />;

  if (screen === "quiz" && quizProps) {
    return (
      <QuizScreen
        difficulty={quizProps.difficulty}
        scams={quizProps.shuffledScams}
        ageRange={quizProps.ageRange}
        sessionId={quizProps.sessionId}
        startedAt={quizProps.startedAt}
        onPlayAgain={goHome}
        onHome={goHome}
      />
    );
  }
  return null;
}

// ─── Root app ─────────────────────────────────────────────────────────────────

export default function App() {
  const quizResetRef = useRef(null);
  const [speechRate, setSpeechRate] = useState(getSpeechRate);
  const [autoRead, setAutoRead] = useState(getAutoRead);

  return (
    <BrowserRouter>
      <NavBar
        onLogoClick={() => quizResetRef.current?.()}
        speechRate={speechRate}
        setSpeechRate={setSpeechRate}
        autoRead={autoRead}
        setAutoRead={setAutoRead}
      />
      <Routes>
        <Route path='/' element={<QuizFlow resetRef={quizResetRef} />} />
        <Route path='/analytics' element={<AnalyticsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
