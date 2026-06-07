import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MicIcon from '../components/MicIcon';
import { useOverlay } from '../context/OverlayContext';
import { useSummaries } from '../context/SummariesContext';
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
  const { refresh: refreshSummaries } = useSummaries();
  const [status, setStatus] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleRecordingComplete = useCallback(async (recording) => {
    setStatus(recording.silent ? 'saving quietly…' : 'saving…');

    let localId;
    try {
      localId = await saveLocalRecording(recording);
      const server = await uploadRecording(recording);
      await updateLocalRecording(localId, {
        serverId: server.id,
        uploadStatus: 'uploaded',
      });
      setStatus('saved — processing');
      void refreshSummaries();
      window.setTimeout(() => void refreshSummaries(), 8000);
      window.setTimeout(() => void refreshSummaries(), 20000);
      window.setTimeout(() => void refreshSummaries(), 45000);
    } catch (err) {
      if (localId) {
        await updateLocalRecording(localId, { uploadStatus: 'failed' });
      }
      const message = err instanceof Error ? err.message : 'Upload failed';
      setStatus(message.includes('401') ? 'Sign in again' : 'Could not upload — saved locally');
    }

    setTimeout(() => setStatus(null), 5000);
  }, [refreshSummaries]);

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
    <div className={`home${visible ? ' home--visible' : ''}${recording ? ' home--recording' : ''}`}>
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
