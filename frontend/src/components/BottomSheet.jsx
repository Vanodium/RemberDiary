import { useEffect } from 'react';
import './sheets.css';

export default function BottomSheet({ open, onClose, labelledBy, children, className = '' }) {
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="sheet-layer" role="presentation">
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
