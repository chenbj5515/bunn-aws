'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { VideoList } from './video-list';
import { useVideoSearch } from '../_hooks/use-video-search';
import { channelDetailAtom } from '../_store';
import { VideoTitle } from './video-title';
import { SearchInput } from './search-input';

/**
 * 视频标题栏组件
 * 包含标题显示、搜索输入和视频列表下拉
 */
export function VideoTitleBar() {
  const t = useTranslations('channels');
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const isReadOnly = searchParams.get('rp') === '1';

  const channelDetail = useAtomValue(channelDetailAtom);

  const {
    inputRef,
    currentVideoId,
    currentVideoTitle,
    filteredVideos,
    isSelecting,
    isListOpen,
    position,
    enterSearchMode,
    exitSearchMode,
    handleSearch,
    handleFocus,
    handleBlur,
  } = useVideoSearch();

  // 处理视频选择 - 使用嵌套路由导航
  const handleVideoSelect = (videoId: string, _videoTitle: string | null) => {
    const locale = params.locale as string;
    const channelId = channelDetail?.channelId || params.channelId as string;
    // 导航到新的视频路由
    router.push(`/${locale}/channels/${encodeURIComponent(channelId)}/${encodeURIComponent(videoId)}`);
  };

  // 显示标题还是搜索框：有视频ID、有标题、且不在选择模式时显示标题
  const showTitle = currentVideoId && currentVideoTitle && !isSelecting;

  return (
    <div className="top-[50px] left-1/2 z-1001 absolute -translate-x-1/2">
      <div className="flex justify-center items-center min-h-10 font-sans">
        {showTitle ? (
          <VideoTitle
            title={currentVideoTitle}
            clickable={!isReadOnly}
            onClick={enterSearchMode}
          />
        ) : (
          <SearchInput
            ref={inputRef}
            placeholder={t('search.placeholder')}
            onSearch={handleSearch}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        )}
      </div>
      <VideoList
        isOpen={isListOpen}
        onClose={exitSearchMode}
        onSelect={handleVideoSelect}
        videos={filteredVideos}
        currentVideoId={currentVideoId}
        position={position}
      />
    </div>
  );
}
