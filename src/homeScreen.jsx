// ─────────────────────────────────────────────────────────────────────────────
// HomeScreen.jsx
//
// All visible text is defined as named TEXT_ constants at the top.
// The same constants are used in both the JSX (what is displayed) and the
// speech builder (what is spoken). Changing a constant updates both
// the screen and the read-aloud automatically — there is no separate copy.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { SCAMS } from "./scamData.js";
import { createSession } from "./analytics.js";

// ─── All visible text ─────────────────────────────────────────────────────────
// Edit any of these strings and both the displayed text and the spoken text
// will update automatically.

const TEXT_APP_NAME    = "ScamSavvy";
const TEXT_APP_SUBTITLE = "Know the scam before it knows you";
const TEXT_TAGLINE     = "Learn to recognise the scams most commonly used against older Americans — at your own pace, in plain language.";

const TEXT_AGE_LABEL   = "Before we begin, what is your age range?";
const TEXT_AGE_CAPTION = "Collected anonymously to help researchers understand which age groups find certain scams most difficult to spot.";

const TEXT_NOTICE_TITLE  = "About your data";
const TEXT_NOTICE_BODY   = "This tool records your quiz answers, time taken, and age range to help researchers understand which scam tactics are hardest to recognise. No names, emails, or personal information are collected or shared. All data is fully anonymous. You may stop at any time.";
const TEXT_CONSENT_LABEL = "I understand and agree to anonymous data collection";

const TEXT_BEGIN_BTN     = "Let's begin";
const TEXT_HINT_BOTH     = "Please select your age range and agree to data collection above.";
const TEXT_HINT_AGE      = "Please select your age range above.";
const TEXT_HINT_CONSENT  = "Please agree to data collection above.";

const TEXT_HOME_CHOOSE   = "Choose your difficulty";
const TEXT_HOME_CAPTION  = "The quiz covers five common scam types in a random order.";
const TEXT_START_BTN     = "Start quiz";
const TEXT_HOME_HINT     = "Please choose a difficulty above.";
const TEXT_HOME_FOOTER   = "All answers are recorded anonymously for research purposes only.";

// ─── Age ranges ───────────────────────────────────────────────────────────────
// Edit this array to add, remove, or rename age ranges.
// The spoken text reads from this same array automatically.

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
// Edit label or desc here and both the card text and the spoken text update.

const DIFFICULTIES = [
  {
    key:   "easy",
    label: "Easy",
    desc:  "Choose the safe action",
    color: "#2D6A4F",
    bg:    "#D8F3DC",
  },
  {
    key:   "medium",
    label: "Medium",
    desc:  "Spot the scam tactic",
    color: "#B5621A",
    bg:    "#FDE8D0",
  },
  {
    key:   "hard",
    label: "Hard",
    desc:  "Highlight the red flags",
    color: "#9B2335",
    bg:    "#FADADD",
  },
];

// ─── Speech speed options ────────────────────────────────────────────────────
// Each option has a label shown on the button and a rate passed to the
// Web Speech API. 1.0 is the browser default; lower is slower.
const SPEECH_SPEEDS = [
  { label: "Slow",   rate: 0.65 },
  { label: "Normal", rate: 0.88 },
  { label: "Fast",   rate: 1.1  },
];

const SPEECH_SPEED_KEY = "scamshield_speech_speed"; // localStorage key

// Returns the currently saved speech rate, defaulting to Normal.
function getSpeechRate() {
  try {
    const saved = localStorage.getItem(SPEECH_SPEED_KEY);
    return saved ? parseFloat(saved) : 0.88;
  } catch {
    return 0.88;
  }
}

// Saves the chosen speech rate to localStorage.
function saveSpeechRate(rate) {
  try { localStorage.setItem(SPEECH_SPEED_KEY, String(rate)); } catch {}
}

// ─── Auto-read setting ────────────────────────────────────────────────────────
// When auto-read is on, each new screen speaks its content automatically
// after a short delay, without the user needing to tap the 🔊 button.

const AUTO_READ_KEY = "scamshield_auto_read";

function getAutoRead() {
  try { return localStorage.getItem(AUTO_READ_KEY) === "true"; }
  catch { return false; }
}

function saveAutoRead(value) {
  try { localStorage.setItem(AUTO_READ_KEY, value ? "true" : "false"); } catch {}
}

// ─── Speech utility ─────────────────────────────────────────────────────────
// Tracks the last text spoken so that changing speed can restart it.
let _lastSpokenText = "";

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  // Remember what was spoken so speed changes can restart it
  _lastSpokenText = text;

  // Split at sentence-ending punctuation to create natural pauses.
  const chunks = text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  chunks.forEach((chunk, i) => {
    const utterance   = new SpeechSynthesisUtterance(chunk);
    utterance.rate    = getSpeechRate();  // reads saved speed from localStorage
    utterance.pitch   = 1;
    if (i > 0) {
      const pause   = new SpeechSynthesisUtterance(" ");
      pause.rate    = 0.1;
      pause.volume  = 0;
      window.speechSynthesis.speak(pause);
    }
    window.speechSynthesis.speak(utterance);
  });
}

// Tracks the last text spoken so speed changes can restart it at the new rate.
// Module-level so it persists across re-renders without a ref.


function trackAndSpeak(text) {
  _lastSpokenText = text;
  speak(text);
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
// These functions build the spoken text entirely from the TEXT_ constants,
// AGE_RANGES, DIFFICULTIES, and current state — the same sources as the JSX.
// Nothing is hardcoded here separately.

function buildLandingScript(ageRange, consentGiven) {
  const ageSelected  = ageRange
    ? `You have selected: ${ageRange}.`
    : "You have not selected an age range yet.";
  const ageOptions   = `The available options are: ${AGE_RANGES.join(", ")}.`;
  const consentState = consentGiven
    ? "You have agreed to data collection."
    : `Please tick the checkbox that says: ${TEXT_CONSENT_LABEL}.`;

  // Stops after the consent state — does not say whether the button is disabled
  return [
    `${TEXT_APP_NAME}. ${TEXT_APP_SUBTITLE}.`,
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
  const diffOptions = DIFFICULTIES.map(d => `${d.label}: ${d.desc}.`).join(" ");
  const selected    = selectedDifficulty
    ? `You have selected: ${selectedDifficulty}.`
    : "No difficulty selected yet.";
  const btnState    = selectedDifficulty
    ? `Tap ${TEXT_START_BTN} to begin.`
    : TEXT_HOME_HINT;

  return [
    TEXT_HOME_CHOOSE + ".",
    TEXT_HOME_CAPTION,
    diffOptions,
    selected,
    btnState,
    `Your selected age range is ${ageRange}.`,
    TEXT_HOME_FOOTER,
  ].join(" ");
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HomeScreen({ onStart }) {
  const [screen, setScreen]                   = useState("landing");
  const [ageRange, setAgeRange]               = useState("");
  const [consentGiven, setConsentGiven]       = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [starting, setStarting]               = useState(false);
  // Speech speed — initialised from localStorage so it persists across sessions
  const [speechRate, setSpeechRate] = useState(getSpeechRate);
  // Auto-read — if true, each screen speaks automatically after a short delay
  const [autoRead, setAutoRead] = useState(getAutoRead);

  // Updates the speech rate in state, persists it, and restarts any
  // speech currently in progress at the new speed.
  const handleSpeedChange = (rate) => {
    setSpeechRate(rate);
    saveSpeechRate(rate);
    // If something is currently playing, restart it at the new rate.
    // 50ms delay lets saveSpeechRate commit before speak() reads it.
    if (_lastSpokenText && window.speechSynthesis?.speaking) {
      setTimeout(() => speak(_lastSpokenText), 50);
    }
  };

  const handleAutoReadToggle = () => {
    const next = !autoRead;
    setAutoRead(next);
    saveAutoRead(next);
  };

  // ── Screen: Landing ─────────────────────────────────────────────────────────
  // Auto-read: speak the landing page content after a 1.5s delay when screen loads
  useEffect(() => {
    if (!autoRead) return;
    const timer = setTimeout(() => trackAndSpeak(buildLandingScript(ageRange, consentGiven)), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Auto-read: speak the home page content after a 1.5s delay
  useEffect(() => {
    if (screen !== "home" || !autoRead) return;
    const timer = setTimeout(() => trackAndSpeak(buildHomeScript(ageRange, selectedDifficulty)), 1500);
    return () => clearTimeout(timer);
  }, [screen]);

  if (screen === "landing") {
    const canBegin = ageRange !== "" && consentGiven;

    return (
      <Wrapper>
        {/* Header row — logo, speed selector, and 🔊 button */}
        <div style={styles.headerRow}>
          <Logo />
          <div style={styles.speechControls}>
            {/* Speed selector — saves to localStorage so it persists */}
            {SPEECH_SPEEDS.map(s => (
              <button
                key={s.label}
                onClick={() => handleSpeedChange(s.rate)}
                style={{
                  ...styles.speedBtn,
                  background:  speechRate === s.rate ? "#3D1580" : "#fff",
                  color:       speechRate === s.rate ? "#fff"    : "#3D1580",
                  borderColor: "#3D1580",
                }}
                title={`Set reading speed to ${s.label}`}
                aria-label={`Set reading speed to ${s.label}`}
              >
                {s.label}
              </button>
            ))}
            {/* Auto-read toggle — persists to localStorage */}
            <button
              onClick={handleAutoReadToggle}
              style={{
                ...styles.speedBtn,
                background:  autoRead ? "#2D6A4F" : "#fff",
                color:       autoRead ? "#fff"    : "#2D6A4F",
                borderColor: "#2D6A4F",
              }}
              title={autoRead ? "Turn off auto-read" : "Turn on auto-read"}
              aria-label={autoRead ? "Turn off auto-read" : "Turn on auto-read"}
            >
              {autoRead ? "Auto ✓" : "Auto"}
            </button>
            <SpeakButton
              onClick={() => trackAndSpeak(buildLandingScript(ageRange, consentGiven))}
              label="Read everything on this page aloud"
            />
          </div>
        </div>

        <Spacer h={24} />
        {/* TEXT_TAGLINE drives both the display and the speech */}
        <p style={styles.tagline}>{TEXT_TAGLINE}</p>

        <Spacer h={36} />
        <Divider />
        <Spacer h={36} />

        {/* Age range selector */}
        <label style={styles.label}>{TEXT_AGE_LABEL}</label>
        <Spacer h={10} />
        <p style={styles.caption}>{TEXT_AGE_CAPTION}</p>
        <Spacer h={16} />

        <div style={styles.ageGrid}>
          {AGE_RANGES.map(range => (
            <button
              key={range}
              onClick={() => setAgeRange(range)}
              style={{
                ...styles.ageBtn,
                background: ageRange === range ? "#3D1580" : "#fff",
                color:      ageRange === range ? "#fff"    : "#3D1580",
              }}
            >
              {range}
            </button>
          ))}
        </div>

        <Spacer h={36} />
        <Divider />
        <Spacer h={36} />

        {/* Data notice */}
        <div style={styles.noticeBox}>
          <p style={styles.noticeTitle}>{TEXT_NOTICE_TITLE}</p>
          <Spacer h={10} />
          <p style={styles.noticeBody}>{TEXT_NOTICE_BODY}</p>
          <Spacer h={18} />
          <label style={styles.checkLabel}>
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={e => setConsentGiven(e.target.checked)}
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
              {/* Hint text also comes from the same TEXT_ constants */}
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
      const sessionId     = await createSession(selectedDifficulty, ageRange);
      const shuffledScams = shuffle(SCAMS);
      onStart(selectedDifficulty, shuffledScams, ageRange, sessionId);
    };

    return (
      <Wrapper>
        {/* Header — logo + age pill, speed selector + 🔊 */}
        <div style={styles.headerRow}>
          <div style={styles.homeHeaderLeft}>
            <Logo small />
            <span style={styles.ageTag}>{ageRange}</span>
          </div>
          <div style={styles.speechControls}>
            {SPEECH_SPEEDS.map(s => (
              <button
                key={s.label}
                onClick={() => handleSpeedChange(s.rate)}
                style={{
                  ...styles.speedBtn,
                  background:  speechRate === s.rate ? "#3D1580" : "#fff",
                  color:       speechRate === s.rate ? "#fff"    : "#3D1580",
                  borderColor: "#3D1580",
                }}
                title={`Set reading speed to ${s.label}`}
                aria-label={`Set reading speed to ${s.label}`}
              >
                {s.label}
              </button>
            ))}
            <button
              onClick={handleAutoReadToggle}
              style={{
                ...styles.speedBtn,
                background:  autoRead ? "#2D6A4F" : "#fff",
                color:       autoRead ? "#fff"    : "#2D6A4F",
                borderColor: "#2D6A4F",
              }}
              title={autoRead ? "Turn off auto-read" : "Turn on auto-read"}
              aria-label={autoRead ? "Turn off auto-read" : "Turn on auto-read"}
            >
              {autoRead ? "Auto ✓" : "Auto"}
            </button>
            <SpeakButton
              onClick={() => trackAndSpeak(buildHomeScript(ageRange, selectedDifficulty))}
              label="Read this page aloud"
            />
          </div>
        </div>

        <Spacer h={32} />

        <p style={styles.label}>{TEXT_HOME_CHOOSE}</p>
        <Spacer h={6} />
        <p style={styles.caption}>{TEXT_HOME_CAPTION}</p>
        <Spacer h={20} />

        <div style={styles.diffList}>
          {DIFFICULTIES.map(d => {
            const isSelected = selectedDifficulty === d.key;
            return (
              <button
                key={d.key}
                onClick={() => setSelectedDifficulty(d.key)}
                style={{
                  ...styles.diffCard,
                  background:  isSelected ? d.bg    : "#fff",
                  borderColor: isSelected ? d.color : "#C9B8E8",
                  borderWidth: isSelected ? 2.5     : 1.5,
                }}
              >
                <div style={styles.diffCardInner}>
                  {/* d.label and d.desc come from DIFFICULTIES — same as speech */}
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

        <BigButton onClick={handleStart} disabled={!selectedDifficulty || starting}>
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
    <div style={{
      width: "100%",
      maxWidth: "100vw",
      boxSizing: "border-box",
      padding: "40px clamp(16px, 5vw, 60px) 60px",
      fontFamily: "'Georgia', serif",
    }}>
      {children}
    </div>
  );
}

function Logo({ small }) {
  return (
    <div>
      <p style={{
        fontSize: small ? 20 : 28,
        fontWeight: 700,
        color: "#1A3C5E",
        margin: 0,
        letterSpacing: "-0.5px",
        fontFamily: "'Georgia', serif",
      }}>
        🛡️ {TEXT_APP_NAME}
      </p>
      {!small && (
        <p style={{
          fontSize: 15,
          color: "#666",
          margin: "6px 0 0",
          fontFamily: "sans-serif",
        }}>
          {TEXT_APP_SUBTITLE}
        </p>
      )}
    </div>
  );
}

function SpeakButton({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={styles.speakBtn}
      title={label}
      aria-label={label}
    >
      🔊
    </button>
  );
}

function Divider() {
  return (
    <hr style={{
      border: "none",
      borderTop: "1.5px solid #E0E8F0",
      margin: 0,
    }} />
  );
}

function BigButton({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "18px 24px",
        fontSize: 18,
        fontWeight: 600,
        fontFamily: "sans-serif",
        background: disabled ? "#D0D8E0" : "#3D1580",
        color: disabled ? "#888" : "#fff",
        border: "none",
        borderRadius: 10,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.2s",
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
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  homeHeaderLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  // Row holding the speed buttons and the 🔊 button together
  speechControls: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  // Individual speed selector button (Slow / Normal / Fast)
  speedBtn: {
    padding: "5px 10px",
    fontSize: 13,
    fontWeight: 600,
    border: "1.5px solid",
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: "sans-serif",
    transition: "background 0.15s, color 0.15s",
  },
  speakBtn: {
    background: "none",
    border: "1.5px solid #D0D8E0",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 20,
    cursor: "pointer",
    flexShrink: 0,
  },
  tagline: {
    fontSize: 19,
    lineHeight: 1.75,
    color: "#333",
    margin: 0,
    fontFamily: "sans-serif",
  },
  label: {
    fontSize: 18,
    fontWeight: 600,
    color: "#3D1580",
    display: "block",
    fontFamily: "sans-serif",
    lineHeight: 1.4,
    margin: 0,
  },
  caption: {
    fontSize: 15,
    color: "#666",
    margin: 0,
    lineHeight: 1.6,
    fontFamily: "sans-serif",
  },
  ageGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
    gap: 10,
  },
  ageBtn: {
    flex: "1 1 auto",
    padding: "12px 10px",
    fontSize: 15,
    fontWeight: 600,
    border: "2px solid #3D1580",
    borderRadius: 8,
    cursor: "pointer",
    fontFamily: "sans-serif",
    textAlign: "center",
    transition: "background 0.15s, color 0.15s",
  },
  noticeBox: {
    background: "#FAF7FF",
    border: "1.5px solid #C9B8E8",
    borderRadius: 10,
    padding: "22px 24px",
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#3D1580",
    margin: 0,
    fontFamily: "sans-serif",
  },
  noticeBody: {
    fontSize: 15,
    lineHeight: 1.7,
    color: "#333",
    margin: 0,
    fontFamily: "sans-serif",
  },
  checkLabel: {
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    fontSize: 16,
    color: "#3D1580",
    cursor: "pointer",
    fontFamily: "sans-serif",
    lineHeight: 1.5,
  },
  checkbox: {
    width: 24,
    height: 24,
    marginTop: 1,
    cursor: "pointer",
    flexShrink: 0,
    accentColor: "#3D1580",
  },
  hint: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    margin: 0,
    fontFamily: "sans-serif",
    fontStyle: "italic",
  },
  ageTag: {
    fontSize: 13,
    fontWeight: 600,
    color: "#3D1580",
    background: "#EDE8F8",
    border: "1.5px solid #C9B8E8",
    borderRadius: 20,
    padding: "4px 12px",
    fontFamily: "sans-serif",
    alignSelf: "flex-start",
  },
  diffList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  diffCard: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "18px 20px",
    border: "solid",
    borderRadius: 10,
    cursor: "pointer",
    textAlign: "left",
    transition: "background 0.15s, border-color 0.15s",
    boxSizing: "border-box",
  },
  diffCardInner: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  diffLabel: {
    fontSize: 18,
    fontWeight: 700,
    fontFamily: "sans-serif",
  },
  diffDesc: {
    fontSize: 14,
    fontFamily: "sans-serif",
    color: "#555",
    lineHeight: 1.4,
  },
  diffCheck: {
    fontSize: 22,
    fontWeight: 700,
    fontFamily: "sans-serif",
  },
  footer: {
    fontSize: 13,
    color: "#999",
    lineHeight: 1.6,
    textAlign: "center",
    fontFamily: "sans-serif",
    margin: 0,
  },
};