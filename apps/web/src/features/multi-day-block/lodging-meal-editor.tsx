import { Button, Input } from '@tour/ui';
import { MealOption } from '../../generated/graphql';
import type { FacilityAvailability } from '../location/hooks';
import type {
  MultiDayBlockLodgingFormValue,
  MultiDayBlockMealsFormValue,
} from './lodging-meal-form';

const FACILITY_OPTIONS: Array<{ value: FacilityAvailability; label: string }> = [
  { value: 'YES', label: '예' },
  { value: 'LIMITED', label: '제한' },
  { value: 'NO', label: '아니오' },
];

const MEAL_OPTIONS: Array<{ value: MealOption; label: string }> = [
  { value: MealOption.CampMeal, label: '캠프식' },
  { value: MealOption.LocalRestaurant, label: '현지식당' },
  { value: MealOption.ShabuShabu, label: '샤브샤브' },
  { value: MealOption.PorkParty, label: '삼겹살파티' },
  { value: MealOption.Horhog, label: '허르헉' },
  { value: MealOption.Shashlik, label: '샤슬릭' },
];

interface Props {
  lodging: MultiDayBlockLodgingFormValue;
  meals: MultiDayBlockMealsFormValue;
  onLodgingChange: (nextValue: MultiDayBlockLodgingFormValue) => void;
  onMealsChange: (nextValue: MultiDayBlockMealsFormValue) => void;
}

export function MultiDayBlockLodgingMealEditor(props: Props): JSX.Element {
  const {
    lodging,
    meals,
    onLodgingChange,
    onMealsChange,
  } = props;

  return (
    <>
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid gap-1">
          <span className="font-medium text-slate-900">숙소</span>
          <p className="text-xs text-slate-500">항상 펼쳐진 상태로 보이며, 숙소명을 비우면 저장 시 빈 값으로 처리됩니다.</p>
        </div>
        <div className="grid gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={lodging.isUnspecified}
              onChange={(event) => onLodgingChange({ ...lodging, isUnspecified: event.target.checked })}
            />
            숙소 미지정
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-slate-700">숙소명</span>
            <Input
              value={lodging.name}
              disabled={lodging.isUnspecified}
              onChange={(event) => onLodgingChange({ ...lodging, name: event.target.value })}
            />
          </label>
          {(
            [
              ['hasElectricity', '전기'],
              ['hasShower', '샤워'],
              ['hasInternet', '인터넷'],
            ] as const
          ).map(([field, label]) => (
            <div key={field} className="grid gap-1 text-sm">
              <span className="text-slate-700">{label}</span>
              <div className="flex flex-wrap gap-2">
                {FACILITY_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={lodging[field] === option.value ? 'default' : 'outline'}
                    disabled={lodging.isUnspecified}
                    onClick={() => onLodgingChange({ ...lodging, [field]: option.value })}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid gap-1">
          <span className="font-medium text-slate-900">식사</span>
          <p className="text-xs text-slate-500">항상 펼쳐진 상태로 보이며, 세 끼를 모두 비워두면 저장 시 빈 값으로 처리됩니다.</p>
        </div>
        <div className="grid gap-3">
          {(['breakfast', 'lunch', 'dinner'] as const).map((field) => (
            <div key={field} className="grid gap-1 text-sm">
              <span className="text-slate-700">{field === 'breakfast' ? '아침' : field === 'lunch' ? '점심' : '저녁'}</span>
              <div className="flex flex-wrap gap-2">
                {MEAL_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={meals[field] === option.value ? 'default' : 'outline'}
                    onClick={() => onMealsChange({ ...meals, [field]: option.value })}
                  >
                    {option.label}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant={meals[field] == null ? 'default' : 'outline'}
                  onClick={() => onMealsChange({ ...meals, [field]: null })}
                >
                  없음
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
