// ─────────────────────────────────────────────────────────────────────────────
// analytics.js
//
// Handles all data collection for the ScamSavvy research project.
// Sends anonymous session and answer data to a Supabase database.
//
// ── CREDENTIALS ──────────────────────────────────────────────────────────────
// Credentials are read from environment variables — never hardcoded.
// In your .env file at the project root:
//
//   VITE_SUPABASE_URL=https://your-project.supabase.co
//   VITE_SUPABASE_ANON_KEY=eyJ...
//
// ── SUPABASE RLS POLICIES REQUIRED ───────────────────────────────────────────
// Run this SQL in Supabase → SQL Editor if not already done:
//
//   ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
//   ALTER TABLE answers  ENABLE ROW LEVEL SECURITY;
//
//   CREATE POLICY "Allow anonymous inserts" ON sessions
//     AS PERMISSIVE FOR INSERT TO anon WITH CHECK (true);
//
//   CREATE POLICY "Allow anonymous inserts" ON answers
//     AS PERMISSIVE FOR INSERT TO anon WITH CHECK (true);
//
//   CREATE POLICY "Allow anonymous updates" ON sessions
//     AS PERMISSIVE FOR UPDATE TO anon USING (true) WITH CHECK (true);
//
// ─────────────────────────────────────────────────────────────────────────────

// ─── Configuration ────────────────────────────────────────────────────────────

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const API_BASE          = `${SUPABASE_URL}/rest/v1`;

// Headers for INSERT requests (POST)
// return=minimal keeps responses fast — no body returned on success
const INSERT_HEADERS = {
  apikey:         SUPABASE_ANON_KEY,
  Authorization:  `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
  Prefer:         "return=minimal",
};

// Headers for UPDATE requests (PATCH)
// return=representation asks Supabase to return the updated row,
// which confirms the update actually applied rather than silently matching zero rows.
const UPDATE_HEADERS = {
  apikey:         SUPABASE_ANON_KEY,
  Authorization:  `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
  Prefer:         "return=representation",
};

// ─── ID generation ────────────────────────────────────────────────────────────

// Generates a UUID v4 to uniquely identify each session.
// Uses the browser's crypto API, with a Math.random() fallback for older browsers.
function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

// Sends a POST (INSERT) request to a Supabase table.
// Returns true on success, false on failure.
// Errors are logged but never thrown — analytics failure should never
// interrupt the user's quiz experience.
async function insertRow(table, data) {
  try {
    const response = await fetch(`${API_BASE}/${table}`, {
      method:  "POST",
      headers: INSERT_HEADERS,
      body:    JSON.stringify(data),
    });
    if (!response.ok) {
      const text = await response.text();
      console.warn(`[analytics] Failed to insert into ${table}:`, response.status, text);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[analytics] Network error inserting into ${table}:`, err);
    return false;
  }
}

// Sends a PATCH (UPDATE) request to a Supabase table.
// Uses UPDATE_HEADERS with return=representation so we can confirm the
// update actually matched and changed a row.
// Returns the updated row object on success, null on failure.
async function updateRow(table, filter, data) {
  try {
    const response = await fetch(`${API_BASE}/${table}?${filter}`, {
      method:  "PATCH",
      headers: UPDATE_HEADERS,
      body:    JSON.stringify(data),
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn(`[analytics] Failed to update ${table}:`, response.status, text);
      return null;
    }

    const result = await response.json();

    // If result is an empty array, the filter matched zero rows —
    // the update silently did nothing. Log this so it's easy to debug.
    if (Array.isArray(result) && result.length === 0) {
      console.warn(`[analytics] Update matched zero rows in ${table} with filter: ${filter}`);
      return null;
    }

    return result;
  } catch (err) {
    console.warn(`[analytics] Network error updating ${table}:`, err);
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

// createSession
// ─────────────
// Call this when the user taps "Start quiz" on the home screen.
// Creates a row in the sessions table and returns the session_id UUID.
// Pass the returned sessionId into recordAnswer() and completeSession().
//
// Parameters:
//   difficulty — "easy" | "medium" | "hard"
//   ageRange   — e.g. "65–74"
export async function createSession(difficulty, ageRange) {
  const sessionId = generateUUID();
  const startedAt = new Date().toISOString();
  await insertRow("sessions", {
    session_id: sessionId,
    age_range:  ageRange,
    difficulty: difficulty,
    completed:  false,
    started_at: startedAt,
  });
  // Return both so the quiz screen can pass startedAt to completeSession
  return { sessionId, startedAt };
}

// recordAnswer
// ────────────
// Call this after the user answers each question.
// Inserts one row into the answers table.
//
// Parameters:
//   sessionId — UUID returned by createSession()
//   answer    — object with:
//     scamId      (string)  — e.g. "phishing"
//     questionId  (string)  — e.g. "ph-e1"
//     ageRange    (string)  — e.g. "65–74"
//     difficulty  (string)  — "easy" | "medium" | "hard"
//     correct     (boolean) — whether the answer was correct
//     timeTaken   (number)  — seconds spent on this question
export async function recordAnswer(sessionId, answer) {
  await insertRow("answers", {
    session_id:  sessionId,
    scam_id:     answer.scamId,
    question_id: answer.questionId,
    age_range:   answer.ageRange,
    difficulty:  answer.difficulty,
    correct:     answer.correct,
    time_taken:  answer.timeTaken,
    started_at:  answer.startedAt,
    finished_at: answer.finishedAt,
  });
}

// completeSession
// ───────────────
// Call this when the user answers the final question.
// Updates the session row to completed: true and records total_time.
// If the user quits early this is never called — completed stays false.
//
// Parameters:
//   sessionId — UUID returned by createSession()
//   totalTime — total seconds from quiz start to final answer
export async function completeSession(sessionId, totalTime, ageRange, difficulty, startedAt) {
  try {console.log
    const response = await fetch(
      `${API_BASE}/sessions?session_id=eq.${sessionId}`,
      {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          completed:   true,
          total_time:  totalTime,
          finished_at: new Date().toISOString(),
        }),
      }
    );
    const text = await response.text();
  } catch (err) {
    console.warn("[analytics] Network error completing session:", err);
  }
}