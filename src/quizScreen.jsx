// ─────────────────────────────────────────────────────────────────────────────
// QuizScreen.jsx
//
// All visible text is defined as named TEXT_ constants at the top of the file.
// The same constants are used in both the JSX (what is displayed) and the
// speech builders (what is spoken). Changing a constant updates both
// the screen and the read-aloud automatically — there is no separate copy.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import { recordAnswer, completeSession } from "./analytics.js";

// ─── All visible text ─────────────────────────────────────────────────────────
// Edit any of these strings and both the displayed text and the spoken text
// will update automatically.

// Intro screen
const TEXT_FIRST_UP = "First up";
const TEXT_NEXT_UP = "Next up";
const TEXT_START_QUESTIONS = "Start questions →";
const TEXT_READ_MESSAGE = "Read the message →";

// Question screen — easy / medium
const TEXT_QUESTION_OF = "Question"; // used as "Question X of Y"
const TEXT_HARD_MODE_LABEL = "Hard mode";
const TEXT_CHECK_ANSWER = "Check answer";
const TEXT_NEXT_QUESTION = "Next question →";
const TEXT_NEXT_TOPIC = "Next topic →";
const TEXT_SEE_RESULTS = "See results →";
const TEXT_CORRECT = "✓ Correct!";
const TEXT_NOT_QUITE = "✗ Not quite";

// Hard mode
const TEXT_SHOW_ANSWERS = "Show answers";
const TEXT_HARD_HINT_BEFORE = (total) =>
  `Tap on any part of the message you think is suspicious. There are ${total} red flags to find.`;
const TEXT_HARD_HINT_AFTER = (found, total) =>
  `You found ${found} of ${total} red flags.`;
const TEXT_FLAG_PREFIX = "🚩";
const TEXT_MISSED_PREFIX = "⚠️ Missed:";
const TEXT_NOT_A_FLAG = "ℹ️ This part is not a red flag.";

// Results screen
const TEXT_QUIZ_COMPLETE = "Quiz complete!";
const TEXT_CORRECT_LABEL = "correct";
const TEXT_SCORE_BY_TOPIC = "Your score by topic";
const TEXT_PRINT_BTN = "🖨️ Print results with answers & explanations";
const TEXT_PLAY_AGAIN = "Play again →";
const TEXT_RESULTS_FOOTER =
  "Your answers have been recorded anonymously. Thank you for helping our research.";

const TEXT_RESULT_EXCELLENT =
  "Excellent — you have a strong awareness of these scams.";
const TEXT_RESULT_GOOD =
  "Good work. Reviewing the topics you found difficult will help build confidence.";
const TEXT_RESULT_KEEP_GOING =
  "These scams are designed to be convincing. Keep practising — awareness is the best protection.";

// Print page
const TEXT_PRINT_TITLE = "ScamSavvy — Quiz Results";
const TEXT_PRINT_DIFFICULTY = "Difficulty:";
const TEXT_PRINT_CORRECT_ANS = "Correct answer:";
const TEXT_PRINT_RED_FLAG = "Red flag";
const TEXT_PRINT_FOOTER =
  "ScamSavvy — know the scam before it knows you. All data collected is anonymous and used for research purposes only.";

// Progress bar
const TEXT_TOPIC_OF = "Topic"; // used as "Topic X of Y"

// Read aloud button label
// ─── Speech speed ────────────────────────────────────────────────────────────
// Reads the speed the user selected on the home screen.
// Defaults to 0.88 if nothing has been saved yet.
const SPEECH_SPEED_KEY = "scamshield_speech_speed";

function getSpeechRate() {
  try {
    const saved = localStorage.getItem(SPEECH_SPEED_KEY);
    return saved ? parseFloat(saved) : 0.88;
  } catch {
    return 0.88;
  }
}

// Reads the auto-read preference saved by the home screen.
const AUTO_READ_KEY = "scamshield_auto_read";

function getAutoRead() {
  try {
    return localStorage.getItem(AUTO_READ_KEY) === "true";
  } catch {
    return false;
  }
}

// ─── Speech utility ─────────────────────────────────────────────────────────
// Tracks the last text spoken so speed changes can restart it.
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
    utterance.rate = getSpeechRate(); // reads speed saved by the home screen
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

function stopSpeech() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

// ─── Speech builders ──────────────────────────────────────────────────────────
// Each builder reads from the TEXT_ constants and the live data — no separate
// hardcoded strings. Change a TEXT_ constant and the speech changes too.

function buildIntroScript(scam, isFirst, isHardMode) {
  return [
    isFirst ? TEXT_FIRST_UP : TEXT_NEXT_UP,
    scam.name + ".",
    scam.description,
    scam.stats.losses + ".",
    scam.stats.complaints + ".",
    isHardMode
      ? `Tap ${TEXT_READ_MESSAGE.replace(" →", "")} to begin.`
      : `Tap ${TEXT_START_QUESTIONS.replace(" →", "")} to begin.`,
  ].join(" ");
}

function buildQuestionScript(question, shuffledOptions) {
  const optionLetters = ["A", "B", "C", "D"];
  const optionTexts = shuffledOptions
    .map((o, i) => `Option ${optionLetters[i]}: ${o.text}`)
    .join(". ");
  return `${question.question} ${optionTexts}`;
}

function buildFeedbackScript(correct, explanation, correctOptionText) {
  const result = correct
    ? TEXT_CORRECT.replace("✓ ", "")
    : TEXT_NOT_QUITE.replace("✗ ", "");
  return `${result} The correct answer is: ${correctOptionText}. ${explanation}`;
}

function buildHardRevealScript(found, total, missed) {
  const hintAfter = TEXT_HARD_HINT_AFTER(found, total);
  const missedText =
    missed > 0
      ? `You missed ${missed} red flag${missed > 1 ? "s" : ""}.`
      : "You found all the red flags!";
  return `${hintAfter} ${missedText}`;
}

function buildResultsScript(
  overallPct,
  totalCorrect,
  totalQuestions,
  scamScores,
) {
  const summary = `${TEXT_QUIZ_COMPLETE} You scored ${overallPct} percent overall, getting ${totalCorrect} out of ${totalQuestions} questions ${TEXT_CORRECT_LABEL}.`;
  const breakdown = scamScores
    .map((s) => `${s.scamName}: ${s.correct} out of ${s.total}.`)
    .join(" ");
  const message =
    overallPct >= 80
      ? TEXT_RESULT_EXCELLENT
      : overallPct >= 50
        ? TEXT_RESULT_GOOD
        : TEXT_RESULT_KEEP_GOING;
  return [summary, message, TEXT_SCORE_BY_TOPIC + ".", breakdown].join(" ");
}

// ─── Print utility ────────────────────────────────────────────────────────────

function openPrintPage(scams, difficulty, scamScores) {
  const isHardMode = difficulty === "hard";
  const totalCorrect = scamScores.reduce((sum, s) => sum + s.correct, 0);
  const totalQuestions = scamScores.reduce((sum, s) => sum + s.total, 0);
  const overallPct = totalQuestions
    ? Math.round((totalCorrect / totalQuestions) * 100)
    : 0;

  // Purple = #3D1580, Gold = #C8952A, Light purple bg = #FAF7FF
  let body = `
    <!-- Logo wordmark -->
    <div style="margin-bottom: 4px;">
      <span style="font-family: Georgia, serif; font-size: 36px; font-weight: 700; color: #3D1580; letter-spacing: -1px;">Scam</span><span style="font-family: Georgia, serif; font-size: 36px; font-weight: 700; color: #C8952A; letter-spacing: -1px;">Savvy</span>
    </div>
    <div style="height: 2px; background: #C8952A; opacity: 0.5; width: 320px; margin: 6px 0 4px;"></div>
    <p style="font-family: sans-serif; font-size: 11px; color: #7A5FAA; letter-spacing: 2px; margin: 0 0 20px;">KNOW THE SCAM BEFORE IT KNOWS YOU</p>

    <p style="font-family: sans-serif; font-size: 14px; color: #555; margin: 0 0 4px;">
      ${TEXT_PRINT_DIFFICULTY} <strong style="color: #3D1580;">${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</strong>
    </p>
    <hr style="border: none; border-top: 1px solid #C9B8E8; margin: 16px 0;" />

    <!-- Overall score -->
    <div style="background: #FAF7FF; border: 1.5px solid #C9B8E8; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; font-family: sans-serif;">
      <p style="font-size: 36px; font-weight: 700; color: #3D1580; margin: 0;">${overallPct}%</p>
      <p style="color: #7A5FAA; margin: 4px 0 0; font-size: 14px;">${totalCorrect} / ${totalQuestions} ${TEXT_CORRECT_LABEL}</p>
    </div>
  `;

  scams.forEach((scam) => {
    body += `
      <h2 style="font-family: Georgia, serif; color: #3D1580; margin-top: 28px; margin-bottom: 8px; font-size: 18px;">
        ${scam.icon} ${scam.name}
      </h2>
    `;
    if (isHardMode) {
      const hardContent = scam.hard;
      body += `<p style="font-family: sans-serif; color: #555; font-style: italic; font-size: 14px; margin: 0 0 12px;">${hardContent.instruction}</p>`;
      hardContent.body.forEach((segment, idx) => {
        if (!segment.isFlag) return;
        body += `
          <div style="background: #FAF7FF; border-left: 4px solid #C8952A; padding: 10px 14px; margin-bottom: 10px; border-radius: 4px; font-family: sans-serif;">
            <p style="margin: 0; font-weight: 600; color: #3D1580; font-size: 13px;">🚩 ${TEXT_PRINT_RED_FLAG} ${idx + 1}</p>
            <p style="margin: 6px 0 0; color: #1A0A3C; font-size: 14px;">"${segment.text}"</p>
            <p style="margin: 6px 0 0; color: #555; font-size: 13px;">${segment.reason}</p>
          </div>
        `;
      });
    } else {
      const questions = scam[difficulty];
      questions.forEach((q, idx) => {
        const correctOption = q.options.find((o) => o.correct);
        body += `
          <div style="margin-bottom: 18px; font-family: sans-serif;">
            <p style="font-weight: 600; color: #1A0A3C; margin: 0 0 6px; font-size: 15px;">
              Q${idx + 1}. ${q.question}
            </p>
            <p style="margin: 0 0 4px; color: #3D1580; font-size: 14px;">
              ✓ <strong>${TEXT_PRINT_CORRECT_ANS}</strong> ${correctOption?.text ?? "—"}
            </p>
            <p style="margin: 0; color: #555; font-size: 13px; line-height: 1.6;">${q.explanation}</p>
          </div>
          <hr style="border: none; border-top: 1px solid #C9B8E8; margin: 0 0 14px;" />
        `;
      });
    }
  });

  body += `<p style="font-family: sans-serif; font-size: 11px; color: #7A5FAA; margin-top: 32px; letter-spacing: 0.5px;">${TEXT_PRINT_FOOTER}</p>`;

  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${TEXT_PRINT_TITLE}</title>
        <style>
          body { max-width: 700px; margin: 40px auto; padding: 0 24px; background: #fff; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>${body}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.onload = () => printWindow.print();
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function QuizScreen({
  difficulty,
  scams,
  ageRange,
  sessionId,
  onPlayAgain,
  onHome,
  readScriptRef,
}) {
  const [screen, setScreen] = useState("intro");
  const [scamIndex, setScamIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [shuffledOptions, setShuffledOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [highlighted, setHighlighted] = useState({});
  const [answersRevealed, setAnswersRevealed] = useState(false);
  const [senderHighlighted, setSenderHighlighted] = useState(false);
  const [scamScores, setScamScores] = useState([]);
  const [currentScamScore, setCurrentScamScore] = useState(0);
  // Ref that always holds the latest scamScores so the results auto-read
  // useEffect can read the correct value immediately after setScreen("results"),
  // before the state update has committed to a re-render.
  const scamScoresRef = useRef([]);

  const questionStartTime = useRef(Date.now());
  const quizStartTime = useRef(Date.now());

  const isHardMode = difficulty === "hard";
  const currentScam = scams[scamIndex] ?? null;
  const questions = currentScam && !isHardMode ? currentScam[difficulty] : null;
  const currentQuestion = questions ? (questions[questionIndex] ?? null) : null;

  // Keep ref in sync with state so the results useEffect always has latest scores
  useEffect(() => {
    scamScoresRef.current = scamScores;
  }, [scamScores]);

  useEffect(() => {
    stopSpeech();
  }, [screen, scamIndex, questionIndex]);

  // Auto-read: when auto-read is on, speak content after a 1.5s delay whenever
  // the screen, scam, or question changes. The delay lets the screen render first.
  useEffect(() => {
    if (!getAutoRead()) return;

    let text = null;

    if (screen === "intro" && currentScam) {
      const isFirst = scamIndex === 0;
      // buildIntroScript reads from scamData directly — same as the JSX
      text = buildIntroScript(currentScam, isFirst, isHardMode);
    }

    if (
      screen === "question" &&
      !isHardMode &&
      currentQuestion &&
      shuffledOptions.length > 0
    ) {
      // buildQuestionScript reads from currentQuestion.question and options
      // Only fires once shuffledOptions has been populated
      text = buildQuestionScript(currentQuestion, shuffledOptions);
    }

    if (screen === "question" && isHardMode && currentScam) {
      const hardContent = currentScam.hard;
      const bodyText = hardContent.body.map((s) => s.text).join(" ");
      text = `${hardContent.instruction} The message reads: ${bodyText}`;
    }

    if (!text) return;
    const timer = setTimeout(() => speak(text), 1500);
    return () => clearTimeout(timer);
  }, [screen, scamIndex, questionIndex, shuffledOptions.length]);

  // Auto-read: speak feedback automatically after the user checks an answer
  useEffect(() => {
    if (!getAutoRead()) return;
    if (!showFeedback || !currentQuestion) return;
    const correctOption = shuffledOptions.find((o) => o.correct);
    const text = buildFeedbackScript(
      selectedOption?.correct,
      currentQuestion.explanation,
      correctOption?.text ?? "",
    );
    const timer = setTimeout(() => speak(text), 800);
    return () => clearTimeout(timer);
  }, [showFeedback]);

  // Auto-read: speak results automatically when the results screen appears.
  // Uses scamScoresRef.current so it reads the correct value immediately,
  // before the setScamScores state update has committed.
  useEffect(() => {
    if (!getAutoRead()) return;
    if (screen !== "results") return;
    const scores = scamScoresRef.current;
    if (scores.length === 0) return;
    const totalCorrect = scores.reduce((sum, s) => sum + s.correct, 0);
    const totalQuestions = scores.reduce((sum, s) => sum + s.total, 0);
    const overallPct = totalQuestions
      ? Math.round((totalCorrect / totalQuestions) * 100)
      : 0;
    const text = buildResultsScript(
      overallPct,
      totalCorrect,
      totalQuestions,
      scores,
    );
    const timer = setTimeout(() => speak(text), 1500);
    return () => clearTimeout(timer);
  }, [screen]);

  useEffect(() => {
    if (!isHardMode && currentQuestion?.options) {
      setShuffledOptions(shuffleArray(currentQuestion.options));
    }
    setSelectedOption(null);
    setShowFeedback(false);
    setHighlighted({});
    setAnswersRevealed(false);
    setSenderHighlighted(false);
    questionStartTime.current = Date.now();
  }, [scamIndex, questionIndex]);

  // Register current screen script with NavBar so the 🔊 button knows what to read.
  // Updates whenever the screen, question, or feedback state changes.
  useEffect(() => {
    if (!readScriptRef) return;
    if (screen === "intro" && currentScam) {
      const isFirst = scamIndex === 0;
      readScriptRef.current = () =>
        buildIntroScript(currentScam, isFirst, isHardMode);
    } else if (
      screen === "question" &&
      !isHardMode &&
      currentQuestion &&
      shuffledOptions.length > 0
    ) {
      if (showFeedback) {
        const correctOption = shuffledOptions.find((o) => o.correct);
        readScriptRef.current = () =>
          buildFeedbackScript(
            selectedOption?.correct,
            currentQuestion.explanation,
            correctOption?.text ?? "",
          );
      } else {
        readScriptRef.current = () =>
          buildQuestionScript(currentQuestion, shuffledOptions);
      }
    } else if (screen === "question" && isHardMode && currentScam) {
      const hardContent = currentScam.hard;
      const bodyText = hardContent.body.map((s) => s.text).join(" ");
      readScriptRef.current = () =>
        `${hardContent.instruction} The message reads: ${bodyText}`;
    } else if (screen === "results") {
      const totalCorrect = scamScores.reduce((sum, s) => sum + s.correct, 0);
      const totalQuestions = scamScores.reduce((sum, s) => sum + s.total, 0);
      const pct = totalQuestions
        ? Math.round((totalCorrect / totalQuestions) * 100)
        : 0;
      readScriptRef.current = () =>
        buildResultsScript(pct, totalCorrect, totalQuestions, scamScores);
    }
  }, [
    screen,
    scamIndex,
    questionIndex,
    showFeedback,
    shuffledOptions.length,
    answersRevealed,
  ]);

  // ── Multiple choice handlers ──────────────────────────────────────────────

  const handleSelectOption = (option) => {
    if (showFeedback) return;
    setSelectedOption(option);
  };

  const handleCheckAnswer = async () => {
    if (!selectedOption || showFeedback) return;
    const correct = selectedOption.correct;
    const finishedAt = new Date().toISOString();
    const startedAt = new Date(questionStartTime.current).toISOString();
    const timeTaken = Math.round(
      (Date.now() - questionStartTime.current) / 1000,
    );
    if (correct) setCurrentScamScore((s) => s + 1);
    setShowFeedback(true);
    await recordAnswer(sessionId, {
      scamId: currentScam.id,
      questionId: currentQuestion.id,
      ageRange,
      difficulty,
      correct,
      timeTaken,
      startedAt,
      finishedAt,
    });
  };

  // ── Hard mode handlers ────────────────────────────────────────────────────

  const handleToggleHighlight = (segmentId) => {
    if (answersRevealed) return;
    setHighlighted((prev) => ({ ...prev, [segmentId]: !prev[segmentId] }));
  };

  const handleRevealAnswers = async () => {
    if (answersRevealed) return;
    const hardContent = currentScam.hard;
    const allFlags = hardContent.body.filter((s) => s.isFlag);
    const senderHit = hardContent.senderIsFlag && senderHighlighted ? 1 : 0;
    const correctHits =
      allFlags.filter((s) => highlighted[s.id]).length + senderHit;
    const falsePositives =
      hardContent.body.filter((s) => !s.isFlag && highlighted[s.id]).length +
      (!hardContent.senderIsFlag && senderHighlighted ? 1 : 0);
    const score = Math.max(0, correctHits - falsePositives);
    const finishedAt = new Date().toISOString();
    const startedAt = new Date(questionStartTime.current).toISOString();
    const timeTaken = Math.round(
      (Date.now() - questionStartTime.current) / 1000,
    );
    const missed =
      allFlags.length + (hardContent.senderIsFlag ? 1 : 0) - correctHits;
    setCurrentScamScore((s) => s + score);
    setAnswersRevealed(true);
    if (!getAutoRead()) {
      speak(buildHardRevealScript(correctHits, allFlags.length, missed));
    }
    for (const segment of hardContent.body) {
      if (!segment.isFlag) continue;
      await recordAnswer(sessionId, {
        scamId: currentScam.id,
        questionId: segment.id,
        ageRange,
        difficulty,
        correct: !!highlighted[segment.id],
        timeTaken,
        startedAt,
        finishedAt,
      });
    }
  };

  // ── Navigation ────────────────────────────────────────────────────────────

  const handleNextQuestion = async () => {
    const isLastQuestion = isHardMode
      ? true
      : questionIndex + 1 >= questions.length;
    if (isLastQuestion) {
      const total = isHardMode
        ? currentScam.hard.body.filter((s) => s.isFlag).length
        : questions.length;
      const newScore = {
        scamId: currentScam.id,
        scamName: currentScam.name,
        scamIcon: currentScam.icon,
        correct: currentScamScore,
        total,
      };
      const updatedScores = [...scamScores, newScore];
      // Update the ref immediately so the results auto-read useEffect
      // can read the correct scores before setScamScores commits.
      scamScoresRef.current = updatedScores;
      setScamScores(updatedScores);
      const isLastScam = scamIndex + 1 >= scams.length;
      if (isLastScam) {
        const totalTime = Math.round(
          (Date.now() - quizStartTime.current) / 1000,
        );
        await completeSession(sessionId, totalTime);
        setScreen("results");
      } else {
        setScamIndex((i) => i + 1);
        setQuestionIndex(0);
        setCurrentScamScore(0);
        setScreen("intro");
      }
    } else {
      setQuestionIndex((i) => i + 1);
      setScreen("question");
    }
  };

  // ── Screen: Intro ─────────────────────────────────────────────────────────
  if (screen === "intro") {
    if (!currentScam) return null;
    const isFirst = scamIndex === 0;
    return (
      <Wrapper onHome={onHome}>
        <ProgressBar
          scamIndex={scamIndex}
          totalScams={scams.length}
          questionIndex={0}
          totalQuestions={
            isHardMode ? 1 : (currentScam[difficulty]?.length ?? 1)
          }
          isHardMode={isHardMode}
        />
        <Spacer h={32} />
        <p style={styles.introLabel}>
          {isFirst ? TEXT_FIRST_UP : TEXT_NEXT_UP}
        </p>
        <Spacer h={12} />
        <div style={styles.introCard}>
          <span style={styles.introIcon}>{currentScam.icon}</span>
          <Spacer h={12} />
          {/* scam data comes from scamData.js — change it there and speech updates */}
          <p style={styles.introName}>{currentScam.name}</p>
          <Spacer h={8} />
          <p style={styles.introDesc}>{currentScam.description}</p>
          <Spacer h={8} />
          <p style={styles.introStat}>{currentScam.stats.losses}</p>
        </div>
        <Spacer h={32} />
        <BigButton onClick={() => setScreen("question")}>
          {/* TEXT_READ_MESSAGE / TEXT_START_QUESTIONS drive both button and speech */}
          {isHardMode ? TEXT_READ_MESSAGE : TEXT_START_QUESTIONS}
        </BigButton>
      </Wrapper>
    );
  }

  // ── Screen: Question — easy / medium ──────────────────────────────────────
  if (screen === "question" && !isHardMode) {
    if (!currentScam || !currentQuestion) return null;
    return (
      <Wrapper onHome={onHome}>
        <ProgressBar
          scamIndex={scamIndex}
          totalScams={scams.length}
          questionIndex={questionIndex}
          totalQuestions={questions.length}
          isHardMode={false}
        />
        <Spacer h={8} />
        <p style={styles.questionCounter}>
          {currentScam.icon} {currentScam.name} — {TEXT_QUESTION_OF}{" "}
          {questionIndex + 1} of {questions.length}
        </p>
        <Spacer h={16} />
        <div style={styles.questionBox}>
          {/* currentQuestion.question comes from scamData.js */}
          <p style={styles.questionText}>{currentQuestion.question}</p>
        </div>
        <Spacer h={16} />
        <div style={styles.optionsList}>
          {shuffledOptions.map((option, idx) => {
            let borderColor = "#D0D8E0";
            let background = "#fff";
            let textColor = "#333";
            if (selectedOption === option && !showFeedback) {
              borderColor = "#1A3C5E";
              background = "#E0EAF4";
            }
            if (showFeedback) {
              if (option.correct) {
                borderColor = "#2D6A4F";
                background = "#D8F3DC";
                textColor = "#1B4332";
              } else if (selectedOption === option && !option.correct) {
                borderColor = "#9B2335";
                background = "#FADADD";
                textColor = "#6B1020";
              }
            }
            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(option)}
                disabled={showFeedback}
                style={{
                  ...styles.optionBtn,
                  borderColor,
                  background,
                  color: textColor,
                  cursor: showFeedback ? "default" : "pointer",
                }}
              >
                {option.text}
              </button>
            );
          })}
        </div>
        <Spacer h={20} />
        {showFeedback && (
          <div
            style={{
              ...styles.feedbackBox,
              borderColor: selectedOption?.correct ? "#2D6A4F" : "#9B2335",
              background: selectedOption?.correct ? "#D8F3DC" : "#FADADD",
            }}
          >
            <p
              style={{
                ...styles.feedbackResult,
                color: selectedOption?.correct ? "#1B4332" : "#6B1020",
              }}
            >
              {selectedOption?.correct ? TEXT_CORRECT : TEXT_NOT_QUITE}
            </p>
            <Spacer h={6} />
            {/* currentQuestion.explanation comes from scamData.js */}
            <p style={styles.feedbackExplanation}>
              {currentQuestion.explanation}
            </p>
          </div>
        )}
        <Spacer h={20} />
        {!showFeedback && (
          <BigButton onClick={handleCheckAnswer} disabled={!selectedOption}>
            {TEXT_CHECK_ANSWER}
          </BigButton>
        )}
        {showFeedback && (
          <BigButton onClick={handleNextQuestion}>
            {questionIndex + 1 >= questions.length
              ? scamIndex + 1 >= scams.length
                ? TEXT_SEE_RESULTS
                : TEXT_NEXT_TOPIC
              : TEXT_NEXT_QUESTION}
          </BigButton>
        )}
      </Wrapper>
    );
  }

  // ── Screen: Question — hard mode ──────────────────────────────────────────
  if (screen === "question" && isHardMode) {
    if (!currentScam) return null;
    const hardContent = currentScam.hard;
    // Count sender as a flag too if it is marked as one
    const senderFlagCount = hardContent.senderIsFlag ? 1 : 0;
    const totalFlags =
      hardContent.body.filter((s) => s.isFlag).length + senderFlagCount;
    const foundSoFar =
      hardContent.body.filter((s) => s.isFlag && highlighted[s.id]).length +
      (hardContent.senderIsFlag && senderHighlighted ? 1 : 0);
    return (
      <Wrapper onHome={onHome}>
        <ProgressBar
          scamIndex={scamIndex}
          totalScams={scams.length}
          questionIndex={0}
          totalQuestions={1}
          isHardMode={true}
        />
        <Spacer h={8} />
        <p style={styles.questionCounter}>
          {currentScam.icon} {currentScam.name} — {TEXT_HARD_MODE_LABEL}
        </p>
        <Spacer h={8} />
        <div style={styles.questionBox}>
          {/* hardContent.instruction comes from scamData.js */}
          <p style={styles.questionText}>{hardContent.instruction}</p>
        </div>
        <Spacer h={16} />
        <div style={styles.messageCard}>
          <div style={styles.messageMeta}>
            <span style={styles.messageMetaLabel}>
              {hardContent.type === "email"
                ? "From:"
                : hardContent.type === "phone"
                  ? "Caller:"
                  : "From:"}
            </span>
            <button
              onClick={() =>
                !answersRevealed && setSenderHighlighted((s) => !s)
              }
              style={{
                ...styles.messageMetaValue,
                background: senderHighlighted
                  ? answersRevealed
                    ? hardContent.senderIsFlag
                      ? "#FADADD"
                      : "#D8F3DC"
                    : "#FDE8D0"
                  : "transparent",
                borderRadius: 4,
                padding: "4px 8px",
                cursor: answersRevealed ? "default" : "pointer",
                border: "none",
                textAlign: "left",
                fontSize: 17,
              }}
            >
              {hardContent.from}
            </button>
          </div>
          {answersRevealed && senderHighlighted && hardContent.senderIsFlag && (
            <p style={styles.flagReason}>
              {TEXT_FLAG_PREFIX} {hardContent.senderReason}
            </p>
          )}
          {answersRevealed &&
            !senderHighlighted &&
            hardContent.senderIsFlag && (
              <p style={{ ...styles.flagReason, color: "#B5621A" }}>
                {TEXT_MISSED_PREFIX} {hardContent.senderReason}
              </p>
            )}
          {hardContent.subject && (
            <>
              <Spacer h={6} />
              <div style={styles.messageMeta}>
                <span style={styles.messageMetaLabel}>Subject:</span>
                <span style={styles.messageMetaValue}>
                  {hardContent.subject}
                </span>
              </div>
            </>
          )}
          <Spacer h={14} />
          {hardContent.body.map((segment) => {
            const isHighlighted = !!highlighted[segment.id];
            let segBackground = "transparent";
            let showReason = false;
            if (!answersRevealed && isHighlighted) segBackground = "#FDE8D0";
            if (answersRevealed) {
              if (segment.isFlag && isHighlighted) {
                segBackground = "#FADADD";
                showReason = true;
              } else if (segment.isFlag && !isHighlighted) {
                segBackground = "#FFF8E1";
                showReason = true;
              } else if (!segment.isFlag && isHighlighted)
                segBackground = "#E0EAF4";
            }
            return (
              <div key={segment.id} style={{ marginBottom: 10 }}>
                <button
                  onClick={() => handleToggleHighlight(segment.id)}
                  style={{
                    ...styles.segmentBtn,
                    background: segBackground,
                    cursor: answersRevealed ? "default" : "pointer",
                    borderBottom:
                      isHighlighted && !answersRevealed
                        ? "2px solid #B5621A"
                        : "2px solid transparent",
                  }}
                >
                  {segment.text}
                </button>
                {showReason && segment.isFlag && isHighlighted && (
                  <p style={styles.flagReason}>
                    {TEXT_FLAG_PREFIX} {segment.reason}
                  </p>
                )}
                {showReason && segment.isFlag && !isHighlighted && (
                  <p style={{ ...styles.flagReason, color: "#B5621A" }}>
                    {TEXT_MISSED_PREFIX} {segment.reason}
                  </p>
                )}
                {answersRevealed && !segment.isFlag && isHighlighted && (
                  <p style={{ ...styles.flagReason, color: "#1A3C5E" }}>
                    {TEXT_NOT_A_FLAG}
                  </p>
                )}
              </div>
            );
          })}
          <Spacer h={8} />
          <p style={styles.hardHint}>
            {/* TEXT_HARD_HINT_BEFORE / AFTER are functions — change the template string in them */}
            {answersRevealed
              ? TEXT_HARD_HINT_AFTER(foundSoFar, totalFlags)
              : TEXT_HARD_HINT_BEFORE(totalFlags)}
          </p>
        </div>
        <Spacer h={20} />
        {!answersRevealed && (
          <BigButton onClick={handleRevealAnswers}>
            {TEXT_SHOW_ANSWERS}
          </BigButton>
        )}
        {answersRevealed && (
          <BigButton onClick={handleNextQuestion}>
            {scamIndex + 1 >= scams.length ? TEXT_SEE_RESULTS : TEXT_NEXT_TOPIC}
          </BigButton>
        )}
      </Wrapper>
    );
  }

  // ── Screen: Results ───────────────────────────────────────────────────────
  if (screen === "results") {
    const totalCorrect = scamScores.reduce((sum, s) => sum + s.correct, 0);
    const totalQuestions = scamScores.reduce((sum, s) => sum + s.total, 0);
    const overallPct = totalQuestions
      ? Math.round((totalCorrect / totalQuestions) * 100)
      : 0;
    return (
      <Wrapper onHome={onHome}>
        <p style={styles.resultsTitle}>{TEXT_QUIZ_COMPLETE}</p>
        <Spacer h={24} />
        <div style={styles.overallScoreCard}>
          <p style={styles.overallPct}>{overallPct}%</p>
          <p style={styles.overallFraction}>
            {totalCorrect} / {totalQuestions} {TEXT_CORRECT_LABEL}
          </p>
          <Spacer h={8} />
          <p style={styles.overallMessage}>
            {overallPct >= 80
              ? TEXT_RESULT_EXCELLENT
              : overallPct >= 50
                ? TEXT_RESULT_GOOD
                : TEXT_RESULT_KEEP_GOING}
          </p>
        </div>
        <Spacer h={24} />
        {/* TEXT_SCORE_BY_TOPIC drives both display and speech */}
        <p style={styles.breakdownTitle}>{TEXT_SCORE_BY_TOPIC}</p>
        <Spacer h={12} />
        {scamScores.map((s) => {
          const pct = Math.round((s.correct / s.total) * 100);
          const barColor =
            pct >= 80 ? "#2D6A4F" : pct >= 50 ? "#B5621A" : "#9B2335";
          return (
            <div key={s.scamId} style={styles.breakdownRow}>
              <div style={styles.breakdownHeader}>
                <span style={styles.breakdownName}>
                  {s.scamIcon} {s.scamName}
                </span>
                <span style={{ ...styles.breakdownPct, color: barColor }}>
                  {s.correct}/{s.total}
                </span>
              </div>
              <div style={styles.barTrack}>
                <div
                  style={{
                    ...styles.barFill,
                    width: `${pct}%`,
                    background: barColor,
                  }}
                />
              </div>
            </div>
          );
        })}
        <Spacer h={32} />
        {/* TEXT_PRINT_BTN drives both the button label and the print page title */}
        <button
          onClick={() => openPrintPage(scams, difficulty, scamScores)}
          style={styles.printBtn}
        >
          {TEXT_PRINT_BTN}
        </button>
        <Spacer h={12} />
        <BigButton onClick={onPlayAgain}>{TEXT_PLAY_AGAIN}</BigButton>
        <Spacer h={16} />
        {/* TEXT_RESULTS_FOOTER drives both display and speech (via buildResultsScript) */}
        <p style={styles.footer}>{TEXT_RESULTS_FOOTER}</p>
      </Wrapper>
    );
  }

  return null;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function shuffleArray(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Wrapper({ children, onHome }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100vw",
        boxSizing: "border-box",
        overflowX: "hidden",
        fontFamily: "'Georgia', serif",
      }}
    >
      <div
        style={{
          padding: "24px clamp(14px, 4vw, 64px) 60px",
          boxSizing: "border-box",
          overflowX: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ProgressBar({
  scamIndex,
  totalScams,
  questionIndex,
  totalQuestions,
  isHardMode,
}) {
  // Guard against undefined/zero values
  const safeScamIndex = scamIndex ?? 0;
  const safeTotalScams = totalScams ?? 1;
  const safeQuestionIndex = questionIndex ?? 0;
  const safeQPerScam =
    totalQuestions && totalQuestions > 0 ? totalQuestions : 1;

  const totalAllQuestions = safeTotalScams * safeQPerScam;
  const completedQuestions = safeScamIndex * safeQPerScam + safeQuestionIndex;
  const pct = Math.round((completedQuestions / totalAllQuestions) * 100);

  // Milestone positions — one tick per completed scam topic
  const milestones = Array.from({ length: safeTotalScams - 1 }, (_, i) =>
    Math.round(((i + 1) / safeTotalScams) * 100),
  );

  return (
    <div>
      <div style={{ ...styles.barTrack, position: "relative" }}>
        {/* Filled progress */}
        <div
          style={{
            ...styles.barFill,
            width: `${pct}%`,
            background: "#3D1580",
            transition: "width 0.4s ease",
          }}
        />
        {/* Topic milestone ticks — gold, thick, visible */}
        {milestones.map((pos, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: -3,
              left: `${pos}%`,
              width: 4,
              height: "calc(100% + 6px)",
              background: pos <= pct ? "#C8952A" : "#D0C0E8",
              borderRadius: 2,
              transform: "translateX(-50%)",
              zIndex: 2,
            }}
          />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 5,
        }}
      >
        <p style={styles.progressLabel}>
          {TEXT_TOPIC_OF} {safeScamIndex + 1} of {safeTotalScams} — Question{" "}
          {safeQuestionIndex + 1} of {safeQPerScam}
        </p>
        <p style={styles.progressLabel}>{pct}%</p>
      </div>
    </div>
  );
}

function BigButton({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "20px 24px",
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
  // Progress bar — purple theme, taller for visibility
  barTrack: {
    width: "100%",
    height: 10,
    background: "#E8E0F5",
    borderRadius: 5,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 5 },
  progressLabel: {
    fontSize: 14,
    color: "#7A5FAA",
    margin: "6px 0 0",
    fontFamily: "sans-serif",
  },

  // Intro screen — larger for older eyes

  introLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: "#7A5FAA",
    textTransform: "uppercase",
    letterSpacing: "1px",
    margin: 0,
    fontFamily: "sans-serif",
  },
  introCard: {
    background: "#FAF7FF",
    border: "1.5px solid #C9B8E8",
    borderRadius: 14,
    padding: "clamp(20px, 4vw, 32px) clamp(16px, 4vw, 28px)",
    textAlign: "center",
  },
  introIcon: { fontSize: 48, display: "block" },
  introName: {
    fontSize: 24,
    fontWeight: 700,
    color: "#3D1580",
    margin: 0,
    fontFamily: "'Georgia', serif",
  },
  introDesc: {
    fontSize: 18,
    color: "#444",
    lineHeight: 1.7,
    margin: 0,
    fontFamily: "sans-serif",
  },
  introStat: {
    fontSize: 15,
    color: "#9B2335",
    fontWeight: 600,
    margin: 0,
    fontFamily: "sans-serif",
  },

  // Question screen — generous sizing throughout

  questionCounter: {
    fontSize: 15,
    color: "#7A5FAA",
    margin: 0,
    fontFamily: "sans-serif",
  },

  // Question box — large, clear, well-padded
  questionBox: {
    background: "#FAF7FF",
    border: "2px solid #C9B8E8",
    borderRadius: 12,
    padding: "clamp(16px, 4vw, 28px)",
  },
  questionText: {
    fontSize: "clamp(18px, 2.5vw, 21px)",
    lineHeight: 1.85,
    color: "#1A0A3C",
    margin: 0,
    fontFamily: "sans-serif",
  },
  optionsList: { display: "flex", flexDirection: "column", gap: 12 },
  // Options — large tap targets, clear text
  optionBtn: {
    width: "100%",
    padding: "clamp(14px, 3vw, 20px) clamp(14px, 3vw, 22px)",
    fontSize: "clamp(15px, 3.5vw, 18px)",
    lineHeight: 1.6,
    fontFamily: "sans-serif",
    textAlign: "left",
    border: "2px solid",
    borderRadius: 12,
    transition: "background 0.15s, border-color 0.15s",
    wordBreak: "break-word",
    boxSizing: "border-box",
  },
  feedbackBox: {
    border: "2px solid",
    borderRadius: 12,
    padding: "clamp(14px, 3vw, 20px) clamp(14px, 3vw, 22px)",
  },

  feedbackResult: {
    fontSize: 19,
    fontWeight: 700,
    margin: 0,
    fontFamily: "sans-serif",
  },
  feedbackExplanation: {
    fontSize: "clamp(16px, 2vw, 18px)",
    lineHeight: 1.75,
    color: "#2A1A50",
    margin: 0,
    fontFamily: "sans-serif",
  },

  // Hard mode message card — readable transcript
  messageCard: {
    background: "#FAF7FF",
    border: "1.5px solid #C9B8E8",
    borderRadius: 14,
    padding: "clamp(14px, 3vw, 24px)",
  },
  messageMeta: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  messageMetaLabel: {
    fontSize: "clamp(15px, 3.5vw, 17px)",
    color: "#7A5FAA",
    fontFamily: "sans-serif",
    fontWeight: 600,
    paddingTop: 2,
  },
  messageMetaValue: {
    fontSize: "clamp(15px, 3.5vw, 17px)",
    color: "#1A0A3C",
    fontFamily: "sans-serif",
    lineHeight: 1.6,
    wordBreak: "break-word",
  },
  segmentBtn: {
    display: "block",
    width: "100%",
    textAlign: "left",
    fontSize: "clamp(15px, 3.5vw, 18px)",
    lineHeight: 1.85,
    color: "#1A0A3C",
    fontFamily: "sans-serif",
    padding: "8px 10px",
    border: "none",
    borderRadius: 6,
    transition: "background 0.15s",
    wordBreak: "break-word",
    boxSizing: "border-box",
  },
  flagReason: {
    fontSize: 16,
    color: "#7A1A2E",
    margin: "8px 0 0 10px",
    lineHeight: 1.65,
    fontFamily: "sans-serif",
  },
  hardHint: {
    fontSize: 16,
    color: "#7A5FAA",
    fontStyle: "italic",
    margin: 0,
    fontFamily: "sans-serif",
    textAlign: "center",
  },

  // Results screen

  resultsTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: "#3D1580",
    margin: 0,
    fontFamily: "'Georgia', serif",
  },
  overallScoreCard: {
    background: "#FAF7FF",
    border: "1.5px solid #C9B8E8",
    borderRadius: 14,
    padding: "28px 24px",
    textAlign: "center",
  },
  overallPct: {
    fontSize: 56,
    fontWeight: 700,
    color: "#3D1580",
    margin: 0,
    fontFamily: "sans-serif",
  },
  overallFraction: {
    fontSize: 17,
    color: "#7A5FAA",
    margin: "4px 0 0",
    fontFamily: "sans-serif",
  },
  overallMessage: {
    fontSize: 17,
    lineHeight: 1.75,
    color: "#2A1A50",
    margin: 0,
    fontFamily: "sans-serif",
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "#3D1580",
    margin: 0,
    fontFamily: "sans-serif",
  },
  breakdownRow: { marginBottom: 18 },
  breakdownHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  breakdownName: { fontSize: 16, color: "#333", fontFamily: "sans-serif" },
  breakdownPct: { fontSize: 16, fontWeight: 700, fontFamily: "sans-serif" },
  printBtn: {
    width: "100%",
    padding: "18px 24px",
    fontSize: 17,
    fontWeight: 500,
    fontFamily: "sans-serif",
    background: "#fff",
    color: "#3D1580",
    border: "2px solid #3D1580",
    borderRadius: 12,
    cursor: "pointer",
  },
  footer: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    margin: 0,
    fontFamily: "sans-serif",
    lineHeight: 1.6,
  },
};
