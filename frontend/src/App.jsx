import { useEffect, useRef, useState } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { AccentProvider } from './context/AccentContext';
import { AuthProvider } from './context/AuthContext';
import { OverlayProvider, useOverlay } from './context/OverlayContext';
import { SummariesProvider } from './context/SummariesContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginExitOverlay from './components/LoginExitOverlay';
import SettingsSheet from './components/SettingsSheet';
import SummarySheet from './components/SummarySheet';
import Main from './pages/Main';
import Login from './pages/Login';
import Home from './pages/Home';
import Timeline from './pages/Timeline';

export default function App() {
  const navigate = useNavigate();
  const [welcomeExit, setWelcomeExit] = useState(null);
  const [loginExit, setLoginExit] = useState(null);
  const welcomeExitTimerRef = useRef(null);
  const loginExitTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (welcomeExitTimerRef.current) {
        clearTimeout(welcomeExitTimerRef.current);
      }
      if (loginExitTimerRef.current) {
        clearTimeout(loginExitTimerRef.current);
      }
    };
  }, []);

  const handleWelcomeExit = (hovered) => {
    setWelcomeExit({ hovered });
    navigate('/login');
    if (welcomeExitTimerRef.current) {
      clearTimeout(welcomeExitTimerRef.current);
    }
    welcomeExitTimerRef.current = setTimeout(() => {
      setWelcomeExit(null);
      welcomeExitTimerRef.current = null;
    }, 1000);
  };

  const handleLoginSuccess = (code) => {
    setLoginExit({ code });
    navigate('/home');
    if (loginExitTimerRef.current) {
      clearTimeout(loginExitTimerRef.current);
    }
    loginExitTimerRef.current = setTimeout(() => {
      setLoginExit(null);
      loginExitTimerRef.current = null;
    }, 1000);
  };

  return (
    <AccentProvider>
      <AuthProvider>
        <SummariesProvider>
          <OverlayProvider>
            <AppRoutes
              welcomeExit={welcomeExit}
              loginExit={loginExit}
              onWelcomeExit={handleWelcomeExit}
              onLoginSuccess={handleLoginSuccess}
            />
          </OverlayProvider>
        </SummariesProvider>
      </AuthProvider>
    </AccentProvider>
  );
}

function AppRoutes({ welcomeExit, loginExit, onWelcomeExit, onLoginSuccess }) {
  const { contentDimmed } = useOverlay();

  return (
    <>
      <div className={`app-content${contentDimmed ? ' app-content--dimmed' : ''}`}>
        <Routes>
          <Route path="/" element={<Main onStartClick={onWelcomeExit} />} />
          <Route path="/login" element={<Login onLoginSuccess={onLoginSuccess} />} />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/timeline"
            element={
              <ProtectedRoute>
                <Timeline />
              </ProtectedRoute>
            }
          />
        </Routes>
        {welcomeExit && <Main exiting initialHovered={welcomeExit.hovered} />}
        {loginExit && <LoginExitOverlay code={loginExit.code} />}
      </div>
      <SettingsSheet />
      <SummarySheet />
    </>
  );
}
