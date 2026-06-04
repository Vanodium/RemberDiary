import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useOverlay } from '../context/OverlayContext';
import { mockUser } from '../lib/mockData';
import { formatTimezoneDisplay, WEEKDAY_OPTIONS } from '../lib/calendar';
import BottomSheet from './BottomSheet';
import MicIcon from './MicIcon';
import './sheets.css';

export default function SettingsSheet() {
  const navigate = useNavigate();
  const { settingsOpen, closeSettings } = useOverlay();
  const [timezone, setTimezone] = useState(mockUser.timezone);
  const [endOfWeekDay, setEndOfWeekDay] = useState(mockUser.endOfWeekDay);

  const handleLogout = () => {
    closeSettings();
    navigate('/');
  };

  return (
    <BottomSheet open={settingsOpen} onClose={closeSettings} labelledBy="settings-title" className="settings-sheet">
      <Link to="/home" className="settings-mic-badge" aria-label="Home" onClick={closeSettings}>
        <MicIcon />
      </Link>

      <h2 id="settings-title" className="visually-hidden">
        Settings
      </h2>

      <div className="settings-rows">
        <label className="settings-row">
          <span>timezone</span>
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            <option value="UTC">utc</option>
            <option value="Europe/Moscow">europe/moscow ({formatTimezoneDisplay('Europe/Moscow')})</option>
            <option value="America/New_York">america/new_york ({formatTimezoneDisplay('America/New_York')})</option>
            <option value="America/Los_Angeles">america/los_angeles ({formatTimezoneDisplay('America/Los_Angeles')})</option>
          </select>
        </label>

        <label className="settings-row">
          <span>end of week</span>
          <select value={endOfWeekDay} onChange={(e) => setEndOfWeekDay(e.target.value)}>
            {WEEKDAY_OPTIONS.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </label>

        <div className="settings-row settings-row--account">
          <span>account</span>
          <div className="settings-account">
            <span>{mockUser.email}</span>
            <button type="button" className="text-btn" onClick={handleLogout}>
              change
            </button>
          </div>
        </div>

        <div className="settings-actions">
          <button type="button" className="text-btn" onClick={handleLogout}>
            log out
          </button>
        </div>
      </div>

      <p className="settings-privacy">
        Your recordings and summaries are private to your account. We don&apos;t sell your data.
      </p>
    </BottomSheet>
  );
}
