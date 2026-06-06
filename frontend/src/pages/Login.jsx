import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login({ onLoginSuccess }) {
  const { user, loading, requestCode, login } = useAuth();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [visible, setVisible] = useState(false);
  const [pendingExit, setPendingExit] = useState(false);

  const emailInputRef = useRef(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (step === 'email') {
      emailInputRef.current?.focus();
    } else {
      document.getElementById('login-code')?.focus();
    }
  }, [step, loading]);

  if (!loading && user && !pendingExit) {
    return <Navigate to="/home" replace />;
  }

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await requestCode(email);
      setStep('code');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, code);
      setPendingExit(true);
      onLoginSuccess?.(code);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const showSendCode = email.includes('@');

  return (
    <div className={`login-page${visible ? ' login-page--visible' : ''}`}>
      {step === 'email' ? (
        <>
          <form id="login-email-form" className="login-form" onSubmit={handleSendCode}>
            <input
              ref={emailInputRef}
              type="email"
              className="login-input login-input--email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email"
              autoComplete="email"
              required
            />
          </form>
          <button
            type="submit"
            form="login-email-form"
            className={`text-btn login-submit${showSendCode ? ' login-submit--visible' : ''}`}
            disabled={submitting || !showSendCode}
            aria-hidden={!showSendCode}
            tabIndex={showSendCode ? 0 : -1}
          >
            {submitting ? 'sending…' : 'send code'}
          </button>
        </>
      ) : (
        <>
          <form id="login-code-form" className="login-form" onSubmit={handleVerify}>
            <input
              id="login-code"
              type="text"
              className="login-input login-input--code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
            />
          </form>
          {code.length >= 6 ? (
            <button
              type="submit"
              form="login-code-form"
              className="text-btn login-submit login-submit--visible"
              disabled={submitting}
            >
              {submitting ? 'verifying…' : 'continue'}
            </button>
          ) : (
            <button
              type="button"
              className="text-btn login-submit login-submit--visible"
              onClick={() => {
                setStep('email');
                setCode('');
                setError(null);
              }}
            >
              change email
            </button>
          )}
        </>
      )}

      {error && (
        <p className="login-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
