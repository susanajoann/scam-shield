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

const TEXT_APP_NAME = "ScamSavvy";
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

// ─── Speech speed options ────────────────────────────────────────────────────
// Each option has a label shown on the button and a rate passed to the
// Web Speech API. 1.0 is the browser default; lower is slower.
const SPEECH_SPEEDS = [
  { label: "Slow", rate: 0.65 },
  { label: "Normal", rate: 0.88 },
  { label: "Fast", rate: 1.1 },
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
  try {
    localStorage.setItem(SPEECH_SPEED_KEY, String(rate));
  } catch {}
}

// ─── Auto-read setting ────────────────────────────────────────────────────────
// When auto-read is on, each new screen speaks its content automatically
// after a short delay, without the user needing to tap the 🔊 button.

const AUTO_READ_KEY = "scamshield_auto_read";

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
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  chunks.forEach((chunk, i) => {
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.rate = getSpeechRate(); // reads saved speed from localStorage
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
  const ageSelected = ageRange
    ? `You have selected: ${ageRange}.`
    : "You have not selected an age range yet.";
  const ageOptions = `The available options are: ${AGE_RANGES.join(", ")}.`;
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
  const diffOptions = DIFFICULTIES.map((d) => `${d.label}: ${d.desc}.`).join(
    " ",
  );
  const selected = selectedDifficulty
    ? `You have selected: ${selectedDifficulty}.`
    : "No difficulty selected yet.";
  const btnState = selectedDifficulty
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
  const [screen, setScreen] = useState("landing");
  const [ageRange, setAgeRange] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [starting, setStarting] = useState(false);
  // Speech speed — initialised from localStorage so it persists across sessions
  const [speechRate, setSpeechRate] = useState(getSpeechRate);
  // Auto-read — if true, each screen speaks automatically after a short delay
  const [autoRead, setAutoRead] = useState(getAutoRead);
  // Controls whether the audio settings panel is expanded
  const [audioOpen, setAudioOpen] = useState(false);

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
    const timer = setTimeout(
      () => trackAndSpeak(buildLandingScript(ageRange, consentGiven)),
      1500,
    );
    return () => clearTimeout(timer);
  }, []);

  // Auto-read: speak the home page content after a 1.5s delay
  useEffect(() => {
    if (screen !== "home" || !autoRead) return;
    const timer = setTimeout(
      () => trackAndSpeak(buildHomeScript(ageRange, selectedDifficulty)),
      1500,
    );
    return () => clearTimeout(timer);
  }, [screen]);

  if (screen === "landing") {
    const canBegin = ageRange !== "" && consentGiven;

    return (
      <Wrapper>
        {/* Header row — audio controls only, logo is in NavBar */}
        <div style={styles.headerRow}>
          <div style={styles.audioWrapper}>
            {/* Single 🔊 button — tapping expands speed/auto controls */}
            <button
              onClick={() => setAudioOpen((o) => !o)}
              style={{
                ...styles.speakBtn,
                background: audioOpen ? "#EDE8F8" : "none",
                position: "relative",
              }}
              title='Audio settings'
              aria-label='Audio settings'
            >
              🔊
            </button>
            {/* Expanded panel */}
            {audioOpen && (
              <div style={styles.audioPanel}>
                <p style={styles.audioPanelLabel}>Speed</p>
                <div style={styles.audioBtnRow}>
                  {SPEECH_SPEEDS.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => handleSpeedChange(s.rate)}
                      style={{
                        ...styles.speedBtn,
                        background: speechRate === s.rate ? "#3D1580" : "#fff",
                        color: speechRate === s.rate ? "#fff" : "#3D1580",
                        borderColor: "#3D1580",
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <div style={styles.audioBtnRow}>
                  <button
                    onClick={handleAutoReadToggle}
                    style={{
                      ...styles.speedBtn,
                      background: autoRead ? "#2D6A4F" : "#fff",
                      color: autoRead ? "#fff" : "#2D6A4F",
                      borderColor: "#2D6A4F",
                      flex: 1,
                    }}
                  >
                    {autoRead ? "Auto-read ON ✓" : "Auto-read OFF"}
                  </button>
                </div>
                <button
                  onClick={() => {
                    trackAndSpeak(buildLandingScript(ageRange, consentGiven));
                    setAudioOpen(false);
                  }}
                  style={{
                    ...styles.speedBtn,
                    width: "100%",
                    background: "#3D1580",
                    color: "#fff",
                    borderColor: "#3D1580",
                    marginTop: 4,
                  }}
                >
                  🔊 Read page aloud
                </button>
              </div>
            )}
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

        {/* Data notice */}
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
      const sessionId = await createSession(selectedDifficulty, ageRange);
      const shuffledScams = shuffle(SCAMS);
      onStart(selectedDifficulty, shuffledScams, ageRange, sessionId);
    };

    return (
      <Wrapper>
        {/* Header — age pill + audio controls, logo is in NavBar */}
        <div style={styles.headerRow}>
          <span style={styles.ageTag}>{ageRange}</span>
          <div style={styles.audioWrapper}>
            <button
              onClick={() => setAudioOpen((o) => !o)}
              style={{
                ...styles.speakBtn,
                background: audioOpen ? "#EDE8F8" : "none",
              }}
              title='Audio settings'
              aria-label='Audio settings'
            >
              🔊
            </button>
            {audioOpen && (
              <div style={styles.audioPanel}>
                <p style={styles.audioPanelLabel}>Speed</p>
                <div style={styles.audioBtnRow}>
                  {SPEECH_SPEEDS.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => handleSpeedChange(s.rate)}
                      style={{
                        ...styles.speedBtn,
                        background: speechRate === s.rate ? "#3D1580" : "#fff",
                        color: speechRate === s.rate ? "#fff" : "#3D1580",
                        borderColor: "#3D1580",
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <div style={styles.audioBtnRow}>
                  <button
                    onClick={handleAutoReadToggle}
                    style={{
                      ...styles.speedBtn,
                      background: autoRead ? "#2D6A4F" : "#fff",
                      color: autoRead ? "#fff" : "#2D6A4F",
                      borderColor: "#2D6A4F",
                      flex: 1,
                    }}
                  >
                    {autoRead ? "Auto-read ON ✓" : "Auto-read OFF"}
                  </button>
                </div>
                <button
                  onClick={() => {
                    trackAndSpeak(
                      buildHomeScript(ageRange, selectedDifficulty),
                    );
                    setAudioOpen(false);
                  }}
                  style={{
                    ...styles.speedBtn,
                    width: "100%",
                    background: "#3D1580",
                    color: "#fff",
                    borderColor: "#3D1580",
                    marginTop: 4,
                  }}
                >
                  🔊 Read page aloud
                </button>
              </div>
            )}
          </div>
        </div>

        <Spacer h={32} />

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
        padding: "40px clamp(16px, 5vw, 60px) 60px",
        fontFamily: "'Georgia', serif",
      }}
    >
      {children}
    </div>
  );
}

function Logo({ small }) {
  return (
    <div>
      {small ? (
        <p
          style={{
            fontSize: "clamp(20px, 3vw, 26px)",
            fontWeight: 700,
            margin: 0,
            fontFamily: "Georgia, serif",
            letterSpacing: "-0.5px",
            lineHeight: 1,
          }}
        >
          <span style={{ color: "#3D1580" }}>Scam</span>
          <span style={{ color: "#C8952A" }}>Savvy</span>
        </p>
      ) : (
        <div>
          <p
            style={{
              fontSize: "clamp(36px, 5vw, 52px)",
              fontWeight: 700,
              margin: 0,
              fontFamily: "Georgia, serif",
              letterSpacing: "-1px",
              lineHeight: 1,
            }}
          >
            <span style={{ color: "#3D1580" }}>Scam</span>
            <span style={{ color: "#C8952A" }}>Savvy</span>
          </p>
          <div
            style={{
              height: 2,
              background: "#C8952A",
              opacity: 0.5,
              margin: "10px 0 7px",
              width: "100%",
            }}
          />
          <p
            style={{
              fontSize: "clamp(11px, 1.5vw, 13px)",
              color: "#7A5FAA",
              margin: 0,
              fontFamily: "sans-serif",
              letterSpacing: "2.5px",
            }}
          >
            {TEXT_APP_SUBTITLE.toUpperCase()}
          </p>
        </div>
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
    <hr
      style={{
        border: "none",
        borderTop: "1.5px solid #E0E8F0",
        margin: 0,
      }}
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
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 12,
  },
  homeHeaderLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  // Wrapper for the compact audio toggle button + dropdown panel
  audioWrapper: {
    position: "relative",
    flexShrink: 0,
  },
  // Dropdown panel that appears when the 🔊 button is tapped
  audioPanel: {
    position: "fixed",
    top: 64,
    right: "clamp(12px, 4vw, 48px)",
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
  },
  audioPanelLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "#7A5FAA",
    margin: 0,
    fontFamily: "sans-serif",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
  },
  audioBtnRow: {
    display: "flex",
    gap: 6,
  },
  // Individual speed selector button
  speedBtn: {
    padding: "7px 12px",
    fontSize: "clamp(13px, 3vw, 15px)",
    fontWeight: 600,
    border: "1.5px solid",
    borderRadius: 8,
    cursor: "pointer",
    fontFamily: "sans-serif",
    transition: "background 0.15s, color 0.15s",
    whiteSpace: "nowrap",
  },
  speakBtn: {
    background: "none",
    border: "1.5px solid #C9B8E8",
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 22,
    cursor: "pointer",
    flexShrink: 0,
  },
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
    alignSelf: "flex-start",
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
