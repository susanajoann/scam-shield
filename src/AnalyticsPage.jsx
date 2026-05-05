// ─────────────────────────────────────────────────────────────────────────────
// AnalyticsPage.jsx
//
// Research analytics dashboard — pulls live data from Supabase and renders
// interactive charts using Recharts (bundled with the app, no CDN needed).
//
// Charts:
//   1. Summary metrics — total answers, sessions, completion rate, accuracy
//   2. Accuracy by scam type
//   3. Accuracy by age range
//   4. Average time taken per question by scam type
//   5. Average time taken by difficulty
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  ScatterChart,
  Scatter,
  ZAxis,
  Legend,
} from "recharts";

// ─── Supabase credentials (read from env) ────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ─── Constants ────────────────────────────────────────────────────────────────

const SCAM_NAMES = {
  phishing: "Phishing & Spoofing",
  techsupport: "Tech Support",
  investment: "Investment Fraud",
  romance: "Romance Scams",
  govimpersonation: "Gov. Impersonation",
};

const AGE_ORDER = [
  "Under 18",
  "18–24",
  "25–34",
  "35–44",
  "45–54",
  "55–64",
  "65–74",
  "75+",
];

const AGE_COLORS = {
  "Under 18": "#9B2335",
  "18–24": "#B5621A",
  "25–34": "#C8952A",
  "35–44": "#2D6A4F",
  "45–54": "#1A6B8A",
  "55–64": "#3D1580",
  "65–74": "#7A1A7A",
  "75+": "#555555",
};

// Difficulty shapes rendered as custom dots
const DIFF_SHAPES = {
  easy: "circle",
  medium: "diamond",
  hard: "triangle",
};

const PURPLE = "#3D1580";
const GOLD = "#C8952A";
const MUTED = "#7A5FAA";
const RED = "#9B2335";
const ORANGE = "#B5621A";
const GREEN = "#2D6A4F";

// Returns a colour based on accuracy percentage
function accuracyColor(pct) {
  if (pct >= 80) return GREEN;
  if (pct >= 50) return ORANGE;
  return RED;
}

// ─── Supabase fetch ───────────────────────────────────────────────────────────

async function fetchTable(tableName) {
  const url = `${SUPABASE_URL}/rest/v1/${tableName}?select=*`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Range: "0-9999",
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${tableName}: ${res.status}`);
  return res.json();
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AnalyticsPage({ readScriptRef }) {
  const [answers, setAnswers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selDifficulty, setSelDifficulty] = useState("all");
  const [selAge, setSelAge] = useState("all");

  useEffect(() => {
    Promise.all([
      fetchTable("answers"),
      fetchTable("sessions"),
      fetchTable("leaderboard_by_difficulty"),
    ])
      .then(([ans, sess, lb]) => {
        setAnswers(ans);
        setSessions(sess);
        setLeaderboard(lb);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Register read script with NavBar once data is loaded
  useEffect(() => {
    if (!readScriptRef) return;
    if (loading) {
      readScriptRef.current = () =>
        "Loading research data from the database. Please wait.";
      return;
    }
    if (!answers.length) {
      readScriptRef.current = () =>
        "No answer data yet. Complete a quiz session to see results here.";
      return;
    }
    const totalAnswers = answers.length;
    const totalSessions = sessions.length;
    const completedSess = sessions.filter((s) => s.completed).length;
    const overallAccuracy = answers.length
      ? Math.round(
          (answers.filter((a) => a.correct).length / answers.length) * 100,
        )
      : 0;
    readScriptRef.current = () =>
      `Research Dashboard. Live data from Supabase. ` +
      `Total answers recorded: ${totalAnswers}. ` +
      `Total sessions: ${totalSessions}. ` +
      `Completed sessions: ${completedSess}. ` +
      `Overall accuracy: ${overallAccuracy} percent. ` +
      `Use the filters on screen to narrow results by difficulty or age range.`;
  }, [loading, answers.length, sessions.length]);

  if (loading)
    return (
      <PageWrapper>
        <p style={s.loading}>Loading data from Supabase…</p>
      </PageWrapper>
    );
  if (error)
    return (
      <PageWrapper>
        <p style={s.error}>Error: {error}</p>
      </PageWrapper>
    );
  if (!answers.length)
    return (
      <PageWrapper>
        <p style={s.empty}>
          No answer data yet. Complete a quiz session to see results here.
        </p>
      </PageWrapper>
    );

  // ── Filter answers ──────────────────────────────────────────────────────────
  const filtered = answers.filter((a) => {
    if (selDifficulty !== "all" && a.difficulty !== selDifficulty) return false;
    if (selAge !== "all" && a.age_range !== selAge) return false;
    return true;
  });

  // ── Summary metrics ─────────────────────────────────────────────────────────
  const totalAnswers = filtered.length;
  const totalSessions = sessions.length;
  const completedSess = sessions.filter((s) => s.completed).length;
  const overallAccuracy = filtered.length
    ? Math.round(
        (filtered.filter((a) => a.correct).length / filtered.length) * 100,
      )
    : 0;

  // ── Chart 1: Accuracy by scam type ─────────────────────────────────────────
  const scamGroups = {};
  filtered.forEach((a) => {
    if (!scamGroups[a.scam_id])
      scamGroups[a.scam_id] = { correct: 0, total: 0 };
    scamGroups[a.scam_id].total++;
    if (a.correct) scamGroups[a.scam_id].correct++;
  });
  const scamData = Object.entries(scamGroups)
    .map(([id, g]) => ({
      name: SCAM_NAMES[id] ?? id,
      pct: Math.round((g.correct / g.total) * 100),
      correct: g.correct,
      total: g.total,
    }))
    .sort((a, b) => a.pct - b.pct);

  // ── Chart 2: Accuracy by age range ─────────────────────────────────────────
  const ageGroups = {};
  filtered.forEach((a) => {
    if (!ageGroups[a.age_range])
      ageGroups[a.age_range] = { correct: 0, total: 0 };
    ageGroups[a.age_range].total++;
    if (a.correct) ageGroups[a.age_range].correct++;
  });
  const ageData = AGE_ORDER.filter((age) => ageGroups[age]).map((age) => ({
    name: age,
    pct: Math.round((ageGroups[age].correct / ageGroups[age].total) * 100),
    correct: ageGroups[age].correct,
    total: ageGroups[age].total,
  }));

  // ── Chart 3: Avg time by scam type ─────────────────────────────────────────
  const scamTime = {};
  filtered.forEach((a) => {
    if (!a.time_taken) return;
    if (!scamTime[a.scam_id]) scamTime[a.scam_id] = { sum: 0, count: 0 };
    scamTime[a.scam_id].sum += a.time_taken;
    scamTime[a.scam_id].count++;
  });
  const timeData = Object.entries(scamTime)
    .map(([id, g]) => ({
      name: SCAM_NAMES[id] ?? id,
      avg: Math.round(g.sum / g.count),
    }))
    .sort((a, b) => b.avg - a.avg);

  // ── Chart 4: Avg time by difficulty ────────────────────────────────────────
  const diffTime = {};
  filtered.forEach((a) => {
    if (!a.time_taken) return;
    if (!diffTime[a.difficulty]) diffTime[a.difficulty] = { sum: 0, count: 0 };
    diffTime[a.difficulty].sum += a.time_taken;
    diffTime[a.difficulty].count++;
  });
  const diffData = ["easy", "medium", "hard"]
    .filter((d) => diffTime[d])
    .map((d) => ({
      name: d.charAt(0).toUpperCase() + d.slice(1),
      avg: Math.round(diffTime[d].sum / diffTime[d].count),
      color: d === "easy" ? GREEN : d === "medium" ? ORANGE : RED,
    }));

  // ── Unique filter options ───────────────────────────────────────────────────
  const difficulties = [...new Set(answers.map((a) => a.difficulty))].sort();
  const ageRanges = AGE_ORDER.filter((a) =>
    answers.some((r) => r.age_range === a),
  );

  return (
    <PageWrapper>
      <h1 style={s.pageTitle}>Research Dashboard</h1>
      <p style={s.pageSubtitle}>
        Live data from Supabase. Reload the page to refresh.
      </p>

      {/* ── Filters ── */}
      <div style={s.filterRow}>
        <div style={s.filterGroup}>
          <label style={s.filterLabel}>Difficulty</label>
          <select
            value={selDifficulty}
            onChange={(e) => setSelDifficulty(e.target.value)}
            style={s.select}
          >
            <option value='all'>All</option>
            {difficulties.map((d) => (
              <option key={d} value={d}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div style={s.filterGroup}>
          <label style={s.filterLabel}>Age range</label>
          <select
            value={selAge}
            onChange={(e) => setSelAge(e.target.value)}
            style={s.select}
          >
            <option value='all'>All</option>
            {ageRanges.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <p style={s.filterCount}>
          {totalAnswers.toLocaleString()} answers shown
        </p>
      </div>

      {/* ── Summary metrics ── */}
      <div style={s.metricsRow}>
        <Metric label='Total answers' value={totalAnswers.toLocaleString()} />
        <Metric label='Total sessions' value={totalSessions} />
        <Metric label='Completed sessions' value={completedSess} />
        <Metric
          label='Overall accuracy'
          value={`${overallAccuracy}%`}
          color={accuracyColor(overallAccuracy)}
        />
      </div>

      <Divider />

      {/* ── Chart 1: Accuracy by scam type ── */}
      <SectionTitle>Accuracy by scam type</SectionTitle>
      <p style={s.chartCaption}>
        Percentage of correct answers for each scam category. Sorted lowest to
        highest.
      </p>
      {scamData.length ? (
        <ResponsiveContainer width='100%' height={300}>
          <BarChart
            data={scamData}
            layout='vertical'
            margin={{ left: 10, right: 60, top: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray='3 3' horizontal={false} />
            <XAxis
              type='number'
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={s.axisTick}
            />
            <YAxis
              type='category'
              dataKey='name'
              width={160}
              tick={s.axisTick}
            />
            <Tooltip
              formatter={(v, n, p) => [
                `${v}% (${p.payload.correct}/${p.payload.total})`,
                "Accuracy",
              ]}
            />
            <Bar dataKey='pct' radius={[0, 4, 4, 0]}>
              <LabelList
                dataKey='pct'
                position='right'
                formatter={(v) => `${v}%`}
                style={{ fontSize: 13, fontFamily: "sans-serif" }}
              />
              {scamData.map((entry, i) => (
                <Cell key={i} fill={accuracyColor(entry.pct)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p style={s.empty}>No data for this filter.</p>
      )}

      <Divider />

      {/* ── Chart 2: Accuracy by age range ── */}
      <SectionTitle>Accuracy by age range</SectionTitle>
      <p style={s.chartCaption}>
        Percentage of correct answers broken down by respondent age group.
      </p>
      {ageData.length ? (
        <ResponsiveContainer width='100%' height={300}>
          <BarChart
            data={ageData}
            margin={{ left: 10, right: 20, top: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray='3 3' vertical={false} />
            <XAxis dataKey='name' tick={s.axisTick} />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={s.axisTick}
            />
            <Tooltip
              formatter={(v, n, p) => [
                `${v}% (${p.payload.correct}/${p.payload.total})`,
                "Accuracy",
              ]}
            />
            <Bar dataKey='pct' radius={[4, 4, 0, 0]}>
              <LabelList
                dataKey='pct'
                position='top'
                formatter={(v) => `${v}%`}
                style={{ fontSize: 13, fontFamily: "sans-serif" }}
              />
              {ageData.map((entry, i) => (
                <Cell key={i} fill={accuracyColor(entry.pct)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p style={s.empty}>No data for this filter.</p>
      )}

      <Divider />

      {/* ── Chart 3: Avg time by scam ── */}
      <SectionTitle>Average time per question by scam type</SectionTitle>
      <p style={s.chartCaption}>
        Longer times may indicate more difficult or confusing content.
      </p>
      {timeData.length ? (
        <ResponsiveContainer width='100%' height={280}>
          <BarChart
            data={timeData}
            margin={{ left: 10, right: 20, top: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray='3 3' vertical={false} />
            <XAxis dataKey='name' tick={s.axisTick} />
            <YAxis tickFormatter={(v) => `${v}s`} tick={s.axisTick} />
            <Tooltip formatter={(v) => [`${v}s`, "Avg. time"]} />
            <Bar dataKey='avg' fill={PURPLE} radius={[4, 4, 0, 0]}>
              <LabelList
                dataKey='avg'
                position='top'
                formatter={(v) => `${v}s`}
                style={{ fontSize: 13, fontFamily: "sans-serif" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p style={s.empty}>No time data for this filter.</p>
      )}

      {/* ── Chart 4: Avg time by difficulty ── */}
      <p style={s.chartCaption} id='diff-time'>
        Average time per question by difficulty level.
      </p>
      {diffData.length ? (
        <ResponsiveContainer width='100%' height={240}>
          <BarChart
            data={diffData}
            margin={{ left: 10, right: 20, top: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray='3 3' vertical={false} />
            <XAxis dataKey='name' tick={s.axisTick} />
            <YAxis tickFormatter={(v) => `${v}s`} tick={s.axisTick} />
            <Tooltip formatter={(v) => [`${v}s`, "Avg. time"]} />
            <Bar dataKey='avg' radius={[4, 4, 0, 0]}>
              <LabelList
                dataKey='avg'
                position='top'
                formatter={(v) => `${v}s`}
                style={{ fontSize: 13, fontFamily: "sans-serif" }}
              />
              {diffData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : null}

      <Divider />

      {/* ── Scatter plot: Time vs Accuracy per session ── */}
      <SectionTitle>Time vs accuracy — all completed sessions</SectionTitle>
      <p style={s.chartCaption}>
        Each dot is one completed session. X axis = total time in seconds. Y
        axis = accuracy %. Colour = age range. Shape = difficulty (○ easy, ◇
        medium, △ hard).
      </p>
      {(() => {
        // Build scatter data by joining sessions with answers
        const scatterData = sessions
          .filter((sess) => sess.completed && sess.total_time != null)
          .map((sess) => {
            const sessAnswers = answers.filter(
              (a) => a.session_id === sess.session_id,
            );
            const total = sessAnswers.length;
            const correct = sessAnswers.filter((a) => a.correct).length;
            const accuracy =
              total > 0 ? Math.round((correct / total) * 100) : 0;
            return {
              x: sess.total_time,
              y: accuracy,
              ageRange: sess.age_range ?? "Unknown",
              difficulty: sess.difficulty ?? "easy",
            };
          });

        if (!scatterData.length)
          return <p style={s.empty}>No completed sessions yet.</p>;

        // Group by age range for separate Scatter series (for legend + colour)
        const byAge = {};
        scatterData.forEach((d) => {
          if (!byAge[d.ageRange]) byAge[d.ageRange] = [];
          byAge[d.ageRange].push(d);
        });

        // Custom dot renderer — shape by difficulty, colour by age range
        const CustomDot = (props) => {
          const { cx, cy, payload } = props;
          const color = AGE_COLORS[payload.ageRange] ?? "#888";
          const size = 8;
          if (payload.difficulty === "hard") {
            // Triangle
            return (
              <polygon
                points={`${cx},${cy - size} ${cx - size},${cy + size} ${cx + size},${cy + size}`}
                fill={color}
                fillOpacity={0.85}
                stroke='#fff'
                strokeWidth={1}
              />
            );
          }
          if (payload.difficulty === "medium") {
            // Diamond
            return (
              <polygon
                points={`${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`}
                fill={color}
                fillOpacity={0.85}
                stroke='#fff'
                strokeWidth={1}
              />
            );
          }
          // Circle (easy)
          return (
            <circle
              cx={cx}
              cy={cy}
              r={size - 1}
              fill={color}
              fillOpacity={0.85}
              stroke='#fff'
              strokeWidth={1}
            />
          );
        };

        return (
          <ResponsiveContainer width='100%' height={380}>
            <ScatterChart margin={{ left: 10, right: 20, top: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                type='number'
                dataKey='x'
                name='Time (s)'
                label={{
                  value: "Time (seconds)",
                  position: "insideBottom",
                  offset: -10,
                  fontSize: 13,
                }}
                tick={s.axisTick}
              />
              <YAxis
                type='number'
                dataKey='y'
                name='Accuracy'
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={s.axisTick}
                label={{
                  value: "Accuracy (%)",
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 13,
                }}
              />
              <ZAxis range={[60, 60]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ payload }) => {
                  if (!payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div
                      style={{
                        background: "#fff",
                        border: "1.5px solid #C9B8E8",
                        borderRadius: 8,
                        padding: "10px 14px",
                        fontSize: 13,
                        fontFamily: "sans-serif",
                      }}
                    >
                      <p
                        style={{ margin: 0, fontWeight: 600, color: "#3D1580" }}
                      >
                        {d.ageRange}
                      </p>
                      <p style={{ margin: "4px 0 0" }}>
                        Difficulty: {d.difficulty}
                      </p>
                      <p style={{ margin: "2px 0 0" }}>Time: {d.x}s</p>
                      <p style={{ margin: "2px 0 0" }}>Accuracy: {d.y}%</p>
                    </div>
                  );
                }}
              />
              <Legend
                verticalAlign='top'
                formatter={(value) => (
                  <span style={{ fontSize: 12, fontFamily: "sans-serif" }}>
                    {value}
                  </span>
                )}
              />
              {Object.entries(byAge).map(([age, data]) => (
                <Scatter
                  key={age}
                  name={age}
                  data={data}
                  shape={<CustomDot />}
                  fill={AGE_COLORS[age] ?? "#888"}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        );
      })()}

      <Divider />

      {/* ── Leaderboard ── */}
      <SectionTitle>
        Leaderboard — fastest completions per difficulty
      </SectionTitle>
      <p style={s.chartCaption}>
        Completed sessions only. Ranked by highest accuracy, then fastest time
        as a tiebreaker.
      </p>
      {["easy", "medium", "hard"].map((diff) => {
        // Pull directly from the Supabase view — already sorted by accuracy desc, time asc
        const diffRows = leaderboard
          .filter((r) => r.difficulty === diff)
          .slice(0, 10);

        if (!diffRows.length) return null;

        const medals = ["🥇", "🥈", "🥉"];
        const diffColor =
          diff === "easy" ? GREEN : diff === "medium" ? ORANGE : RED;

        return (
          <div key={diff} style={{ marginBottom: 32 }}>
            <p
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: diffColor,
                fontFamily: "sans-serif",
                margin: "0 0 10px",
              }}
            >
              {diff.charAt(0).toUpperCase() + diff.slice(1)}
            </p>
            <div style={s.tableWrapper}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {["Rank", "Age range", "Accuracy", "Time", "Finished"].map(
                      (h) => (
                        <th key={h} style={s.th}>
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {diffRows.map((row, i) => (
                    <tr
                      key={i}
                      style={{ background: i % 2 === 0 ? "#FAF7FF" : "#fff" }}
                    >
                      <td
                        style={{ ...s.td, fontWeight: 700, color: diffColor }}
                      >
                        {medals[i] ?? `#${i + 1}`}
                      </td>
                      <td style={s.td}>{row.age_range ?? "—"}</td>
                      <td
                        style={{
                          ...s.td,
                          fontWeight: 600,
                          color: accuracyColor(Number(row.accuracy_pct)),
                        }}
                      >
                        {row.accuracy_pct}%
                      </td>
                      <td style={s.td}>
                        {row.total_time < 60
                          ? `${row.total_time}s`
                          : `${Math.floor(row.total_time / 60)}m ${row.total_time % 60}s`}
                      </td>
                      <td style={s.td}>
                        {row.finished_at_est
                          ? new Date(row.finished_at_est).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      <p style={s.footer}>
        All data is anonymous. No personal information is stored or displayed.
      </p>
    </PageWrapper>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PageWrapper({ children }) {
  return (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "24px clamp(14px, 4vw, 64px) 80px",
        fontFamily: "sans-serif",
      }}
    >
      {children}
    </div>
  );
}

function Metric({ label, value, color }) {
  return (
    <div
      style={{
        flex: "1 1 140px",
        minWidth: "calc(50% - 6px)",
        background: "#FAF7FF",
        border: "1.5px solid #C9B8E8",
        borderRadius: 12,
        padding: "16px 18px",
        textAlign: "center",
        boxSizing: "border-box",
      }}
    >
      <p
        style={{
          fontSize: "clamp(24px, 5vw, 32px)",
          fontWeight: 700,
          color: color ?? PURPLE,
          margin: 0,
        }}
      >
        {value}
      </p>
      <p style={{ fontSize: 14, color: MUTED, margin: "6px 0 0" }}>{label}</p>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h2
      style={{
        fontSize: 20,
        fontWeight: 600,
        color: PURPLE,
        margin: "0 0 6px",
        fontFamily: "Georgia, serif",
      }}
    >
      {children}
    </h2>
  );
}

function Divider() {
  return (
    <hr
      style={{
        border: "none",
        borderTop: "1.5px solid #E8E0F5",
        margin: "32px 0",
      }}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  pageTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: PURPLE,
    margin: "0 0 6px",
    fontFamily: "Georgia, serif",
  },
  pageSubtitle: { fontSize: 14, color: MUTED, margin: "0 0 24px" },
  loading: { fontSize: 16, color: MUTED, padding: "40px 0" },
  error: { fontSize: 16, color: RED, padding: "40px 0" },
  empty: { fontSize: 15, color: MUTED, fontStyle: "italic", padding: "16px 0" },
  filterRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 24,
  },
  filterGroup: { display: "flex", flexDirection: "column", gap: 6 },
  filterLabel: { fontSize: 13, fontWeight: 600, color: MUTED },
  select: {
    fontSize: 15,
    padding: "8px 12px",
    border: "1.5px solid #C9B8E8",
    borderRadius: 8,
    background: "#fff",
    color: "#1A0A3C",
    cursor: "pointer",
  },
  filterCount: {
    fontSize: 13,
    color: MUTED,
    marginBottom: 2,
    alignSelf: "flex-end",
  },
  metricsRow: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8 },
  chartCaption: { fontSize: 14, color: "#555", margin: "0 0 16px" },
  axisTick: { fontSize: 13, fontFamily: "sans-serif", fill: "#555" },
  tableWrapper: { overflowX: "auto", WebkitOverflowScrolling: "touch" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: {
    textAlign: "left",
    padding: "clamp(7px, 2vw, 10px) clamp(8px, 2vw, 14px)",
    background: "#EDE8F8",
    color: PURPLE,
    fontWeight: 600,
    borderBottom: "2px solid #C9B8E8",
    fontSize: "clamp(12px, 3vw, 14px)",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "clamp(7px, 2vw, 9px) clamp(8px, 2vw, 14px)",
    borderBottom: "1px solid #E8E0F5",
    color: "#1A0A3C",
    fontSize: "clamp(12px, 3vw, 14px)",
  },
  footer: { fontSize: 13, color: "#999", marginTop: 32, textAlign: "center" },
};
