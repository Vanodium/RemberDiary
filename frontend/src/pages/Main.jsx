import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Main.css';

export default function Main({ exiting = false, initialHovered = false, onStartClick }) {
  const { user, loading } = useAuth();
  const [startHovered, setStartHovered] = useState(initialHovered || exiting);
  const [showExit, setShowExit] = useState(false);
  const hovered = exiting || startHovered;

  useEffect(() => {
    if (!exiting) return;
    const frame = requestAnimationFrame(() => setShowExit(true));
    return () => cancelAnimationFrame(frame);
  }, [exiting]);

  if (!exiting && !loading && user) {
    return <Navigate to="/home" replace />;
  }

  const handleStartClick = (e) => {
    e.preventDefault();
    if (exiting || !onStartClick) return;
    onStartClick(startHovered);
  };

  return (
    <main
      className={[
        'main',
        hovered ? 'main--start-hovered' : '',
        exiting ? 'main--exit-overlay' : '',
        showExit ? 'main--exiting' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="main-white" aria-hidden="true" />
      <div className="main-fill" aria-hidden="true" />
      <div className="main-left">
        {exiting ? (
          <span className="main-start" aria-hidden="true">
            start
          </span>
        ) : (
          <Link
            to="/login"
            className="main-start"
            onMouseEnter={() => setStartHovered(true)}
            onMouseLeave={() => setStartHovered(false)}
            onFocus={() => setStartHovered(true)}
            onBlur={() => setStartHovered(false)}
            onClick={handleStartClick}
          >
            start
          </Link>
        )}
      </div>
      <div className="main-right">
        <h1 className="main-headline">
          <span>new</span>
          <span>era of</span>
          <span>journ</span>
          <span>alling</span>
        </h1>
      </div>
    </main>
  );
}
