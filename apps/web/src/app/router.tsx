import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ItineraryBuilderPage } from '../pages/ItineraryBuilderPage';
import { LocationPage } from '../pages/LocationPage';
import { RegionPage } from '../pages/RegionPage';
import { SegmentPage } from '../pages/SegmentPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/itinerary-builder" replace /> },
      { path: 'itinerary-builder', element: <ItineraryBuilderPage /> },
      { path: 'regions', element: <RegionPage /> },
      { path: 'locations', element: <LocationPage /> },
      { path: 'segments', element: <SegmentPage /> },
    ],
  },
]);
