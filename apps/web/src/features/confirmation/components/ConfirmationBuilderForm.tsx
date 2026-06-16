import { Button } from '@tour/ui';
import type { ConfirmationBuilderState, ConfirmationTraveler } from '../model/types';
import { CONFIRMATION_MEETING_PLACE_DEFAULT } from '../model/constants';

interface ConfirmationBuilderFormProps {
  value: ConfirmationBuilderState;
  onChange: (next: ConfirmationBuilderState) => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  saving: boolean;
}

function updateTraveler(
  travelers: ConfirmationTraveler[],
  index: number,
  patch: Partial<ConfirmationTraveler>,
): ConfirmationTraveler[] {
  return travelers.map((traveler, travelerIndex) =>
    travelerIndex === index ? { ...traveler, ...patch } : traveler,
  );
}

function TextField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <label>
      <span>{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

export function ConfirmationBuilderForm({
  value,
  onChange,
  onSaveDraft,
  onPublish,
  saving,
}: ConfirmationBuilderFormProps) {
  const patch = (partial: Partial<ConfirmationBuilderState>) => onChange({ ...value, ...partial });

  return (
    <div className="confirmation-builder-form">
      <TextField label="대표자명" value={value.leaderName} onChange={(leaderName) => patch({ leaderName })} />
      <TextField label="문서번호" value={value.documentNumber ?? ''} onChange={(documentNumber) => patch({ documentNumber })} />
      <TextField label="여행지" value={value.destination} onChange={(destination) => patch({ destination })} />
      <TextField label="인원" value={value.headcountText} onChange={(headcountText) => patch({ headcountText })} />
      <TextField label="여행 기간" value={value.travelPeriodText} onChange={(travelPeriodText) => patch({ travelPeriodText })} />
      <TextField label="차량" value={value.vehicleType} onChange={(vehicleType) => patch({ vehicleType })} />
      <TextField label="항공권 IN" value={value.flightInText} onChange={(flightInText) => patch({ flightInText })} multiline />
      <TextField label="항공권 OUT" value={value.flightOutText} onChange={(flightOutText) => patch({ flightOutText })} multiline />
      <TextField label="픽업" value={value.pickupText} onChange={(pickupText) => patch({ pickupText })} multiline />
      <TextField label="드랍" value={value.dropText} onChange={(dropText) => patch({ dropText })} multiline />
      <TextField
        label="실투어 외 픽드랍"
        value={value.externalPickupDropText}
        onChange={(externalPickupDropText) => patch({ externalPickupDropText })}
        multiline
      />
      <TextField label="특이사항" value={value.specialNote} onChange={(specialNote) => patch({ specialNote })} multiline />
      <TextField label="기본 대여물품" value={value.rentalItemsText} onChange={(rentalItemsText) => patch({ rentalItemsText })} multiline />
      <TextField label="참여 이벤트" value={value.eventNames} onChange={(eventNames) => patch({ eventNames })} />
      <TextField label="비고" value={value.remark} onChange={(remark) => patch({ remark })} multiline />
      <TextField label="잔금(1인)" value={value.balancePerPersonText} onChange={(balancePerPersonText) => patch({ balancePerPersonText })} />
      <TextField label="가이드님" value={value.guideName} onChange={(guideName) => patch({ guideName })} />
      <TextField
        label="미팅장소"
        value={value.meetingPlace || CONFIRMATION_MEETING_PLACE_DEFAULT}
        onChange={(meetingPlace) => patch({ meetingPlace })}
      />

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">여행객 명단</h3>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              patch({
                travelers: [...value.travelers, { name: '', gender: '', birthCode: '', note: '' }],
              })
            }
          >
            여행객 추가
          </Button>
        </div>
        {value.travelers.map((traveler, index) => (
          <div key={`traveler-${index}`} className="confirmation-traveler-row">
            <div className="confirmation-traveler-row__grid">
              <TextField
                label="이름"
                value={traveler.name}
                onChange={(name) => patch({ travelers: updateTraveler(value.travelers, index, { name }) })}
              />
              <TextField
                label="성별"
                value={traveler.gender ?? ''}
                onChange={(gender) => patch({ travelers: updateTraveler(value.travelers, index, { gender }) })}
              />
              <TextField
                label="생년(7자리)"
                value={traveler.birthCode ?? ''}
                onChange={(birthCode) => patch({ travelers: updateTraveler(value.travelers, index, { birthCode }) })}
              />
              <TextField
                label="특이사항"
                value={traveler.note ?? ''}
                onChange={(note) => patch({ travelers: updateTraveler(value.travelers, index, { note }) })}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                patch({
                  travelers: value.travelers.filter((_, travelerIndex) => travelerIndex !== index),
                })
              }
            >
              삭제
            </Button>
          </div>
        ))}
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">숙소</h3>
          <Button
            type="button"
            variant="outline"
            onClick={() => patch({ accommodationLines: [...value.accommodationLines, ''] })}
          >
            숙소 추가
          </Button>
        </div>
        {value.accommodationLines.map((line, index) => (
          <div key={`lodging-${index}`} className="flex gap-2">
            <TextField
              label={`숙소 ${index + 1}`}
              value={line}
              onChange={(nextLine) =>
                patch({
                  accommodationLines: value.accommodationLines.map((current, lineIndex) =>
                    lineIndex === index ? nextLine : current,
                  ),
                })
              }
            />
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                patch({
                  accommodationLines: value.accommodationLines.filter((_, lineIndex) => lineIndex !== index),
                })
              }
            >
              삭제
            </Button>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={saving} onClick={onSaveDraft}>
          임시 저장
        </Button>
        <Button type="button" disabled={saving} onClick={onPublish}>
          발행 저장
        </Button>
      </div>
    </div>
  );
}
