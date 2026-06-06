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
  return {
    weekday: now.toLocaleDateString('en-US', { weekday: 'short' }),
    monthDay: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  };
}

export default function Home() {
  const { openSettings } = useOverlay();
  const [status, setStatus] = useState(null);

  const handleRecordingComplete = useCallback(async (recording) => {
    if (recording.silent) {
      setStatus('Check the microphone');
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

  const { recording, durationMs, audioDetected, error, start, stop } = useVoiceRecorder({
    onComplete: handleRecordingComplete,
  });

  const toggleRecording = useCallback(() => {
    if (recording) {
      stop();
      return;
    }

    void start();
  }, [recording, start, stop]);

  const leftBottomText = recording
    ? audioDetected
      ? formatDuration(durationMs)
      : 'Check the microphone'
    : (error ?? status);

  const { weekday, monthDay } = formatToday();

  return (
    <div className={`home${recording ? ' home--recording' : ''}`}>
      <div className="home-left">
        <div className="home-mic-wrap">
          <button
            type="button"
            className={`mic-btn${recording ? ' mic-btn--recording' : ''}`}
            aria-label={recording ? 'Stop recording' : 'Record voice note'}
            aria-pressed={recording}
            onClick={toggleRecording}
          >
            <MicIcon />
          </button>
        </div>
      </div>

      <div className="home-right">
        <div className="home-meta">
          <p className="home-date">
            {weekday},<br />
            {monthDay}
          </p>
          <Link to="/timeline" className="text-btn home-timeline">
            timeline
          </Link>
        </div>
      </div>

      {leftBottomText && (
        <p
          className={recording && audioDetected ? 'home-duration' : 'home-status'}
          role="status"
          aria-live="polite"
        >
          {leftBottomText}
        </p>
      )}
      <button type="button" className="text-btn home-settings" onClick={openSettings}>
        settings
      </button>
    </div>
  );
}
