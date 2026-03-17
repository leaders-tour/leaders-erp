import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { EmployeeRole, FacilityAvailability, MealOption, PrismaClient, VariantType } from '@prisma/client';

const envFilePath = path.resolve(process.cwd(), '.env');
if (existsSync(envFilePath)) {
  const envContent = readFileSync(envFilePath, 'utf8');
  for (const rawLine of envContent.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const prisma = new PrismaClient();
const scrypt = promisify(scryptCallback);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}

async function ensureBootstrapAdmin(): Promise<void> {
  const email = process.env.AUTH_BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.AUTH_BOOTSTRAP_ADMIN_PASSWORD?.trim();
  const name = process.env.AUTH_BOOTSTRAP_ADMIN_NAME?.trim() || 'ERP 관리자';

  if (!email || !password) {
    return;
  }

  const employee = await prisma.employee.upsert({
    where: { email },
    update: {
      name,
      passwordHash: await hashPassword(password),
      role: EmployeeRole.ADMIN,
      isActive: true,
    },
    create: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role: EmployeeRole.ADMIN,
      isActive: true,
    },
  });

  await prisma.employeeRefreshToken.updateMany({
    where: {
      employeeId: employee.id,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

async function main(): Promise<void> {
  await ensureBootstrapAdmin();

  const gobi = await prisma.region.upsert({
    where: { id: 'seed_region_gobi' },
    update: {},
    create: {
      id: 'seed_region_gobi',
      name: '고비',
      description: '고비 권역 기본 데이터',
    },
  });

  const ub = await prisma.location.upsert({
    where: { id: 'seed_loc_ub' },
    update: {},
    create: {
      id: 'seed_loc_ub',
      regionId: gobi.id,
      regionName: gobi.name,
      name: ['울란바토르'],
      defaultLodgingType: '도시 호텔',
      latitude: 47.8864,
      longitude: 106.9057,
    },
  });

  const dalanzadgad = await prisma.location.upsert({
    where: { id: 'seed_loc_dalanzadgad' },
    update: {},
    create: {
      id: 'seed_loc_dalanzadgad',
      regionId: gobi.id,
      regionName: gobi.name,
      name: ['달란자드가드'],
      defaultLodgingType: '사막 캠프',
      latitude: 43.5708,
      longitude: 104.425,
    },
  });

  const ubVersion = await prisma.locationVersion.upsert({
    where: {
      locationId_versionNumber: {
        locationId: ub.id,
        versionNumber: 1,
      },
    },
    update: {
      label: '기본',
      locationNameSnapshot: ub.name,
      regionNameSnapshot: ub.regionName,
      defaultLodgingType: ub.defaultLodgingType,
    },
    create: {
      locationId: ub.id,
      versionNumber: 1,
      label: '기본',
      locationNameSnapshot: ub.name,
      regionNameSnapshot: ub.regionName,
      defaultLodgingType: ub.defaultLodgingType,
      changeNote: 'seed default',
    },
  });

  const dalanVersion = await prisma.locationVersion.upsert({
    where: {
      locationId_versionNumber: {
        locationId: dalanzadgad.id,
        versionNumber: 1,
      },
    },
    update: {
      label: '기본',
      locationNameSnapshot: dalanzadgad.name,
      regionNameSnapshot: dalanzadgad.regionName,
      defaultLodgingType: dalanzadgad.defaultLodgingType,
    },
    create: {
      locationId: dalanzadgad.id,
      versionNumber: 1,
      label: '기본',
      locationNameSnapshot: dalanzadgad.name,
      regionNameSnapshot: dalanzadgad.regionName,
      defaultLodgingType: dalanzadgad.defaultLodgingType,
      changeNote: 'seed default',
    },
  });

  await prisma.location.update({
    where: { id: ub.id },
    data: { currentVersionId: ubVersion.id },
  });

  await prisma.location.update({
    where: { id: dalanzadgad.id },
    data: { currentVersionId: dalanVersion.id },
  });

  const ubToDalanSegment = await prisma.segment.upsert({
    where: {
      fromLocationId_toLocationId: {
        fromLocationId: ub.id,
        toLocationId: dalanzadgad.id,
      },
    },
    update: {},
    create: {
      regionId: gobi.id,
      regionName: gobi.name,
      fromLocationId: ub.id,
      toLocationId: dalanzadgad.id,
      averageDistanceKm: 540,
      averageTravelHours: 8.5,
      isLongDistance: true,
    },
  });

  const ubToDalanDirectVersion = await prisma.segmentVersion.upsert({
    where: {
      segmentId_sortOrder: {
        segmentId: ubToDalanSegment.id,
        sortOrder: 0,
      },
    },
    update: {
      name: 'Direct',
      averageDistanceKm: 540,
      averageTravelHours: 8.5,
      isLongDistance: true,
      isDefault: true,
    },
    create: {
      segmentId: ubToDalanSegment.id,
      name: 'Direct',
      averageDistanceKm: 540,
      averageTravelHours: 8.5,
      isLongDistance: true,
      sortOrder: 0,
      isDefault: true,
    },
  });

  await prisma.segment.update({
    where: { id: ubToDalanSegment.id },
    data: {
      defaultVersionId: ubToDalanDirectVersion.id,
      isLongDistance: true,
    },
  });

  const dalanLodging = await prisma.lodging.upsert({
    where: { id: 'seed_lodging_dalan_camp' },
    update: {
      locationId: dalanzadgad.id,
      locationVersionId: dalanVersion.id,
      locationNameSnapshot: dalanzadgad.name,
      name: '여행자 캠프',
      specialNotes: '전기/샤워/인터넷 가능',
      isUnspecified: false,
      hasElectricity: FacilityAvailability.YES,
      hasShower: FacilityAvailability.YES,
      hasInternet: FacilityAvailability.YES,
    },
    create: {
      id: 'seed_lodging_dalan_camp',
      locationId: dalanzadgad.id,
      locationVersionId: dalanVersion.id,
      locationNameSnapshot: dalanzadgad.name,
      name: '여행자 캠프',
      specialNotes: '전기/샤워/인터넷 가능',
      isUnspecified: false,
      hasElectricity: FacilityAvailability.YES,
      hasShower: FacilityAvailability.YES,
      hasInternet: FacilityAvailability.YES,
    },
  });

  const dalanMeals = await prisma.mealSet.upsert({
    where: {
      locationVersionId_setName: {
        locationVersionId: dalanVersion.id,
        setName: '기본 세트',
      },
    },
    update: {
      locationId: dalanzadgad.id,
      locationNameSnapshot: dalanzadgad.name,
      breakfast: MealOption.CAMP_MEAL,
      lunch: MealOption.LOCAL_RESTAURANT,
      dinner: MealOption.CAMP_MEAL,
    },
    create: {
      locationId: dalanzadgad.id,
      locationVersionId: dalanVersion.id,
      locationNameSnapshot: dalanzadgad.name,
      setName: '기본 세트',
      breakfast: MealOption.CAMP_MEAL,
      lunch: MealOption.LOCAL_RESTAURANT,
      dinner: MealOption.CAMP_MEAL,
    },
  });

  const slot08 = await prisma.timeBlock.upsert({
    where: {
      locationVersionId_profile_orderIndex: {
        locationVersionId: dalanVersion.id,
        profile: 'DEFAULT',
        orderIndex: 0,
      },
    },
    update: { profile: 'DEFAULT', startTime: '08:00', label: '08:00' },
    create: {
      locationId: dalanzadgad.id,
      locationVersionId: dalanVersion.id,
      profile: 'DEFAULT',
      startTime: '08:00',
      label: '08:00',
      orderIndex: 0,
    },
  });
  const slot12 = await prisma.timeBlock.upsert({
    where: {
      locationVersionId_profile_orderIndex: {
        locationVersionId: dalanVersion.id,
        profile: 'DEFAULT',
        orderIndex: 1,
      },
    },
    update: { profile: 'DEFAULT', startTime: '12:00', label: '12:00' },
    create: {
      locationId: dalanzadgad.id,
      locationVersionId: dalanVersion.id,
      profile: 'DEFAULT',
      startTime: '12:00',
      label: '12:00',
      orderIndex: 1,
    },
  });
  const slot18 = await prisma.timeBlock.upsert({
    where: {
      locationVersionId_profile_orderIndex: {
        locationVersionId: dalanVersion.id,
        profile: 'DEFAULT',
        orderIndex: 2,
      },
    },
    update: { profile: 'DEFAULT', startTime: '18:00', label: '18:00' },
    create: {
      locationId: dalanzadgad.id,
      locationVersionId: dalanVersion.id,
      profile: 'DEFAULT',
      startTime: '18:00',
      label: '18:00',
      orderIndex: 2,
    },
  });

  await prisma.activity.upsert({
    where: {
      timeBlockId_orderIndex: {
        timeBlockId: slot08.id,
        orderIndex: 0,
      },
    },
    update: {
      description: '가이드 미팅 후 고비로 출발',
      isOptional: false,
      conditionNote: null,
    },
    create: {
      timeBlockId: slot08.id,
      description: '가이드 미팅 후 고비로 출발',
      orderIndex: 0,
      isOptional: false,
      conditionNote: null,
    },
  });

  const segmentSlot08 = await prisma.segmentTimeBlock.upsert({
    where: {
      segmentId_variant_orderIndex: {
        segmentId: ubToDalanSegment.id,
        variant: 'basic',
        orderIndex: 0,
      },
    },
    update: { variant: 'basic', startTime: '08:00', label: '08:00' },
    create: {
      segmentId: ubToDalanSegment.id,
      variant: 'basic',
      startTime: '08:00',
      label: '08:00',
      orderIndex: 0,
    },
  });
  const segmentSlot12 = await prisma.segmentTimeBlock.upsert({
    where: {
      segmentId_variant_orderIndex: {
        segmentId: ubToDalanSegment.id,
        variant: 'basic',
        orderIndex: 1,
      },
    },
    update: { variant: 'basic', startTime: '12:00', label: '12:00' },
    create: {
      segmentId: ubToDalanSegment.id,
      variant: 'basic',
      startTime: '12:00',
      label: '12:00',
      orderIndex: 1,
    },
  });
  const segmentSlot18 = await prisma.segmentTimeBlock.upsert({
    where: {
      segmentId_variant_orderIndex: {
        segmentId: ubToDalanSegment.id,
        variant: 'basic',
        orderIndex: 2,
      },
    },
    update: { variant: 'basic', startTime: '18:00', label: '18:00' },
    create: {
      segmentId: ubToDalanSegment.id,
      variant: 'basic',
      startTime: '18:00',
      label: '18:00',
      orderIndex: 2,
    },
  });

  await prisma.segmentActivity.upsert({
    where: {
      segmentTimeBlockId_orderIndex: {
        segmentTimeBlockId: segmentSlot08.id,
        orderIndex: 0,
      },
    },
    update: {
      description: '가이드 미팅 후 고비로 출발',
      isOptional: false,
      conditionNote: null,
    },
    create: {
      segmentTimeBlockId: segmentSlot08.id,
      description: '가이드 미팅 후 고비로 출발',
      orderIndex: 0,
      isOptional: false,
      conditionNote: null,
    },
  });

  await prisma.segmentActivity.upsert({
    where: {
      segmentTimeBlockId_orderIndex: {
        segmentTimeBlockId: segmentSlot12.id,
        orderIndex: 0,
      },
    },
    update: {
      description: '이동 중 점심식사',
      isOptional: false,
      conditionNote: null,
    },
    create: {
      segmentTimeBlockId: segmentSlot12.id,
      description: '이동 중 점심식사',
      orderIndex: 0,
      isOptional: false,
      conditionNote: null,
    },
  });

  await prisma.segmentActivity.upsert({
    where: {
      segmentTimeBlockId_orderIndex: {
        segmentTimeBlockId: segmentSlot18.id,
        orderIndex: 0,
      },
    },
    update: {
      description: '숙소 도착 후 휴식',
      isOptional: false,
      conditionNote: null,
    },
    create: {
      segmentTimeBlockId: segmentSlot18.id,
      description: '숙소 도착 후 휴식',
      orderIndex: 0,
      isOptional: false,
      conditionNote: null,
    },
  });

  const segmentVersionSlot08 = await prisma.segmentVersionTimeBlock.upsert({
    where: {
      segmentVersionId_variant_orderIndex: {
        segmentVersionId: ubToDalanDirectVersion.id,
        variant: 'basic',
        orderIndex: 0,
      },
    },
    update: { variant: 'basic', startTime: '08:00', label: '08:00' },
    create: {
      segmentVersionId: ubToDalanDirectVersion.id,
      variant: 'basic',
      startTime: '08:00',
      label: '08:00',
      orderIndex: 0,
    },
  });
  const segmentVersionSlot12 = await prisma.segmentVersionTimeBlock.upsert({
    where: {
      segmentVersionId_variant_orderIndex: {
        segmentVersionId: ubToDalanDirectVersion.id,
        variant: 'basic',
        orderIndex: 1,
      },
    },
    update: { variant: 'basic', startTime: '12:00', label: '12:00' },
    create: {
      segmentVersionId: ubToDalanDirectVersion.id,
      variant: 'basic',
      startTime: '12:00',
      label: '12:00',
      orderIndex: 1,
    },
  });
  const segmentVersionSlot18 = await prisma.segmentVersionTimeBlock.upsert({
    where: {
      segmentVersionId_variant_orderIndex: {
        segmentVersionId: ubToDalanDirectVersion.id,
        variant: 'basic',
        orderIndex: 2,
      },
    },
    update: { variant: 'basic', startTime: '18:00', label: '18:00' },
    create: {
      segmentVersionId: ubToDalanDirectVersion.id,
      variant: 'basic',
      startTime: '18:00',
      label: '18:00',
      orderIndex: 2,
    },
  });

  await prisma.segmentVersionActivity.upsert({
    where: {
      segmentVersionTimeBlockId_orderIndex: {
        segmentVersionTimeBlockId: segmentVersionSlot08.id,
        orderIndex: 0,
      },
    },
    update: {
      description: '가이드 미팅 후 고비로 출발',
      isOptional: false,
      conditionNote: null,
    },
    create: {
      segmentVersionTimeBlockId: segmentVersionSlot08.id,
      description: '가이드 미팅 후 고비로 출발',
      orderIndex: 0,
      isOptional: false,
      conditionNote: null,
    },
  });

  await prisma.segmentVersionActivity.upsert({
    where: {
      segmentVersionTimeBlockId_orderIndex: {
        segmentVersionTimeBlockId: segmentVersionSlot12.id,
        orderIndex: 0,
      },
    },
    update: {
      description: '이동 중 점심식사',
      isOptional: false,
      conditionNote: null,
    },
    create: {
      segmentVersionTimeBlockId: segmentVersionSlot12.id,
      description: '이동 중 점심식사',
      orderIndex: 0,
      isOptional: false,
      conditionNote: null,
    },
  });

  await prisma.segmentVersionActivity.upsert({
    where: {
      segmentVersionTimeBlockId_orderIndex: {
        segmentVersionTimeBlockId: segmentVersionSlot18.id,
        orderIndex: 0,
      },
    },
    update: {
      description: '숙소 도착 후 휴식',
      isOptional: false,
      conditionNote: null,
    },
    create: {
      segmentVersionTimeBlockId: segmentVersionSlot18.id,
      description: '숙소 도착 후 휴식',
      orderIndex: 0,
      isOptional: false,
      conditionNote: null,
    },
  });

  await prisma.activity.upsert({
    where: {
      timeBlockId_orderIndex: {
        timeBlockId: slot12.id,
        orderIndex: 0,
      },
    },
    update: {
      description: '이동 중 점심식사',
      isOptional: false,
      conditionNote: null,
    },
    create: {
      timeBlockId: slot12.id,
      description: '이동 중 점심식사',
      orderIndex: 0,
      isOptional: false,
      conditionNote: null,
    },
  });

  await prisma.activity.upsert({
    where: {
      timeBlockId_orderIndex: {
        timeBlockId: slot18.id,
        orderIndex: 0,
      },
    },
    update: {
      description: '숙소 도착 후 휴식',
      isOptional: false,
      conditionNote: null,
    },
    create: {
      timeBlockId: slot18.id,
      description: '숙소 도착 후 휴식',
      orderIndex: 0,
      isOptional: false,
      conditionNote: null,
    },
  });

  const defaultUser = await prisma.user.upsert({
    where: { email: 'default-user@leaders.local' },
    update: { name: 'Default User' },
    create: {
      name: 'Default User',
      email: 'default-user@leaders.local',
    },
  });

  const plan = await prisma.plan.upsert({
    where: { id: 'seed_plan_gobi_basic' },
    update: {
      userId: defaultUser.id,
      regionId: gobi.id,
      title: '고비 기본 일정',
      documentNumberBase: '260101001',
    },
    create: {
      id: 'seed_plan_gobi_basic',
      userId: defaultUser.id,
      regionId: gobi.id,
      title: '고비 기본 일정',
      documentNumberBase: '260101001',
    },
  });

  const initialVersion = await prisma.planVersion.upsert({
    where: {
      planId_versionNumber: {
        planId: plan.id,
        versionNumber: 1,
      },
    },
    update: {
      variantType: VariantType.basic,
      totalDays: 2,
      parentVersionId: null,
      changeNote: null,
    },
    create: {
      planId: plan.id,
      versionNumber: 1,
      variantType: VariantType.basic,
      totalDays: 2,
      parentVersionId: null,
      changeNote: null,
    },
  });

  await prisma.plan.update({
    where: { id: plan.id },
    data: { currentVersionId: initialVersion.id },
  });

  await prisma.planVersionMeta.upsert({
    where: { planVersionId: initialVersion.id },
    update: {
      leaderName: '홍길동',
      documentNumber: '260101001V1',
      travelStartDate: new Date('2026-01-01T00:00:00.000Z'),
      travelEndDate: new Date('2026-01-02T00:00:00.000Z'),
      headcountTotal: 6,
      headcountMale: 6,
      headcountFemale: 0,
      vehicleType: '스타렉스',
      flightInTime: '08:00',
      flightOutTime: '17:30',
      pickupDropNote: '',
      externalPickupDropNote: '',
      includeRentalItems: true,
      rentalItemsText:
        '판초 6개, 모기장 6개, 썰매 6개, 돗자리 2개, 별레이저 1개, 랜턴 1개, 멀티탭 2개, 드라이기 1개, 보드게임 1종, 버너/냄비/팬 set',
      eventCodes: ['A'],
      extraLodgings: [],
      lodgingSelections: [],
      remark: '',
    },
    create: {
      planVersionId: initialVersion.id,
      leaderName: '홍길동',
      documentNumber: '260101001V1',
      travelStartDate: new Date('2026-01-01T00:00:00.000Z'),
      travelEndDate: new Date('2026-01-02T00:00:00.000Z'),
      headcountTotal: 6,
      headcountMale: 6,
      headcountFemale: 0,
      vehicleType: '스타렉스',
      flightInTime: '08:00',
      flightOutTime: '17:30',
      pickupDropNote: '',
      externalPickupDropNote: '',
      includeRentalItems: true,
      rentalItemsText:
        '판초 6개, 모기장 6개, 썰매 6개, 돗자리 2개, 별레이저 1개, 랜턴 1개, 멀티탭 2개, 드라이기 1개, 보드게임 1종, 버너/냄비/팬 set',
      eventCodes: ['A'],
      extraLodgings: [],
      lodgingSelections: [],
      remark: '',
    },
  });

  await prisma.planStop.deleteMany({ where: { planVersionId: initialVersion.id } });
  await prisma.planStop.createMany({
    data: [
      {
        planVersionId: initialVersion.id,
        locationId: dalanzadgad.id,
        locationVersionId: dalanVersion.id,
        dateCellText: '1일차',
        destinationCellText: `${dalanzadgad.name.join('\n')}\n(이동시간: 8.5시간)`,
        timeCellText: '08:00\n12:00\n18:00',
        scheduleCellText: '가이드 미팅 후 고비로 출발\n이동 중 점심식사\n숙소 도착 후 휴식',
        lodgingCellText: `${dalanLodging.name}\n전기 O\n샤워 O\n인터넷 O`,
        mealCellText: `아침 ${dalanMeals.breakfast === MealOption.CAMP_MEAL ? '캠프식' : 'X'}\n점심 ${dalanMeals.lunch === MealOption.LOCAL_RESTAURANT ? '현지식당' : 'X'}\n저녁 ${dalanMeals.dinner === MealOption.CAMP_MEAL ? '캠프식' : 'X'}`,
      },
      {
        planVersionId: initialVersion.id,
        locationId: dalanzadgad.id,
        locationVersionId: dalanVersion.id,
        dateCellText: '2일차',
        destinationCellText: `${dalanzadgad.name.join('\n')}\n(이동시간: 0시간)`,
        timeCellText: '08:00\n12:00\n18:00',
        scheduleCellText: '가이드 미팅 후 고비로 출발\n이동 중 점심식사\n숙소 도착 후 휴식',
        lodgingCellText: `${dalanLodging.name}\n전기 O\n샤워 O\n인터넷 O`,
        mealCellText: `아침 ${dalanMeals.breakfast === MealOption.CAMP_MEAL ? '캠프식' : 'X'}\n점심 ${dalanMeals.lunch === MealOption.LOCAL_RESTAURANT ? '현지식당' : 'X'}\n저녁 ${dalanMeals.dinner === MealOption.CAMP_MEAL ? '캠프식' : 'X'}`,
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    process.stderr.write(`Seed failed: ${String(error)}\n`);
    await prisma.$disconnect();
    process.exit(1);
  });
