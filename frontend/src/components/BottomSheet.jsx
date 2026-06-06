import { useEffect, useState } from 'react';
import './sheets.css';

const SHEET_DURATION_MS = 500;

export default function BottomSheet({
  open,
  onClose,
  onPresentChange,
  labelledBy,
  children,
  className = '',
}) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    onPresentChange?.(mounted);
    return () => onPresentChange?.(false);
  }, [mounted, onPresentChange]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setVisible(false);

      let outerFrame;
      let innerFrame;
      outerFrame = requestAnimationFrame(() => {
        innerFrame = requestAnimationFrame(() => setVisible(true));
      });

      return () => {
        cancelAnimationFrame(outerFrame);
        cancelAnimationFrame(innerFrame);
      };
    }

    setVisible(false);
    return undefined;
  }, [open]);

  useEffect(() => {
    if (open || !mounted) return undefined;

    const timer = setTimeout(() => setMounted(false), SHEET_DURATION_MS);
    return () => clearTimeout(timer);
  }, [open, mounted]);

  useEffect(() => {
    if (!mounted || !visible) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mounted, visible, onClose]);

  if (!mounted) return null;

  return (
    <div
      className={`sheet-layer${visible ? ' sheet-layer--visible' : ''}`}
      role="presentation"
    >
      <button type="button" className="sheet-scrim" aria-label="Close" onClick={onClose} />
      <div
        className={`bottom-sheet ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {children}
      </div>
    </div>
  );
}
