import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

export function useAuth() {
  const navigate = useNavigate();
  const { token, user, setAuth, setUser, logout } = useAuthStore();

  const isAuthenticated = useMemo(() => Boolean(token), [token]);

  const login = async (email, password) => {
    const { data } = await client.post('/api/auth/login', { email, password });
    setAuth({ token: data.token, user: data.user });
    return data;
  };

  const register = async (payload) => {
    const { data } = await client.post('/api/auth/register', payload);
    return data;
  };

  const fetchProfile = async () => {
    const { data } = await client.get('/api/user/profile');
    if (data?.userInfo) {
      setUser({
        id: user?.id,
        username: data.userInfo.childName,
        parent_name: data.userInfo.parentName,
        email: data.userInfo.email,
        avatar: data.userInfo.avatar,
      });
    }
    return data;
  };

  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return {
    token,
    user,
    isAuthenticated,
    login,
    register,
    fetchProfile,
    signOut,
  };
}
