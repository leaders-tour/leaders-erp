import { describe, expect, it } from 'vitest';
import { MealOption, VariantType } from '../../generated/graphql';
import type { LocationOption, OvernightStayOption, SegmentOption } from './route-autofill';
import {
  buildAutoRowsFromRoute,
  buildFirstDayOptions,
  buildNextOptions,
  buildOvernightStayOptions,
  buildSelectedRouteFromStops,
  buildTemplateStopsFromRouteAndRows,
  resolveSegmentVersionForDate,
} from './route-autofill';

const locationA: LocationOption = {
  id: 'loc-a',
  regionId: 'region-1',
  name: ['울란바토르'],
  defaultVersionId: 'ver-a',
  isFirstDayEligible: true,
  isLastDayEligible: false,
  variations: [
    {
      id: 'ver-a',
      versionNumber: 1,
      label: '기본',
      firstDayAverageDistanceKm: 35,
      firstDayAverageTravelHours: 1.5,
      firstDayMovementIntensity: 'LEVEL_1',
      lodgings: [],
      mealSets: [],
      firstDayTimeBlocks: [
        {
          id: 'tb-a-first',
          startTime: '08:00',
          orderIndex: 0,
          activities: [{ id: 'act-a-first', description: '첫날 기본 일정', orderIndex: 0 }],
        },
      ],
      firstDayEarlyTimeBlocks: [
        {
          id: 'tb-a-early',
          startTime: '05:00',
          orderIndex: 0,
          activities: [{ id: 'act-a-early', description: '첫날 얼리 일정', orderIndex: 0 }],
        },
      ],
    },
  ],
};

const locationB: LocationOption = {
  id: 'loc-b',
  regionId: 'region-1',
  name: ['차강소브라가', '달란자드가드'],
  defaultVersionId: 'ver-b',
  isFirstDayEligible: false,
  isLastDayEligible: false,
  variations: [
    {
      id: 'ver-b',
      versionNumber: 1,
      label: '기본',
      firstDayAverageDistanceKm: null,
      firstDayAverageTravelHours: null,
      firstDayMovementIntensity: null,
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
      firstDayTimeBlocks: [],
      firstDayEarlyTimeBlocks: [],
    },
  ],
};

const locationC: LocationOption = {
  id: 'loc-c',
  regionId: 'region-1',
  name: ['고비 사막'],
  defaultVersionId: 'ver-c',
  isFirstDayEligible: false,
  isLastDayEligible: true,
  variations: [
    {
      id: 'ver-c',
      versionNumber: 1,
      label: '기본',
      firstDayAverageDistanceKm: null,
      firstDayAverageTravelHours: null,
      firstDayMovementIntensity: null,
      lodgings: [],
      mealSets: [],
      firstDayTimeBlocks: [],
      firstDayEarlyTimeBlocks: [],
    },
  ],
};

const segmentAB: SegmentOption = {
  id: 'segment-ab',
  regionId: 'region-1',
  fromLocationId: 'loc-a',
  toLocationId: 'loc-b',
  defaultVersionId: 'segment-version-ab',
  averageDistanceKm: 540,
  averageTravelHours: 8.5,
  scheduleTimeBlocks: [
    {
      id: 'seg-ab-basic',
      startTime: '12:00',
      orderIndex: 0,
      activities: [{ id: 'seg-ab-basic-act', description: '기본 이동', orderIndex: 0 }],
    },
  ],
  earlyScheduleTimeBlocks: [
    {
      id: 'seg-ab-early',
      startTime: '06:00',
      orderIndex: 0,
      activities: [{ id: 'seg-ab-early-act', description: '얼리 이동', orderIndex: 0 }],
    },
  ],
  extendScheduleTimeBlocks: [],
  earlyExtendScheduleTimeBlocks: [],
  versions: [
    {
      id: 'segment-version-ab',
      segmentId: 'segment-ab',
      name: 'Direct',
      averageDistanceKm: 540,
      averageTravelHours: 8.5,
      isLongDistance: false,
      sortOrder: 0,
      isDefault: true,
      scheduleTimeBlocks: [
        {
          id: 'segv-ab-basic',
          startTime: '12:00',
          orderIndex: 0,
          activities: [{ id: 'segv-ab-basic-act', description: '기본 이동', orderIndex: 0 }],
        },
      ],
      earlyScheduleTimeBlocks: [
        {
          id: 'segv-ab-early',
          startTime: '06:00',
          orderIndex: 0,
          activities: [{ id: 'segv-ab-early-act', description: '얼리 이동', orderIndex: 0 }],
        },
      ],
      extendScheduleTimeBlocks: [],
      earlyExtendScheduleTimeBlocks: [],
    },
  ],
};

const segmentBC: SegmentOption = {
  id: 'segment-bc',
  regionId: 'region-1',
  fromLocationId: 'loc-b',
  toLocationId: 'loc-c',
  defaultVersionId: 'segment-version-bc',
  averageDistanceKm: 200,
  averageTravelHours: 4,
  scheduleTimeBlocks: [
    {
      id: 'seg-bc-basic',
      startTime: '11:00',
      orderIndex: 0,
      activities: [{ id: 'seg-bc-basic-act', description: '기본 이동', orderIndex: 0 }],
    },
  ],
  earlyScheduleTimeBlocks: [],
  extendScheduleTimeBlocks: [
    {
      id: 'seg-bc-extend',
      startTime: '19:00',
      orderIndex: 0,
      activities: [{ id: 'seg-bc-extend-act', description: '연장 이동', orderIndex: 0 }],
    },
  ],
  earlyExtendScheduleTimeBlocks: [],
  versions: [
    {
      id: 'segment-version-bc',
      segmentId: 'segment-bc',
      name: 'Direct',
      averageDistanceKm: 200,
      averageTravelHours: 4,
      isLongDistance: false,
      sortOrder: 0,
      isDefault: true,
      scheduleTimeBlocks: [
        {
          id: 'segv-bc-basic',
          startTime: '11:00',
          orderIndex: 0,
          activities: [{ id: 'segv-bc-basic-act', description: '기본 이동', orderIndex: 0 }],
        },
      ],
      earlyScheduleTimeBlocks: [],
      extendScheduleTimeBlocks: [
        {
          id: 'segv-bc-extend',
          startTime: '19:00',
          orderIndex: 0,
          activities: [{ id: 'segv-bc-extend-act', description: '연장 이동', orderIndex: 0 }],
        },
      ],
      earlyExtendScheduleTimeBlocks: [],
    },
  ],
};

const segmentAC: SegmentOption = {
  id: 'segment-ac',
  regionId: 'region-1',
  fromLocationId: 'loc-a',
  toLocationId: 'loc-c',
  defaultVersionId: 'segment-version-ac',
  averageDistanceKm: 620,
  averageTravelHours: 10,
  scheduleTimeBlocks: [
    {
      id: 'seg-ac-basic',
      startTime: '12:00',
      orderIndex: 0,
      activities: [{ id: 'seg-ac-basic-act', description: '기본 장거리 이동', orderIndex: 0 }],
    },
  ],
  earlyScheduleTimeBlocks: [
    {
      id: 'seg-ac-early',
      startTime: '05:30',
      orderIndex: 0,
      activities: [{ id: 'seg-ac-early-act', description: '얼리 장거리 이동', orderIndex: 0 }],
    },
  ],
  extendScheduleTimeBlocks: [
    {
      id: 'seg-ac-extend',
      startTime: '20:00',
      orderIndex: 0,
      activities: [{ id: 'seg-ac-extend-act', description: '연장 장거리 이동', orderIndex: 0 }],
    },
  ],
  earlyExtendScheduleTimeBlocks: [
    {
      id: 'seg-ac-early-extend',
      startTime: '05:30',
      orderIndex: 0,
      activities: [{ id: 'seg-ac-early-extend-act', description: '얼리+연장 이동', orderIndex: 0 }],
    },
  ],
  versions: [
    {
      id: 'segment-version-ac',
      segmentId: 'segment-ac',
      name: 'Direct',
      averageDistanceKm: 620,
      averageTravelHours: 10,
      isLongDistance: false,
      sortOrder: 0,
      isDefault: true,
      scheduleTimeBlocks: [
        {
          id: 'segv-ac-basic',
          startTime: '12:00',
          orderIndex: 0,
          activities: [{ id: 'segv-ac-basic-act', description: '기본 장거리 이동', orderIndex: 0 }],
        },
      ],
      earlyScheduleTimeBlocks: [
        {
          id: 'segv-ac-early',
          startTime: '05:30',
          orderIndex: 0,
          activities: [{ id: 'segv-ac-early-act', description: '얼리 장거리 이동', orderIndex: 0 }],
        },
      ],
      extendScheduleTimeBlocks: [
        {
          id: 'segv-ac-extend',
          startTime: '20:00',
          orderIndex: 0,
          activities: [{ id: 'segv-ac-extend-act', description: '연장 장거리 이동', orderIndex: 0 }],
        },
      ],
      earlyExtendScheduleTimeBlocks: [
        {
          id: 'segv-ac-early-extend',
          startTime: '05:30',
          orderIndex: 0,
          activities: [{ id: 'segv-ac-early-extend-act', description: '얼리+연장 이동', orderIndex: 0 }],
        },
      ],
    },
  ],
};

const segmentACWithoutEarly: SegmentOption = {
  ...segmentAC,
  earlyScheduleTimeBlocks: [],
  versions: [
    {
      ...segmentAC.versions![0]!,
      earlyScheduleTimeBlocks: [],
    },
  ],
};

const segmentABSeasonal: SegmentOption = {
  ...segmentAB,
  versions: [
    {
      ...segmentAB.versions![0]!,
      id: 'segment-version-ab-default',
      isDefault: true,
    },
    {
      ...segmentAB.versions![0]!,
      id: 'segment-version-ab-jan',
      name: '1월 특화',
      isDefault: false,
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-01-31T00:00:00.000Z',
      scheduleTimeBlocks: [
        {
          id: 'segv-ab-jan-basic',
          startTime: '10:30',
          orderIndex: 0,
          activities: [{ id: 'segv-ab-jan-basic-act', description: '1월 이동', orderIndex: 0 }],
        },
      ],
      earlyScheduleTimeBlocks: [
        {
          id: 'segv-ab-jan-early',
          startTime: '05:10',
          orderIndex: 0,
          activities: [{ id: 'segv-ab-jan-early-act', description: '1월 얼리 이동', orderIndex: 0 }],
        },
      ],
    },
    {
      ...segmentAB.versions![0]!,
      id: 'segment-version-ab-feb',
      name: '2월 특화',
      isDefault: false,
      startDate: '2026-02-01T00:00:00.000Z',
      endDate: '2026-02-28T00:00:00.000Z',
      scheduleTimeBlocks: [
        {
          id: 'segv-ab-feb-basic',
          startTime: '11:30',
          orderIndex: 0,
          activities: [{ id: 'segv-ab-feb-basic-act', description: '2월 이동', orderIndex: 0 }],
        },
      ],
      earlyScheduleTimeBlocks: [],
    },
  ],
};

const locationAVersion = locationA.variations[0]!;
const locationBVersion = locationB.variations[0]!;
const locationCVersion = locationC.variations[0]!;

const overnightStayB2: OvernightStayOption = {
  id: 'stay-b-2',
  regionId: 'region-1',
  locationId: locationB.id,
  blockType: 'STAY',
  startLocationId: locationB.id,
  endLocationId: locationB.id,
  name: '차강소브라가 2일 표준',
  title: '차강소브라가 연박',
  isActive: true,
  sortOrder: 0,
  days: [
    {
      id: 'stay-b-2-day-1',
      dayOrder: 1,
      displayLocationId: locationB.id,
      averageDistanceKm: 0,
      averageTravelHours: 0,
      timeCellText: '08:00',
      scheduleCellText: '연박 1일차',
      lodgingCellText: '',
      mealCellText: '',
    },
    {
      id: 'stay-b-2-day-2',
      dayOrder: 2,
      displayLocationId: locationB.id,
      averageDistanceKm: 0,
      averageTravelHours: 0,
      timeCellText: '09:00',
      scheduleCellText: '연박 2일차',
      lodgingCellText: '',
      mealCellText: '',
    },
  ],
};

const overnightStayB3: OvernightStayOption = {
  ...overnightStayB2,
  id: 'stay-b-3',
  name: '차강소브라가 3일 확장',
  title: '차강소브라가 3일 연박',
  days: [
    ...overnightStayB2.days,
    {
      id: 'stay-b-3-day-3',
      dayOrder: 3,
      displayLocationId: locationB.id,
      averageDistanceKm: 0,
      averageTravelHours: 0,
      timeCellText: '10:00',
      scheduleCellText: '연박 3일차',
      lodgingCellText: '',
      mealCellText: '',
    },
  ],
};

describe('route-autofill', () => {
  it('limits day 1 candidates to first-day eligible locations', () => {
    expect(buildFirstDayOptions([locationA, locationB, locationC]).map((location) => location.id)).toEqual(['loc-a']);
  });

  it('filters day 2 candidates by early schedules when the variant is early', () => {
    const options = buildNextOptions({
      filteredLocations: [locationA, locationB, locationC],
      filteredSegments: [segmentAB, segmentACWithoutEarly],
      startLocationId: locationA.id,
      selectedRoute: [],
      totalDays: 3,
      variantType: VariantType.Early,
    });

    expect(options.map((location) => location.id)).toEqual(['loc-b']);
  });

  it('filters the last day by last-day eligibility and extend schedules', () => {
    const options = buildNextOptions({
      filteredLocations: [locationA, locationB, locationC],
      filteredSegments: [segmentBC],
      startLocationId: locationA.id,
      selectedRoute: [
        {
          kind: 'LOCATION',
          locationId: locationB.id,
          locationVersionId: 'ver-b',
          segmentId: 'segment-ab',
          segmentVersionId: 'segment-version-ab',
        },
      ],
      totalDays: 3,
      variantType: VariantType.Extend,
    });

    expect(options.map((location) => location.id)).toEqual(['loc-c']);
  });

  it('filters overnight stay options by remaining days per stay length', () => {
    const optionsForTwoDaysLeft = buildOvernightStayOptions({
      filteredOvernightStays: [overnightStayB2, overnightStayB3],
      filteredSegments: [segmentAB],
      startLocationId: locationA.id,
      selectedRoute: [],
      totalDays: 3,
    });

    expect(optionsForTwoDaysLeft.map((overnightStay) => overnightStay.id)).toEqual(['stay-b-2']);
  });

  it('resolves a date-matched segment version before falling back to default', () => {
    expect(resolveSegmentVersionForDate(segmentABSeasonal, '2026-01-15')?.id).toBe('segment-version-ab-jan');
    expect(resolveSegmentVersionForDate(segmentABSeasonal, '2026-02-15')?.id).toBe('segment-version-ab-feb');
    expect(resolveSegmentVersionForDate(segmentABSeasonal, '2026-03-15')?.id).toBe('segment-version-ab-default');
  });

  it('keeps an explicitly selected segment version even when the date points to another one', () => {
    expect(resolveSegmentVersionForDate(segmentABSeasonal, '2026-01-15', 'segment-version-ab-feb')?.id).toBe('segment-version-ab-feb');
  });

  it('filters day candidates using the date-matched segment version schedule', () => {
    const januaryOptions = buildNextOptions({
      filteredLocations: [locationA, locationB, locationC],
      filteredSegments: [segmentABSeasonal],
      startLocationId: locationA.id,
      selectedRoute: [],
      totalDays: 3,
      variantType: VariantType.Early,
      targetDate: '2026-01-02',
    });

    const februaryOptions = buildNextOptions({
      filteredLocations: [locationA, locationB, locationC],
      filteredSegments: [segmentABSeasonal],
      startLocationId: locationA.id,
      selectedRoute: [],
      totalDays: 3,
      variantType: VariantType.Early,
      targetDate: '2026-02-02',
    });

    expect(januaryOptions.map((location) => location.id)).toEqual(['loc-b']);
    expect(februaryOptions).toEqual([]);
  });

  it('uses first-day early time blocks and early+extend segment schedules for a 2-day route', () => {
    const rows = buildAutoRowsFromRoute({
      startLocationId: locationA.id,
      startLocationVersionId: 'ver-a',
      selectedRoute: [
        {
          kind: 'LOCATION',
          locationId: locationC.id,
          locationVersionId: 'ver-c',
          segmentId: 'segment-ac',
          segmentVersionId: 'segment-version-ac',
        },
      ],
      filteredSegments: [segmentAC],
      locationById: new Map([
        [locationA.id, locationA],
        [locationC.id, locationC],
      ]),
      locationVersionById: new Map([
        ['ver-a', locationAVersion],
        ['ver-c', locationCVersion],
      ]),
      totalDays: 2,
      variantType: VariantType.EarlyExtend,
      firstDayTimeOverride: '04:30',
      lastDayTimeOverride: '22:00',
    });

    expect(rows[0]).toMatchObject({
      destinationCellText: '울란바토르\n이동 1.5시간\n(35 km)',
      movementIntensity: 'LEVEL_1',
      timeCellText: '04:30',
      scheduleCellText: '첫날 얼리 일정',
    });
    expect(rows[1]).toMatchObject({
      segmentId: 'segment-ac',
      segmentVersionId: 'segment-version-ac',
      timeCellText: '22:00',
      scheduleCellText: '얼리+연장 이동',
    });
  });

  it('expands 3-day overnight stays into 3 rows', () => {
    const rows = buildAutoRowsFromRoute({
      startLocationId: locationA.id,
      startLocationVersionId: 'ver-a',
      selectedRoute: [
        {
          kind: 'OVERNIGHT_STAY',
          overnightStayId: overnightStayB3.id,
          stayLength: 3,
          locationId: locationB.id,
          locationVersionId: 'ver-b',
        },
      ],
      filteredSegments: [segmentAB],
      filteredOvernightStays: [overnightStayB3],
      locationById: new Map([
        [locationA.id, locationA],
        [locationB.id, locationB],
      ]),
      locationVersionById: new Map([
        ['ver-a', locationAVersion],
        ['ver-b', locationBVersion],
      ]),
      totalDays: 4,
    });

    expect(rows.slice(1, 4).map((row) => row.overnightStayDayOrder)).toEqual([1, 2, 3]);
  });

  it('STAY block expands rows with multiDayBlock* and displayLocationId-derived locationId', () => {
    const rows = buildAutoRowsFromRoute({
      startLocationId: locationA.id,
      startLocationVersionId: 'ver-a',
      selectedRoute: [
        {
          kind: 'OVERNIGHT_STAY',
          overnightStayId: overnightStayB2.id,
          stayLength: 2,
          locationId: locationB.id,
          locationVersionId: 'ver-b',
        },
      ],
      filteredSegments: [segmentAB],
      filteredOvernightStays: [overnightStayB2],
      locationById: new Map([
        [locationA.id, locationA],
        [locationB.id, locationB],
      ]),
      locationVersionById: new Map([
        ['ver-a', locationAVersion],
        ['ver-b', locationBVersion],
      ]),
      totalDays: 3,
    });

    expect(rows[1]).toMatchObject({
      multiDayBlockId: overnightStayB2.id,
      multiDayBlockDayOrder: 1,
      overnightStayId: overnightStayB2.id,
      overnightStayDayOrder: 1,
      locationId: locationB.id,
      locationVersionId: 'ver-b',
    });
    expect(rows[2]).toMatchObject({
      multiDayBlockId: overnightStayB2.id,
      multiDayBlockDayOrder: 2,
      overnightStayId: overnightStayB2.id,
      overnightStayDayOrder: 2,
      locationId: locationB.id,
      locationVersionId: 'ver-b',
    });
  });

  it('restores route from stops with only legacy overnightStay* (no multiDayBlock*)', () => {
    const stops = [
      { dayIndex: 1, locationId: locationA.id, locationVersionId: 'ver-a' },
      {
        dayIndex: 2,
        overnightStayId: overnightStayB2.id,
        overnightStayDayOrder: 1,
        locationId: locationB.id,
        locationVersionId: 'ver-b',
      },
      {
        dayIndex: 3,
        overnightStayId: overnightStayB2.id,
        overnightStayDayOrder: 2,
        locationId: locationB.id,
        locationVersionId: 'ver-b',
      },
    ];
    const route = buildSelectedRouteFromStops(stops);
    expect(route).toHaveLength(2);
    expect(route[0]).toMatchObject({ kind: 'LOCATION', locationId: locationA.id, locationVersionId: 'ver-a' });
    expect(route[1]).toMatchObject({
      kind: 'OVERNIGHT_STAY',
      overnightStayId: overnightStayB2.id,
      stayLength: 2,
      locationId: locationB.id,
      locationVersionId: 'ver-b',
    });
  });

  it('uses the route date to fill segmentVersionId when auto rows are built', () => {
    const rows = buildAutoRowsFromRoute({
      startLocationId: locationA.id,
      startLocationVersionId: 'ver-a',
      selectedRoute: [
        {
          kind: 'LOCATION',
          locationId: locationB.id,
          locationVersionId: 'ver-b',
          segmentId: 'segment-ab',
        },
      ],
      filteredSegments: [segmentABSeasonal],
      locationById: new Map([
        [locationA.id, locationA],
        [locationB.id, locationB],
      ]),
      locationVersionById: new Map([
        ['ver-a', locationAVersion],
        ['ver-b', locationBVersion],
      ]),
      totalDays: 2,
      travelStartDate: '2026-01-01',
    });

    expect(rows[1]?.segmentVersionId).toBe('segment-version-ab-jan');
    expect(rows[1]?.scheduleCellText).toBe('1월 이동');
  });

  it('preserves segmentId in template stop payloads for day 2+', () => {
    const stops = buildTemplateStopsFromRouteAndRows({
      startLocationId: locationA.id,
      startLocationVersionId: 'ver-a',
      selectedRoute: [
        {
          kind: 'LOCATION',
          locationId: locationB.id,
          locationVersionId: 'ver-b',
          segmentId: 'segment-ab',
          segmentVersionId: 'segment-version-ab',
        },
      ],
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
          segmentVersionId: 'segment-version-ab',
          locationId: locationB.id,
          locationVersionId: 'ver-b',
          dateCellText: '2일차',
          destinationCellText: '차강소브라가\n달란자드가드',
          timeCellText: '12:00',
          scheduleCellText: '이동 중 점심식사',
          lodgingCellText: '',
          mealCellText: '',
        },
      ],
    });

    expect(stops[0]?.segmentId).toBeUndefined();
    expect(stops[1]?.segmentId).toBe('segment-ab');
    expect(stops[1]?.segmentVersionId).toBe('segment-version-ab');
  });
});
