import { useEffect } from 'react';

export function useMobileViewport() {
  useEffect(() => {
    // 设置真实的视口高度
    function setRealVH() {
      // 获取当前视口的实际高度
      const vh = window.innerHeight * 0.01;
      // 设置CSS自定义属性
      document.documentElement.style.setProperty('--real-vh', `${vh}px`);
    }

    // 初始设置
    setRealVH();

    // 监听窗口大小变化（包括地址栏的显示/隐藏）
    const handleResize = () => {
      setRealVH();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // 清理事件监听器
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);
} 