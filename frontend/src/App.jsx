import { Routes, Route } from 'react-router-dom';
import Main from './pages/Main';
import Login from './pages/Login';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Main />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}
