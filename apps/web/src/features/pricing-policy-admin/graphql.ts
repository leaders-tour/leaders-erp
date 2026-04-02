import { gql } from '@apollo/client';

export const PRICING_POLICIES_LIST_QUERY = gql`
  query PricingPoliciesListPage {
    pricingPolicies {
      id
      name
      status
      effectiveFrom
      effectiveTo
      rules {
        id
      }
    }
  }
`;

export const PRICING_POLICY_WITH_RULES_QUERY = gql`
  query PricingPolicyRulesPage($id: ID!) {
    pricingPolicy(id: $id) {
      id
      name
      status
      effectiveFrom
      effectiveTo
      rules {
        id
        policyId
        ruleType
        title
        lineCode
        calcType
        targetLineCode
        amountKrw
        percentBps
        quantitySource
        headcountMin
        headcountMax
        dayMin
        dayMax
        travelDateFrom
        travelDateTo
        vehicleType
        variantTypes
        flightInTimeBand
        flightOutTimeBand
        pickupPlaceType
        dropPlaceType
        externalTransferMode
        externalTransferMinCount
        chargeScope
        personMode
        customDisplayText
        isEnabled
        sortOrder
      }
    }
  }
`;

export const CREATE_POLICY_MUTATION = gql`
  mutation CreatePricingPolicy($input: PricingPolicyCreateInput!) {
    createPricingPolicy(input: $input) {
      id
    }
  }
`;

export const UPDATE_POLICY_MUTATION = gql`
  mutation UpdatePricingPolicy($id: ID!, $input: PricingPolicyUpdateInput!) {
    updatePricingPolicy(id: $id, input: $input) {
      id
    }
  }
`;

export const DELETE_POLICY_MUTATION = gql`
  mutation DeletePricingPolicy($id: ID!) {
    deletePricingPolicy(id: $id)
  }
`;

export const DUPLICATE_POLICY_MUTATION = gql`
  mutation DuplicatePricingPolicy($id: ID!, $input: PricingPolicyDuplicateInput!) {
    duplicatePricingPolicy(id: $id, input: $input) {
      id
    }
  }
`;

export const CREATE_RULE_MUTATION = gql`
  mutation CreatePricingRule($input: PricingRuleCreateInput!) {
    createPricingRule(input: $input) {
      id
    }
  }
`;

export const UPDATE_RULE_MUTATION = gql`
  mutation UpdatePricingRule($id: ID!, $input: PricingRuleUpdateInput!) {
    updatePricingRule(id: $id, input: $input) {
      id
    }
  }
`;

export const DELETE_RULE_MUTATION = gql`
  mutation DeletePricingRule($id: ID!) {
    deletePricingRule(id: $id)
  }
`;
