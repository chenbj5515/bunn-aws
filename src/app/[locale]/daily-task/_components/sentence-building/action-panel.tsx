'use client';

import { Check } from 'lucide-react';
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
    <div className="flex flex-col gap-4 w-full">
      {/* 判题结果区域 */}
      <div className="flex justify-center items-center min-h-[60px]">
        {isSubmitted && (
          isCorrect ? (
            <div className="flex justify-center items-center gap-2 text-green-600 animate-slideInBottom">
              <Check className="w-6 h-6" />
              <span className="font-medium text-xl">{t('correct')}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2 w-full animate-slideInBottom">
              <div className="bg-[#FFF0F0] p-4 border-[#FF5E5E] border-l-4 rounded-lg">
                <span className="text-[#666] text-sm">{t('correctAnswer')}：</span>
                <span className="block mt-1 font-medium text-red-600 break-all">{originalText}</span>
              </div>
            </div>
          )
        )}
      </div>

      {/* 提交/继续按钮 */}
      <div className="flex justify-center mt-[8px] w-full">
        {!isSubmitted ? (
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className={`
              group relative w-full bg-transparent hover:brightness-110 p-0 border-none outline-offset-4 select-none
              ${!canSubmit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            style={{ height: '56px' }}
          >
            <span className="top-0 left-0 absolute bg-black/25 rounded-2xl w-full h-full transition-transform translate-y-0.5 group-active:translate-y-px group-hover:translate-y-1 duration-600 will-change-transform cubic-bezier(0.3,0.7,0.4,1)"></span>
            <span className={`top-0 left-0 absolute ${canSubmit ? 'bg-linear-to-l from-green-800 via-green-700 to-green-800' : 'bg-linear-to-l from-gray-500 via-gray-400 to-gray-500'} rounded-2xl w-full h-full`}></span>
            <span
              className={`relative flex justify-center items-center ${canSubmit ? 'bg-green-600' : 'bg-gray-400'} rounded-2xl text-white text-lg font-bold transition-transform -translate-y-1 group-active:-translate-y-0.5 group-hover:-translate-y-1.5 duration-600 will-change-transform cubic-bezier(0.3,0.7,0.4,1)`}
              style={{ height: '56px' }}
            >
              {t('submit')}
            </span>
          </button>
        ) : (
          <button
            onClick={onContinue}
            className="group relative bg-transparent hover:brightness-110 p-0 border-none outline-offset-4 w-full animate-slideInBottom cursor-pointer select-none"
            style={{ height: '56px' }}
          >
            <span className="top-0 left-0 absolute bg-black/25 rounded-2xl w-full h-full transition-transform translate-y-0.5 group-active:translate-y-px group-hover:translate-y-1 duration-600 will-change-transform cubic-bezier(0.3,0.7,0.4,1)"></span>
            <span className="top-0 left-0 absolute bg-linear-to-l from-green-800 via-green-700 to-green-800 rounded-2xl w-full h-full"></span>
            <span
              className="relative flex justify-center items-center bg-green-600 rounded-2xl text-white text-lg font-bold transition-transform -translate-y-1 group-active:-translate-y-0.5 group-hover:-translate-y-1.5 duration-600 will-change-transform cubic-bezier(0.3,0.7,0.4,1)"
              style={{ height: '56px' }}
            >
              {t('continue')}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
