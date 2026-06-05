import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { OverlayProvider } from './context/OverlayContext';
import { SummariesProvider } from './context/SummariesContext';
import ProtectedRoute from './components/ProtectedRoute';
import SettingsSheet from './components/SettingsSheet';
import SummarySheet from './components/SummarySheet';
import Main from './pages/Main';
import Login from './pages/Login';
import Home from './pages/Home';
import Timeline from './pages/Timeline';

export default function App() {
  return (
    <AuthProvider>
      <SummariesProvider>
        <OverlayProvider>
          <Routes>
            <Route path="/" element={<Main />} />
            <Route path="/login" element={<Login />} />
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
          <SettingsSheet />
          <SummarySheet />
        </OverlayProvider>
      </SummariesProvider>
    </AuthProvider>
  );
}
