// ─────────────────────────────────────────────────────────────────────────────
// AnalyticsPage.jsx
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
} from "recharts";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function formatTime(secs) {
  if (!secs && secs !== 0) return "—";
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h}h ${m}m ${s}s`;
}

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

const DIFF_COLORS = { easy: "#2D6A4F", medium: "#B5621A", hard: "#9B2335" };

const AGE_SHAPES = {
  "Under 18": "circle",
  "18–24": "diamond",
  "25–34": "triangle",
  "35–44": "square",
  "45–54": "star",
  "55–64": "cross",
  "65–74": "pentagon",
  "75+": "hexagon",
};

const AGE_SHAPE_SYMBOLS = {
  circle: "○",
  diamond: "◇",
  triangle: "△",
  square: "□",
  star: "★",
  cross: "+",
  pentagon: "⬠",
  hexagon: "⬡",
};

const PURPLE = "#3D1580",
  GOLD = "#C8952A",
  MUTED = "#7A5FAA";
const RED = "#9B2335",
  ORANGE = "#B5621A",
  GREEN = "#2D6A4F";

function accuracyColor(pct) {
  if (pct >= 80) return GREEN;
  if (pct >= 50) return ORANGE;
  return RED;
}

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

// Custom dot — colour by difficulty, shape by age range
function CustomDot({ cx, cy, payload }) {
  const color = DIFF_COLORS[payload.difficulty] ?? "#888";
  const shape = AGE_SHAPES[payload.ageRange] ?? "circle";
  const size = 7;
  switch (shape) {
    case "diamond":
      return (
        <polygon
          points={`${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`}
          fill={color}
          fillOpacity={0.85}
          stroke='#fff'
          strokeWidth={1}
        />
      );
    case "triangle":
      return (
        <polygon
          points={`${cx},${cy - size} ${cx - size},${cy + size} ${cx + size},${cy + size}`}
          fill={color}
          fillOpacity={0.85}
          stroke='#fff'
          strokeWidth={1}
        />
      );
    case "square":
      return (
        <rect
          x={cx - size + 1}
          y={cy - size + 1}
          width={(size - 1) * 2}
          height={(size - 1) * 2}
          fill={color}
          fillOpacity={0.85}
          stroke='#fff'
          strokeWidth={1}
        />
      );
    case "star": {
      const pts = Array.from({ length: 5 }, (_, i) => {
        const a = ((i * 72 - 90) * Math.PI) / 180,
          a2 = ((i * 72 - 90 + 36) * Math.PI) / 180;
        return `${cx + size * Math.cos(a)},${cy + size * Math.sin(a)} ${cx + size * 0.45 * Math.cos(a2)},${cy + size * 0.45 * Math.sin(a2)}`;
      }).join(" ");
      return (
        <polygon
          points={pts}
          fill={color}
          fillOpacity={0.85}
          stroke='#fff'
          strokeWidth={1}
        />
      );
    }
    case "cross":
      return (
        <g>
          <rect
            x={cx - size}
            y={cy - 2}
            width={size * 2}
            height={4}
            fill={color}
            fillOpacity={0.85}
          />
          <rect
            x={cx - 2}
            y={cy - size}
            width={4}
            height={size * 2}
            fill={color}
            fillOpacity={0.85}
          />
        </g>
      );
    case "pentagon": {
      const pts = Array.from({ length: 5 }, (_, i) => {
        const a = ((i * 72 - 90) * Math.PI) / 180;
        return `${cx + size * Math.cos(a)},${cy + size * Math.sin(a)}`;
      }).join(" ");
      return (
        <polygon
          points={pts}
          fill={color}
          fillOpacity={0.85}
          stroke='#fff'
          strokeWidth={1}
        />
      );
    }
    case "hexagon": {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (i * 60 * Math.PI) / 180;
        return `${cx + size * Math.cos(a)},${cy + size * Math.sin(a)}`;
      }).join(" ");
      return (
        <polygon
          points={pts}
          fill={color}
          fillOpacity={0.85}
          stroke='#fff'
          strokeWidth={1}
        />
      );
    }
    default:
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
  }
}

export default function AnalyticsPage({ readScriptRef }) {
  const [answers, setAnswers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selDifficulty, setSelDifficulty] = useState("all");
  const [selAge, setSelAge] = useState("all");

  useEffect(() => {
    Promise.all([fetchTable("answers"), fetchTable("sessions")])
      .then(([ans, sess]) => {
        setAnswers(ans);
        setSessions(sess);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!readScriptRef) return;
    if (loading) {
      readScriptRef.current = () => "Loading research data. Please wait.";
      return;
    }
    if (!answers.length) {
      readScriptRef.current = () => "No answer data yet.";
      return;
    }
    const totalAnswers = answers.length;
    const totalSessions = sessions.length;
    const completedSess = sessions.filter((s) => s.completed).length;
    const overallAccuracy = Math.round(
      (answers.filter((a) => a.correct).length / answers.length) * 100,
    );
    readScriptRef.current = () =>
      `Research Dashboard. ${totalAnswers} answers. ${totalSessions} sessions. ${completedSess} completed. ${overallAccuracy} percent accuracy.`;
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
          No answer data yet. Complete a quiz to see results.
        </p>
      </PageWrapper>
    );

  // ── Filtered answers ────────────────────────────────────────────────────────
  const filtered = answers.filter((a) => {
    if (selDifficulty !== "all" && a.difficulty !== selDifficulty) return false;
    if (selAge !== "all" && a.age_range !== selAge) return false;
    return true;
  });

  // ── Filtered sessions (for scatter + leaderboard) ───────────────────────────
  const filteredSessions = sessions.filter((sess) => {
    if (selDifficulty !== "all" && sess.difficulty !== selDifficulty)
      return false;
    if (selAge !== "all" && sess.age_range !== selAge) return false;
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

  // ── Scatter data — uses filteredSessions ────────────────────────────────────
  const scatterData = filteredSessions
    .filter((sess) => sess.completed && sess.total_time != null)
    .map((sess) => {
      const sessAnswers = answers.filter(
        (a) => a.session_id === sess.session_id,
      );
      const total = sessAnswers.length;
      const correct = sessAnswers.filter((a) => a.correct).length;
      return {
        x: sess.total_time,
        y: total > 0 ? Math.round((correct / total) * 100) : 0,
        ageRange: sess.age_range ?? "Unknown",
        difficulty: sess.difficulty ?? "easy",
      };
    });

  // Group by age range for Scatter series
  const byAge = {};
  scatterData.forEach((d) => {
    if (!byAge[d.ageRange]) byAge[d.ageRange] = [];
    byAge[d.ageRange].push(d);
  });

  // ── Leaderboard — uses filteredSessions, calculates accuracy inline ─────────
  const buildLeaderboard = (diff) => {
    return filteredSessions
      .filter(
        (sess) =>
          sess.completed && sess.total_time != null && sess.difficulty === diff,
      )
      .map((sess) => {
        const sessAnswers = answers.filter(
          (a) => a.session_id === sess.session_id,
        );
        const total = sessAnswers.length;
        const correct = sessAnswers.filter((a) => a.correct).length;
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
        return { ...sess, accuracy };
      })
      .sort((a, b) => b.accuracy - a.accuracy || a.total_time - b.total_time)
      .slice(0, 3);
  };

  // ── Bar chart data ──────────────────────────────────────────────────────────
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

  const difficulties = [...new Set(answers.map((a) => a.difficulty))].sort();
  const ageRanges = AGE_ORDER.filter((a) =>
    answers.some((r) => r.age_range === a),
  );

  return (
    <PageWrapper>
      <h1 style={s.pageTitle}>Research Dashboard</h1>
      <p style={s.pageSubtitle}>Live data from Supabase. Reload to refresh.</p>

      {/* ── Filters — applied to all charts, scatter, and leaderboard ── */}
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
        <Metric label='Total Answers' value={totalAnswers.toLocaleString()} />
        <Metric label='Total Sessions' value={totalSessions} />
        <Metric label='Completed Sessions' value={completedSess} />
        <Metric
          label='Overall Accuracy'
          value={`${overallAccuracy}%`}
          color={accuracyColor(overallAccuracy)}
        />
      </div>

      {/* ── Scatter plot ── */}
      <SectionTitle>Time vs Accuracy — All Completed Sessions</SectionTitle>
      <p style={s.chartCaption}>
        Each dot is one completed session. Filtered by selections above.
      </p>
      {scatterData.length === 0 ? (
        <p style={s.empty}>No completed sessions match the current filters.</p>
      ) : (
        <div
          style={{
            display: "flex",
            gap: 20,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 400px", minWidth: 0 }}>
            <ResponsiveContainer width='100%' height={380}>
              <ScatterChart
                margin={{ left: 10, right: 20, top: 10, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis
                  type='number'
                  dataKey='x'
                  name='Time'
                  tickFormatter={(v) => formatTime(v)}
                  label={{
                    value: "Time Taken",
                    position: "insideBottom",
                    offset: -16,
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
                          style={{
                            margin: 0,
                            fontWeight: 600,
                            color: DIFF_COLORS[d.difficulty] ?? PURPLE,
                          }}
                        >
                          {d.difficulty?.charAt(0).toUpperCase() +
                            d.difficulty?.slice(1)}
                        </p>
                        <p style={{ margin: "4px 0 0" }}>
                          Age range: {d.ageRange}
                        </p>
                        <p style={{ margin: "2px 0 0" }}>
                          Time: {formatTime(d.x)}
                        </p>
                        <p style={{ margin: "2px 0 0" }}>Accuracy: {d.y}%</p>
                      </div>
                    );
                  }}
                />
                {Object.entries(byAge).map(([age, data]) => (
                  <Scatter
                    key={age}
                    data={data}
                    shape={<CustomDot />}
                    fill={DIFF_COLORS.easy}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Side legend */}
          <div
            style={{
              flexShrink: 0,
              background: "#FAF7FF",
              border: "1.5px solid #C9B8E8",
              borderRadius: 12,
              padding: "16px 20px",
              minWidth: 180,
              fontFamily: "sans-serif",
            }}
          >
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: PURPLE,
                margin: "0 0 12px",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
              }}
            >
              Legend
            </p>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: MUTED,
                margin: "0 0 6px",
              }}
            >
              Difficulty (colour)
            </p>
            {[
              { key: "easy", label: "Easy" },
              { key: "medium", label: "Medium" },
              { key: "hard", label: "Hard" },
            ].map(({ key, label }) => {
              const count = scatterData.filter(
                (d) => d.difficulty === key,
              ).length;
              return (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 5,
                  }}
                >
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: DIFF_COLORS[key],
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 12, color: "#333", flex: 1 }}>
                    {label}
                  </span>
                  <span style={{ fontSize: 11, color: "#999" }}>{count}</span>
                </div>
              );
            })}
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: MUTED,
                margin: "14px 0 6px",
              }}
            >
              Age range (shape)
            </p>
            {Object.entries(byAge).map(([age, data]) => {
              const symbol =
                AGE_SHAPE_SYMBOLS[AGE_SHAPES[age] ?? "circle"] ?? "○";
              return (
                <div
                  key={age}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 5,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: PURPLE,
                      width: 14,
                      textAlign: "center",
                      flexShrink: 0,
                    }}
                  >
                    {symbol}
                  </span>
                  <span style={{ fontSize: 12, color: "#333", flex: 1 }}>
                    {age}
                  </span>
                  <span style={{ fontSize: 11, color: "#999" }}>
                    {data.length}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Divider />

      {/* ── Leaderboard — uses filteredSessions ── */}
      <SectionTitle>Leaderboard — Fastest Accurate Completions</SectionTitle>
      <p style={s.chartCaption}>
        Top 3 per difficulty. Filtered by selections above. Ranked by accuracy
        then time.
      </p>
      {["easy", "medium", "hard"].map((diff) => {
        const rows = buildLeaderboard(diff);
        if (!rows.length) return null;
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
                  {rows.map((row, i) => (
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
                          color: accuracyColor(row.accuracy),
                        }}
                      >
                        {row.accuracy}%
                      </td>
                      <td style={s.td}>{formatTime(row.total_time)}</td>
                      <td style={s.td}>
                        {row.finished_at
                          ? new Date(row.finished_at).toLocaleDateString(
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

      <Divider />

      {/* ── Chart 1: Accuracy by scam type ── */}
      <SectionTitle>Accuracy by Scam Type</SectionTitle>
      <p style={s.chartCaption}>
        Percentage correct per scam. Sorted lowest to highest.
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
      <SectionTitle>Accuracy by Age Range</SectionTitle>
      <p style={s.chartCaption}>
        Percentage correct broken down by respondent age group.
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
      <SectionTitle>Average Time per Question by Scam Type</SectionTitle>
      <p style={s.chartCaption}>
        Longer times may indicate more difficult content.
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

      <Divider />

      {/* ── Chart 4: Avg time by difficulty ── */}
      <SectionTitle>Average Time per Question by Difficulty</SectionTitle>
      <p style={s.chartCaption}>
        Longer times may indicate more difficult content.
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

      <p style={s.footer}>
        All data is anonymous. No personal information is stored or displayed.
      </p>
    </PageWrapper>
  );
}

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
  metricsRow: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 },
  chartCaption: { fontSize: 14, color: "#555", margin: "0 0 16px" },
  axisTick: { fontSize: 13, fontFamily: "sans-serif", fill: "#555" },
  tableWrapper: { overflowX: "auto", WebkitOverflowScrolling: "touch" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: {
    textAlign: "left",
    padding: "clamp(7px,2vw,10px) clamp(8px,2vw,14px)",
    background: "#EDE8F8",
    color: PURPLE,
    fontWeight: 600,
    borderBottom: "2px solid #C9B8E8",
    fontSize: "clamp(12px,3vw,14px)",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "clamp(7px,2vw,9px) clamp(8px,2vw,14px)",
    borderBottom: "1px solid #E8E0F5",
    color: "#1A0A3C",
    fontSize: "clamp(12px,3vw,14px)",
  },
  footer: { fontSize: 13, color: "#999", marginTop: 32, textAlign: "center" },
};
