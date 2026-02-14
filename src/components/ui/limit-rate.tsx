'use client';

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import InlineLimitBanner from '@/components/ui/inline-limit-banner';

interface LimitRateProps {
  show: boolean;
  onClose: () => void;
  className?: string;
}

export function LimitRate({ show, onClose, className = '' }: LimitRateProps) {
  const t = useTranslations('common');
  const containerRef = useRef<HTMLDivElement>(null);

  // 处理点击外部关闭
  useEffect(() => {
    if (!show) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="z-1002 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
      <div
        ref={containerRef}
        className={`bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4 ${className}`}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-900 text-lg" />
          <button
            onClick={onClose}
            className="hover:bg-gray-100 p-1 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex justify-center items-center gap-4">
          <InlineLimitBanner fontSizePx={18} />
        </div>
      </div>
    </div>
  );
}

export default LimitRate;
