import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOverlay } from '../context/OverlayContext';
import {
  buildCalendarMonth,
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

  const { weekdays, cells } = useMemo(
    () => buildCalendarMonth(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const selectedDate = useMemo(() => new Date(`${selectedIso}T12:00:00`), [selectedIso]);

  const shiftMonth = (delta) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const handleDaySelect = (date, inMonth) => {
    const iso = toIsoDate(date);
    setSelectedIso(iso);
    if (inMonth && hasSummary(iso)) {
      openSummary(iso);
    }
  };

  return (
    <div className="timeline-page">
      <div className="timeline-layout">
        <section className="calendar-section" aria-label="Calendar">
          <div className="calendar-grid">
            {weekdays.map((day) => (
              <span key={day} className="calendar-weekday">
                {day}
              </span>
            ))}
            {cells.map(({ date, inMonth }) => {
              const iso = toIsoDate(date);
              const summary = inMonth && hasSummary(iso);
              const selected = iso === selectedIso;
              const className = [
                'calendar-cell',
                !inMonth && 'other-month',
                summary && 'has-summary',
                selected && 'selected',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <button
                  key={`${iso}-${inMonth}`}
                  type="button"
                  className={className}
                  onClick={() => handleDaySelect(date, inMonth)}
                  disabled={!inMonth}
                  aria-pressed={selected}
                  aria-label={formatShortDate(date)}
                >
                  {date.getDate()}
                </button>
              );
            })}
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
          <p className="timeline-date">{formatShortDate(selectedDate)}</p>
          <h1 className="timeline-title">timeline</h1>
          {!hasSummary(selectedIso) && (
            <p className="timeline-empty">No summary for this day.</p>
          )}
        </section>
      </div>

      <Link to="/home" className="text-btn timeline-home">
        home
      </Link>
      <button type="button" className="text-btn timeline-settings" onClick={openSettings}>
        settings
      </button>
    </div>
  );
}
