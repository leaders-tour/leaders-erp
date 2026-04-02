import { Navigate, createBrowserRouter } from 'react-router-dom';
import { RedirectAuthenticated, RequireAdmin, RequireAuth } from './auth-guards';
import { AppLayout } from '../components/layout/AppLayout';
import { ConnectionCreatePage } from '../pages/ConnectionCreatePage';
import { ConnectionListPage } from '../pages/ConnectionListPage';
import { CustomerCreatePage } from '../pages/CustomerCreatePage';
import { CustomerPage } from '../pages/CustomerPage';
import { CustomerPlansPage } from '../pages/CustomerPlansPage';
import { DealPipelinePage } from '../pages/DealPipelinePage';
import { EmployeeAdminPage } from '../pages/EmployeeAdminPage';
import { EstimatePrintPage } from '../pages/EstimatePrintPage';
import { EventPage } from '../pages/EventPage';
import { ItineraryBuilderPage } from '../pages/ItineraryBuilderPage';
import { ItineraryTemplateCreatePage } from '../pages/ItineraryTemplateCreatePage';
import { ItineraryTemplateDetailPage } from '../pages/ItineraryTemplateDetailPage';
import { ItineraryTemplatePage } from '../pages/ItineraryTemplatePage';
import { LoginPage } from '../pages/LoginPage';
import { LocationCreatePage } from '../pages/LocationCreatePage';
import { LocationDetailPage } from '../pages/LocationDetailPage';
import { LocationEditPage } from '../pages/LocationEditPage';
import { LocationGuidePage } from '../pages/LocationGuidePage';
import { LocationListPage } from '../pages/LocationListPage';
import { LocationVersionDetailPage } from '../pages/LocationVersionDetailPage';
import { LocationVersionEditPage } from '../pages/LocationVersionEditPage';
import { MultiDayBlockEditPage } from '../pages/MultiDayBlockEditPage';
import { MultiDayBlockCreatePage } from '../pages/MultiDayBlockCreatePage';
import { MultiDayBlockDetailPage } from '../pages/MultiDayBlockDetailPage';
import { MultiDayBlockListPage } from '../pages/MultiDayBlockListPage';
import { OutreachLeadDetailPage } from '../pages/OutreachLeadDetailPage';
import { OutreachLeadListPage } from '../pages/OutreachLeadListPage';
import { PlanDetailPage } from '../pages/PlanDetailPage';
import { PlanVersionDetailPage } from '../pages/PlanVersionDetailPage';
import { PricingPolicyPage } from '../pages/PricingPolicyPage';
import { RegionCreatePage } from '../pages/RegionCreatePage';
import { RegionLodgingPage } from '../pages/RegionLodgingPage';
import { RegionListPage } from '../pages/RegionListPage';
import { RegionSetAdminPage } from '../pages/RegionSetAdminPage';
import { SpecialMealDestinationRulesPage } from '../pages/SpecialMealDestinationRulesPage';
import { TodoListPage } from '../pages/TodoListPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <RedirectAuthenticated>
        <LoginPage />
      </RedirectAuthenticated>
    ),
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/itinerary-builder" replace /> },
      { path: 'itinerary-builder', element: <ItineraryBuilderPage /> },
      { path: 'itinerary-templates', element: <ItineraryTemplatePage /> },
      { path: 'itinerary-templates/new', element: <ItineraryTemplateCreatePage /> },
      { path: 'itinerary-templates/:templateId', element: <ItineraryTemplateDetailPage /> },
      { path: 'documents/estimate', element: <EstimatePrintPage /> },
      { path: 'customers', element: <CustomerPage /> },
      { path: 'customers/create', element: <CustomerCreatePage /> },
      { path: 'customers/:userId/plans', element: <CustomerPlansPage /> },
      { path: 'deal-pipeline', element: <DealPipelinePage /> },
      { path: 'outreach/leads', element: <OutreachLeadListPage /> },
      { path: 'outreach/leads/:leadId', element: <OutreachLeadDetailPage /> },
      { path: 'todos/list', element: <TodoListPage /> },
      { path: 'plans/:planId', element: <PlanDetailPage /> },
      { path: 'plans/:planId/versions/:versionId', element: <PlanVersionDetailPage /> },
      { path: 'regions', element: <Navigate to="/regions/list" replace /> },
      { path: 'regions/list', element: <RegionListPage /> },
      { path: 'regions/create', element: <RegionCreatePage /> },
      { path: 'regions/lodgings', element: <RegionLodgingPage /> },
      { path: 'regions/sets', element: <RegionSetAdminPage /> },
      { path: 'settings/special-meal-destination-rules', element: <SpecialMealDestinationRulesPage /> },
      { path: 'events', element: <Navigate to="/events/list" replace /> },
      { path: 'events/list', element: <EventPage /> },
      { path: 'events/create', element: <EventPage /> },
      { path: 'connections', element: <Navigate to="/connections/list" replace /> },
      { path: 'connections/list', element: <ConnectionListPage /> },
      { path: 'connections/create', element: <ConnectionCreatePage /> },
      { path: 'multi-day-blocks', element: <Navigate to="/multi-day-blocks/list" replace /> },
      { path: 'multi-day-blocks/list', element: <MultiDayBlockListPage /> },
      { path: 'multi-day-blocks/create', element: <MultiDayBlockCreatePage /> },
      { path: 'multi-day-blocks/:stayId', element: <MultiDayBlockDetailPage /> },
      { path: 'multi-day-blocks/:stayId/edit', element: <MultiDayBlockEditPage /> },
      { path: 'locations', element: <Navigate to="/locations/list" replace /> },
      { path: 'locations/list', element: <LocationListPage /> },
      { path: 'locations/create', element: <LocationCreatePage /> },
      { path: 'location-guides', element: <LocationGuidePage /> },
      { path: 'locations/stays', element: <Navigate to="/multi-day-blocks/list" replace /> },
      { path: 'locations/stays/new', element: <Navigate to="/multi-day-blocks/create" replace /> },
      { path: 'locations/stays/:stayId', element: <MultiDayBlockDetailPage /> },
      { path: 'locations/stays/:stayId/edit', element: <MultiDayBlockEditPage /> },
      { path: 'locations/:id', element: <LocationDetailPage /> },
      { path: 'locations/:id/edit', element: <LocationEditPage /> },
      { path: 'locations/:locationId/versions/:versionId', element: <LocationVersionDetailPage /> },
      { path: 'locations/:locationId/versions/:versionId/edit', element: <LocationVersionEditPage /> },
      { path: 'locations/connections', element: <Navigate to="/connections/list" replace /> },
      { path: 'segments', element: <Navigate to="/connections/list" replace /> },
      {
        path: 'admin/employees',
        element: (
          <RequireAdmin>
            <EmployeeAdminPage />
          </RequireAdmin>
        ),
      },
      {
        path: 'admin/pricing-policies',
        element: (
          <RequireAdmin>
            <PricingPolicyPage />
          </RequireAdmin>
        ),
      },
    ],
  },
]);
