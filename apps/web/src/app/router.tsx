import { EmployeeRole } from '@tour/domain';
import { Navigate, createBrowserRouter } from 'react-router-dom';
import { useAuth } from '../features/auth/context';
import { RedirectAuthenticated, RequireAdmin, RequireAuth, RequireStaffOrAbove } from './auth-guards';
import { AppLayout } from '../components/layout/AppLayout';
import { ConfirmedTripsPage } from '../pages/ConfirmedTripsPage';
import { ConfirmedTripDetailPage } from '../pages/ConfirmedTripDetailPage';
import { ConfirmedTripAssignPage } from '../pages/ConfirmedTripAssignPage';
import { GuidesPage } from '../pages/GuidesPage';
import { GuideDetailPage } from '../pages/GuideDetailPage';
import { DriverDetailPage } from '../pages/DriverDetailPage';
import { DriversPage } from '../pages/DriversPage';
import { AccommodationDetailPage } from '../pages/AccommodationDetailPage';
import { AccommodationsPage } from '../pages/AccommodationsPage';
import { ConnectionCreatePage } from '../pages/ConnectionCreatePage';
import { ConnectionListPage } from '../pages/ConnectionListPage';
import { CustomerCreatePage } from '../pages/CustomerCreatePage';
import { CustomerPage } from '../pages/CustomerPage';
import { CustomerPlansPage } from '../pages/CustomerPlansPage';
import { DealPipelinePage } from '../pages/DealPipelinePage';
import { EmployeeAdminPage } from '../pages/EmployeeAdminPage';
import { EstimatePdfRenderPage } from '../pages/EstimatePdfRenderPage';
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
import { PricingPoliciesPage } from '../pages/PricingPoliciesPage';
import { PricingPolicyRulesPage } from '../pages/PricingPolicyRulesPage';
import { RegionCreatePage } from '../pages/RegionCreatePage';
import { RegionLodgingPage } from '../pages/RegionLodgingPage';
import { RegionListPage } from '../pages/RegionListPage';
import { RegionSetAdminPage } from '../pages/RegionSetAdminPage';
import { SpecialMealDestinationRulesPage } from '../pages/SpecialMealDestinationRulesPage';
import { TodoListPage } from '../pages/TodoListPage';

/** 역할에 따라 초기 홈 경로를 분기합니다. */
function HomeRedirect(): JSX.Element {
  const { employee } = useAuth();
  if (employee?.role === EmployeeRole.OPS_STAFF) {
    return <Navigate to="/confirmed-trips" replace />;
  }
  return <Navigate to="/itinerary-builder" replace />;
}

export const router = createBrowserRouter([
  {
    path: '/documents/estimate/render',
    element: <EstimatePdfRenderPage />,
  },
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
      { index: true, element: <HomeRedirect /> },
      // ── OPS_STAFF 포함 전체 접근 가능 (운영 4개 영역) ───────────────────────
      { path: 'confirmed-trips', element: <ConfirmedTripsPage /> },
      { path: 'confirmed-trips/:tripId', element: <ConfirmedTripDetailPage /> },
      { path: 'confirmed-trips/:tripId/assign', element: <ConfirmedTripAssignPage /> },
      { path: 'guides', element: <GuidesPage /> },
      { path: 'guides/:guideId', element: <GuideDetailPage /> },
      { path: 'drivers', element: <DriversPage /> },
      { path: 'drivers/:driverId', element: <DriverDetailPage /> },
      { path: 'accommodations', element: <AccommodationsPage /> },
      { path: 'accommodations/:accommodationId', element: <AccommodationDetailPage /> },
      // ── STAFF / ADMIN 전용 (OPS_STAFF 차단) ────────────────────────────────
      {
        path: 'itinerary-builder',
        element: <RequireStaffOrAbove><ItineraryBuilderPage /></RequireStaffOrAbove>,
      },
      {
        path: 'itinerary-templates',
        element: <RequireStaffOrAbove><ItineraryTemplatePage /></RequireStaffOrAbove>,
      },
      {
        path: 'itinerary-templates/new',
        element: <RequireStaffOrAbove><ItineraryTemplateCreatePage /></RequireStaffOrAbove>,
      },
      {
        path: 'itinerary-templates/:templateId',
        element: <RequireStaffOrAbove><ItineraryTemplateDetailPage /></RequireStaffOrAbove>,
      },
      {
        path: 'documents/estimate',
        element: <RequireStaffOrAbove><EstimatePrintPage /></RequireStaffOrAbove>,
      },
      {
        path: 'customers',
        element: <RequireStaffOrAbove><CustomerPage /></RequireStaffOrAbove>,
      },
      {
        path: 'customers/create',
        element: <RequireStaffOrAbove><CustomerCreatePage /></RequireStaffOrAbove>,
      },
      {
        path: 'customers/:userId/plans',
        element: <RequireStaffOrAbove><CustomerPlansPage /></RequireStaffOrAbove>,
      },
      {
        path: 'deal-pipeline',
        element: <RequireStaffOrAbove><DealPipelinePage /></RequireStaffOrAbove>,
      },
      {
        path: 'outreach/leads',
        element: <RequireStaffOrAbove><OutreachLeadListPage /></RequireStaffOrAbove>,
      },
      {
        path: 'outreach/leads/:leadId',
        element: <RequireStaffOrAbove><OutreachLeadDetailPage /></RequireStaffOrAbove>,
      },
      {
        path: 'todos/list',
        element: <RequireStaffOrAbove><TodoListPage /></RequireStaffOrAbove>,
      },
      {
        path: 'plans/:planId',
        element: <RequireStaffOrAbove><PlanDetailPage /></RequireStaffOrAbove>,
      },
      {
        path: 'plans/:planId/versions/:versionId',
        element: <RequireStaffOrAbove><PlanVersionDetailPage /></RequireStaffOrAbove>,
      },
      { path: 'regions', element: <Navigate to="/regions/list" replace /> },
      {
        path: 'regions/list',
        element: <RequireStaffOrAbove><RegionListPage /></RequireStaffOrAbove>,
      },
      {
        path: 'regions/create',
        element: <RequireStaffOrAbove><RegionCreatePage /></RequireStaffOrAbove>,
      },
      {
        path: 'regions/lodgings',
        element: <RequireStaffOrAbove><RegionLodgingPage /></RequireStaffOrAbove>,
      },
      {
        path: 'regions/sets',
        element: <RequireStaffOrAbove><RegionSetAdminPage /></RequireStaffOrAbove>,
      },
      {
        path: 'settings/special-meal-destination-rules',
        element: <RequireStaffOrAbove><SpecialMealDestinationRulesPage /></RequireStaffOrAbove>,
      },
      { path: 'events', element: <Navigate to="/events/list" replace /> },
      {
        path: 'events/list',
        element: <RequireStaffOrAbove><EventPage /></RequireStaffOrAbove>,
      },
      {
        path: 'events/create',
        element: <RequireStaffOrAbove><EventPage /></RequireStaffOrAbove>,
      },
      { path: 'connections', element: <Navigate to="/connections/list" replace /> },
      {
        path: 'connections/list',
        element: <RequireStaffOrAbove><ConnectionListPage /></RequireStaffOrAbove>,
      },
      {
        path: 'connections/create',
        element: <RequireStaffOrAbove><ConnectionCreatePage /></RequireStaffOrAbove>,
      },
      { path: 'multi-day-blocks', element: <Navigate to="/multi-day-blocks/list" replace /> },
      {
        path: 'multi-day-blocks/list',
        element: <RequireStaffOrAbove><MultiDayBlockListPage /></RequireStaffOrAbove>,
      },
      {
        path: 'multi-day-blocks/create',
        element: <RequireStaffOrAbove><MultiDayBlockCreatePage /></RequireStaffOrAbove>,
      },
      {
        path: 'multi-day-blocks/:stayId',
        element: <RequireStaffOrAbove><MultiDayBlockDetailPage /></RequireStaffOrAbove>,
      },
      {
        path: 'multi-day-blocks/:stayId/edit',
        element: <RequireStaffOrAbove><MultiDayBlockEditPage /></RequireStaffOrAbove>,
      },
      { path: 'locations', element: <Navigate to="/locations/list" replace /> },
      {
        path: 'locations/list',
        element: <RequireStaffOrAbove><LocationListPage /></RequireStaffOrAbove>,
      },
      {
        path: 'locations/create',
        element: <RequireStaffOrAbove><LocationCreatePage /></RequireStaffOrAbove>,
      },
      {
        path: 'location-guides',
        element: <RequireStaffOrAbove><LocationGuidePage /></RequireStaffOrAbove>,
      },
      { path: 'locations/stays', element: <Navigate to="/multi-day-blocks/list" replace /> },
      { path: 'locations/stays/new', element: <Navigate to="/multi-day-blocks/create" replace /> },
      {
        path: 'locations/stays/:stayId',
        element: <RequireStaffOrAbove><MultiDayBlockDetailPage /></RequireStaffOrAbove>,
      },
      {
        path: 'locations/stays/:stayId/edit',
        element: <RequireStaffOrAbove><MultiDayBlockEditPage /></RequireStaffOrAbove>,
      },
      {
        path: 'locations/:id',
        element: <RequireStaffOrAbove><LocationDetailPage /></RequireStaffOrAbove>,
      },
      {
        path: 'locations/:id/edit',
        element: <RequireStaffOrAbove><LocationEditPage /></RequireStaffOrAbove>,
      },
      {
        path: 'locations/:locationId/versions/:versionId',
        element: <RequireStaffOrAbove><LocationVersionDetailPage /></RequireStaffOrAbove>,
      },
      {
        path: 'locations/:locationId/versions/:versionId/edit',
        element: <RequireStaffOrAbove><LocationVersionEditPage /></RequireStaffOrAbove>,
      },
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
            <PricingPoliciesPage />
          </RequireAdmin>
        ),
      },
      {
        path: 'admin/pricing-policies/:policyId/rules',
        element: (
          <RequireAdmin>
            <PricingPolicyRulesPage />
          </RequireAdmin>
        ),
      },
    ],
  },
]);
