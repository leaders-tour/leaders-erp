import { describe, expect, it } from 'vitest';
import { MealOption } from '../../generated/graphql';
import type { LocationOption, SegmentOption } from './route-autofill';
import { buildAutoRowsFromRoute, buildTemplateStopsFromRouteAndRows } from './route-autofill';

const locationA: LocationOption = {
  id: 'loc-a',
  regionId: 'region-1',
  name: '울란바토르',
  defaultVersionId: 'ver-a',
  variations: [
    {
      id: 'ver-a',
      versionNumber: 1,
      label: '기본',
      lodgings: [],
      mealSets: [],
      timeBlocks: [
        {
          id: 'tb-a-1',
          startTime: '08:00',
          orderIndex: 0,
          activities: [{ id: 'act-a-1', description: '출발 준비', orderIndex: 0 }],
        },
      ],
    },
  ],
};

const locationB: LocationOption = {
  id: 'loc-b',
  regionId: 'region-1',
  name: '달란자드가드',
  defaultVersionId: 'ver-b',
  variations: [
    {
      id: 'ver-b',
      versionNumber: 1,
      label: '기본',
      lodgings: [
        {
          id: 'lodging-b',
          name: '여행자 캠프',
          hasElectricity: 'YES',
          hasShower: 'YES',
          hasInternet: 'LIMITED',
        },
      ],
      mealSets: [
        {
          id: 'meal-b',
          breakfast: MealOption.CampMeal,
          lunch: MealOption.LocalRestaurant,
          dinner: MealOption.CampMeal,
        },
      ],
      timeBlocks: [
        {
          id: 'tb-b-1',
          startTime: '09:00',
          orderIndex: 0,
          activities: [{ id: 'act-b-1', description: '현지 산책', orderIndex: 0 }],
        },
      ],
    },
  ],
};

const segment: SegmentOption = {
  id: 'segment-ab',
  regionId: 'region-1',
  fromLocationId: 'loc-a',
  toLocationId: 'loc-b',
  averageDistanceKm: 540,
  averageTravelHours: 8.5,
  scheduleTimeBlocks: [
    {
      id: 'seg-tb-1',
      startTime: '12:00',
      orderIndex: 0,
      activities: [{ id: 'seg-act-1', description: '이동 중 점심식사', orderIndex: 0 }],
    },
    {
      id: 'seg-tb-2',
      startTime: '18:00',
      orderIndex: 1,
      activities: [{ id: 'seg-act-2', description: '숙소 도착', orderIndex: 0 }],
    },
  ],
};

const locationAVersion = locationA.variations[0]!;
const locationBVersion = locationB.variations[0]!;

describe('route-autofill', () => {
  it('uses location version schedule on day 1 and segment schedule afterwards', () => {
    const rows = buildAutoRowsFromRoute({
      startLocationId: locationA.id,
      startLocationVersionId: 'ver-a',
      selectedRoute: [{ locationId: locationB.id, locationVersionId: 'ver-b' }],
      filteredSegments: [segment],
      locationById: new Map([
        [locationA.id, locationA],
        [locationB.id, locationB],
      ]),
      locationVersionById: new Map([
        ['ver-a', locationAVersion],
        ['ver-b', locationBVersion],
      ]),
      totalDays: 2,
    });

    expect(rows[0]).toMatchObject({
      segmentId: undefined,
      timeCellText: '08:00',
      scheduleCellText: '출발 준비',
    });
    expect(rows[1]).toMatchObject({
      segmentId: 'segment-ab',
      timeCellText: '12:00\n18:00',
      scheduleCellText: '이동 중 점심식사\n숙소 도착',
      lodgingCellText: '여행자 캠프\n전기 O\n샤워 O\n인터넷 제한',
    });
  });

  it('preserves segmentId in template stop payloads for day 2+', () => {
    const stops = buildTemplateStopsFromRouteAndRows({
      startLocationId: locationA.id,
      startLocationVersionId: 'ver-a',
      selectedRoute: [{ locationId: locationB.id, locationVersionId: 'ver-b' }],
      planRows: [
        {
          locationId: locationA.id,
          locationVersionId: 'ver-a',
          dateCellText: '1일차',
          destinationCellText: '울란바토르',
          timeCellText: '08:00',
          scheduleCellText: '출발 준비',
          lodgingCellText: '',
          mealCellText: '',
        },
        {
          segmentId: 'segment-ab',
          locationId: locationB.id,
          locationVersionId: 'ver-b',
          dateCellText: '2일차',
          destinationCellText: '달란자드가드',
          timeCellText: '12:00\n18:00',
          scheduleCellText: '이동 중 점심식사\n숙소 도착',
          lodgingCellText: '',
          mealCellText: '',
        },
      ],
    });

    expect(stops[0]?.segmentId).toBeUndefined();
    expect(stops[1]?.segmentId).toBe('segment-ab');
  });
});
