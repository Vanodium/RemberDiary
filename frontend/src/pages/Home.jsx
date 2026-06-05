import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import MicIcon from '../components/MicIcon';
import { useOverlay } from '../context/OverlayContext';
import { formatDuration, useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { uploadRecording } from '../lib/api';
import { saveLocalRecording, updateLocalRecording } from '../lib/localRecordings';
import './Home.css';

function formatToday() {
  const now = new Date();
  const weekday = now.toLocaleDateString('en-US', { weekday: 'short' });
  const monthDay = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${weekday}, ${monthDay}`;
}

export default function Home() {
  const { openSettings } = useOverlay();
  const [status, setStatus] = useState(null);

  const handleRecordingComplete = useCallback(async (recording) => {
    if (recording.silent) {
      setStatus('no audio detected — check mic');
      setTimeout(() => setStatus(null), 4000);
      return;
    }

    setStatus('saving…');

    const localId = await saveLocalRecording(recording);

    try {
      const server = await uploadRecording(recording);
      await updateLocalRecording(localId, {
        serverId: server.id,
        uploadStatus: 'uploaded',
      });
      setStatus('saved');
    } catch {
      await updateLocalRecording(localId, { uploadStatus: 'failed' });
      setStatus('saved locally');
    }

    setTimeout(() => setStatus(null), 2000);
  }, []);

  const { recording, durationMs, error, start, stop } = useVoiceRecorder({
    onComplete: handleRecordingComplete,
  });

  return (
    <div className={`home${recording ? ' home--recording' : ''}`}>
      <div className="home-main">
        <div className="home-mic-wrap">
          <button
            type="button"
            className={`mic-btn${recording ? ' mic-btn--recording' : ''}`}
            aria-label={recording ? 'Recording' : 'Record voice note'}
            aria-pressed={recording}
            onPointerDown={start}
            onPointerUp={stop}
            onPointerLeave={stop}
            onPointerCancel={stop}
          >
            <MicIcon />
          </button>
          {recording && (
            <p className="home-duration" aria-live="polite">
              {formatDuration(durationMs)}
            </p>
          )}
        </div>

        <div className="home-meta">
          <p className="home-date">{formatToday()}</p>
          <Link to="/timeline" className="text-btn home-timeline">
            timeline
          </Link>
        </div>
      </div>

      {(status || error) && (
        <p className="home-status" role="status" aria-live="polite">
          {error ?? status}
        </p>
      )}

      <button type="button" className="text-btn home-settings" onClick={openSettings}>
        settings
      </button>
    </div>
  );
}
