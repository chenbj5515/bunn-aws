"use client";

import Image from "next/image";
import { AIContentRenderer } from "../../ai-content-renderer";

interface AskAIContextDisplayProps {
  contextText: string;
}

/**
 * 上下文展示组件
 */
export function AskAIContextDisplay({ contextText }: AskAIContextDisplayProps) {
  if (!contextText) return null;

  return (
    <div className="flex justify-start">
      <div className="flex flex-row w-full md:max-w-[80%]">
        <div className="hidden md:block z-10 relative shrink-0 mr-3">
          <div className="flex flex-col items-center">
            <span className="-mt-[4px] font-sans text-[12px] text-center">
              Bunn
            </span>
            <Image
              src="/assets/logo.jpeg"
              alt="Bunn"
              width={32}
              height={32}
              className="rounded-[4px] w-[32px] h-[32px]"
            />
          </div>
        </div>
        <div className="p-3 rounded-lg text-[14px] leading-[1.9] tracking-[0.5px] md:ml-[-40px] md:pl-[52px]">
          <AIContentRenderer content={contextText} />
        </div>
      </div>
    </div>
  );
}
