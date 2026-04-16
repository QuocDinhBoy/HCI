/* ─── AppLayout ──────────────────────────────────────────────
   Layout chính sau khi đăng nhập:
   - Header sticky (logo + desktop nav + avatar + sound toggle)
   - Main content
   - Bottom Nav sticky (mobile/tablet ≤ 1024px)
───────────────────────────────────────────────────────────── */
import { Outlet } from 'react-router-dom';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';

export default function AppLayout() {
  return (
    <div className="app-shell">
      <AppHeader />
      <main className="app-main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
