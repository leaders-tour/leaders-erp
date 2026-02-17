import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ActivityPage } from '../pages/ActivityPage';
import { DayPlanPage } from '../pages/DayPlanPage';
import { LocationPage } from '../pages/LocationPage';
import { OverridePage } from '../pages/OverridePage';
import { PlanPage } from '../pages/PlanPage';
import { RegionPage } from '../pages/RegionPage';
import { SegmentPage } from '../pages/SegmentPage';
import { TimeBlockPage } from '../pages/TimeBlockPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/regions" replace /> },
      { path: 'regions', element: <RegionPage /> },
      { path: 'locations', element: <LocationPage /> },
      { path: 'segments', element: <SegmentPage /> },
      { path: 'plans', element: <PlanPage /> },
      { path: 'day-plans', element: <DayPlanPage /> },
      { path: 'time-blocks', element: <TimeBlockPage /> },
      { path: 'activities', element: <ActivityPage /> },
      { path: 'overrides', element: <OverridePage /> },
    ],
  },
]);
