import { gql } from '@apollo/client';

/** 견적 `buildEffectivePricing`과 동일한 필드 세트 — PlanVersion 상세·확정 여행 등에서 공유 */
export const PLAN_VERSION_PRICING_EFFECTIVE_FIELDS_FRAGMENT = gql`
  fragment PlanVersionPricingEffectiveFields on PlanVersionPricing {
    id
    planVersionId
    policyId
    currencyCode
    baseAmountKrw
    addonAmountKrw
    totalAmountKrw
    depositAmountKrw
    balanceAmountKrw
    securityDepositAmountKrw
    securityDepositUnitPriceKrw
    securityDepositQuantity
    securityDepositMode
    securityDepositEvent {
      id
      name
    }
    longDistanceSegmentCount
    extraLodgingCount
    savedManualAdjustments {
      kind
      title
      chargeScope
      personMode
      countValue
      amountKrw
      customDisplayText
    }
    savedManualDepositAmountKrw
    manualPricing {
      enabled
      adjustmentLines {
        id
        type
        rowKey
        teamOrderIndex
        label
        leadAmountKrw
        formula
        strikethrough
        deleted
      }
      summary {
        baseAmountKrw
        totalAmountKrw
        depositAmountKrw
        balanceAmountKrw
        securityDepositAmountKrw
        securityDepositMode
      }
      teamSummaries {
        teamOrderIndex
        baseAmountKrw
        totalAmountKrw
        depositAmountKrw
        balanceAmountKrw
        securityDepositAmountKrw
        securityDepositMode
      }
      lineOverrides {
        rowKey
        amountKrw
      }
      expandTeamPricingSummaryRows
      customerPricingSnapshot {
        baseAmountKrw
        totalAmountKrw
        depositAmountKrw
        balanceAmountKrw
        securityDepositTotalKrw
        securityDepositUnitKrw
        securityDepositMode
        adjustmentLines {
          teamName
          label
          leadAmountKrw
          formula
          strikethrough
        }
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
    originalPricing {
      baseAmountKrw
      addonAmountKrw
      totalAmountKrw
      depositAmountKrw
      balanceAmountKrw
      securityDepositAmountKrw
      teamPricings {
        teamOrderIndex
        teamName
        headcount
        baseAmountKrw
        addonAmountKrw
        totalAmountKrw
        depositAmountKrw
        balanceAmountKrw
        securityDepositAmountKrw
        securityDepositUnitPriceKrw
        securityDepositQuantity
        securityDepositMode
        lines {
          id
          ruleType
          lineCode
          sourceType
          description
          ruleId
          unitPriceKrw
          quantity
          amountKrw
          displayBasis
          displayLabel
          displayUnitAmountKrw
          displayCount
          displayDivisorPerson
          displayText
          teamOrderIndex
          teamName
          headcount
        }
      }
    }
    teamPricings {
      teamOrderIndex
      teamName
      headcount
      baseAmountKrw
      addonAmountKrw
      totalAmountKrw
      depositAmountKrw
      balanceAmountKrw
      securityDepositAmountKrw
      securityDepositUnitPriceKrw
      securityDepositQuantity
      securityDepositMode
      securityDepositEvent {
        id
        name
      }
      lines {
        id
        ruleType
        lineCode
        sourceType
        description
        ruleId
        unitPriceKrw
        quantity
        amountKrw
        displayBasis
        displayLabel
        displayUnitAmountKrw
        displayCount
        displayDivisorPerson
        displayText
        teamOrderIndex
        teamName
        headcount
      }
    }
    createdAt
    updatedAt
    lines {
      id
      ruleType
      lineCode
      sourceType
      description
      ruleId
      unitPriceKrw
      quantity
      amountKrw
      displayBasis
      displayLabel
      displayUnitAmountKrw
      displayCount
      displayDivisorPerson
      displayText
      teamOrderIndex
      teamName
      headcount
    }
  }
`;
