import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ActivityPage } from '../pages/ActivityPage';
import { CustomerPage } from '../pages/CustomerPage';
import { CustomerPlansPage } from '../pages/CustomerPlansPage';
import { ItineraryBuilderPage } from '../pages/ItineraryBuilderPage';
import { LocationCreatePage } from '../pages/LocationCreatePage';
import { LocationDetailPage } from '../pages/LocationDetailPage';
import { LocationEditPage } from '../pages/LocationEditPage';
import { LocationListPage } from '../pages/LocationListPage';
import { PlanDetailPage } from '../pages/PlanDetailPage';
import { PlanVersionDetailPage } from '../pages/PlanVersionDetailPage';
import { RegionCreatePage } from '../pages/RegionCreatePage';
import { RegionListPage } from '../pages/RegionListPage';
import { SegmentPage } from '../pages/SegmentPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/itinerary-builder" replace /> },
      { path: 'itinerary-builder', element: <ItineraryBuilderPage /> },
      { path: 'customers', element: <CustomerPage /> },
      { path: 'customers/:userId/plans', element: <CustomerPlansPage /> },
      { path: 'plans/:planId', element: <PlanDetailPage /> },
      { path: 'plans/:planId/versions/:versionId', element: <PlanVersionDetailPage /> },
      { path: 'activities', element: <ActivityPage /> },
      { path: 'regions', element: <Navigate to="/regions/list" replace /> },
      { path: 'regions/list', element: <RegionListPage /> },
      { path: 'regions/create', element: <RegionCreatePage /> },
      { path: 'locations', element: <Navigate to="/locations/list" replace /> },
      { path: 'locations/list', element: <LocationListPage /> },
      { path: 'locations/create', element: <LocationCreatePage /> },
      { path: 'locations/:id', element: <LocationDetailPage /> },
      { path: 'locations/:id/edit', element: <LocationEditPage /> },
      { path: 'locations/connections', element: <SegmentPage /> },
      { path: 'segments', element: <Navigate to="/locations/connections" replace /> },
    ],
  },
]);
