import { useState, useEffect } from 'react';

/**
 * 检测是否为移动设备的hook
 * @returns boolean - 是否为移动设备
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      // 检查用户代理字符串
      const userAgent = navigator.userAgent;
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      
      // 检查屏幕宽度
      const isSmallScreen = window.innerWidth <= 768;
      
      // 检查是否支持触摸
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // 综合判断
      const mobile = mobileRegex.test(userAgent) || (isSmallScreen && isTouchDevice);
      
      setIsMobile(mobile);
    };

    // 初始检查
    checkIsMobile();

    // 监听窗口大小变化
    const handleResize = () => {
      checkIsMobile();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return isMobile;
} 