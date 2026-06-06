import { useEffect, useState } from 'react';
import '../pages/Login.css';

export default function LoginExitOverlay({ code }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setExiting(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className={`login-exit-overlay${exiting ? ' login-exit-overlay--exiting' : ''}`}>
      <div className="login-exit-fill" aria-hidden="true" />
      <div className="login-exit-content" aria-hidden="true">
        <span className="login-exit-code">{code}</span>
        <span className="login-exit-submit">continue</span>
      </div>
    </div>
  );
}
