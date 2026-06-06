import { useCallback, useRef } from 'react';
import { useOverlay } from '../context/OverlayContext';
import { useSummaries } from '../context/SummariesContext';
import { formatLongDate } from '../lib/calendar';
import BottomSheet from './BottomSheet';

export default function SummarySheet() {
  const {
    summaryDate,
    summaryOpen,
    closeSummary,
    clearSummaryDate,
  } = useOverlay();
  const { getSummary } = useSummaries();
  const summary = summaryDate ? getSummary(summaryDate) : null;
  const summaryOpenRef = useRef(summaryOpen);
  summaryOpenRef.current = summaryOpen;

  const handlePresentChange = useCallback(
    (present) => {
      // Only clear after the close animation — not when BottomSheet's mount
      // effect cleanup fires while the sheet is still opening.
      if (!present && !summaryOpenRef.current) clearSummaryDate();
    },
    [clearSummaryDate],
  );

  return (
    <BottomSheet
      open={summaryOpen && Boolean(summary)}
      onClose={closeSummary}
      onPresentChange={handlePresentChange}
      labelledBy="summary-title"
    >
      {summaryDate && summary ? (
        <>
          <header className="bottom-sheet-header" id="summary-title">
            {formatLongDate(new Date(`${summaryDate}T12:00:00`))}
          </header>
          <div className="bottom-sheet-body">{summary.content}</div>
        </>
      ) : null}
    </BottomSheet>
  );
}
