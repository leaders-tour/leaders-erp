import { PrismaClient, VariantType } from '@prisma/client';

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

  await prisma.plan.create({
    data: {
      regionId: gobi.id,
      variantType: VariantType.basic,
      totalDays: 2,
      dayPlans: {
        create: [
          {
            dayIndex: 1,
            fromLocationId: ub.id,
            toLocationId: dalanzadgad.id,
            distanceText: '540km',
            lodgingText: '사막 캠프',
            mealsText: '중식/석식',
            timeBlocks: {
              create: [
                {
                  startTime: '08:00',
                  label: '출발',
                  orderIndex: 0,
                  activities: {
                    create: [
                      {
                        description: '가이드 미팅 후 고비로 출발',
                        orderIndex: 0,
                        isOptional: false,
                      },
                    ],
                  },
                },
              ],
            },
          },
          {
            dayIndex: 2,
            fromLocationId: dalanzadgad.id,
            toLocationId: dalanzadgad.id,
            distanceText: '30km',
            lodgingText: '사막 캠프',
            mealsText: '조식/중식/석식',
            timeBlocks: {
              create: [
                {
                  startTime: '09:00',
                  label: '투어',
                  orderIndex: 0,
                  activities: {
                    create: [
                      {
                        description: '고비 핵심 포인트 투어',
                        orderIndex: 0,
                        isOptional: false,
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
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
