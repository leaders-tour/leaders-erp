import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ItineraryBuilderPage } from '../pages/ItineraryBuilderPage';
import { LocationCreatePage } from '../pages/LocationCreatePage';
import { LocationListPage } from '../pages/LocationListPage';
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
      { path: 'regions', element: <Navigate to="/regions/list" replace /> },
      { path: 'regions/list', element: <RegionListPage /> },
      { path: 'regions/create', element: <RegionCreatePage /> },
      { path: 'locations', element: <Navigate to="/locations/list" replace /> },
      { path: 'locations/list', element: <LocationListPage /> },
      { path: 'locations/create', element: <LocationCreatePage /> },
      { path: 'locations/connections', element: <SegmentPage /> },
      { path: 'segments', element: <Navigate to="/locations/connections" replace /> },
    ],
  },
]);
