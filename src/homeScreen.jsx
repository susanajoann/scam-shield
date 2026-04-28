// ─────────────────────────────────────────────────────────────────────────────
// HomeScreen.jsx
//
// All visible text is defined as named TEXT_ constants at the top.
// Audio controls (speed, auto-read) now live in the NavBar in App.jsx.
// This file only handles the quiz landing and difficulty selector screens.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { SCAMS } from "./scamData.js";
import { createSession } from "./analytics.js";

// ─── All visible text ─────────────────────────────────────────────────────────

const TEXT_APP_SUBTITLE = "Know the scam before it knows you";
const TEXT_TAGLINE =
  "Learn to recognise the scams most commonly used against older Americans — at your own pace, in plain language.";
const TEXT_AGE_LABEL = "Before we begin, what is your age range?";
const TEXT_AGE_CAPTION =
  "Collected anonymously to help researchers understand which age groups find certain scams most difficult to spot.";
const TEXT_NOTICE_TITLE = "About your data";
const TEXT_NOTICE_BODY =
  "This tool records your quiz answers, time taken, and age range to help researchers understand which scam tactics are hardest to recognise. No names, emails, or personal information are collected or shared. All data is fully anonymous. You may stop at any time.";
const TEXT_CONSENT_LABEL =
  "I understand and agree to anonymous data collection";
const TEXT_BEGIN_BTN = "Let's begin";
const TEXT_HINT_BOTH =
  "Please select your age range and agree to data collection above.";
const TEXT_HINT_AGE = "Please select your age range above.";
const TEXT_HINT_CONSENT = "Please agree to data collection above.";
const TEXT_HOME_CHOOSE = "Choose your difficulty";
const TEXT_HOME_CAPTION =
  "The quiz covers five common scam types in a random order.";
const TEXT_START_BTN = "Start quiz";
const TEXT_HOME_HINT = "Please choose a difficulty above.";
const TEXT_HOME_FOOTER =
  "All answers are recorded anonymously for research purposes only.";

// ─── Age ranges ───────────────────────────────────────────────────────────────

const AGE_RANGES = [
  "Under 18",
  "18–24",
  "25–34",
  "35–44",
  "45–54",
  "55–64",
  "65–74",
  "75+",
];

// ─── Difficulty levels ────────────────────────────────────────────────────────

const DIFFICULTIES = [
  {
    key: "easy",
    label: "Easy",
    desc: "Choose the safe action",
    color: "#2D6A4F",
    bg: "#D8F3DC",
  },
  {
    key: "medium",
    label: "Medium",
    desc: "Spot the scam tactic",
    color: "#B5621A",
    bg: "#FDE8D0",
  },
  {
    key: "hard",
    label: "Hard",
    desc: "Highlight the red flags",
    color: "#9B2335",
    bg: "#FADADD",
  },
];

// ─── Speech utility ───────────────────────────────────────────────────────────
// Reads speed from localStorage so it stays in sync with the NavBar controls.

let _lastSpokenText = "";

function speak(text) {
  if (!window.speechSynthesis) return;
  // Toggle — if already speaking the same text, stop it
  if (window.speechSynthesis.speaking && _lastSpokenText === text) {
    window.speechSynthesis.cancel();
    _lastSpokenText = "";
    return;
  }
  window.speechSynthesis.cancel();
  _lastSpokenText = text;
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
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.rate = rate;
    utterance.pitch = 1;
    if (i > 0) {
      const pause = new SpeechSynthesisUtterance(" ");
      pause.rate = 0.1;
      pause.volume = 0;
      window.speechSynthesis.speak(pause);
    }
    window.speechSynthesis.speak(utterance);
  });
}

// ─── Shuffle utility ──────────────────────────────────────────────────────────

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ─── Speech builders ──────────────────────────────────────────────────────────

function buildLandingScript(ageRange, consentGiven) {
  const ageSelected = ageRange
    ? `You have selected: ${ageRange}.`
    : "You have not selected an age range yet.";
  const ageOptions = `The available options are: ${AGE_RANGES.join(", ")}.`;
  const consentState = consentGiven
    ? "You have agreed to data collection."
    : `Please tick the checkbox that says: ${TEXT_CONSENT_LABEL}.`;
  return [
    `ScamSavvy. ${TEXT_APP_SUBTITLE}.`,
    TEXT_TAGLINE,
    TEXT_AGE_LABEL,
    TEXT_AGE_CAPTION,
    ageOptions,
    ageSelected,
    `${TEXT_NOTICE_TITLE}.`,
    TEXT_NOTICE_BODY,
    consentState,
  ].join(" ");
}

function buildHomeScript(ageRange, selectedDifficulty) {
  const diffOptions = DIFFICULTIES.map((d) => `${d.label}: ${d.desc}.`).join(
    " ",
  );
  const selected = selectedDifficulty
    ? `You have selected: ${selectedDifficulty}.`
    : "No difficulty selected yet.";
  return [
    TEXT_HOME_CHOOSE + ".",
    TEXT_HOME_CAPTION,
    diffOptions,
    selected,
    `Your selected age range is ${ageRange}.`,
    TEXT_HOME_FOOTER,
  ].join(" ");
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HomeScreen({ onStart, readScriptRef }) {
  const [screen, setScreen] = useState("landing");
  const [ageRange, setAgeRange] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [starting, setStarting] = useState(false);

  // Auto-read: reads preference from localStorage (set by NavBar audio controls)
  const isAutoRead = () => {
    try {
      return localStorage.getItem("scamshield_auto_read") === "true";
    } catch {
      return false;
    }
  };

  // Register current page script with NavBar so the 🔊 button knows what to read
  useEffect(() => {
    if (!readScriptRef) return;
    if (screen === "landing") {
      readScriptRef.current = () => buildLandingScript(ageRange, consentGiven);
    } else if (screen === "home") {
      readScriptRef.current = () =>
        buildHomeScript(ageRange, selectedDifficulty);
    }
  }, [screen, ageRange, consentGiven, selectedDifficulty]);

  // Auto-read on landing screen load
  useEffect(() => {
    if (!isAutoRead()) return;
    const timer = setTimeout(
      () => speak(buildLandingScript(ageRange, consentGiven)),
      1500,
    );
    return () => clearTimeout(timer);
  }, []);

  // Auto-read when switching to home screen
  useEffect(() => {
    if (screen !== "home" || !isAutoRead()) return;
    const timer = setTimeout(
      () => speak(buildHomeScript(ageRange, selectedDifficulty)),
      1500,
    );
    return () => clearTimeout(timer);
  }, [screen]);

  // ── Screen: Landing ─────────────────────────────────────────────────────────
  if (screen === "landing") {
    const canBegin = ageRange !== "" && consentGiven;

    return (
      <Wrapper>
        <Spacer h={8} />
        <p style={styles.tagline}>{TEXT_TAGLINE}</p>

        <Spacer h={36} />
        <Divider />
        <Spacer h={36} />

        <label style={styles.label}>{TEXT_AGE_LABEL}</label>
        <Spacer h={10} />
        <p style={styles.caption}>{TEXT_AGE_CAPTION}</p>
        <Spacer h={16} />

        <div style={styles.ageGrid}>
          {AGE_RANGES.map((range) => (
            <button
              key={range}
              onClick={() => setAgeRange(range)}
              style={{
                ...styles.ageBtn,
                background: ageRange === range ? "#3D1580" : "#fff",
                color: ageRange === range ? "#fff" : "#3D1580",
              }}
            >
              {range}
            </button>
          ))}
        </div>

        <Spacer h={36} />
        <Divider />
        <Spacer h={36} />

        <div style={styles.noticeBox}>
          <p style={styles.noticeTitle}>{TEXT_NOTICE_TITLE}</p>
          <Spacer h={10} />
          <p style={styles.noticeBody}>{TEXT_NOTICE_BODY}</p>
          <Spacer h={18} />
          <label style={styles.checkLabel}>
            <input
              type='checkbox'
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              style={styles.checkbox}
            />
            <span>{TEXT_CONSENT_LABEL}</span>
          </label>
        </div>

        <Spacer h={32} />

        <BigButton onClick={() => setScreen("home")} disabled={!canBegin}>
          {TEXT_BEGIN_BTN} →
        </BigButton>

        {!canBegin && (
          <>
            <Spacer h={12} />
            <p style={styles.hint}>
              {!ageRange && !consentGiven
                ? TEXT_HINT_BOTH
                : !ageRange
                  ? TEXT_HINT_AGE
                  : TEXT_HINT_CONSENT}
            </p>
          </>
        )}
      </Wrapper>
    );
  }

  // ── Screen: Home (difficulty selector) ─────────────────────────────────────
  if (screen === "home") {
    const handleStart = async () => {
      if (!selectedDifficulty || starting) return;
      setStarting(true);
      const { sessionId, startedAt } = await createSession(
        selectedDifficulty,
        ageRange,
      );
      const shuffledScams = shuffle(SCAMS);
      onStart(
        selectedDifficulty,
        shuffledScams,
        ageRange,
        sessionId,
        startedAt,
      );
    };

    return (
      <Wrapper>
        <span style={styles.ageTag}>{ageRange}</span>
        <Spacer h={24} />

        <p style={styles.label}>{TEXT_HOME_CHOOSE}</p>
        <Spacer h={6} />
        <p style={styles.caption}>{TEXT_HOME_CAPTION}</p>
        <Spacer h={20} />

        <div style={styles.diffList}>
          {DIFFICULTIES.map((d) => {
            const isSelected = selectedDifficulty === d.key;
            return (
              <button
                key={d.key}
                onClick={() => setSelectedDifficulty(d.key)}
                style={{
                  ...styles.diffCard,
                  background: isSelected ? d.bg : "#fff",
                  borderColor: isSelected ? d.color : "#C9B8E8",
                  borderWidth: isSelected ? 2.5 : 1.5,
                }}
              >
                <div style={styles.diffCardInner}>
                  <span style={{ ...styles.diffLabel, color: d.color }}>
                    {d.label}
                  </span>
                  <span style={styles.diffDesc}>{d.desc}</span>
                </div>
                {isSelected && (
                  <span style={{ ...styles.diffCheck, color: d.color }}>✓</span>
                )}
              </button>
            );
          })}
        </div>

        <Spacer h={32} />

        <BigButton
          onClick={handleStart}
          disabled={!selectedDifficulty || starting}
        >
          {starting ? "Starting..." : `${TEXT_START_BTN} →`}
        </BigButton>

        {!selectedDifficulty && !starting && (
          <>
            <Spacer h={12} />
            <p style={styles.hint}>{TEXT_HOME_HINT}</p>
          </>
        )}

        <Spacer h={24} />
        <p style={styles.footer}>{TEXT_HOME_FOOTER}</p>
      </Wrapper>
    );
  }

  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Wrapper({ children }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100vw",
        boxSizing: "border-box",
        padding: "32px clamp(16px, 5vw, 64px) 60px",
        fontFamily: "'Georgia', serif",
      }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return (
    <hr
      style={{ border: "none", borderTop: "1.5px solid #E0E8F0", margin: 0 }}
    />
  );
}

function BigButton({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "22px 24px",
        fontSize: "clamp(17px, 2.5vw, 20px)",
        fontWeight: 600,
        fontFamily: "sans-serif",
        background: disabled ? "#D0D8E0" : "#3D1580",
        color: disabled ? "#888" : "#fff",
        border: "none",
        borderRadius: 12,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.2s",
        lineHeight: 1.4,
      }}
    >
      {children}
    </button>
  );
}

function Spacer({ h }) {
  return <div style={{ height: h }} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  tagline: {
    fontSize: "clamp(18px, 2.5vw, 22px)",
    lineHeight: 1.8,
    color: "#333",
    margin: 0,
    fontFamily: "sans-serif",
  },
  label: {
    fontSize: "clamp(18px, 2.5vw, 22px)",
    fontWeight: 600,
    color: "#3D1580",
    display: "block",
    fontFamily: "sans-serif",
    lineHeight: 1.4,
    margin: 0,
  },
  caption: {
    fontSize: "clamp(15px, 2vw, 17px)",
    color: "#555",
    margin: 0,
    lineHeight: 1.7,
    fontFamily: "sans-serif",
  },
  ageGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
    gap: 10,
  },
  ageBtn: {
    flex: "1 1 auto",
    padding: "clamp(10px, 3vw, 16px) 8px",
    fontSize: "clamp(13px, 3.5vw, 16px)",
    fontWeight: 600,
    border: "2px solid #3D1580",
    borderRadius: 10,
    cursor: "pointer",
    fontFamily: "sans-serif",
    textAlign: "center",
    transition: "background 0.15s, color 0.15s",
  },
  noticeBox: {
    background: "#FAF7FF",
    border: "1.5px solid #C9B8E8",
    borderRadius: 12,
    padding: "24px 28px",
  },
  noticeTitle: {
    fontSize: "clamp(17px, 2vw, 19px)",
    fontWeight: 700,
    color: "#3D1580",
    margin: 0,
    fontFamily: "sans-serif",
  },
  noticeBody: {
    fontSize: "clamp(15px, 2vw, 17px)",
    lineHeight: 1.8,
    color: "#333",
    margin: 0,
    fontFamily: "sans-serif",
  },
  checkLabel: {
    display: "flex",
    alignItems: "flex-start",
    gap: 16,
    fontSize: "clamp(16px, 2vw, 18px)",
    color: "#3D1580",
    cursor: "pointer",
    fontFamily: "sans-serif",
    lineHeight: 1.6,
  },
  checkbox: {
    width: 28,
    height: 28,
    marginTop: 2,
    cursor: "pointer",
    flexShrink: 0,
    accentColor: "#3D1580",
  },
  hint: {
    fontSize: "clamp(14px, 1.8vw, 16px)",
    color: "#888",
    textAlign: "center",
    margin: 0,
    fontFamily: "sans-serif",
    fontStyle: "italic",
  },
  ageTag: {
    fontSize: "clamp(13px, 1.8vw, 15px)",
    fontWeight: 600,
    color: "#3D1580",
    background: "#EDE8F8",
    border: "1.5px solid #C9B8E8",
    borderRadius: 20,
    padding: "5px 14px",
    fontFamily: "sans-serif",
    display: "inline-block",
  },
  diffList: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  diffCard: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "22px 24px",
    border: "solid",
    borderRadius: 12,
    cursor: "pointer",
    textAlign: "left",
    transition: "background 0.15s, border-color 0.15s",
    boxSizing: "border-box",
  },
  diffCardInner: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  diffLabel: {
    fontSize: "clamp(19px, 2.5vw, 22px)",
    fontWeight: 700,
    fontFamily: "sans-serif",
  },
  diffDesc: {
    fontSize: "clamp(15px, 2vw, 17px)",
    fontFamily: "sans-serif",
    color: "#555",
    lineHeight: 1.5,
  },
  diffCheck: {
    fontSize: 26,
    fontWeight: 700,
    fontFamily: "sans-serif",
  },

  footer: {
    fontSize: "clamp(13px, 1.8vw, 15px)",
    color: "#999",
    lineHeight: 1.6,
    textAlign: "center",
    fontFamily: "sans-serif",
    margin: 0,
  },
};
