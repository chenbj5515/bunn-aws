import { FC } from 'react';
import Image from 'next/image';
import { ExternalLink, HelpCircle, Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useTranslations } from 'next-intl';

interface ContextButtonProps {
  contextUrl: string | null;
  handlePlayBtn?: () => void;
  weakBorder?: boolean;
  onGrammarAnalysis?: () => void;
  mode?: "Comprehensible input" | "Standard";
  isPlaying?: boolean;
  theme?: "white" | "vision";
  onPlayVideo?: () => void; // 新增：播放视频的回调，用于关闭弹窗并播放
  showOnlyHelp?: boolean; // 仅显示问号AI分析按钮
}

export const ContextButton: FC<ContextButtonProps> = ({
  contextUrl,
  handlePlayBtn = () => {},
  weakBorder = false,
  onGrammarAnalysis = () => {},
  mode = "Standard",
  isPlaying = false,
  theme = "white",
  onPlayVideo = () => {},
  showOnlyHelp = false
}) => {
  const isMobile = useIsMobile();

  if (showOnlyHelp) {
    return (
      <div className="top-[22px] right-5 absolute">
        <div
          className={`${theme === 'vision' ? 'bg-white/20 backdrop-blur-sm border-white/30 shadow-xl shadow-black/50' : 'shadow-neumorphic hover:shadow-neumorphic-button-hover bg-white dark:bg-bgDark'} flex justify-center items-center rounded-full w-16 h-16 transition-all duration-300 cursor-pointer`}
          onClick={onGrammarAnalysis}
        >
          <HelpCircle className="w-5 h-5" />
        </div>
      </div>
    );
  }
  
  // 如果是Comprehensible input模式，直接显示两个按钮
  if (mode === "Comprehensible input") {
    const t = useTranslations('memoCard');
    return (
      <div className="top-2 right-2 absolute">
        <div className="relative flex flex-col gap-2 w-[54px]">
          {/* TTS播放按钮 */}
          <div
            className={`${
              theme === 'vision'
                ? 'bg-white/20 backdrop-blur-sm border-white/30 shadow-xl shadow-black/50'
                : 'shadow-neumorphic hover:shadow-neumorphic-button-hover bg-white dark:bg-bgDark dark:shadow-none border-solid'
            } flex justify-center items-center rounded-full w-[54px] h-[54px] transition-all duration-300 cursor-pointer ${isPlaying ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={isPlaying ? undefined : handlePlayBtn}
          >
            {isPlaying ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Image
                src="/icon/play-audio.svg"
                alt="play audio"
                width={24}
                height={20}
                className="w-6 h-5"
              />
            )}
          </div>

          {/* AI分析按钮 */}
          <div
            className={`${
              theme === 'vision'
                ? 'bg-white/20 backdrop-blur-sm border-white/30 shadow-xl shadow-black/50'
                : 'shadow-neumorphic hover:shadow-neumorphic-button-hover bg-white dark:bg-bgDark'
            } flex justify-center items-center rounded-full w-[54px] h-[54px] transition-all duration-300 cursor-pointer`}
            onClick={onGrammarAnalysis}
          >
            <HelpCircle className="w-5 h-5" />
          </div>
        </div>
      </div>
    );
  }

  if (contextUrl) {
    // 默认显示TTS按钮，hover时显示其他按钮
    return (
      <div className={`${isMobile ? '' : 'group'} top-2 right-2 absolute`}>
        <div className="relative pb-[152px] w-[54px]">
          {/* 默认显示的TTS按钮 */}
          <div
            className={`${
              theme === 'vision'
                ? 'bg-white/10 border border-white/20'
                : 'shadow-neumorphic hover:shadow-neumorphic-button-hover bg-white dark:bg-bgDark dark:shadow-none border-solid'
            } z-10 relative flex justify-center items-center rounded-full w-[54px] h-[54px] transition-all duration-300 cursor-pointer ${isPlaying ? 'opacity-50 cursor-not-allowed' : ''} ${!isPlaying && theme !== 'vision' ? 'hover:shadow-neumorphic-button-hover' : ''}`}
            onClick={isPlaying ? undefined : handlePlayBtn}
          >
            {isPlaying ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Image
                src="/icon/play-audio.svg"
                alt="play audio"
                width={24}
                height={20}
                className="w-6 h-5"
              />
            )}
          </div>

          {!isMobile && (
            <>
              {/* hover时显示的外部链接按钮 */}
              <div
                className={`${
                  theme === 'vision'
                    ? 'bg-white/10 border border-white/20'
                    : 'shadow-neumorphic hover:shadow-neumorphic-button-hover bg-white dark:bg-bgDark'
                } mt-2 cursor-pointer top-0 left-0 absolute flex justify-center items-center opacity-0 group-hover:opacity-100 rounded-full w-[54px] h-[54px] transition-all group-hover:translate-y-14 duration-300 ${isPlaying ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={isPlaying ? undefined : handlePlayBtn}
              >
                {isPlaying ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Image
                    src="/icon/play-audio.svg"
                    alt="play audio"
                    width={24}
                    height={20}
                    className="w-6 h-5"
                  />
                )}
              </div>

              {/* hover时显示的语法分析按钮 */}
              <div
                className={`${
                  theme === 'vision'
                    ? 'bg-white/10 border border-white/20'
                    : 'shadow-neumorphic hover:shadow-neumorphic-button-hover bg-white dark:bg-bgDark'
                } mt-2 cursor-pointer top-0 left-0 absolute flex justify-center items-center opacity-0 group-hover:opacity-100 rounded-full w-[54px] h-[54px] transition-all group-hover:translate-y-30 duration-300`}
                onClick={onGrammarAnalysis}
              >
                <HelpCircle className="w-5 h-5" />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className={`${isMobile ? '' : 'group'} top-2 right-2 absolute`}>
      <div
        className={`${
          theme === 'vision'
            ? 'bg-white/10 border border-white/20'
            : 'shadow-neumorphic hover:shadow-neumorphic-button-hover bg-white dark:bg-bgDark dark:shadow-none border-solid'
        } z-10 relative flex justify-center items-center rounded-full w-12 h-12 transition-all duration-300 cursor-pointer ${isPlaying ? 'opacity-50 cursor-not-allowed' : ''} ${!isPlaying && theme !== 'vision' ? 'hover:shadow-neumorphic-button-hover' : ''}`}
        onClick={isPlaying ? undefined : handlePlayBtn}
      >
        {isPlaying ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Image
            src="/icon/play-audio.svg"
            alt="play audio"
            width={24}
            height={20}
            className="w-6 h-5"
          />
        )}
      </div>
      {!isMobile && (
        <div
          className={`${
            theme === 'vision'
              ? 'bg-white/10 border border-white/20'
              : 'shadow-neumorphic hover:shadow-neumorphic-button-hover bg-white dark:bg-bgDark'
          } mt-2 cursor-pointer top-0 right-0 absolute flex justify-center items-center opacity-0 group-hover:opacity-100 rounded-full w-12 h-12 transition-all group-hover:translate-y-14 duration-300`}
          onClick={onGrammarAnalysis}
        >
          <HelpCircle className="w-5 h-5" />
        </div>
      )}
    </div>
  );
};