import { gql, useMutation, useQuery } from '@apollo/client';
import { useCallback, useState } from 'react';
import { useAuth } from '../auth/context';
import { CONFIRMED_TRIP_QUERY, type TourListRentalItem } from '../confirmed-trip/hooks';
import { runUploadMutation } from '../../lib/upload-mutation';
import { PLAN_VERSION_PRICING_EFFECTIVE_FIELDS_FRAGMENT } from './plan-version-pricing-fragment';

const UPLOAD_USER_ATTACHMENT_MUTATION_STR = `
  mutation UploadUserAttachment($userId: ID!, $file: Upload!) {
    uploadUserAttachment(userId: $userId, file: $file) {
      filename
      url
      type
    }
  }
`;
export type DealStageValue =
  | 'CONSULTING'
  | 'CONTRACTING'
  | 'CONTRACT_CONFIRMED'
  | 'MONGOL_ASSIGNING'
  | 'MONGOL_ASSIGNED'
  | 'ON_HOLD'
  | 'BEFORE_DEPARTURE_10D'
  | 'BEFORE_DEPARTURE_3D'
  | 'TRIP_COMPLETED';

export type DealTodoStatusValue = 'TODO' | 'DOING' | 'DONE';

export type ConfirmedTripStatusValue = 'ACTIVE' | 'CANCELLED';

export interface UserConfirmedTripLodgingSummaryRow {
  dayIndex: number;
  nights: number;
  checkInDate: string;
  checkOutDate: string;
}

export interface UserConfirmedTripSummaryRow {
  id: string;
  status: ConfirmedTripStatusValue;
  planVersionId?: string | null;
  travelStart: string | null;
  travelEnd: string | null;
  destination: string | null;
  pickupDate: string | null;
  dropDate: string | null;
  latestPublishedConfirmationDocument?: {
    id: string;
    versionNumber: number;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    publishedAt: string | null;
  } | null;
  guideAssignments: Array<{
    id: string;
    nameSnapshot: string | null;
    guide: { id: string; nameKo: string; nameMn: string | null };
  }>;
  driverAssignments: Array<{
    id: string;
    nameSnapshot: string | null;
    driver: { id: string; nameMn: string };
  }>;
  lodgings: UserConfirmedTripLodgingSummaryRow[];
}

export interface EmployeeOwnerRow {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'STAFF';
  isActive: boolean;
}

export interface UserDealTodoPreviewRow {
  id: string;
  stage: DealStageValue;
  title: string;
  description: string | null;
  status: DealTodoStatusValue;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserAttachmentItem {
  filename: string;
  url: string;
  type: string;
}

export interface UserRow {
  id: string;
  name: string;
  nameDisambiguator?: string | null;
  displayName?: string;
  email: string | null;
  ownerEmployeeId: string | null;
  ownerEmployee: EmployeeOwnerRow | null;
  dealStage: DealStageValue;
  dealStageOrder: number;
  attachments: UserAttachmentItem[];
  plans?: Array<{
    id?: string;
    currentVersion: {
      id?: string;
      totalDays?: number;
      regionSetName?: string | null;
      meta: {
        documentNumber?: string;
        headcountTotal?: number;
        travelStartDate?: string;
        travelEndDate?: string;
        pickupDate?: string | null;
        pickupTime?: string | null;
        pickupPlaceType?: 'AIRPORT' | 'OZ_HOUSE' | 'ULAANBAATAR' | 'CUSTOM' | null;
        pickupPlaceCustomText?: string | null;
        dropDate?: string | null;
        dropTime?: string | null;
        dropPlaceType?: 'AIRPORT' | 'OZ_HOUSE' | 'ULAANBAATAR' | 'CUSTOM' | null;
        dropPlaceCustomText?: string | null;
      } | null;
      planStops?: Array<{
        dateCellText: string;
        destinationCellText: string;
      }>;
      pricing?: Pick<
        PlanVersionPricingRow,
        'id' | 'totalAmountKrw' | 'depositAmountKrw' | 'balanceAmountKrw' | 'securityDepositAmountKrw' | 'securityDepositUnitPriceKrw' | 'securityDepositMode'
      > & {
        manualPricing?: {
          customerPricingSnapshot?: {
            totalAmountKrw: number;
            depositAmountKrw: number;
            balanceAmountKrw: number;
            securityDepositTotalKrw: number;
            securityDepositUnitKrw: number;
            securityDepositMode: 'NONE' | 'PER_PERSON' | 'PER_TEAM';
            teamPricings?: Array<{
              teamOrderIndex: number;
              teamName: string;
              totalAmountKrw: number;
              depositAmountKrw: number;
              balanceAmountKrw: number;
              securityDepositAmountKrw: number;
              securityDepositUnitKrw: number;
              securityDepositScope: string;
            }>;
          } | null;
        } | null;
        teamPricings?: Array<{
          teamOrderIndex: number;
          teamName: string;
          headcount: number;
          totalAmountKrw: number;
          depositAmountKrw: number;
          balanceAmountKrw: number;
          securityDepositAmountKrw: number;
          securityDepositUnitPriceKrw: number;
          securityDepositMode: 'NONE' | 'PER_PERSON' | 'PER_TEAM';
        }>;
      } | null;
    } | null;
  }>;
  userDealTodos?: UserDealTodoPreviewRow[];
  confirmedTrips?: UserConfirmedTripSummaryRow[];
  createdAt: string;
  updatedAt: string;
}

export interface UserWithTravelRow extends UserRow {
  plans: Array<{
    currentVersion: {
      meta: {
        travelStartDate: string;
        travelEndDate: string;
      } | null;
    } | null;
  }>;
}

export interface DealPipelineCardUpdateInput {
  userId: string;
  dealStage: DealStageValue;
  dealStageOrder: number;
}

export interface UserNoteRow {
  id: string;
  userId: string;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserDealTodoRow {
  id: string;
  userId: string;
  stage: DealStageValue;
  templateId: string | null;
  title: string;
  description: string | null;
  status: DealTodoStatusValue;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlanVersionRow {
  id: string;
  planId: string;
  regionSetId: string;
  parentVersionId: string | null;
  versionNumber: number;
  variantType: string;
  totalDays: number;
  changeNote: string | null;
  movementIntensity?: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4' | 'LEVEL_5' | null;
  createdAt: string;
  updatedAt: string;
  childVersions?: Array<{ id: string }>;
  regionSet?: {
    id: string;
    name: string;
  } | null;
  meta?: PlanVersionMetaRow | null;
}

export interface PlanVersionMetaRow {
  id: string;
  planVersionId: string;
  leaderName: string;
  documentNumber: string;
  travelStartDate: string;
  travelEndDate: string;
  headcountTotal: number;
  headcountMale: number;
  headcountFemale: number;
  vehicleType: string;
  vehicleAssignments?: Array<{ vehicleType: string; count: number }> | null;
  flightInTime: string | null;
  flightOutTime: string | null;
  pickupDate: string | null;
  pickupTime: string | null;
  dropDate: string | null;
  dropTime: string | null;
  pickupDropNote: string | null;
  pickupPlaceType: 'AIRPORT' | 'OZ_HOUSE' | 'ULAANBAATAR' | 'CUSTOM' | null;
  pickupPlaceCustomText: string | null;
  dropPlaceType: 'AIRPORT' | 'OZ_HOUSE' | 'ULAANBAATAR' | 'CUSTOM' | null;
  dropPlaceCustomText: string | null;
  externalPickupDate: string | null;
  externalPickupTime: string | null;
  externalPickupPlaceType: 'AIRPORT' | 'OZ_HOUSE' | 'ULAANBAATAR' | 'CUSTOM' | null;
  externalPickupPlaceCustomText: string | null;
  externalDropDate: string | null;
  externalDropTime: string | null;
  externalDropPlaceType: 'AIRPORT' | 'OZ_HOUSE' | 'ULAANBAATAR' | 'CUSTOM' | null;
  externalDropPlaceCustomText: string | null;
  externalPickupDropNote: string | null;
  externalTransfers: Array<{
    direction: 'PICKUP' | 'DROP';
    presetCode:
      | 'DROP_ULAANBAATAR_AIRPORT'
      | 'DROP_TERELJ_AIRPORT'
      | 'DROP_OZHOUSE_AIRPORT'
      | 'PICKUP_AIRPORT_OZHOUSE'
      | 'PICKUP_AIRPORT_ULAANBAATAR'
      | 'PICKUP_AIRPORT_TERELJ'
      | 'CUSTOM';
    travelDate: string;
    departureTime: string;
    arrivalTime: string;
    departurePlace: string;
    arrivalPlace: string;
    selectedTeamOrderIndexes: number[];
  }>;
  specialNote: string | null;
  includeRentalItems: boolean;
  rentalItemsText: string;
  events: Array<{
    id: string;
    name: string;
    securityDepositKrw: number;
    isActive: boolean;
    tourListRentalItem: TourListRentalItem | null;
  }>;
  extraLodgings: Array<{
    dayIndex: number;
    lodgingCount: number;
  }>;
  lodgingSelections: Array<{
    dayIndex: number;
    level: 'LV1' | 'LV2' | 'LV3' | 'LV4' | 'CUSTOM';
    customLodgingId?: string | null;
    customLodgingNameSnapshot?: string | null;
    pricingModeSnapshot?: string | null;
    priceSnapshotKrw?: number | null;
  }>;
  transportGroups: Array<{
    id: string;
    planVersionMetaId: string;
    orderIndex: number;
    teamName: string;
    headcount: number;
    flightInDate: string | null;
    flightInTime: string | null;
    flightOutDate: string | null;
    flightOutTime: string | null;
    pickupDate: string | null;
    pickupTime: string | null;
    pickupPlaceType: 'AIRPORT' | 'OZ_HOUSE' | 'ULAANBAATAR' | 'CUSTOM' | null;
    pickupPlaceCustomText: string | null;
    dropDate: string | null;
    dropTime: string | null;
    dropPlaceType: 'AIRPORT' | 'OZ_HOUSE' | 'ULAANBAATAR' | 'CUSTOM' | null;
    dropPlaceCustomText: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  remark: string | null;
  estimateGuideImagesPerPage: number;
  estimateGuidePageSplits: number[] | null;
  movementIntensityColorOverride: string | null;
  validUntilDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlanPricingLineRow {
  id?: string | null;
  ruleType?: string | null;
  lineCode: string;
  sourceType: string;
  description: string | null;
  ruleId: string | null;
  unitPriceKrw: number | null;
  quantity: number;
  amountKrw: number;
  displayBasis?: string | null;
  displayLabel?: string | null;
  displayUnitAmountKrw?: number | null;
  displayCount?: number | null;
  displayDivisorPerson?: number | null;
  displayText?: string | null;
  /** Display-only: merged lodging lines show quantity as "N박". */
  quantityDisplaySuffix?: '박';
  teamOrderIndex?: number | null;
  teamName?: string | null;
  headcount?: number | null;
}

export interface PlanVersionPricingRow {
  id: string;
  planVersionId: string;
  policyId: string;
  currencyCode: string;
  baseAmountKrw: number;
  addonAmountKrw: number;
  totalAmountKrw: number;
  depositAmountKrw: number;
  balanceAmountKrw: number;
  securityDepositAmountKrw: number;
  securityDepositUnitPriceKrw: number;
  securityDepositQuantity: number;
  securityDepositMode: 'NONE' | 'PER_PERSON' | 'PER_TEAM';
  securityDepositEvent: {
    id: string;
    name: string;
  } | null;
  longDistanceSegmentCount: number;
  extraLodgingCount: number;
  savedManualAdjustments: Array<{
    kind: 'ADD' | 'DISCOUNT';
    title: string;
    chargeScope: 'TEAM' | 'PER_PERSON';
    personMode?: 'SINGLE' | 'PER_DAY' | 'PER_NIGHT' | null;
    countValue?: number | null;
    amountKrw: number;
    customDisplayText?: string | null;
  }>;
  savedManualDepositAmountKrw: number | null;
  manualPricing?: {
    enabled: boolean;
    adjustmentLines: Array<{
      id: string;
      type: 'AUTO' | 'MANUAL';
      rowKey?: string | null;
      teamOrderIndex?: number | null;
      label: string;
      leadAmountKrw: number;
      formula: string;
      strikethrough: boolean;
      deleted: boolean;
    }>;
    summary?: {
      baseAmountKrw?: number | null;
      totalAmountKrw?: number | null;
      depositAmountKrw?: number | null;
      balanceAmountKrw?: number | null;
      securityDepositAmountKrw?: number | null;
      securityDepositMode?: 'NONE' | 'PER_PERSON' | 'PER_TEAM' | null;
    } | null;
    teamSummaries: Array<{
      teamOrderIndex: number;
      baseAmountKrw?: number | null;
      totalAmountKrw?: number | null;
      depositAmountKrw?: number | null;
      balanceAmountKrw?: number | null;
      securityDepositAmountKrw?: number | null;
      securityDepositMode?: 'NONE' | 'PER_PERSON' | 'PER_TEAM' | null;
    }>;
    lineOverrides: Array<{
      rowKey: string;
      amountKrw: number;
    }>;
    expandTeamPricingSummaryRows?: boolean | null;
    customerPricingSnapshot?: {
      baseAmountKrw: number;
      totalAmountKrw: number;
      depositAmountKrw: number;
      balanceAmountKrw: number;
      securityDepositTotalKrw: number;
      securityDepositUnitKrw: number;
      securityDepositMode: 'NONE' | 'PER_PERSON' | 'PER_TEAM';
      adjustmentLines: Array<{
        teamName?: string | null;
        label: string;
        leadAmountKrw: number;
        formula: string;
        strikethrough: boolean;
      }>;
      teamPricings: Array<{
        teamOrderIndex: number;
        teamName: string;
        baseAmountKrw?: number;
        totalAmountKrw: number;
        depositAmountKrw: number;
        balanceAmountKrw: number;
        securityDepositAmountKrw: number;
        securityDepositUnitKrw: number;
        securityDepositScope: string;
      }>;
    } | null;
  } | null;
  originalPricing?: {
    baseAmountKrw: number;
    addonAmountKrw: number;
    totalAmountKrw: number;
    depositAmountKrw: number;
    balanceAmountKrw: number;
    securityDepositAmountKrw: number;
    teamPricings: Array<{
      teamOrderIndex: number;
      teamName: string;
      headcount: number;
      baseAmountKrw: number;
      addonAmountKrw: number;
      totalAmountKrw: number;
      depositAmountKrw: number;
      balanceAmountKrw: number;
      securityDepositAmountKrw: number;
      securityDepositUnitPriceKrw: number;
      securityDepositQuantity: number;
      securityDepositMode: 'NONE' | 'PER_PERSON' | 'PER_TEAM';
      lines: PlanPricingLineRow[];
    }>;
  } | null;
  teamPricings: Array<{
    teamOrderIndex: number;
    teamName: string;
    headcount: number;
    baseAmountKrw: number;
    addonAmountKrw: number;
    totalAmountKrw: number;
    depositAmountKrw: number;
    balanceAmountKrw: number;
    securityDepositAmountKrw: number;
    securityDepositUnitPriceKrw: number;
    securityDepositQuantity: number;
    securityDepositMode: 'NONE' | 'PER_PERSON' | 'PER_TEAM';
    securityDepositEvent: {
      id: string;
      name: string;
    } | null;
    lines: PlanPricingLineRow[];
  }>;
  lines: PlanPricingLineRow[];
  createdAt: string;
  updatedAt: string;
}

export interface PlanRow {
  id: string;
  userId: string;
  regionSetId: string;
  title: string;
  documentNumberBase: string;
  currentVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  currentVersion: PlanVersionRow | null;
}

export interface PlanDetail extends PlanRow {
  user: UserRow;
  regionSet: {
    id: string;
    name: string;
  };
  versions: PlanVersionRow[];
}

export interface PlanVersionDetail extends PlanVersionRow {
  plan: PlanRow & {
    user: UserRow;
    regionSet: {
      id: string;
      name: string;
    };
  };
  planStops: Array<{
    id: string;
    planVersionId: string;
    rowType?: 'MAIN' | 'EXTERNAL_TRANSFER' | null;
    segmentId?: string | null;
    segmentVersionId?: string | null;
    multiDayBlockId?: string | null;
    multiDayBlockDayOrder?: number | null;
    multiDayBlockConnectionId?: string | null;
    multiDayBlockConnectionVersionId?: string | null;
    locationId?: string | null;
    locationVersionId?: string | null;
    dateCellText: string;
    destinationCellText: string;
    movementIntensity?: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4' | 'LEVEL_5' | null;
    movementIntensityColorOverride?: string | null;
    destinationMovementIntensityColorOverride?: string | null;
    timeCellText: string;
    scheduleCellText: string;
    lodgingCellText: string;
    mealCellText: string;
  }>;
  pricing?: PlanVersionPricingRow | null;
}

const USERS_QUERY = gql`
  query Users {
    users {
      id
      name
      nameDisambiguator
      displayName
      email
      ownerEmployeeId
      ownerEmployee {
        id
        name
        email
        role
        isActive
      }
      dealStage
      dealStageOrder
      userDealTodos {
        id
        stage
        title
        description
        status
        completedAt
        createdAt
        updatedAt
      }
      confirmedTrips {
        id
        status
        planVersionId
        travelStart
        travelEnd
        destination
        pickupDate
        dropDate
        latestPublishedConfirmationDocument {
          id
          versionNumber
          status
          publishedAt
        }
        guideAssignments {
          id
          nameSnapshot
          guide {
            id
            nameKo
            nameMn
          }
        }
        driverAssignments {
          id
          nameSnapshot
          driver {
            id
            nameMn
          }
        }
        lodgings {
          dayIndex
          nights
          checkInDate
          checkOutDate
        }
      }
      plans {
        id
        currentVersion {
          id
          totalDays
          regionSetName
          meta {
            documentNumber
            headcountTotal
            travelStartDate
            travelEndDate
            pickupDate
            pickupTime
            pickupPlaceType
            pickupPlaceCustomText
            dropDate
            dropTime
            dropPlaceType
            dropPlaceCustomText
          }
          planStops {
            dateCellText
            destinationCellText
          }
          pricing {
            id
            totalAmountKrw
            depositAmountKrw
            balanceAmountKrw
            securityDepositAmountKrw
            securityDepositUnitPriceKrw
            securityDepositMode
            manualPricing {
              customerPricingSnapshot {
                totalAmountKrw
                depositAmountKrw
                balanceAmountKrw
                securityDepositTotalKrw
                securityDepositUnitKrw
                securityDepositMode
                teamPricings {
                  teamOrderIndex
                  teamName
                  baseAmountKrw
                  totalAmountKrw
                  depositAmountKrw
                  balanceAmountKrw
                  securityDepositAmountKrw
                  securityDepositUnitKrw
                  securityDepositScope
                }
              }
            }
            teamPricings {
              teamOrderIndex
              teamName
              headcount
              totalAmountKrw
              depositAmountKrw
              balanceAmountKrw
              securityDepositAmountKrw
              securityDepositUnitPriceKrw
              securityDepositMode
            }
          }
        }
      }
      createdAt
      updatedAt
    }
  }
`;

const USER_QUERY = gql`
  query User($id: ID!) {
    user(id: $id) {
      id
      name
      nameDisambiguator
      displayName
      email
      ownerEmployeeId
      ownerEmployee {
        id
        name
        email
        role
        isActive
      }
      dealStage
      dealStageOrder
      attachments {
        filename
        url
        type
      }
      userDealTodos {
        id
        stage
        title
        description
        status
        completedAt
        createdAt
        updatedAt
      }
      confirmedTrips {
        id
        status
      }
      plans {
        id
      }
      createdAt
      updatedAt
    }
  }
`;

const DELETE_USER_MUTATION = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id)
  }
`;

const PLANS_BY_USER_QUERY = gql`
  query PlansByUser($userId: ID!) {
    plans(userId: $userId) {
      id
      userId
      regionSetId
      title
      documentNumberBase
      currentVersionId
      createdAt
      updatedAt
      currentVersion {
        id
        planId
        regionSetId
        parentVersionId
        versionNumber
        variantType
        totalDays
        changeNote
        movementIntensity
        createdAt
        updatedAt
        meta {
          id
          planVersionId
          leaderName
        }
      }
    }
  }
`;

const PLAN_DETAIL_QUERY = gql`
  query PlanDetail($id: ID!) {
    plan(id: $id) {
      id
      userId
      regionSetId
      title
      documentNumberBase
      currentVersionId
      createdAt
      updatedAt
      user {
        id
        name
        nameDisambiguator
        displayName
        email
        ownerEmployeeId
        ownerEmployee {
          id
          name
          email
          role
          isActive
        }
        dealStage
        dealStageOrder
        createdAt
        updatedAt
      }
      regionSet {
        id
        name
      }
      currentVersion {
        id
        planId
        parentVersionId
        versionNumber
        variantType
        totalDays
        changeNote
        movementIntensity
        createdAt
        updatedAt
        meta {
          id
          planVersionId
          leaderName
        }
      }
      versions {
        id
        planId
        regionSetId
        parentVersionId
        versionNumber
        variantType
        totalDays
        changeNote
        movementIntensity
        createdAt
        updatedAt
        meta {
          id
          planVersionId
          leaderName
        }
      }
    }
  }
`;

const UPDATE_PLAN_MUTATION = gql`
  mutation UpdatePlanDetail($id: ID!, $input: PlanUpdateInput!) {
    updatePlan(id: $id, input: $input) {
      id
      documentNumberBase
      title
      currentVersionId
    }
  }
`;

const PLAN_VERSIONS_QUERY = gql`
  query PlanVersions($planId: ID!) {
    planVersions(planId: $planId) {
      id
      planId
      regionSetId
      parentVersionId
      versionNumber
      variantType
      totalDays
      changeNote
      movementIntensity
      createdAt
      updatedAt
      childVersions {
        id
      }
      meta {
        id
        planVersionId
        leaderName
      }
    }
  }
`;

const PLAN_VERSION_DETAIL_QUERY = gql`
  ${PLAN_VERSION_PRICING_EFFECTIVE_FIELDS_FRAGMENT}
  query PlanVersionDetail($id: ID!) {
    planVersion(id: $id) {
      id
      planId
      regionSetId
      parentVersionId
      versionNumber
      variantType
      totalDays
      changeNote
      movementIntensity
      createdAt
      updatedAt
      plan {
        id
        userId
        regionSetId
        title
        documentNumberBase
        currentVersionId
        createdAt
        updatedAt
        user {
          id
          name
          nameDisambiguator
          displayName
          email
          ownerEmployeeId
          ownerEmployee {
            id
            name
            email
            role
            isActive
          }
          dealStage
          dealStageOrder
          createdAt
          updatedAt
        }
        regionSet {
          id
          name
        }
      }
      regionSet {
        id
        name
      }
      planStops {
        id
        planVersionId
        rowType
        segmentId
        segmentVersionId
        multiDayBlockId
        multiDayBlockDayOrder
        multiDayBlockConnectionId
        multiDayBlockConnectionVersionId
        locationId
        locationVersionId
        dateCellText
        destinationCellText
        movementIntensity
        movementIntensityColorOverride
        destinationMovementIntensityColorOverride
        timeCellText
        scheduleCellText
        lodgingCellText
        mealCellText
      }
      meta {
        id
        planVersionId
        leaderName
        documentNumber
        travelStartDate
        travelEndDate
        headcountTotal
        headcountMale
        headcountFemale
        vehicleType
        vehicleAssignments {
          vehicleType
          count
        }
        flightInTime
        flightOutTime
        pickupDate
        pickupTime
        dropDate
        dropTime
        pickupDropNote
        pickupPlaceType
        pickupPlaceCustomText
        dropPlaceType
        dropPlaceCustomText
        externalPickupDate
        externalPickupTime
        externalPickupPlaceType
        externalPickupPlaceCustomText
        externalDropDate
        externalDropTime
        externalDropPlaceType
        externalDropPlaceCustomText
        externalPickupDropNote
        externalTransfers {
          direction
          presetCode
          travelDate
          departureTime
          arrivalTime
          departurePlace
          arrivalPlace
          selectedTeamOrderIndexes
        }
        specialNote
        includeRentalItems
        rentalItemsText
        events {
          id
          name
          securityDepositKrw
          isActive
          tourListRentalItem
        }
        extraLodgings {
          dayIndex
          lodgingCount
        }
        lodgingSelections {
          dayIndex
          level
          customLodgingId
          customLodgingNameSnapshot
          pricingModeSnapshot
          priceSnapshotKrw
        }
        transportGroups {
          id
          planVersionMetaId
          orderIndex
          teamName
          headcount
          flightInDate
          flightInTime
          flightOutDate
          flightOutTime
          pickupDate
          pickupTime
          pickupPlaceType
          pickupPlaceCustomText
          dropDate
          dropTime
          dropPlaceType
          dropPlaceCustomText
          createdAt
          updatedAt
        }
        remark
        estimateGuideImagesPerPage
        estimateGuidePageSplits
        movementIntensityColorOverride
        validUntilDate
        createdAt
        updatedAt
      }
      pricing {
        ...PlanVersionPricingEffectiveFields
      }
    }
  }
`;

const UPDATE_PLAN_VERSION_VALID_UNTIL_DATE_MUTATION = gql`
  mutation UpdatePlanVersionValidUntilDate($planVersionId: ID!, $validUntilDate: DateTime!) {
    updatePlanVersionValidUntilDate(planVersionId: $planVersionId, validUntilDate: $validUntilDate) {
      id
    }
  }
`;

const UPDATE_PLAN_VERSION_CHANGE_NOTE_MUTATION = gql`
  mutation UpdatePlanVersionChangeNote($planVersionId: ID!, $changeNote: String) {
    updatePlanVersionChangeNote(planVersionId: $planVersionId, changeNote: $changeNote) {
      id
      changeNote
    }
  }
`;

const CREATE_USER_MUTATION = gql`
  mutation CreateUser($input: UserCreateInput!) {
    createUser(input: $input) {
      id
      name
      nameDisambiguator
      displayName
      email
      ownerEmployeeId
      ownerEmployee {
        id
        name
        email
        role
        isActive
      }
    }
  }
`;

const UPDATE_USER_MUTATION = gql`
  mutation UpdateUser($id: ID!, $input: UserUpdateInput!) {
    updateUser(id: $id, input: $input) {
      id
      name
      nameDisambiguator
      displayName
      email
      ownerEmployeeId
      ownerEmployee {
        id
        name
        email
        role
        isActive
      }
      dealStage
      dealStageOrder
      attachments {
        filename
        url
        type
      }
      createdAt
      updatedAt
    }
  }
`;

const SET_CURRENT_VERSION_MUTATION = gql`
  mutation SetCurrentPlanVersion($planId: ID!, $versionId: ID!) {
    setCurrentPlanVersion(planId: $planId, versionId: $versionId) {
      id
      currentVersionId
    }
  }
`;

const DELETE_PLAN_VERSION_MUTATION = gql`
  mutation DeletePlanVersion($id: ID!) {
    deletePlanVersion(id: $id)
  }
`;

const REORDER_DEAL_PIPELINE_MUTATION = gql`
  mutation ReorderDealPipeline($input: DealPipelineReorderInput!) {
    reorderDealPipeline(input: $input)
  }
`;

const USER_NOTES_QUERY = gql`
  query UserNotes($userId: ID!) {
    userNotes(userId: $userId) {
      id
      userId
      content
      createdBy
      createdAt
      updatedAt
    }
  }
`;

const CREATE_USER_NOTE_MUTATION = gql`
  mutation CreateUserNote($input: UserNoteCreateInput!) {
    createUserNote(input: $input) {
      id
      userId
      content
      createdBy
      createdAt
      updatedAt
    }
  }
`;

const USER_DEAL_TODOS_QUERY = gql`
  query UserDealTodos($userId: ID!, $includeDone: Boolean) {
    userDealTodos(userId: $userId, includeDone: $includeDone) {
      id
      userId
      stage
      templateId
      title
      description
      status
      completedAt
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_USER_DEAL_TODO_STATUS_MUTATION = gql`
  mutation UpdateUserDealTodoStatus($id: ID!, $status: DealTodoStatus!) {
    updateUserDealTodoStatus(id: $id, status: $status) {
      id
      userId
      stage
      templateId
      title
      description
      status
      completedAt
      createdAt
      updatedAt
    }
  }
`;

export function useUsers() {
  const { data, loading, error, refetch } = useQuery<{ users: UserRow[] }>(USERS_QUERY);
  return { users: data?.users ?? [], loading, error, refetch };
}

export function useUser(id: string | undefined) {
  const { data, loading, refetch } = useQuery<{ user: UserRow | null }>(USER_QUERY, {
    variables: { id },
    skip: !id,
  });

  return { user: data?.user ?? null, loading, refetch };
}

export function usePlansByUser(userId: string | undefined) {
  const { data, loading, refetch } = useQuery<{ plans: PlanRow[] }>(PLANS_BY_USER_QUERY, {
    variables: { userId },
    skip: !userId,
  });

  return { plans: data?.plans ?? [], loading, refetch };
}

export function usePlanDetail(id: string | undefined) {
  const { data, loading, refetch } = useQuery<{ plan: PlanDetail | null }>(PLAN_DETAIL_QUERY, {
    variables: { id },
    skip: !id,
  });

  return { plan: data?.plan ?? null, loading, refetch };
}

export function useUpdatePlan() {
  const [mutate, { loading }] = useMutation<{
    updatePlan: Pick<PlanRow, 'id' | 'documentNumberBase' | 'title' | 'currentVersionId'>;
  }>(UPDATE_PLAN_MUTATION);

  return {
    loading,
    updatePlan: async (
      id: string,
      input: {
        title?: string;
        currentVersionId?: string;
        documentNumberBase?: string;
      },
    ): Promise<Pick<PlanRow, 'id' | 'documentNumberBase' | 'title' | 'currentVersionId'>> => {
      const result = await mutate({
        variables: { id, input },
        awaitRefetchQueries: true,
        refetchQueries: [
          { query: PLAN_DETAIL_QUERY, variables: { id } },
          { query: PLAN_VERSIONS_QUERY, variables: { planId: id } },
        ],
      });
      if (!result.data?.updatePlan) {
        throw new Error('Plan 업데이트에 실패했습니다.');
      }
      return result.data.updatePlan;
    },
  };
}

export function usePlanVersions(planId: string | undefined) {
  const { data, loading, refetch } = useQuery<{ planVersions: PlanVersionRow[] }>(PLAN_VERSIONS_QUERY, {
    variables: { planId },
    skip: !planId,
  });

  return { versions: data?.planVersions ?? [], loading, refetch };
}

export function usePlanVersionDetail(id: string | undefined) {
  const { data, loading, refetch } = useQuery<{ planVersion: PlanVersionDetail | null }>(PLAN_VERSION_DETAIL_QUERY, {
    variables: { id },
    skip: !id,
  });

  return { version: data?.planVersion ?? null, loading, refetch };
}

export function useUpdatePlanVersionChangeNote() {
  const [mutate, { loading }] = useMutation<{
    updatePlanVersionChangeNote: { id: string; changeNote: string | null };
  }>(UPDATE_PLAN_VERSION_CHANGE_NOTE_MUTATION);

  const updatePlanVersionChangeNote = useCallback(
    async (planVersionId: string, changeNote: string | null) => {
      const result = await mutate({
        variables: { planVersionId, changeNote },
        refetchQueries: [{ query: PLAN_VERSION_DETAIL_QUERY, variables: { id: planVersionId } }],
      });
      if (!result.data?.updatePlanVersionChangeNote) {
        throw new Error('변경 메모 저장에 실패했습니다.');
      }
      return result.data.updatePlanVersionChangeNote;
    },
    [mutate],
  );

  return { loading, updatePlanVersionChangeNote };
}

export function useUpdatePlanVersionValidUntilDate() {
  const [mutate, { loading }] = useMutation<{
    updatePlanVersionValidUntilDate: { id: string };
  }>(UPDATE_PLAN_VERSION_VALID_UNTIL_DATE_MUTATION);

  const updatePlanVersionValidUntilDate = useCallback(
    async (planVersionId: string, validUntilDate: string) => {
      const result = await mutate({
        variables: { planVersionId, validUntilDate: `${validUntilDate}T00:00:00.000Z` },
        refetchQueries: [{ query: PLAN_VERSION_DETAIL_QUERY, variables: { id: planVersionId } }],
      });
      if (!result.data?.updatePlanVersionValidUntilDate) {
        throw new Error('견적 유효기간 저장에 실패했습니다.');
      }
      return result.data.updatePlanVersionValidUntilDate;
    },
    [mutate],
  );

  return { loading, updatePlanVersionValidUntilDate };
}

export function useCreateUser() {
  const [mutate, { loading }] = useMutation<{ createUser: UserRow }>(CREATE_USER_MUTATION);

  return {
    loading,
    createUser: async (input: { name: string; email?: string | null; ownerEmployeeId?: string | null }): Promise<UserRow> => {
      const result = await mutate({ variables: { input }, refetchQueries: [{ query: USERS_QUERY }] });
      if (!result.data?.createUser) {
        throw new Error('Failed to create user');
      }
      return result.data.createUser;
    },
  };
}

export function useUpdateUser() {
  const [mutate, { loading }] = useMutation<{ updateUser: UserRow }>(UPDATE_USER_MUTATION);

  return {
    loading,
    updateUser: async (
      id: string,
      input: {
        name?: string;
        email?: string | null;
        ownerEmployeeId?: string | null;
        dealStage?: DealStageValue;
        dealStageOrder?: number;
        attachments?: UserAttachmentItem[];
      },
      options?: { refetchConfirmedTripId?: string },
    ): Promise<UserRow> => {
      const extraRefetch =
        options?.refetchConfirmedTripId != null
          ? [{ query: CONFIRMED_TRIP_QUERY, variables: { id: options.refetchConfirmedTripId } }]
          : [];
      const result = await mutate({
        variables: { id, input },
        refetchQueries: [
          { query: USERS_QUERY },
          { query: USER_QUERY, variables: { id } },
          { query: PLANS_BY_USER_QUERY, variables: { userId: id } },
          ...extraRefetch,
        ],
      });

      if (!result.data?.updateUser) {
        throw new Error('Failed to update user');
      }

      return result.data.updateUser;
    },
  };
}

export function useDeleteUser() {
  const [mutate, { loading }] = useMutation<{ deleteUser: boolean }>(DELETE_USER_MUTATION);

  return {
    loading,
    deleteUser: async (id: string): Promise<void> => {
      const result = await mutate({
        variables: { id },
        refetchQueries: [{ query: USERS_QUERY }],
        awaitRefetchQueries: true,
      });

      if (!result.data?.deleteUser) {
        throw new Error('고객 삭제에 실패했습니다.');
      }
    },
  };
}

export function useUploadUserAttachment() {
  const { ensureAccessToken } = useAuth();
  const [loading, setLoading] = useState(false);

  return {
    loading,
    uploadUserAttachment: async (userId: string, file: File): Promise<UserAttachmentItem> => {
      setLoading(true);
      try {
        const accessToken = await ensureAccessToken();
        const data = await runUploadMutation<{ uploadUserAttachment: UserAttachmentItem }>(
          UPLOAD_USER_ATTACHMENT_MUTATION_STR,
          { userId, file: null },
          [file],
          ['variables.file'],
          accessToken,
        );
        return data.uploadUserAttachment;
      } finally {
        setLoading(false);
      }
    },
  };
}

export function useSetCurrentPlanVersion() {
  const [mutate, { loading }] = useMutation(SET_CURRENT_VERSION_MUTATION);

  return {
    loading,
    setCurrentPlanVersion: async (planId: string, versionId: string): Promise<void> => {
      await mutate({
        variables: { planId, versionId },
        refetchQueries: [
          { query: PLAN_DETAIL_QUERY, variables: { id: planId } },
          { query: PLAN_VERSIONS_QUERY, variables: { planId } },
          { query: PLAN_VERSION_DETAIL_QUERY, variables: { id: versionId } },
        ],
      });
    },
  };
}

export function useDeletePlanVersion() {
  const [mutate, { loading }] = useMutation<{ deletePlanVersion: boolean }>(DELETE_PLAN_VERSION_MUTATION);

  return {
    loading,
    deletePlanVersion: async (versionId: string, planId: string): Promise<void> => {
      const result = await mutate({
        variables: { id: versionId },
        refetchQueries: [
          { query: PLAN_DETAIL_QUERY, variables: { id: planId } },
          { query: PLAN_VERSIONS_QUERY, variables: { planId } },
        ],
      });
      if (!result.data?.deletePlanVersion) {
        throw new Error('버전 삭제에 실패했습니다.');
      }
    },
  };
}

export function useReorderDealPipeline() {
  const [mutate, { loading }] = useMutation<{ reorderDealPipeline: boolean }>(REORDER_DEAL_PIPELINE_MUTATION);

  return {
    loading,
    reorderDealPipeline: async (updates: DealPipelineCardUpdateInput[]): Promise<void> => {
      const result = await mutate({
        variables: { input: { updates } },
      });

      if (!result.data?.reorderDealPipeline) {
        throw new Error('Failed to reorder deal pipeline');
      }
    },
  };
}

export function useUserNotes(userId: string | undefined) {
  const { data, loading, refetch } = useQuery<{ userNotes: UserNoteRow[] }>(USER_NOTES_QUERY, {
    variables: { userId },
    skip: !userId,
  });

  return { notes: data?.userNotes ?? [], loading, refetch };
}

export function useCreateUserNote() {
  const [mutate, { loading }] = useMutation<{ createUserNote: UserNoteRow }>(CREATE_USER_NOTE_MUTATION);

  return {
    loading,
    createUserNote: async (input: { userId: string; content: string; createdBy: string }): Promise<UserNoteRow> => {
      const result = await mutate({
        variables: { input },
        refetchQueries: [{ query: USER_NOTES_QUERY, variables: { userId: input.userId } }],
      });

      if (!result.data?.createUserNote) {
        throw new Error('Failed to create user note');
      }

      return result.data.createUserNote;
    },
  };
}

export function useUserDealTodos(userId: string | undefined, includeDone = false) {
  const { data, loading, refetch } = useQuery<{ userDealTodos: UserDealTodoRow[] }>(USER_DEAL_TODOS_QUERY, {
    variables: { userId, includeDone },
    skip: !userId,
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
  });

  return { todos: data?.userDealTodos ?? [], loading, refetch };
}

export function useUpdateUserDealTodoStatus() {
  const [mutate, { loading }] = useMutation<{ updateUserDealTodoStatus: UserDealTodoRow }>(UPDATE_USER_DEAL_TODO_STATUS_MUTATION);

  return {
    loading,
    updateUserDealTodoStatus: async (input: { id: string; status: DealTodoStatusValue }): Promise<UserDealTodoRow> => {
      const result = await mutate({
        variables: input,
      });

      if (!result.data?.updateUserDealTodoStatus) {
        throw new Error('Failed to update user deal todo status');
      }

      return result.data.updateUserDealTodoStatus;
    },
  };
}

const USERS_WITH_TRAVEL_QUERY = gql`
  query UsersWithTravel {
    users {
      id
      name
      nameDisambiguator
      displayName
      email
      ownerEmployeeId
      ownerEmployee {
        id
        name
        email
        role
        isActive
      }
      dealStage
      dealStageOrder
      plans {
        currentVersion {
          meta {
            travelStartDate
            travelEndDate
          }
        }
      }
      userDealTodos {
        id
        stage
        title
        description
        status
        completedAt
        createdAt
        updatedAt
      }
      createdAt
      updatedAt
    }
  }
`;

export function useUsersWithTravel() {
  const { data, loading, error, refetch } = useQuery<{ users: UserWithTravelRow[] }>(USERS_WITH_TRAVEL_QUERY);
  return { users: data?.users ?? [], loading, error, refetch };
}
