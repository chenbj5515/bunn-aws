'use client';

interface VideoTitleProps {
  title: string | null;
  clickable: boolean;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function VideoTitle({ title, clickable, onClick }: VideoTitleProps) {
  return (
    <div
      className={clickable ? 'cursor-pointer group' : ''}
      onClick={clickable ? onClick : undefined}
    >
      <h2 className="flex justify-center items-center font-bold text-xl">
        {title}
      </h2>
    </div>
  );
}
