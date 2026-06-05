import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const { user, loading, requestCode, login } = useAuth();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (step === 'code') {
      document.getElementById('login-code')?.focus();
    }
  }, [step]);

  if (!loading && user) {
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
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <Link to="/" className="text-btn login-back">
        back
      </Link>

      <div className="login-main">
        <h1 className="login-title">log in</h1>

        {step === 'email' ? (
          <form className="login-form" onSubmit={handleSendCode}>
            <label className="login-label">
              email
              <input
                type="email"
                className="login-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                autoFocus
              />
            </label>
            <button type="submit" className="text-btn login-submit" disabled={submitting}>
              {submitting ? 'sending…' : 'send code'}
            </button>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleVerify}>
            <p className="login-hint">
              code sent to <span>{email}</span>
            </p>
            <label className="login-label">
              code
              <input
                id="login-code"
                type="text"
                className="login-input login-input--code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
              />
            </label>
            <button type="submit" className="text-btn login-submit" disabled={submitting || code.length < 6}>
              {submitting ? 'verifying…' : 'continue'}
            </button>
            <button
              type="button"
              className="text-btn login-secondary"
              onClick={() => {
                setStep('email');
                setCode('');
                setError(null);
              }}
            >
              use a different email
            </button>
          </form>
        )}

        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
