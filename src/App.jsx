
// ─────────────────────────────────────────────────────────────────────────────
// App.jsx
//
// Root component. Manages which top-level screen is shown:
//   "home" — the HomeScreen (landing + difficulty selector)
//   "quiz" — the QuizScreen (the actual quiz)
//
// When the user taps "Start quiz" on the home screen, onStart() is called
// with everything the quiz needs. App stores those values in state and
// switches to the quiz screen.
//
// When the user taps "Play again" on the results screen, onPlayAgain()
// resets everything back to the home screen.
// ─────────────────────────────────────────────────────────────────────────────
 
import { useState } from "react";
import HomeScreen from "./homeScreen";
import QuizScreen from "./quizScreen";
 
export default function App() {
  // "home" | "quiz"
  const [screen, setScreen] = useState("home");
 
  // Values passed from HomeScreen into QuizScreen when a quiz starts
  const [quizProps, setQuizProps] = useState(null);
 
  // Called by HomeScreen when the user taps "Start quiz".
  // Stores everything the quiz needs and switches to the quiz screen.
  const handleStart = (difficulty, shuffledScams, ageRange, sessionId, startedAt) => {
    setQuizProps({ difficulty, shuffledScams, ageRange, sessionId, startedAt });
    setScreen("quiz");
  };
 
  // Called by QuizScreen when the user taps "Play again".
  // Clears quiz state and returns to the home screen.
  const handlePlayAgain = () => {
    setQuizProps(null);
    setScreen("home");
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
        onPlayAgain={handlePlayAgain}
      />
    );
  }
 
  return null;
}