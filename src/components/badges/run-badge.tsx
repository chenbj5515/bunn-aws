'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface RunBadgeProps {
  level: 'yellow' | 'orange' | 'green' | 'blue' | 'purple' | 'black' | 'volt';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showAnimation?: boolean;
  className?: string;
}

export function RunBadge({ 
  level, 
  size = 'md', 
  showAnimation = false,
  className 
}: RunBadgeProps) {
  const [isAnimating, setIsAnimating] = useState(showAnimation);
  
  // 根据级别获取颜色
  const getBadgeColor = () => {
    switch (level) {
      case 'yellow': return '#FFD700';
      case 'orange': return '#FFA500';
      case 'green': return '#00C853';
      case 'blue': return '#2979FF';
      case 'purple': return '#AA00FF';
      case 'black': return '#212121';
      case 'volt': return '#CCFF00';
      default: return '#FFD700';
    }
  };
  
  // 根据尺寸获取大小
  const getBadgeSize = () => {
    switch (size) {
      case 'xs': return { width: '30px', height: '35px' };
      case 'sm': return { width: '60px', height: '70px' };
      case 'md': return { width: '80px', height: '90px' };
      case 'lg': return { width: '100px', height: '115px' };
      default: return { width: '80px', height: '90px' };
    }
  };
  
  // 获取大小相关样式
  const sizeStyle = getBadgeSize();
  const outerBorderWidth = size === 'xs' ? 1 : size === 'sm' ? 2 : 3;
  const innerBorderWidth = size === 'xs' ? 1 : size === 'sm' ? 1 : 2;
  const innerPadding = size === 'xs' ? 3 : size === 'sm' ? 5 : 8;
  
  useEffect(() => {
    if (showAnimation) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 2000); // 动画持续2秒
      
      return () => clearTimeout(timer);
    }
  }, [showAnimation]);
  
  return (
    <div className={cn('relative', className)} style={sizeStyle}>
      <motion.div
        initial={isAnimating ? { scale: 0.5, opacity: 0 } : { scale: 1, opacity: 1 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 150 }}
        className="relative w-full h-full"
      >
        {/* 外部黑色轮廓 */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundColor: 'black',
            clipPath: 'polygon(0% 0%, 100% 0%, 100% 80%, 50% 100%, 0% 80%)'
          }}
        ></div>
        
        {/* 中间彩色区域 */}
        <div 
          className="absolute"
          style={{
            top: `${outerBorderWidth}px`,
            left: `${outerBorderWidth}px`,
            right: `${outerBorderWidth}px`,
            bottom: `${outerBorderWidth}px`,
            backgroundColor: getBadgeColor(),
            clipPath: 'polygon(0% 0%, 100% 0%, 100% 80%, 50% 100%, 0% 80%)'
          }}
        >
          {/* 内部黑色轮廓 */}
          <div
            className="absolute"
            style={{
              top: `${innerPadding}px`,
              left: `${innerPadding}px`,
              right: `${innerPadding}px`,
              bottom: `${innerPadding}px`,
              backgroundColor: 'black',
              clipPath: 'polygon(0% 0%, 100% 0%, 100% 80%, 50% 100%, 0% 80%)',
              zIndex: 1
            }}
          >
            {/* 最内层彩色区域 */}
            <div
              className="absolute"
              style={{
                top: `${innerBorderWidth}px`,
                left: `${innerBorderWidth}px`,
                right: `${innerBorderWidth}px`,
                bottom: `${innerBorderWidth}px`,
                backgroundColor: getBadgeColor(),
                clipPath: 'polygon(0% 0%, 100% 0%, 100% 80%, 50% 100%, 0% 80%)',
                zIndex: 2
              }}
            />
          </div>
          
          {/* Bunn 图标 */}
          <div 
            className="flex justify-center items-center"
            style={{ 
              position: 'absolute',
              inset: 0,
              paddingBottom: '10%',
              zIndex: 3
            }}
          >
            <img 
              src="/icon/brand.png" 
              alt="Bunn" 
              style={{ 
                width: size === 'xs' ? '42%' : size === 'sm' ? '42%' : size === 'lg' ? '42%' : '42%',
                height: 'auto',
                objectFit: 'contain'
              }} 
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}