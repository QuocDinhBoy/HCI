import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
  Tooltip,
} from 'recharts';
import client from '../api/client';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { getEmotionLabel } from '../utils/emotionHelpers';

function alertTitle(type) {
  return (
    {
      PROLONGED_SADNESS: 'Buon ba keo dai',
      PROLONGED_NEGATIVE: 'Cam xuc tieu cuc keo dai',
      HIGH_ANGER: 'Muc tuc gian cao',
      LOW_ENGAGEMENT: 'Tham gia thap',
      SUDDEN_CHANGE: 'Thay doi dot ngot',
      EMOTION_DIFFICULTY: 'Kho khan cam xuc cu the',
    }[type] || 'Canh bao'
  );
}

export default function ReportPage() {
  const [report, setReport] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError('');

      const [reportRes, sessionRes, alertRes, recRes] = await Promise.allSettled([
        client.get('/api/report'),
        client.get('/api/emotion-sessions/history?limit=20'),
        client.get('/api/alerts'),
        client.get('/api/recommendations'),
      ]);

      if (!mounted) return;

      if (reportRes.status === 'fulfilled') setReport(reportRes.value.data);
      if (sessionRes.status === 'fulfilled') setSessions(sessionRes.value.data?.sessions || []);
      if (alertRes.status === 'fulfilled') setAlerts(alertRes.value.data?.alerts || []);
      if (recRes.status === 'fulfilled') setRecommendations(recRes.value.data?.recommendations || []);

      if (reportRes.status !== 'fulfilled') {
        setError(reportRes.reason?.response?.data?.message || 'Khong tai duoc report tong hop.');
      }

      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = report?.stats || {};
  const radarData = report?.radar || [];
  const skillData = report?.skills || [];
  const logs = report?.logs || [];

  const unreadCount = useMemo(() => alerts.filter((a) => !a.is_read).length, [alerts]);

  const markOneRead = async (alert) => {
    if (alert.is_read) return;
    try {
      await client.patch(`/api/alerts/${alert.id}/read`);
      setAlerts((prev) => prev.map((item) => (item.id === alert.id ? { ...item, is_read: 1 } : item)));
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    try {
      await client.patch('/api/alerts/read-all');
      setAlerts((prev) => prev.map((item) => ({ ...item, is_read: 1 })));
    } catch {
      // ignore
    }
  };

  return (
    <div className="page-shell" style={{ display: 'grid', gap: 14 }}>
      <Card style={{ background: 'linear-gradient(130deg,#fff,#edf8ff)' }}>
        <h1 style={{ fontSize: 'clamp(1.8rem,3vw,2.7rem)' }}>Bao cao tong hop</h1>
        <p style={{ color: '#4f758a', marginTop: 6 }}>Tong quan hoc tap, cam xuc va de xuat ca nhan hoa.</p>
      </Card>

      {loading ? <p style={{ color: '#4f758a' }}>Dang tai bao cao...</p> : null}
      {error ? (
        <p style={{ color: '#bc4a36', fontWeight: 800, background: '#ffe8e3', borderRadius: 12, padding: '8px 10px' }}>{error}</p>
      ) : null}

      {!loading ? (
        <section className="grid-auto">
          <Card>
            <div style={{ color: '#4f758a', fontWeight: 700 }}>Tong sao</div>
            <div style={{ fontSize: 34, fontWeight: 900, color: '#f9b233' }}>{stats.stars || 0}</div>
          </Card>
          <Card>
            <div style={{ color: '#4f758a', fontWeight: 700 }}>Streak</div>
            <div style={{ fontSize: 34, fontWeight: 900, color: '#ff7f6a' }}>{stats.streak || 0}</div>
          </Card>
          <Card>
            <div style={{ color: '#4f758a', fontWeight: 700 }}>Do chinh xac</div>
            <div style={{ fontSize: 34, fontWeight: 900, color: '#4d90fe' }}>{stats.accuracy || 0}%</div>
          </Card>
          <Card>
            <div style={{ color: '#4f758a', fontWeight: 700 }}>Canh bao moi</div>
            <div style={{ fontSize: 34, fontWeight: 900, color: unreadCount ? '#e14b4b' : '#2f8b53' }}>{unreadCount}</div>
          </Card>
        </section>
      ) : null}

      {!loading ? (
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
          <Card>
            <h2 style={{ fontSize: 28 }}>Radar cap do</h2>
            <div style={{ marginTop: 8, width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="label" />
                  <Radar dataKey="score" stroke="#0f8f8f" fill="#17a2a2" fillOpacity={0.25} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <h2 style={{ fontSize: 28 }}>Ky nang theo loai bai</h2>
            <div style={{ marginTop: 8, width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={skillData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="code" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="score" fill="#4d90fe" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      ) : null}

      {!loading ? (
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
          <Card>
            <h2 style={{ fontSize: 28 }}>Nhat ky hoc gan day</h2>
            {logs.length === 0 ? (
              <p style={{ marginTop: 10, color: '#4f758a' }}>Chua co du lieu.</p>
            ) : (
              <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                {logs.map((log, idx) => (
                  <div key={`${log.answered_at}-${idx}`} className="surface-card" style={{ padding: 10 }}>
                    <div style={{ fontWeight: 800 }}>{log.lesson_type}</div>
                    <div style={{ color: '#4f758a', fontSize: 13, marginTop: 2 }}>Score: {log.score} | {new Date(log.answered_at).toLocaleString('vi-VN')}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h2 style={{ fontSize: 28 }}>Lich su sessions</h2>
            {sessions.length === 0 ? (
              <p style={{ marginTop: 10, color: '#4f758a' }}>Chua co session.</p>
            ) : (
              <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                {sessions.map((s) => (
                  <div key={s.id} className="surface-card" style={{ padding: 10 }}>
                    <div style={{ fontWeight: 800 }}>
                      {getEmotionLabel(s.dominant_emotion || 'neutral')} ({s.avg_confidence || 0}%)
                    </div>
                    <div style={{ color: '#4f758a', fontSize: 13, marginTop: 2 }}>
                      {s.session_type} | {new Date(s.started_at).toLocaleString('vi-VN')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : null}

      {!loading ? (
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 28 }}>Canh bao</h2>
              <Button variant="ghost" onClick={markAllRead}>
                Danh dau tat ca da doc
              </Button>
            </div>
            {alerts.length === 0 ? (
              <p style={{ marginTop: 10, color: '#4f758a' }}>Khong co canh bao.</p>
            ) : (
              <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                {alerts.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => markOneRead(a)}
                    style={{
                      borderRadius: 14,
                      border: '1px solid #f0d1cc',
                      textAlign: 'left',
                      background: a.is_read ? '#fff' : '#fff1ef',
                      padding: 10,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 900, color: a.is_read ? '#2e5e76' : '#b33c2d' }}>{alertTitle(a.alert_type)}</div>
                    <div style={{ color: '#4f758a', marginTop: 2, fontSize: 13 }}>{a.description}</div>
                    <div style={{ color: '#6e879a', marginTop: 4, fontSize: 12 }}>{new Date(a.created_at).toLocaleString('vi-VN')}</div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h2 style={{ fontSize: 28 }}>De xuat ca nhan hoa</h2>
            {recommendations.length === 0 ? (
              <p style={{ marginTop: 10, color: '#4f758a' }}>Chua co de xuat.</p>
            ) : (
              <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                {recommendations.map((r, idx) => (
                  <div key={`${r.type}-${idx}`} className="surface-card" style={{ padding: 10 }}>
                    <div style={{ fontWeight: 900 }}>{r.title}</div>
                    <div style={{ color: '#4f758a', marginTop: 2 }}>{r.description}</div>
                    {r.action?.label ? <div style={{ marginTop: 4, color: '#0f8f8f', fontWeight: 800 }}>{r.action.label}</div> : null}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : null}

      <style>{`
        @media (max-width: 980px) {
          .page-shell > div:nth-of-type(3),
          .page-shell > div:nth-of-type(4),
          .page-shell > div:nth-of-type(5) {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
