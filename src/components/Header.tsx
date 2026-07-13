import { useEffect, useState } from 'react';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export default function Header({ theme, onToggleTheme }: HeaderProps) {
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const iv = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <header className="header">
      <div className="header-left" />
      <div className="header-center">
        <div className="header-title-block">
          <h1 className="header-title">🔗 ROS Web Bridge</h1>
          <span className="header-subtitle">LiDAR Camera Projection System</span>
        </div>
      </div>
      <div className="header-right">
        <button
          className="btn-theme"
          onClick={onToggleTheme}
          title={theme === 'dark' ? '切换到浅色主题' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <span className="header-divider">|</span>
        <span className="metric">
          {clock.toLocaleTimeString()}
        </span>
      </div>
    </header>
  );
}
