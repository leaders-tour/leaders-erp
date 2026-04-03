import type { Dispatch, SetStateAction } from 'react';
import { PricingRuleStepBasics } from './PricingRuleStepBasics';
import { PricingRuleStepConditions } from './PricingRuleStepConditions';
import { PricingRuleStepDisplay } from './PricingRuleStepDisplay';
import type { ConditionCategoryKey, RuleFormState, RuleFormStep } from './types';
import { deriveRuleConstraints } from './utils';

export function PricingRuleFormFields({
  ruleForm,
  setRuleForm,
  currentStep,
  openConditionCategories,
  setOpenConditionCategories,
}: {
  ruleForm: RuleFormState;
  setRuleForm: Dispatch<SetStateAction<RuleFormState>>;
  currentStep: RuleFormStep;
  openConditionCategories: ConditionCategoryKey[];
  setOpenConditionCategories: Dispatch<SetStateAction<ConditionCategoryKey[]>>;
}): JSX.Element {
  const constraints = deriveRuleConstraints(ruleForm);

  if (currentStep === 'BASICS') {
    return <PricingRuleStepBasics ruleForm={ruleForm} setRuleForm={setRuleForm} constraints={constraints} />;
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
