import { FacilityAvailability, MealOption, PrismaClient, VariantType } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
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
      name: '울란바토르',
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
      name: '달란자드가드',
      defaultLodgingType: '사막 캠프',
      latitude: 43.5708,
      longitude: 104.425,
    },
  });

  await prisma.segment.upsert({
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
    },
  });

  const dalanLodging = await prisma.lodging.upsert({
    where: { id: 'seed_lodging_dalan_camp' },
    update: {
      locationId: dalanzadgad.id,
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
      locationId_setName: {
        locationId: dalanzadgad.id,
        setName: '기본 세트',
      },
    },
    update: {
      locationNameSnapshot: dalanzadgad.name,
      breakfast: MealOption.CAMP_MEAL,
      lunch: MealOption.LOCAL_RESTAURANT,
      dinner: MealOption.CAMP_MEAL,
    },
    create: {
      locationId: dalanzadgad.id,
      locationNameSnapshot: dalanzadgad.name,
      setName: '기본 세트',
      breakfast: MealOption.CAMP_MEAL,
      lunch: MealOption.LOCAL_RESTAURANT,
      dinner: MealOption.CAMP_MEAL,
    },
  });

  const slot08 = await prisma.timeBlock.upsert({
    where: {
      locationId_orderIndex: {
        locationId: dalanzadgad.id,
        orderIndex: 0,
      },
    },
    update: { startTime: '08:00', label: '08:00' },
    create: {
      locationId: dalanzadgad.id,
      startTime: '08:00',
      label: '08:00',
      orderIndex: 0,
    },
  });
  const slot12 = await prisma.timeBlock.upsert({
    where: {
      locationId_orderIndex: {
        locationId: dalanzadgad.id,
        orderIndex: 1,
      },
    },
    update: { startTime: '12:00', label: '12:00' },
    create: {
      locationId: dalanzadgad.id,
      startTime: '12:00',
      label: '12:00',
      orderIndex: 1,
    },
  });
  const slot18 = await prisma.timeBlock.upsert({
    where: {
      locationId_orderIndex: {
        locationId: dalanzadgad.id,
        orderIndex: 2,
      },
    },
    update: { startTime: '18:00', label: '18:00' },
    create: {
      locationId: dalanzadgad.id,
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
    },
    create: {
      id: 'seed_plan_gobi_basic',
      userId: defaultUser.id,
      regionId: gobi.id,
      title: '고비 기본 일정',
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

  await prisma.planStop.deleteMany({ where: { planVersionId: initialVersion.id } });
  await prisma.planStop.createMany({
    data: [
      {
        planVersionId: initialVersion.id,
        dateCellText: '1일차',
        destinationCellText: `${dalanzadgad.name}\n(이동시간: 8.5시간)`,
        timeCellText: '08:00\n12:00\n18:00',
        scheduleCellText: '가이드 미팅 후 고비로 출발\n이동 중 점심식사\n숙소 도착 후 휴식',
        lodgingCellText: `${dalanLodging.name}\n전기 O\n샤워 O\n인터넷 O`,
        mealCellText: `아침 ${dalanMeals.breakfast === MealOption.CAMP_MEAL ? '캠프식' : 'X'}\n점심 ${dalanMeals.lunch === MealOption.LOCAL_RESTAURANT ? '현지식당' : 'X'}\n저녁 ${dalanMeals.dinner === MealOption.CAMP_MEAL ? '캠프식' : 'X'}`,
      },
      {
        planVersionId: initialVersion.id,
        dateCellText: '2일차',
        destinationCellText: `${dalanzadgad.name}\n(이동시간: 0시간)`,
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
