import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

function MicIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3z" />
      <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-3.08A7 7 0 0 0 19 11z" />
    </svg>
  );
}

function formatToday() {
  const now = new Date();
  const weekday = now.toLocaleDateString('en-US', { weekday: 'short' });
  const monthDay = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${weekday}, ${monthDay}`;
}

export default function Home() {
  const [recording, setRecording] = useState(false);

  return (
    <div className="home">
      <div className="home-main">
        <button
          type="button"
          className={`mic-btn${recording ? ' mic-btn--recording' : ''}`}
          aria-label={recording ? 'Recording' : 'Record voice note'}
          aria-pressed={recording}
          onPointerDown={() => setRecording(true)}
          onPointerUp={() => setRecording(false)}
          onPointerLeave={() => setRecording(false)}
          onPointerCancel={() => setRecording(false)}
        >
          <MicIcon />
        </button>

        <div className={`home-meta${recording ? ' home-meta--faded' : ''}`}>
          <p className="home-date">{formatToday()}</p>
          <Link to="/timeline" className="home-timeline">
            timeline
          </Link>
        </div>
      </div>

      <button type="button" className="link muted home-settings">
        settings
      </button>
    </div>
  );
}
