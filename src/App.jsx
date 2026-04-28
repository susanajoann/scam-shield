// ─────────────────────────────────────────────────────────────────────────────
// App.jsx
//
// Root component. Uses React Router for two routes:
//   /           — the quiz app (HomeScreen + QuizScreen)
//   /analytics  — the research analytics dashboard
//
// A persistent nav bar appears at the top of every page with tabs to switch
// between the quiz and the analytics dashboard.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import HomeScreen from "./homeScreen";
import QuizScreen from "./quizScreen";
import AnalyticsPage from "./AnalyticsPage";

// ─── Nav bar ─────────────────────────────────────────────────────────────────

function NavBar({ onLogoClick }) {
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
        flexWrap: "wrap",
        gap: 0,
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Logo — takes up full row on very small screens */}
      <NavLink
        to='/'
        style={{
          textDecoration: "none",
          marginRight: "auto",
          padding: "14px 0",
        }}
      >
        <span
          style={{
            fontSize: "clamp(20px, 4vw, 24px)",
            fontWeight: 700,
            fontFamily: "Georgia, serif",
            letterSpacing: "-0.5px",
          }}
        >
          <span style={{ color: "#3D1580" }}>Scam</span>
          <span style={{ color: "#C8952A" }}>Savvy</span>
        </span>
      </NavLink>

      {/* Quiz tab */}
      <NavLink
        to='/'
        end
        style={({ isActive }) => ({
          padding: "16px clamp(10px, 3vw, 20px)",
          fontSize: "clamp(14px, 3.5vw, 16px)",
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
          padding: "16px clamp(10px, 3vw, 20px)",
          fontSize: "clamp(14px, 3.5vw, 16px)",
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
    </nav>
  );
}

// ─── Quiz flow (home + quiz screens) ─────────────────────────────────────────

// resetRef lets the NavBar trigger a reset to the landing screen from outside
// QuizFlow without needing to lift all state up to App.
function QuizFlow({ resetRef }) {
  const [screen, setScreen] = useState("home");
  const [quizProps, setQuizProps] = useState(null);

  const goHome = () => {
    setQuizProps(null);
    setScreen("home");
  };

  // Expose goHome so the NavBar logo can call it
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

  if (screen === "home") {
    return <HomeScreen onStart={handleStart} />;
  }

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
  // A ref lets the NavBar call goHome() inside QuizFlow without prop drilling
  const quizResetRef = useRef(null);

  return (
    <BrowserRouter>
      <NavBar onLogoClick={() => quizResetRef.current?.()} />
      <Routes>
        <Route path='/' element={<QuizFlow resetRef={quizResetRef} />} />
        <Route path='/analytics' element={<AnalyticsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
