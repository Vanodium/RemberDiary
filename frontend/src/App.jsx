import { Routes, Route } from 'react-router-dom';
import { OverlayProvider } from './context/OverlayContext';
import { SummariesProvider } from './context/SummariesContext';
import SettingsSheet from './components/SettingsSheet';
import SummarySheet from './components/SummarySheet';
import Main from './pages/Main';
import Login from './pages/Login';
import Home from './pages/Home';
import Timeline from './pages/Timeline';

export default function App() {
  return (
    <SummariesProvider>
    <OverlayProvider>
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/timeline" element={<Timeline />} />
      </Routes>
      <SettingsSheet />
      <SummarySheet />
    </OverlayProvider>
    </SummariesProvider>
  );
}
