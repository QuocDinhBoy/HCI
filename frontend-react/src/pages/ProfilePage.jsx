import { useEffect, useState } from 'react';
import client from '../api/client';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAuthStore } from '../store/useAuthStore';

export default function ProfilePage() {
  const { setUser, logout } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const { data } = await client.get('/api/user/profile');
        if (!mounted) return;
        setProfile(data);
        if (data?.userInfo) {
          const currentUser = useAuthStore.getState().user || {};
          const nextUser = {
            ...currentUser,
            username: data.userInfo.childName,
            parent_name: data.userInfo.parentName,
            email: data.userInfo.email,
            avatar: data.userInfo.avatar,
          };

          const isSameProfile =
            currentUser?.username === nextUser.username &&
            currentUser?.parent_name === nextUser.parent_name &&
            currentUser?.email === nextUser.email &&
            currentUser?.avatar === nextUser.avatar;

          if (!isSameProfile) {
            setUser(nextUser);
          }
        }
      } catch (err) {
        if (!mounted) return;
        setError(err?.response?.data?.message || 'Khong tai duoc profile.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [setUser]);

  const info = profile?.userInfo || {};

  return (
    <div className="page-shell" style={{ display: 'grid', gap: 14 }}>
      <Card style={{ background: 'linear-gradient(130deg,#fff,#eef8ff)' }}>
        <h1 style={{ fontSize: 'clamp(1.9rem,3vw,2.6rem)' }}>Ho so nguoi dung</h1>
        <p style={{ color: '#4f758a', marginTop: 6 }}>Quan ly thong tin be va thong tin phu huynh.</p>
      </Card>

      {loading ? <p style={{ color: '#4f758a' }}>Dang tai profile...</p> : null}
      {error ? (
        <p style={{ color: '#bc4a36', fontWeight: 800, background: '#ffe8e3', borderRadius: 12, padding: '8px 10px' }}>{error}</p>
      ) : null}

      {!loading && !error ? (
        <div className="grid-auto">
          <Card>
            <h2 style={{ fontSize: 28 }}>Thong tin co ban</h2>
            <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
              <div>
                <div style={{ color: '#4f758a', fontWeight: 700 }}>Ten cua be</div>
                <div style={{ fontWeight: 900, fontSize: 22 }}>{info.childName || '--'}</div>
              </div>
              <div>
                <div style={{ color: '#4f758a', fontWeight: 700 }}>Phu huynh</div>
                <div style={{ fontWeight: 800 }}>{info.parentName || '--'}</div>
              </div>
              <div>
                <div style={{ color: '#4f758a', fontWeight: 700 }}>Email</div>
                <div style={{ fontWeight: 800 }}>{info.email || '--'}</div>
              </div>
            </div>
          </Card>

          <Card>
            <h2 style={{ fontSize: 28 }}>Thanh tich</h2>
            <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
              <div className="surface-card" style={{ padding: 10 }}>
                <div style={{ color: '#4f758a', fontWeight: 700 }}>Tong sao</div>
                <div style={{ fontSize: 30, fontWeight: 900, color: '#f9b233' }}>{profile?.stars || 0}</div>
              </div>
              <div className="surface-card" style={{ padding: 10 }}>
                <div style={{ color: '#4f758a', fontWeight: 700 }}>Streak hien tai</div>
                <div style={{ fontSize: 30, fontWeight: 900, color: '#ff7f6a' }}>{profile?.currentStreak || 0}</div>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      <div>
        <Button
          variant="danger"
          onClick={() => {
            logout();
            window.location.href = '/login';
          }}
        >
          Dang xuat khoi he thong
        </Button>
      </div>
    </div>
  );
}
