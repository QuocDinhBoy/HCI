import { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import PublicOnlyRoute from './components/layout/PublicOnlyRoute';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const LessonPage = lazy(() => import('./pages/LessonPage'));
const EmotionDetectorPage = lazy(() => import('./pages/EmotionDetectorPage'));
const ReportPage = lazy(() => import('./pages/ReportPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const BadgeCollectionPage = lazy(() => import('./pages/BadgeCollectionPage'));
const StoryLibraryPage    = lazy(() => import('./pages/StoryLibraryPage'));
const StoryReaderPage     = lazy(() => import('./pages/StoryReaderPage'));
const LearningMapPage     = lazy(() => import('./pages/LearningMapPage'));

function RouteFallback() {
  return (
    <div style={{ minHeight: '40vh', display: 'grid', placeItems: 'center', color: '#4f758a', fontWeight: 800 }}>
      Dang tai giao dien...
    </div>
  );
}

function withSuspense(node) {
  return <Suspense fallback={<RouteFallback />}>{node}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: withSuspense(<LandingPage />),
  },
  {
    path: '/login',
    element: <PublicOnlyRoute>{withSuspense(<LoginPage />)}</PublicOnlyRoute>,
  },
  {
    path: '/register',
    element: <PublicOnlyRoute>{withSuspense(<RegisterPage />)}</PublicOnlyRoute>,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/app', element: withSuspense(<DashboardPage />) },
      { path: '/learn/:levelId/:lessonType', element: withSuspense(<LessonPage />) },
      { path: '/emotion-detector', element: withSuspense(<EmotionDetectorPage />) },
      { path: '/emotion-practice', element: withSuspense(<EmotionDetectorPage practiceMode />) },
      { path: '/speed-run', element: withSuspense(<EmotionDetectorPage practiceMode />) },
      { path: '/report', element: withSuspense(<ReportPage />) },
      { path: '/profile', element: withSuspense(<ProfilePage />) },
      { path: '/badges',            element: withSuspense(<BadgeCollectionPage />) },
      { path: '/stories',           element: withSuspense(<StoryLibraryPage />) },
      { path: '/stories/:storyId',  element: withSuspense(<StoryReaderPage />) },
      { path: '/map',               element: withSuspense(<LearningMapPage />) },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
