import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

export default function Login() {
  useEffect(() => {
    // Placeholder: real email + code auth will replace this redirect.
  }, []);

  return <Navigate to="/home" replace />;
}
