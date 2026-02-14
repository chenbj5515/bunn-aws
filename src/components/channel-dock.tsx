"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface ChannelDockProps {
  className?: string;
}

interface ChannelItem {
  id: string;
  name: string;
  image: string;
  url: string;
}

export function ChannelDock({ className }: ChannelDockProps) {
  const [hoveredIcon, setHoveredIcon] = useState<number | null>(null);
  const t = useTranslations('safari');

  const channels: ChannelItem[] = [
    {
      id: "channels_01",
      name: "マリマリマリー",
      image: "/assets/slogans/channels_01.png",
      url: "https://www.youtube.com/@marymarymary80s"
    },
    {
      id: "channels_02",
      name: "ピグマリオン",
      image: "/assets/slogans/channels_02.png",
      url: "https://www.youtube.com/@pygmalion_123"
    },
    {
      id: "channels_03",
      name: "私立パラの丸高校",
      image: "/assets/slogans/channels_03.png",
      url: "https://www.youtube.com/@parako"
    }
  ];

  const handleChannelClick = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className={cn("flex flex-col items-center space-y-2", className)}>
      <div className="text-sm">
        {t('findVideos')}
      </div>
      <motion.div
        className="flex justify-center items-center gap-2.5 bg-[#0000000d] backdrop-blur-md backdrop-saturate-180 px-3 py-2 border-[0.5px] border-white/20 rounded-2xl"
      >
        {channels.map((channel, index) => (
          <Tooltip key={channel.id}>
            <TooltipTrigger asChild>
              <motion.div
                className="relative flex justify-center items-center cursor-pointer"
                onMouseEnter={() => setHoveredIcon(index)}
                onMouseLeave={() => setHoveredIcon(null)}
                onClick={() => handleChannelClick(channel.url)}
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <motion.div
                  className="relative flex justify-center items-center shadow-md border border-white/20 rounded-full w-10 h-10 overflow-hidden"
                  animate={{
                    scale: hoveredIcon === index ? 1.2 : 1,
                    y: hoveredIcon === index ? -5 : 0,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 17,
                  }}
                >
                  <img
                    src={channel.image}
                    alt={channel.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // 如果图片加载失败，显示一个默认的圆形背景
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.style.backgroundColor = '#f0f0f0';
                      }
                    }}
                  />
                </motion.div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent sideOffset={10}>
              <p>{channel.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </motion.div>
    </div>
  );
}