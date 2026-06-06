import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOverlay } from '../context/OverlayContext';
import { useSummaries } from '../context/SummariesContext';
import {
  buildTimelineMonthRows,
  formatDateLines,
  formatMonthYearLines,
  formatShortDate,
  toIsoDate,
} from '../lib/calendar';
import './Timeline.css';

function leadingWorkdaySpacers(dates) {
  if (dates.length === 0) return 0;
  const dow = dates[0].getDay();
  if (dow === 0 || dow === 6) return 0;
  return dow - 1;
}

function leadingWeekendSpacers(dates) {
  if (dates.length === 0) return 0;
  return dates[0].getDay() === 0 ? 1 : 0;
}

export default function Timeline() {
  const { openSettings, openSummary } = useOverlay();
  const { hasSummary } = useSummaries();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedIso, setSelectedIso] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const rows = useMemo(
    () => buildTimelineMonthRows(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const selectedDate = useMemo(
    () => (selectedIso ? new Date(`${selectedIso}T12:00:00`) : null),
    [selectedIso],
  );

  const headerDate = useMemo(() => {
    if (selectedDate) return selectedDate;
    const now = new Date();
    const viewingCurrentMonth =
      viewYear === now.getFullYear() && viewMonth === now.getMonth();
    return viewingCurrentMonth ? now : null;
  }, [selectedDate, viewYear, viewMonth]);

  const headerDateLines = useMemo(
    () => (headerDate ? formatDateLines(headerDate) : null),
    [headerDate],
  );

  const monthYearLines = useMemo(
    () => formatMonthYearLines(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const shiftMonth = (delta) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
    setSelectedIso(null);
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
    const selected = selectedIso !== null && iso === selectedIso;
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
    <div className={`timeline-page${visible ? ' timeline-page--visible' : ''}`}>
      <div className="timeline-left">
        <section className="calendar-section" aria-label="Calendar">
          <div className="calendar-rows">
            {rows.map((row, index) => {
              const workdaySpacers = index === 0 ? leadingWorkdaySpacers(row.workdays) : 0;
              const weekendSpacers = index === 0 ? leadingWeekendSpacers(row.weekends) : 0;

              return (
                <div
                  key={`${viewYear}-${viewMonth}-w${row.workdays.map((d) => d.getDate()).join('-')}-e${row.weekends.map((d) => d.getDate()).join('-')}`}
                  className="calendar-row"
                >
                  <div className="calendar-workdays">
                    {Array.from({ length: workdaySpacers }, (_, i) => (
                      <span key={`ws-${i}`} className="calendar-cell calendar-cell--spacer" aria-hidden="true" />
                    ))}
                    {row.workdays.map(renderDay)}
                  </div>
                  <div className="calendar-weekends">
                    {Array.from({ length: weekendSpacers }, (_, i) => (
                      <span key={`es-${i}`} className="calendar-cell calendar-cell--spacer" aria-hidden="true" />
                    ))}
                    {row.weekends.map(renderDay)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="calendar-nav">
          <button type="button" className="text-btn calendar-nav-btn" onClick={() => shiftMonth(-1)}>
            &lt;
          </button>
          <button type="button" className="text-btn calendar-nav-btn" onClick={() => shiftMonth(1)}>
            &gt;
          </button>
        </div>
      </div>

      <div className="timeline-right">
        <section className="timeline-meta">
          {headerDateLines ? (
            <Link to="/home" className="timeline-date">
              {headerDateLines.weekday},<br />
              {headerDateLines.monthDay}
            </Link>
          ) : (
            <p className="timeline-month">
              {monthYearLines.month}
              <br />
              {monthYearLines.year}
            </p>
          )}
          <h1 className="timeline-title">timeline</h1>
        </section>
      </div>
      <button type="button" className="text-btn timeline-settings" onClick={openSettings}>
        settings
      </button>
    </div>
  );
}
