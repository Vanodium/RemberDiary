import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ACCENT_OPTIONS } from '../lib/accentColors';
import { useAccent } from '../context/AccentContext';
import { useAuth } from '../context/AuthContext';
import { useOverlay } from '../context/OverlayContext';
import { WEEKDAY_OPTIONS } from '../lib/calendar';
import BottomSheet from './BottomSheet';
import MicIcon from './MicIcon';
import './sheets.css';

export default function SettingsSheet() {
  const navigate = useNavigate();
  const { user, logout, saveSettings } = useAuth();
  const { accentId, setAccentId } = useAccent();
  const { settingsOpen, closeSettings } = useOverlay();
  const [endOfWeekDay, setEndOfWeekDay] = useState('sun');

  useEffect(() => {
    if (user) {
      setEndOfWeekDay(user.endOfWeekDay);
    }
  }, [user]);

  const handleEndOfWeekChange = async (value) => {
    setEndOfWeekDay(value);
    try {
      await saveSettings({ endOfWeekDay: value });
    } catch {
      setEndOfWeekDay(user?.endOfWeekDay ?? 'sun');
    }
  };

  const handleLogout = () => {
    closeSettings();
    logout();
    navigate('/');
  };

  const handleChangeAccount = () => {
    closeSettings();
    logout();
    navigate('/login');
  };

  if (!user) return null;

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
          <span>accent</span>
          <div className="accent-picker" role="radiogroup" aria-label="Accent color">
            {ACCENT_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={accentId === option.id}
                aria-label={option.label}
                className={`accent-swatch${accentId === option.id ? ' accent-swatch--selected' : ''}`}
                style={{ '--swatch-color': option.color }}
                onClick={() => setAccentId(option.id)}
              />
            ))}
          </div>
        </label>

        <label className="settings-row">
          <span>end of week</span>
          <select value={endOfWeekDay} onChange={(e) => handleEndOfWeekChange(e.target.value)}>
            {WEEKDAY_OPTIONS.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </label>

        <div className="settings-row settings-row--account">
          <div className="settings-account">
            <span>{user.email}</span>
            <button type="button" className="text-btn" onClick={handleChangeAccount}>
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
