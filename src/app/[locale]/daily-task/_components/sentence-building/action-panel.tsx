'use client';

import { X, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ActionPanelProps {
  selectedCount: number;
  totalCount: number;
  isSubmitted: boolean;
  isCorrect: boolean | null;
  originalText: string;
  onSubmit: () => void;
  onContinue: () => void;
}

export function ActionPanel({
  selectedCount,
  totalCount,
  isSubmitted,
  isCorrect,
  originalText,
  onSubmit,
  onContinue,
}: ActionPanelProps) {
  const t = useTranslations('sentenceBuilding');
  const canSubmit = selectedCount === totalCount;

  return (
    <div className="flex flex-col gap-4 pt-4 w-full">
      {/* 判题结果区域 */}
      <div className="flex justify-center items-center min-h-[60px]">
        {isSubmitted && (
          isCorrect ? (
            <div className="flex justify-center items-center gap-2 text-green-600 animate-slideInBottom">
              <Check className="w-6 h-6" />
              <span className="font-medium text-xl">{t('correct')}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 animate-slideInBottom">
              <div className="flex items-center gap-2">
                <X className="w-6 h-6 text-red-500" />
                <span className="font-medium text-red-600 text-lg">{t('correctAnswer')}</span>
              </div>
              <span className="font-system-ui font-medium text-red-600 text-center">{originalText}</span>
            </div>
          )
        )}
      </div>

      {/* 提交/继续按钮 */}
      <div className="flex justify-center">
        {!isSubmitted ? (
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className={`
              group relative bg-transparent hover:brightness-110 p-0 border-none outline-offset-4 select-none
              ${!canSubmit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            style={{ width: '280px', height: '50px' }}
          >
            <span className="top-0 left-0 absolute bg-black/25 rounded-xl w-full h-full transition-transform translate-y-0.5 group-active:translate-y-px group-hover:translate-y-1 duration-600 will-change-transform cubic-bezier(0.3,0.7,0.4,1)"></span>
            <span className={`top-0 left-0 absolute ${canSubmit ? 'bg-linear-to-l from-green-800 via-green-700 to-green-800' : 'bg-linear-to-l from-gray-500 via-gray-400 to-gray-500'} rounded-xl w-full h-full`}></span>
            <span
              className={`relative flex justify-center items-center ${canSubmit ? 'bg-green-600' : 'bg-gray-400'} rounded-xl text-white text-lg transition-transform -translate-y-1 group-active:-translate-y-0.5 group-hover:-translate-y-1.5 duration-600 will-change-transform cubic-bezier(0.3,0.7,0.4,1)`}
              style={{ width: '280px', height: '50px' }}
            >
              {t('submit')}
            </span>
          </button>
        ) : (
          <button
            onClick={onContinue}
            className="group relative bg-transparent hover:brightness-110 p-0 border-none outline-offset-4 animate-slideInBottom cursor-pointer select-none"
            style={{ width: '280px', height: '50px' }}
          >
            <span className="top-0 left-0 absolute bg-black/25 rounded-xl w-full h-full transition-transform translate-y-0.5 group-active:translate-y-px group-hover:translate-y-1 duration-600 will-change-transform cubic-bezier(0.3,0.7,0.4,1)"></span>
            <span className={`top-0 left-0 absolute bg-linear-to-l ${isCorrect ? 'from-green-800 via-green-700 to-green-800' : 'from-red-800 via-red-700 to-red-800'} rounded-xl w-full h-full`}></span>
            <span
              className={`relative flex justify-center items-center ${isCorrect ? 'bg-green-600' : 'bg-red-600'} rounded-xl text-white text-lg transition-transform -translate-y-1 group-active:-translate-y-0.5 group-hover:-translate-y-1.5 duration-600 will-change-transform cubic-bezier(0.3,0.7,0.4,1)`}
              style={{ width: '280px', height: '50px' }}
            >
              {t('continue')}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
