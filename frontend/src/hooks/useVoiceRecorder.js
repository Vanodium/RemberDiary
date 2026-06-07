import { useCallback, useEffect, useRef, useState } from 'react';
import { toIsoDate } from '../lib/calendar';
import { getSupportedMimeType } from '../lib/mime';

const AUDIO_CONSTRAINTS = {
  channelCount: 1,
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: true,
};

const SILENT_PEAK_THRESHOLD = 4;
const RECORD_TIMESLICE_MS = 250;

function stopStream(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}

function createLevelMonitor(stream, onPeak) {
  const ctx = new AudioContext();
  void ctx.resume();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  const source = ctx.createMediaStreamSource(stream);
  source.connect(analyser);

  const bins = new Uint8Array(analyser.frequencyBinCount);
  const interval = setInterval(() => {
    analyser.getByteFrequencyData(bins);
    onPeak(Math.max(...bins));
  }, 100);

  return () => {
    clearInterval(interval);
    source.disconnect();
    void ctx.close();
  };
}

export function useVoiceRecorder({ onComplete }) {
  const [recording, setRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [audioDetected, setAudioDetected] = useState(false);
  const [error, setError] = useState(null);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const startTimeRef = useRef(0);
  const timerRef = useRef(null);
  const stopLevelMonitorRef = useRef(null);
  const peakLevelRef = useRef(0);
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
      setAudioDetected(false);
      peakLevelRef.current = 0;

      if (typeof MediaRecorder === 'undefined') {
        setError('Recording is not supported in this browser');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS });
      streamRef.current = stream;

      stopLevelMonitorRef.current = createLevelMonitor(stream, (peak) => {
        peakLevelRef.current = Math.max(peakLevelRef.current, peak);
        if (peak >= SILENT_PEAK_THRESHOLD) {
          setAudioDetected(true);
        }
      });

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
        const peakLevel = peakLevelRef.current;
        const silent = peakLevel < SILENT_PEAK_THRESHOLD;

        if (blob.size === 0) {
          setError('Recording failed — try again');
        } else {
          const now = new Date();
          onCompleteRef.current?.({
            blob,
            mimeType: type,
            durationMs: elapsed,
            recordedAt: now.toISOString(),
            recordedDate: toIsoDate(now),
            peakLevel,
            silent,
          });
        }

        stopLevelMonitorRef.current?.();
        stopLevelMonitorRef.current = null;
        stopStream(streamRef.current);
        streamRef.current = null;
        recorderRef.current = null;
      };

      recorderRef.current = recorder;
      startTimeRef.current = Date.now();
      recorder.start(RECORD_TIMESLICE_MS);
      setRecording(true);
      setDurationMs(0);

      timerRef.current = setInterval(() => {
        setDurationMs(Date.now() - startTimeRef.current);
      }, 100);
    } catch (err) {
      setError(err?.message ?? 'Microphone access denied');
      stopLevelMonitorRef.current?.();
      stopLevelMonitorRef.current = null;
      stopStream(streamRef.current);
      streamRef.current = null;
    }
  }, [recording, clearTimer]);

  const stop = useCallback(() => {
    clearTimer();
    setRecording(false);
    setAudioDetected(false);

    const recorder = recorderRef.current;
    if (recorder?.state === 'recording') {
      recorder.requestData();
      recorder.stop();
    }
  }, [clearTimer]);

  useEffect(
    () => () => {
      clearTimer();
      stopLevelMonitorRef.current?.();
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.requestData();
        recorderRef.current.stop();
      }
      stopStream(streamRef.current);
    },
    [clearTimer],
  );

  return { recording, durationMs, audioDetected, error, start, stop };
}

export function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
