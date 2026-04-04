import type { Dispatch, SetStateAction } from 'react';
import { PricingRuleManualForm } from './PricingRuleManualForm';
import { PricingRuleStepBasics } from './PricingRuleStepBasics';
import { PricingRuleStepConditions } from './PricingRuleStepConditions';
import { PricingRuleStepDisplay } from './PricingRuleStepDisplay';
import type { ConditionCategoryKey, PricingPriceItemGroup, RuleFormState, RuleFormStep } from './types';
import { deriveRuleConstraints } from './utils';

export function PricingRuleFormFields({
  ruleForm,
  setRuleForm,
  currentStep,
  openConditionCategories,
  setOpenConditionCategories,
  lockedGroup,
}: {
  ruleForm: RuleFormState;
  setRuleForm: Dispatch<SetStateAction<RuleFormState>>;
  currentStep: RuleFormStep;
  openConditionCategories: ConditionCategoryKey[];
  setOpenConditionCategories: Dispatch<SetStateAction<ConditionCategoryKey[]>>;
  lockedGroup?: PricingPriceItemGroup | null;
}): JSX.Element {
  const constraints = deriveRuleConstraints(ruleForm);

  if (ruleForm.priceItemPreset === 'MANUAL_PRESET') {
    return <PricingRuleManualForm ruleForm={ruleForm} setRuleForm={setRuleForm} constraints={constraints} lockedGroup={lockedGroup} />;
  }

  if (currentStep === 'BASICS') {
    return (
      <PricingRuleStepBasics
        ruleForm={ruleForm}
        setRuleForm={setRuleForm}
        constraints={constraints}
        lockedGroup={lockedGroup}
        setOpenConditionCategories={setOpenConditionCategories}
      />
    );
  }

  if (currentStep === 'CONDITIONS') {
    return (
      <PricingRuleStepConditions
        ruleForm={ruleForm}
        setRuleForm={setRuleForm}
        openCategories={openConditionCategories}
        setOpenCategories={setOpenConditionCategories}
        constraints={constraints}
      />
    );
  }

  return <PricingRuleStepDisplay ruleForm={ruleForm} setRuleForm={setRuleForm} constraints={constraints} />;
}
