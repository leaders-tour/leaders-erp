import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ActivityPage } from '../pages/ActivityPage';
import { ItineraryBuilderPage } from '../pages/ItineraryBuilderPage';
import { LodgingPage } from '../pages/LodgingPage';
import { LocationPage } from '../pages/LocationPage';
import { MealSetPage } from '../pages/MealSetPage';
import { RegionPage } from '../pages/RegionPage';
import { SegmentPage } from '../pages/SegmentPage';
import { TimeBlockPage } from '../pages/TimeBlockPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/itinerary-builder" replace /> },
      { path: 'itinerary-builder', element: <ItineraryBuilderPage /> },
      { path: 'regions', element: <RegionPage /> },
      { path: 'locations', element: <LocationPage /> },
      { path: 'lodgings', element: <LodgingPage /> },
      { path: 'meal-sets', element: <MealSetPage /> },
      { path: 'segments', element: <SegmentPage /> },
      { path: 'time-blocks', element: <TimeBlockPage /> },
      { path: 'activities', element: <ActivityPage /> },
    ],
  },
]);
