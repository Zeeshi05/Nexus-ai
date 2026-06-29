"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import type { ClarificationQuestion } from "@/types/project";

interface ClarificationCardProps {
  questions: ClarificationQuestion[];
  onBack: () => void;
  onContinue: (answers: Record<string, string>) => void;
  loading: boolean;
}

export default function ClarificationCard({
  questions,
  onBack,
  onContinue,
  loading,
}: ClarificationCardProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);

  const currentQuestion = questions[currentIdx];

  const handleSelectOption = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      onContinue(answers);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    } else {
      onBack();
    }
  };

  const isCurrentAnswered = !!answers[currentQuestion?.id];
  const allAnswered = questions.every((q) => !!answers[q.id]);

  if (!currentQuestion) return null;

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 space-y-8">
      {/* Header / Back */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrev}
          className="text-xs text-[#8892A4] hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {currentIdx === 0 ? "Edit prompt" : "Previous Question"}
        </button>
        <span className="text-xs text-[#8892A4] font-medium">
          Question {currentIdx + 1} of {questions.length}
        </span>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5 justify-center">
        {questions.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === currentIdx
                ? "w-8 bg-[#00B4D8]"
                : i < currentIdx
                ? "w-3 bg-[#5C35C5]"
                : "w-3 bg-[#1E2D40]"
            }`}
          />
        ))}
      </div>

      {/* Question Card */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-white text-center">
          {currentQuestion.question}
        </h3>

        {/* Options grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {currentQuestion.options.map((option, i) => {
            const isSelected = answers[currentQuestion.id] === option.value;

            return (
              <motion.button
                key={option.value}
                type="button"
                onClick={() => handleSelectOption(option.value)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.3 }}
                className={`relative text-left p-5 rounded-xl border transition-all duration-200 h-full flex flex-col justify-between ${
                  isSelected
                    ? "bg-[#1A1040]/30 border-[#5C35C5] text-white shadow-lg shadow-[#5C35C5]/10"
                    : "bg-[#0F1520] border-[#1E2D40] text-[#8892A4] hover:border-[#3949AB] hover:text-white"
                }`}
              >
                <div>
                  <span className={`text-sm font-semibold block mb-1 ${isSelected ? "text-[#00B4D8]" : "text-white"}`}>
                    {option.label}
                  </span>
                  <p className="text-xs text-[#8892A4] leading-relaxed">
                    {option.description}
                  </p>
                </div>
                {isSelected && (
                  <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#5C35C5] flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Continue */}
      <Button
        onClick={handleNext}
        disabled={loading || (!isCurrentAnswered && currentQuestion.required)}
        className="w-full h-14 bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 text-white font-medium text-base rounded-xl transition-all"
      >
        {loading ? (
          "Planning build..."
        ) : currentIdx < questions.length - 1 ? (
          <>
            Next Question
            <ArrowRight className="h-5 w-5 ml-2" />
          </>
        ) : (
          <>
            Continue Building
            <ArrowRight className="h-5 w-5 ml-2" />
          </>
        )}
      </Button>
    </div>
  );
}
