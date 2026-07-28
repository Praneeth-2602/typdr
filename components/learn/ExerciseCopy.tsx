"use client";

import { TypingBox } from "@/components/typing/TypingBox";
import type { SessionResult } from "@/lib/stores/analytics";
import type { LessonExercise } from "@/lib/data/curriculum";

interface ExerciseCopyProps {
  exercise: LessonExercise;
  onComplete: (result: SessionResult) => void;
  onRestart?: () => void;
  resetKey: number;
}

export function ExerciseCopy({ exercise, onComplete, onRestart, resetKey }: ExerciseCopyProps) {
  const text = typeof exercise.content === "string" ? exercise.content : exercise.content.join(" ");

  return (
    <div>
      {exercise.instructions && (
        <p className="text-xs font-mono text-slate-500 mb-4">{exercise.instructions}</p>
      )}
      <TypingBox
        key={resetKey}
        text={text}
        mode="words"
        duration={0}
        onComplete={onComplete}
        onRestart={onRestart}
      />
    </div>
  );
}
