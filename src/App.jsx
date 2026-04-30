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
import FeedbackPage from "./Feedbackpage";

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

// Global speak function used by the NavBar to read the current page.
// HomeScreen and QuizScreen pass their read scripts via a ref.
let _navLastText = "";
let _navSpeaking = false;

function navSpeak(text, onDone) {
  if (!window.speechSynthesis) return false;
  // Toggle off if already speaking
  if (_navSpeaking && _navLastText === text) {
    window.speechSynthesis.cancel();
    _navSpeaking = false;
    _navLastText = "";
    onDone?.();
    return false; // now stopped
  }
  window.speechSynthesis.cancel();
  _navLastText = text;
  _navSpeaking = true;
  const rate = (() => {
    try {
      const s = localStorage.getItem("scamshield_speech_speed");
      return s ? parseFloat(s) : 0.88;
    } catch {
      return 0.88;
    }
  })();
  const chunks = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  chunks.forEach((chunk, i) => {
    const u = new SpeechSynthesisUtterance(chunk);
    u.rate = rate;
    u.pitch = 1;
    // On the last chunk, fire onDone when it finishes
    if (i === chunks.length - 1) {
      u.onend = () => {
        _navSpeaking = false;
        onDone?.();
      };
    }
    if (i > 0) {
      const p = new SpeechSynthesisUtterance(" ");
      p.rate = 0.1;
      p.volume = 0;
      window.speechSynthesis.speak(p);
    }
    window.speechSynthesis.speak(u);
  });
  return true; // now speaking
}

function NavBar({ onLogoClick, autoRead, setAutoRead, readScriptRef }) {
  const [audioOpen, setAudioOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleAutoReadToggle = () => {
    const next = !autoRead;
    setAutoRead(next);
    saveAutoRead(next);
  };

  const handleSpeakBtn = () => {
    const script = readScriptRef?.current?.();
    if (!script) return;
    const nowSpeaking = navSpeak(script, () => setIsSpeaking(false));
    setIsSpeaking(nowSpeaking);
  };

  return (
    <nav
      style={{
        width: "100%",
        maxWidth: "100vw",
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
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {/* SS on mobile, full wordmark on desktop — controlled by CSS classes */}
        <style>{`
          .logo-full { display: inline; }
          .logo-short { display: none; }
          @media (max-width: 500px) {
            .logo-full { display: none; }
            .logo-short { display: inline; }
          }
        `}</style>
        <span
          className='logo-full'
          style={{
            fontWeight: 700,
            fontFamily: "Georgia, serif",
            letterSpacing: "-0.5px",
            lineHeight: 1,
            fontSize: 26,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color: "#3D1580" }}>Scam</span>
          <span style={{ color: "#C8952A" }}>Savvy</span>
        </span>
        <span
          className='logo-short'
          style={{
            fontWeight: 700,
            fontFamily: "Georgia, serif",
            letterSpacing: "-1px",
            lineHeight: 1,
            fontSize: 24,
          }}
        >
          <span style={{ color: "#3D1580" }}>S</span>
          <span style={{ color: "#C8952A" }}>S</span>
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

      {/* Feedback tab */}
      <NavLink
        to='/feedback'
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
        Feedback
      </NavLink>

      {/* Audio controls — 🔊 button reads/stops, ▾ opens auto-read dropdown */}
      <div
        style={{
          position: "relative",
          marginLeft: "clamp(6px, 2vw, 12px)",
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* Unified audio button group — both buttons share identical sizing */}
        <button
          onClick={handleSpeakBtn}
          style={{
            background: isSpeaking ? "#EDE8F8" : "#fff",
            border: "1.5px solid #C9B8E8",
            borderRadius: "8px 0 0 8px",
            borderRight: "none",
            width: 40,
            height: 36,
            fontSize: 16,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.15s",
            padding: 0,
          }}
          title={isSpeaking ? "Stop reading" : "Read page aloud"}
          aria-label={isSpeaking ? "Stop reading" : "Read page aloud"}
        >
          {isSpeaking ? "⏹" : "🔊"}
        </button>
        <button
          onClick={() => setAudioOpen((o) => !o)}
          style={{
            background: audioOpen ? "#EDE8F8" : "#fff",
            border: "1.5px solid #C9B8E8",
            borderRadius: "0 8px 8px 0",
            width: 24,
            height: 36,
            fontSize: 11,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#7A5FAA",
            transition: "background 0.15s",
            padding: 0,
          }}
          title='Audio settings'
          aria-label='Audio settings'
        >
          ▾
        </button>

        {/* Dropdown — auto-read only */}
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
              width: "min(200px, calc(100vw - 24px))",
              boxShadow: "0 4px 20px rgba(61,21,128,0.15)",
            }}
          >
            <button
              onClick={handleAutoReadToggle}
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: 14,
                fontWeight: 600,
                border: "1.5px solid #2D6A4F",
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: "sans-serif",
                background: autoRead ? "#2D6A4F" : "#fff",
                color: autoRead ? "#fff" : "#2D6A4F",
                transition: "background 0.15s",
                textAlign: "left",
              }}
            >
              {autoRead ? "✓ Auto-read ON" : "Auto-read OFF"}
            </button>
            <p
              style={{
                fontSize: 12,
                color: "#999",
                margin: "8px 0 0",
                fontFamily: "sans-serif",
                lineHeight: 1.4,
              }}
            >
              When on, each new screen is read aloud automatically.
            </p>
          </div>
        )}
      </div>
    </nav>
  );
}

// ─── Quiz flow ────────────────────────────────────────────────────────────────

function QuizFlow({ resetRef, readScriptRef }) {
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

  if (screen === "home")
    return <HomeScreen onStart={handleStart} readScriptRef={readScriptRef} />;

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
        readScriptRef={readScriptRef}
      />
    );
  }
  return null;
}

// ─── Root app ─────────────────────────────────────────────────────────────────

export default function App() {
  const quizResetRef = useRef(null);
  const readScriptRef = useRef(() => ""); // any screen can set this to return its read script
  const [autoRead, setAutoRead] = useState(getAutoRead);

  return (
    <BrowserRouter>
      <NavBar
        onLogoClick={() => quizResetRef.current?.()}
        autoRead={autoRead}
        setAutoRead={setAutoRead}
        readScriptRef={readScriptRef}
      />
      <Routes>
        <Route
          path='/'
          element={
            <QuizFlow resetRef={quizResetRef} readScriptRef={readScriptRef} />
          }
        />
        <Route
          path='/analytics'
          element={<AnalyticsPage readScriptRef={readScriptRef} />}
        />
        <Route
          path='/feedback'
          element={<FeedbackPage readScriptRef={readScriptRef} />}
        />
      </Routes>
    </BrowserRouter>
  );
}
