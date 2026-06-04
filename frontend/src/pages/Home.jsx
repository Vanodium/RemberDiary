import { useState } from 'react';
import { Link } from 'react-router-dom';
import MicIcon from '../components/MicIcon';
import { useOverlay } from '../context/OverlayContext';
import './Home.css';

function formatToday() {
  const now = new Date();
  const weekday = now.toLocaleDateString('en-US', { weekday: 'short' });
  const monthDay = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${weekday}, ${monthDay}`;
}

export default function Home() {
  const [recording, setRecording] = useState(false);
  const { openSettings } = useOverlay();

  return (
    <div className={`home${recording ? ' home--recording' : ''}`}>
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

        <div className="home-meta">
          <p className="home-date">{formatToday()}</p>
          <Link to="/timeline" className="text-btn home-timeline">
            timeline
          </Link>
        </div>
      </div>

      <button type="button" className="text-btn home-settings" onClick={openSettings}>
        settings
      </button>
    </div>
  );
}
