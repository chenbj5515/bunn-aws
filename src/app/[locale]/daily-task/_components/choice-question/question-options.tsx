import type { Question } from './reducer';

interface QuestionOptionsProps {
  question: Question;
  selectedAnswer: string | null;
  isSubmitted: boolean;
  onSelect: (answer: string) => void;
}

// 选项入场动画延迟（每个选项递增）
const OPTION_ANIMATION_DELAY_MS = 60;

export function QuestionOptions({
  question,
  selectedAnswer,
  isSubmitted,
  onSelect,
}: QuestionOptionsProps) {
  return (
    <div className="space-y-4">
      <h4 className="p-2 font-medium text-black text-lg animate-slideInBottom">{question.question}</h4>
      <div className="gap-2 grid">
        {question.options.map((option, index) => {
          const isCorrect = option === question.correctAnswer;
          const isSelected = option === selectedAnswer;

          return (
            <button
              key={`${question.question}-${index}`}
              onClick={() => !isSubmitted && onSelect(option)}
              disabled={isSubmitted}
              tabIndex={-1}
              style={{
                animationDelay: `${(index + 1) * OPTION_ANIMATION_DELAY_MS}ms`,
              }}
              className={`
                min-h-[50px] px-4 py-3 rounded-lg font-medium text-base transition-all duration-200
                opacity-0 animate-slideInBottom
                focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-within:outline-none focus-within:ring-0
                ${
                  isSubmitted
                    ? isCorrect
                      ? 'bg-green-50 text-green-700 shadow-neumorphic-button-hover border border-green-200 cursor-default'
                      : isSelected
                        ? 'bg-red-50 text-red-700 shadow-neumorphic-button-hover border border-red-200 cursor-default'
                        : 'bg-gray-50 text-black shadow-neumorphic-weak border border-gray-200 cursor-default'
                    : isSelected
                      ? 'bg-white text-black shadow-neumorphic-button-hover border border-gray-200 cursor-pointer'
                      : 'bg-white text-black shadow-neumorphic hover:shadow-neumorphic-button-hover hover:bg-gray-50 border border-gray-200 cursor-pointer'
                }
              `}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
