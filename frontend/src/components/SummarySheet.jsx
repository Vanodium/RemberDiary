import { useOverlay } from '../context/OverlayContext';
import { getSummary } from '../lib/mockData';
import { formatLongDate } from '../lib/calendar';
import BottomSheet from './BottomSheet';

export default function SummarySheet() {
  const { summaryDate, closeSummary } = useOverlay();
  const summary = summaryDate ? getSummary(summaryDate) : null;

  return (
    <BottomSheet
      open={Boolean(summaryDate && summary)}
      onClose={closeSummary}
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
