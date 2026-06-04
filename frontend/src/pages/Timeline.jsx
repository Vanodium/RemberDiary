import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOverlay } from '../context/OverlayContext';
import {
  buildTimelineMonthRows,
  formatShortDate,
  toIsoDate,
} from '../lib/calendar';
import { hasSummary } from '../lib/mockData';
import './Timeline.css';

export default function Timeline() {
  const { openSettings, openSummary } = useOverlay();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedIso, setSelectedIso] = useState(toIsoDate(today));

  const rows = useMemo(
    () => buildTimelineMonthRows(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const selectedDate = useMemo(() => new Date(`${selectedIso}T12:00:00`), [selectedIso]);

  const shiftMonth = (delta) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    const newYear = next.getFullYear();
    const newMonth = next.getMonth();
    const daysInNewMonth = new Date(newYear, newMonth + 1, 0).getDate();
    const day = Math.min(selectedDate.getDate(), daysInNewMonth);

    setViewYear(newYear);
    setViewMonth(newMonth);
    setSelectedIso(toIsoDate(new Date(newYear, newMonth, day)));
  };

  const handleDaySelect = (date) => {
    const iso = toIsoDate(date);
    setSelectedIso(iso);
    if (hasSummary(iso)) {
      openSummary(iso);
    }
  };

  const renderDay = (date) => {
    const iso = toIsoDate(date);
    const summary = hasSummary(iso);
    const selected = iso === selectedIso;
    const className = ['calendar-cell', summary && 'has-summary', selected && 'selected']
      .filter(Boolean)
      .join(' ');

    return (
      <button
        key={iso}
        type="button"
        className={className}
        onClick={() => handleDaySelect(date)}
        aria-pressed={selected}
        aria-label={formatShortDate(date)}
      >
        {date.getDate()}
      </button>
    );
  };

  return (
    <div className="timeline-page">
      <div className="timeline-layout">
        <section className="calendar-section" aria-label="Calendar">
          <div className="calendar-rows">
            {rows.map((row, index) => (
              <div
                key={`${viewYear}-${viewMonth}-w${row.workdays.map((d) => d.getDate()).join('-')}-e${row.weekends.map((d) => d.getDate()).join('-')}`}
                className={`calendar-row${index === 0 ? ' calendar-row--first' : ''}`}
              >
                <div className="calendar-workdays">{row.workdays.map(renderDay)}</div>
                <div className="calendar-weekends">{row.weekends.map(renderDay)}</div>
              </div>
            ))}
          </div>

          <div className="calendar-nav">
            <button type="button" className="text-btn calendar-nav-btn" onClick={() => shiftMonth(-1)}>
              &lt;
            </button>
            <button type="button" className="text-btn calendar-nav-btn" onClick={() => shiftMonth(1)}>
              &gt;
            </button>
          </div>
        </section>

        <section className="timeline-meta">
          <Link to="/home" className="text-btn timeline-date">
            {formatShortDate(selectedDate)}
          </Link>
          <h1 className="timeline-title">timeline</h1>
        </section>
      </div>

      <button type="button" className="text-btn timeline-settings" onClick={openSettings}>
        settings
      </button>
    </div>
  );
}
