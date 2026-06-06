import { forwardRef, useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const AutoGrowInput = forwardRef(function AutoGrowInput(
  { value, onChange, placeholder, className = '', ...props },
  ref,
) {
  return (
    <div className="login-input-field">
      <span className="login-input-sizer" aria-hidden="true">
        {value || placeholder}
      </span>
      <input
        ref={ref}
        className={`login-input ${className}`.trim()}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        size={1}
        {...props}
      />
    </div>
  );
});

export default function Login() {
  const { user, loading, requestCode, login } = useAuth();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const emailInputRef = useRef(null);

  useEffect(() => {
    if (loading) return;
    if (step === 'email') {
      emailInputRef.current?.focus();
    } else {
      document.getElementById('login-code')?.focus();
    }
  }, [step, loading]);

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

  const showSendCode = email.includes('@');

  return (
    <div className="login-page">
      {step === 'email' ? (
        <>
          <form id="login-email-form" className="login-form" onSubmit={handleSendCode}>
            <AutoGrowInput
              ref={emailInputRef}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email"
              autoComplete="email"
              required
            />
          </form>
          {showSendCode && (
            <button
              type="submit"
              form="login-email-form"
              className="text-btn login-submit"
              disabled={submitting}
            >
              {submitting ? 'sending…' : 'send code'}
            </button>
          )}
        </>
      ) : (
        <div className="login-main">
          <form className="login-form" onSubmit={handleVerify}>
            <p className="login-hint">
              code sent to <span>{email}</span>
            </p>
            <AutoGrowInput
              id="login-code"
              type="text"
              className="login-input--code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
            />
            {code.length >= 6 && (
              <button type="submit" className="text-btn login-submit login-submit--inline" disabled={submitting}>
                {submitting ? 'verifying…' : 'continue'}
              </button>
            )}
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
        </div>
      )}

      {error && (
        <p className="login-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
