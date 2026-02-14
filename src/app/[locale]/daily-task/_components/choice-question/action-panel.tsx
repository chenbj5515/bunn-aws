import { X } from 'lucide-react';

interface ActionPanelProps {
  selectedAnswer: string | null;
  correctAnswer: string;
  isSubmitted: boolean;
  isLastQuestion: boolean;
  submitLabel: string;
  correctLabel: string;
  correctAnswerLabel: string;
  nextLabel: string;
  continueLabel: string;
  onSubmit: () => void;
  onContinue: () => void;
}

export function ActionPanel({
  selectedAnswer,
  correctAnswer,
  isSubmitted,
  isLastQuestion,
  submitLabel,
  correctLabel,
  correctAnswerLabel,
  nextLabel,
  continueLabel,
  onSubmit,
  onContinue,
}: ActionPanelProps) {
  const isCorrect = selectedAnswer === correctAnswer;

  return (
    <div className="flex flex-col flex-1 justify-end pt-8 pb-2 w-full">
      {/* 提交按钮：有选中且未提交时出现 */}
      {!isSubmitted && selectedAnswer && (
        <div className="w-full animate-slideInBottom">
          <button
            onClick={onSubmit}
            tabIndex={-1}
            className="group relative bg-transparent hover:brightness-110 p-0 border-none focus-visible:outline-none focus-within:outline-none focus:outline-none outline-offset-4 focus-visible:ring-0 focus-within:ring-0 focus:ring-0 w-full min-h-[46px] animate-slideInBottom cursor-pointer select-none"
          >
            <span className="top-0 left-0 absolute bg-black/25 rounded-xl w-full h-full transition-transform translate-y-0.5 group-active:translate-y-px group-hover:translate-y-1 duration-600 will-change-transform cubic-bezier(0.3,0.7,0.4,1)"></span>
            <span className="top-0 left-0 absolute bg-linear-to-l from-green-800 via-green-700 to-green-800 rounded-xl w-full h-full"></span>
            <span className="relative flex justify-center items-center bg-green-600 rounded-xl text-white text-lg transition-transform -translate-y-1 group-active:-translate-y-0.5 group-hover:-translate-y-1.5 duration-600 will-change-transform cubic-bezier(0.3,0.7,0.4,1) w-full min-h-[46px]">
              {submitLabel}
            </span>
          </button>
        </div>
      )}

      {/* 答题反馈区域 */}
      {isSubmitted && (
        <div className="w-full animate-slideInBottom">
          {isCorrect ? (
            /* 答对了 */
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-3">
                <svg className="overflow-visible" viewBox="0 0 24 24" height="24px" width="24px">
                  <path
                    d="M 4 12 L 10 18 L 20 6"
                    pathLength="100"
                    stroke="#16a34a"
                    className="animate-checkmark"
                    style={{
                      fill: 'none',
                      strokeWidth: 2.5,
                      strokeLinecap: 'round',
                      strokeLinejoin: 'round',
                    }}
                  ></path>
                </svg>
                <span className="font-medium text-green-700 text-lg">{correctLabel}</span>
              </div>
              <ContinueButton
                color="green"
                label={isLastQuestion ? continueLabel : nextLabel}
                onClick={onContinue}
              />
            </div>
          ) : (
            /* 答错了 */
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-3">
                <X className="w-6 h-6 text-red-500" />
                <span className="font-medium text-red-700 text-lg">
                  {correctAnswerLabel}: {correctAnswer}
                </span>
              </div>
              <ContinueButton
                color="red"
                label={isLastQuestion ? continueLabel : nextLabel}
                onClick={onContinue}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ContinueButtonProps {
  color: 'green' | 'red';
  label: string;
  onClick: () => void;
}

function ContinueButton({ color, label, onClick }: ContinueButtonProps) {

  return (
    <button
      onClick={onClick}
      tabIndex={-1}
      className="group relative bg-transparent hover:brightness-110 p-0 border-none focus-visible:outline-none focus-within:outline-none focus:outline-none outline-offset-4 focus-visible:ring-0 focus-within:ring-0 focus:ring-0 w-full min-h-[46px] animate-slideInBottom cursor-pointer select-none"
    >
      <span className="top-0 left-0 absolute bg-black/25 rounded-xl w-full h-full transition-transform translate-y-0.5 group-active:translate-y-px group-hover:translate-y-1 duration-600 will-change-transform cubic-bezier(0.3,0.7,0.4,1)"></span>
      <span className={`top-0 left-0 absolute bg-linear-to-l ${color === 'green' ? 'from-green-800 via-green-700 to-green-800' : 'from-red-800 via-red-700 to-red-800'} rounded-xl w-full h-full`}></span>
      <span className={`relative flex justify-center items-center ${color === 'green' ? 'bg-green-600' : 'bg-red-600'} rounded-xl text-white text-lg transition-transform -translate-y-1 group-active:-translate-y-0.5 group-hover:-translate-y-1.5 duration-600 will-change-transform cubic-bezier(0.3,0.7,0.4,1) w-full min-h-[46px]`}>
        {label}
      </span>
    </button>
  );
}
