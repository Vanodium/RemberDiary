import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupportedMimeType } from '../lib/mime';

function stopStream(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function useVoiceRecorder({ onComplete }) {
  const [recording, setRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [error, setError] = useState(null);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const startTimeRef = useRef(0);
  const timerRef = useRef(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    if (recording || recorderRef.current?.state === 'recording') return;

    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const elapsed = Date.now() - startTimeRef.current;
        const type = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });

        if (blob.size > 0) {
          onCompleteRef.current?.({
            blob,
            mimeType: type,
            durationMs: elapsed,
            recordedAt: new Date().toISOString(),
          });
        }

        stopStream(streamRef.current);
        streamRef.current = null;
        recorderRef.current = null;
      };

      recorderRef.current = recorder;
      startTimeRef.current = Date.now();
      recorder.start(250);
      setRecording(true);
      setDurationMs(0);

      timerRef.current = setInterval(() => {
        setDurationMs(Date.now() - startTimeRef.current);
      }, 100);
    } catch (err) {
      setError(err?.message ?? 'Microphone access denied');
      stopStream(streamRef.current);
      streamRef.current = null;
    }
  }, [recording, clearTimer]);

  const stop = useCallback(() => {
    clearTimer();
    setRecording(false);

    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }
  }, [clearTimer]);

  useEffect(
    () => () => {
      clearTimer();
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.stop();
      }
      stopStream(streamRef.current);
    },
    [clearTimer],
  );

  return { recording, durationMs, error, start, stop };
}

export function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
