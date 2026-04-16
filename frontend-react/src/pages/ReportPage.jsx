/* ─── ReportPage ─────────────────────────────────────────────
   Báo cáo tiến trình — dành cho phụ huynh & giáo viên
   Thiết kế: pastel achievement cards, biểu đồ đẹp, thông báo thân thiện
───────────────────────────────────────────────────────────── */
import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar,
  BarChart, CartesianGrid, XAxis, YAxis, Bar, Tooltip,
} from 'recharts';
import client from '../api/client';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import StarBadge from '../components/ui/StarBadge';
import { getEmotionLabel } from '../utils/emotionHelpers';

/* ── Alert type labels ────────────────────────────────────── */
const ALERT_LABELS = {
  PROLONGED_SADNESS:  { icon: '😢', label: 'Buồn bã kéo dài',        color: 'var(--sky-500)' },
  PROLONGED_NEGATIVE: { icon: '😟', label: 'Cảm xúc tiêu cực kéo dài', color: 'var(--lavender-500)' },
  HIGH_ANGER:         { icon: '😠', label: 'Mức tức giận cao',         color: 'var(--coral-500)' },
  LOW_ENGAGEMENT:     { icon: '😴', label: 'Tham gia thấp',            color: 'var(--ink-400)' },
  SUDDEN_CHANGE:      { icon: '⚡', label: 'Thay đổi đột ngột',       color: 'var(--peach-500)' },
  EMOTION_DIFFICULTY: { icon: '🤔', label: 'Khó khăn cảm xúc cụ thể', color: 'var(--lavender-400)' },
};

function alertInfo(type) {
  return ALERT_LABELS[type] || { icon: '⚠️', label: 'Cảnh báo', color: 'var(--coral-500)' };
}

/* ── Custom Tooltip for charts ────────────────────────────── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'white', borderRadius: 12, padding: '10px 14px',
      boxShadow: 'var(--shadow-md)', border: '1.5px solid rgba(126,197,248,0.20)',
      fontSize: '0.9rem', fontWeight: 700,
    }}>
      <p style={{ color: 'var(--ink-600)' }}>{label}</p>
      <p style={{ color: 'var(--sky-500)', marginTop: 4 }}>Điểm: {payload[0]?.value}</p>
    </div>
  );
}

/* ── Stat Card ────────────────────────────────────────────── */
function StatCard({ icon, label, value, unit = '', variant = 'sky', style }) {
  return (
    <Card variant={variant} style={{ padding: '22px 24px', ...style }}>
      <div style={{ fontSize: '2.5rem', lineHeight: 1, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: '2.2rem', fontWeight: 900, fontFamily: 'var(--font-heading)', color: 'var(--ink-800)', lineHeight: 1 }}>
        {value}{unit}
      </div>
      <div style={{ color: 'var(--ink-500)', fontWeight: 700, marginTop: 6, fontSize: '0.95rem' }}>{label}</div>
    </Card>
  );
}

export default function ReportPage() {
  const [report,           setReport]          = useState(null);
  const [sessions,         setSessions]        = useState([]);
  const [alerts,           setAlerts]          = useState([]);
  const [recommendations,  setRecommendations] = useState([]);
  const [loading,          setLoading]         = useState(true);
  const [error,            setError]           = useState('');
  const [activeTab,        setActiveTab]       = useState('overview');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true); setError('');
      const [reportRes, sessionRes, alertRes, recRes] = await Promise.allSettled([
        client.get('/api/report'),
        client.get('/api/emotion-sessions/history?limit=20'),
        client.get('/api/alerts'),
        client.get('/api/recommendations'),
      ]);
      if (!mounted) return;
      if (reportRes.status === 'fulfilled')  setReport(reportRes.value.data);
      if (sessionRes.status === 'fulfilled') setSessions(sessionRes.value.data?.sessions || []);
      if (alertRes.status === 'fulfilled')   setAlerts(alertRes.value.data?.alerts || []);
      if (recRes.status === 'fulfilled')     setRecommendations(recRes.value.data?.recommendations || []);
      if (reportRes.status !== 'fulfilled')  setError(reportRes.reason?.response?.data?.message || 'Không tải được báo cáo.');
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  const stats      = report?.stats    || {};
  const radarData  = report?.radar    || [];
  const skillData  = report?.skills   || [];
  const logs       = report?.logs     || [];
  const unread     = useMemo(() => alerts.filter((a) => !a.is_read).length, [alerts]);

  const markOneRead = async (alert) => {
    if (alert.is_read) return;
    try {
      await client.patch(`/api/alerts/${alert.id}/read`);
      setAlerts((prev) => prev.map((item) => item.id === alert.id ? { ...item, is_read: 1 } : item));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await client.patch('/api/alerts/read-all');
      setAlerts((prev) => prev.map((item) => ({ ...item, is_read: 1 })));
    } catch { /* ignore */ }
  };

  const TABS = [
    { id: 'overview', icon: '📊', label: 'Tổng quan' },
    { id: 'history',  icon: '📝', label: 'Nhật ký' },
    { id: 'alerts',   icon: '🔔', label: `Cảnh báo ${unread ? `(${unread})` : ''}` },
    { id: 'tips',     icon: '💡', label: 'Đề xuất' },
  ];

  return (
    <div className="page-shell" style={{ display: 'grid', gap: 20 }}>

      {/* ── Header ────────────────────────────────────────────── */}
      <Card variant="sky" style={{ padding: 28, position: 'relative', overflow: 'hidden' }}>
        <span className="float-emoji" style={{ top: 10, right: 50, fontSize: '2.5rem', animationDelay: '0s' }}>📊</span>
        <span className="float-emoji" style={{ top: 30, right: 16, fontSize: '1.5rem', animationDelay: '1.5s' }}>✨</span>
        <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.5rem)' }}>📋 Báo cáo tiến trình</h1>
        <p style={{ color: 'var(--ink-500)', marginTop: 8, fontSize: '1.05rem' }}>
          Theo dõi sự phát triển và cảm xúc của bé
        </p>
      </Card>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div className="loading-spinner" />
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && (
        <>
          {/* ── Stats Row ─────────────────────────────────────── */}
          <div className="grid-4 stagger-children" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            <StatCard icon="⭐" label="Tổng sao"       value={stats.stars    || 0} variant="sun"      />
            <StatCard icon="🔥" label="Ngày liên tiếp" value={stats.streak   || 0} variant="coral"    />
            <StatCard icon="🎯" label="Độ chính xác"   value={stats.accuracy || 0} unit="%" variant="mint"   />
            <StatCard icon="🔔" label="Cảnh báo mới"   value={unread}              variant={unread ? 'coral' : 'sky'} />
          </div>

          {/* ── Tabs ──────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="btn btn-sm"
                style={{
                  background:  activeTab === tab.id ? 'var(--sky-100)' : 'white',
                  color:       activeTab === tab.id ? 'var(--sky-600)' : 'var(--ink-500)',
                  border:      `1.5px solid ${activeTab === tab.id ? 'rgba(126,197,248,0.40)' : 'rgba(148,163,184,0.20)'}`,
                  fontWeight:  activeTab === tab.id ? 800 : 700,
                  fontSize:    '0.95rem',
                  padding:     '10px 18px',
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* ═══ OVERVIEW ═══════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gap: 20 }}>
              <div className="grid-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>

                {/* Radar chart */}
                <Card style={{ padding: 24 }}>
                  <h2 style={{ fontSize: '1.3rem', marginBottom: 16 }}>🕸️ Radar cấp độ</h2>
                  <div style={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="rgba(126,197,248,0.25)" />
                        <PolarAngleAxis dataKey="label" tick={{ fontSize: 12, fontWeight: 700, fill: '#64748B' }} />
                        <Radar
                          dataKey="score"
                          stroke="var(--sky-400)"
                          fill="var(--sky-300)"
                          fillOpacity={0.25}
                          strokeWidth={2}
                        />
                        <Tooltip content={<CustomTooltip />} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Bar chart */}
                <Card style={{ padding: 24 }}>
                  <h2 style={{ fontSize: '1.3rem', marginBottom: 16 }}>📊 Kỹ năng theo loại bài</h2>
                  <div style={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer>
                      <BarChart data={skillData} barSize={32}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(126,197,248,0.15)" />
                        <XAxis dataKey="code" tick={{ fontSize: 12, fontWeight: 700, fill: '#64748B' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                          dataKey="score"
                          fill="url(#barGrad)"
                          radius={[10, 10, 0, 0]}
                        >
                          <defs>
                            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%"   stopColor="#7EC5F8" />
                              <stop offset="100%" stopColor="#6DCF9A" />
                            </linearGradient>
                          </defs>
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ═══ HISTORY ════════════════════════════════════════ */}
          {activeTab === 'history' && (
            <div style={{ display: 'grid', gap: 20 }}>
              <div className="grid-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                {/* Learning Journal */}
                <Card style={{ padding: 24 }}>
                  <h2 style={{ fontSize: '1.3rem', marginBottom: 16 }}>📓 Nhật ký học tập</h2>
                  {logs.length === 0
                    ? <p style={{ color: 'var(--ink-400)', textAlign: 'center', padding: '20px 0' }}>Chưa có dữ liệu.</p>
                    : (
                      <div style={{ display: 'grid', gap: 10 }}>
                        {logs.map((log, idx) => (
                          <div key={`${log.answered_at}-${idx}`} className="surface-card animate-rise" style={{
                            padding: '14px 16px',
                            background: 'linear-gradient(135deg, var(--sky-50), white)',
                            animationDelay: `${idx * 0.04}s`,
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 800, color: 'var(--ink-700)', fontSize: '0.95rem' }}>
                                {log.lesson_type === 'flashcard'        ? '🃏 Thẻ học'
                                : log.lesson_type === 'matching'        ? '🧩 Ghép cặp'
                                : log.lesson_type === 'context'         ? '📖 Ngữ cảnh'
                                : log.lesson_type === 'emotion_training'? '🎭 Biểu cảm AI'
                                :                                         log.lesson_type}
                              </span>
                              <span className={`pill ${log.score >= 7 ? 'pill-mint' : 'pill-sky'}`}>
                                {log.score} điểm
                              </span>
                            </div>
                            <p style={{ color: 'var(--ink-400)', fontSize: '0.82rem', marginTop: 6 }}>
                              🕐 {new Date(log.answered_at).toLocaleString('vi-VN')}
                            </p>
                          </div>
                        ))}
                      </div>
                    )
                  }
                </Card>

                {/* Emotion sessions */}
                <Card style={{ padding: 24 }}>
                  <h2 style={{ fontSize: '1.3rem', marginBottom: 16 }}>📷 Lịch sử nhận diện</h2>
                  {sessions.length === 0
                    ? <p style={{ color: 'var(--ink-400)', textAlign: 'center', padding: '20px 0' }}>Chưa có phiên nào.</p>
                    : (
                      <div style={{ display: 'grid', gap: 10 }}>
                        {sessions.map((s) => (
                          <div key={s.id} className="surface-card" style={{
                            padding: '14px 16px',
                            background: 'linear-gradient(135deg, var(--mint-50), white)',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 800, color: 'var(--ink-700)', fontSize: '0.95rem' }}>
                                {getEmotionLabel(s.dominant_emotion || 'neutral')}
                              </span>
                              <span className="pill pill-mint">{s.avg_confidence || 0}%</span>
                            </div>
                            <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                              <p style={{ color: 'var(--ink-400)', fontSize: '0.82rem' }}>
                                📌 {s.session_type}
                              </p>
                              <p style={{ color: 'var(--ink-400)', fontSize: '0.82rem' }}>
                                🕐 {new Date(s.started_at).toLocaleString('vi-VN')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  }
                </Card>
              </div>
            </div>
          )}

          {/* ═══ ALERTS ═════════════════════════════════════════ */}
          {activeTab === 'alerts' && (
            <Card style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                <h2 style={{ fontSize: '1.3rem' }}>🔔 Cảnh báo</h2>
                {unread > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllRead}>
                    ✓ Đánh dấu tất cả đã đọc
                  </Button>
                )}
              </div>

              {alerts.length === 0
                ? (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <span style={{ fontSize: '3.5rem' }}>✅</span>
                    <p style={{ color: 'var(--ink-400)', marginTop: 12 }}>Không có cảnh báo nào. Bé học rất tốt!</p>
                  </div>
                )
                : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {alerts.map((a) => {
                      const info = alertInfo(a.alert_type);
                      return (
                        <button
                          key={a.id}
                          onClick={() => markOneRead(a)}
                          style={{
                            display:      'block', width: '100%', textAlign: 'left',
                            padding:      '16px 18px', borderRadius: 'var(--radius-lg)',
                            background:   a.is_read ? 'white' : `linear-gradient(135deg, ${a.alert_type === 'HIGH_ANGER' ? 'var(--coral-50)' : 'var(--sun-50)'}, white)`,
                            border:       `1.5px solid ${a.is_read ? 'rgba(148,163,184,0.15)' : 'rgba(255,192,94,0.35)'}`,
                            cursor:       'pointer',
                            transition:   'all 0.2s ease',
                            boxShadow:    a.is_read ? 'none' : 'var(--shadow-sm)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: '1.8rem' }}>{info.icon}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{
                                fontWeight: 800,
                                color:      a.is_read ? 'var(--ink-600)' : info.color,
                                fontSize:   '1rem',
                                display:    'flex', alignItems: 'center', gap: 8,
                              }}>
                                {info.label}
                                {!a.is_read && <span className="pill pill-coral" style={{ fontSize: '0.7rem' }}>Mới</span>}
                              </div>
                              <p style={{ color: 'var(--ink-500)', marginTop: 4, fontSize: '0.9rem', lineHeight: 1.5 }}>
                                {a.description}
                              </p>
                              <p style={{ color: 'var(--ink-300)', marginTop: 6, fontSize: '0.8rem' }}>
                                🕐 {new Date(a.created_at).toLocaleString('vi-VN')}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )
              }
            </Card>
          )}

          {/* ═══ RECOMMENDATIONS ════════════════════════════════ */}
          {activeTab === 'tips' && (
            <div>
              <h2 style={{ fontSize: '1.3rem', marginBottom: 16 }}>💡 Đề xuất cá nhân hóa</h2>
              {recommendations.length === 0
                ? (
                  <Card style={{ padding: 32, textAlign: 'center' }}>
                    <span style={{ fontSize: '3rem' }}>🎓</span>
                    <p style={{ color: 'var(--ink-400)', marginTop: 12 }}>Chưa có đề xuất. Hãy học thêm để hệ thống hiểu bé hơn!</p>
                  </Card>
                )
                : (
                  <div className="grid-auto stagger-children">
                    {recommendations.map((r, idx) => (
                      <Card key={`${r.type}-${idx}`} variant="lavender" style={{ padding: 22 }}>
                        <h3 style={{ fontSize: '1.1rem', color: 'var(--ink-800)' }}>{r.title}</h3>
                        <p style={{ color: 'var(--ink-500)', marginTop: 8, fontSize: '0.95rem', lineHeight: 1.6 }}>{r.description}</p>
                        {r.action?.label && (
                          <div style={{ marginTop: 14 }}>
                            <span className="pill pill-lavender">{r.action.label}</span>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )
              }
            </div>
          )}
        </>
      )}
    </div>
  );
}
