# 🗄 Prisma Schema Design v1

## Tour Itinerary ERP – MySQL (RDS)

---

# 1️⃣ 설계 원칙

1. Domain Modeling v2를 그대로 반영
2. FK 기반 명확한 관계 설정
3. Cascade 전략 명확화
4. 정렬은 `orderIndex`로 통일
5. 향후 멀티테넌트 확장 대비

---

# 2️⃣ Prisma Schema (초안)

`generator client {   provider = "prisma-client-js" }  datasource db {   provider = "mysql"   url      = env("DATABASE_URL") }`

---

# 3️⃣ Static Domain

---

## 3.1 Region

`model Region {   id          String     @id @default(cuid())   name        String   description String?    locations   Location[]   segments    Segment[]   plans       Plan[]    createdAt   DateTime   @default(now())   updatedAt   DateTime   @updatedAt }`

---

## 3.2 Location

`model Location {   id                 String   @id @default(cuid())   regionId           String   name               String   defaultLodgingType String   latitude           Float?   longitude          Float?    region             Region   @relation(fields: [regionId], references: [id], onDelete: Cascade)   fromSegments       Segment[] @relation("FromLocation")   toSegments         Segment[] @relation("ToLocation")    createdAt          DateTime @default(now())   updatedAt          DateTime @updatedAt    @@index([regionId]) }`

---

# 4️⃣ Graph Domain

---

## 4.1 Segment

`model Segment {   id                    String   @id @default(cuid())   regionId              String   fromLocationId        String   toLocationId          String   averageDistanceKm     Float   averageTravelHours    Float    region                Region   @relation(fields: [regionId], references: [id], onDelete: Cascade)   fromLocation          Location @relation("FromLocation", fields: [fromLocationId], references: [id])   toLocation            Location @relation("ToLocation", fields: [toLocationId], references: [id])    createdAt             DateTime @default(now())   updatedAt             DateTime @updatedAt    @@index([regionId])   @@unique([fromLocationId, toLocationId]) }`

---

# 5️⃣ Plan Domain

---

## 5.1 Plan

`model Plan {   id           String    @id @default(cuid())   regionId     String   variantType  VariantType   totalDays    Int    region       Region    @relation(fields: [regionId], references: [id])    dayPlans     DayPlan[]   overrides    Override[]    createdAt    DateTime  @default(now())   updatedAt    DateTime  @updatedAt    @@index([regionId]) }`

---

## 5.2 VariantType Enum

`enum VariantType {   basic   early   afternoon   extend }`

---

## 5.3 DayPlan

`model DayPlan {   id              String    @id @default(cuid())   planId          String   dayIndex        Int   fromLocationId  String   toLocationId    String    distanceText    String   lodgingText     String   mealsText       String    plan            Plan      @relation(fields: [planId], references: [id], onDelete: Cascade)   timeBlocks      TimeBlock[]    createdAt       DateTime  @default(now())   updatedAt       DateTime  @updatedAt    @@index([planId])   @@unique([planId, dayIndex]) }`

---

# 6️⃣ TimeBlock 구조

---

## 6.1 TimeBlock

`model TimeBlock {   id         String     @id @default(cuid())   dayPlanId  String   startTime  String     // HH:mm   label      String   orderIndex Int    dayPlan    DayPlan    @relation(fields: [dayPlanId], references: [id], onDelete: Cascade)   activities Activity[]    createdAt  DateTime   @default(now())   updatedAt  DateTime   @updatedAt    @@index([dayPlanId])   @@unique([dayPlanId, orderIndex]) }`

---

# 7️⃣ Activity

`model Activity {   id            String     @id @default(cuid())   timeBlockId   String   description   String   orderIndex    Int   isOptional    Boolean    @default(false)   conditionNote String?    timeBlock     TimeBlock  @relation(fields: [timeBlockId], references: [id], onDelete: Cascade)    createdAt     DateTime   @default(now())   updatedAt     DateTime   @updatedAt    @@index([timeBlockId])   @@unique([timeBlockId, orderIndex]) }`

---

# 8️⃣ Override Domain

---

## Override

`model Override {   id         String   @id @default(cuid())   planId     String   targetType OverrideTargetType   targetId   String   fieldName  String   value      String    plan       Plan     @relation(fields: [planId], references: [id], onDelete: Cascade)    createdAt  DateTime @default(now())   updatedAt  DateTime @updatedAt    @@index([planId]) }`

---

## OverrideTargetType Enum

`enum OverrideTargetType {   DayPlan   TimeBlock   Activity }`

---

# 9️⃣ 관계 구조 요약

`Region  └── Location  └── Segment  Plan  └── DayPlan        └── TimeBlock              └── Activity Plan  └── Override`

---

# 🔟 Cascade 전략

| 관계                 | onDelete |
| -------------------- | -------- |
| Region → Location    | Cascade  |
| Region → Segment     | Cascade  |
| Plan → DayPlan       | Cascade  |
| DayPlan → TimeBlock  | Cascade  |
| TimeBlock → Activity | Cascade  |

---

# 11️⃣ 이 구조의 장점

✔ Domain Modeling v2 완전 반영  
✔ ERP 확장 가능  
✔ MySQL 친화적  
✔ Prisma 타입 자동 생성  
✔ GraphQL 매핑 쉬움  
✔ AI Agent 친화적
