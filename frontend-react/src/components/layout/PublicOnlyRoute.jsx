import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

export default function PublicOnlyRoute({ children }) {
  const token = useAuthStore((state) => state.token) || localStorage.getItem('token');

  if (token) {
    return <Navigate to="/app" replace />;
  }

  return children;
}