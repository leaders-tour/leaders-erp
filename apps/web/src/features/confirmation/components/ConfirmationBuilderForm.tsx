import { Button, Card } from '@tour/ui';
import { useState, type ReactNode } from 'react';
import type {
  ConfirmationAppendixPlanStopRow,
  ConfirmationBuilderState,
  ConfirmationTraveler,
} from '../model/types';
import { CONFIRMATION_MEETING_PLACE_DEFAULT } from '../model/constants';
import {
  ConfirmationScheduleEditor,
  type ConfirmationScheduleEditorRowMeta,
} from '../../plan/components/ConfirmationScheduleEditor';

interface ConfirmationBuilderFormProps {
  value: ConfirmationBuilderState;
  onChange: (next: ConfirmationBuilderState) => void;
  scheduleEditor?: {
    rows: ConfirmationAppendixPlanStopRow[];
    rowMeta: ConfirmationScheduleEditorRowMeta[];
    onRowsChange: (rows: ConfirmationAppendixPlanStopRow[]) => void;
    onRestore: () => void;
    restoreDisabled?: boolean;
    loading?: boolean;
  };
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
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  className?: string;
}) {
  return (
    <label className={className}>
      <span>{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function FormSection({
  number,
  title,
  description,
  children,
  action,
  className,
}: {
  number: number;
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`confirmation-builder-section${className ? ` ${className}` : ''}`}>
      <div className="confirmation-builder-section__header">
        <div className="confirmation-builder-section__title-wrap">
          <span className="confirmation-builder-section__number">{number}</span>
          <div>
            <h3>{title}</h3>
            {description ? <p>{description}</p> : null}
          </div>
        </div>
        {action ? <div className="confirmation-builder-section__action">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function RestoreScheduleConfirmModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}): JSX.Element | null {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <Card className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">일정표 원상복구</h3>
        <p className="mt-2 text-sm text-slate-600">
          확정서 일정표를 연결 견적의 기존 일정으로 되돌립니다. 지금까지 수정한 일정표 내용은
          모두 사라집니다.
        </p>
        <p className="mt-1 text-xs text-slate-500">이 작업은 되돌릴 수 없습니다.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            취소
          </Button>
          <Button type="button" variant="primary" onClick={onConfirm}>
            기존 일정으로 초기화
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function ConfirmationBuilderForm({
  value,
  onChange,
  scheduleEditor,
}: ConfirmationBuilderFormProps) {
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const patch = (partial: Partial<ConfirmationBuilderState>) => onChange({ ...value, ...partial });

  return (
    <div className="confirmation-builder-form">
      <FormSection number={1} title="기본정보" description="대표자, 문서번호, 여행 기본값을 확인합니다.">
        <div className="confirmation-builder-field-grid">
          <TextField label="대표자명" value={value.leaderName} onChange={(leaderName) => patch({ leaderName })} />
          <TextField label="문서번호" value={value.documentNumber ?? ''} onChange={(documentNumber) => patch({ documentNumber })} />
          <TextField label="여행지" value={value.destination} onChange={(destination) => patch({ destination })} />
          <TextField label="인원" value={value.headcountText} onChange={(headcountText) => patch({ headcountText })} />
          <TextField
            label="여행 기간"
            value={value.travelPeriodText}
            onChange={(travelPeriodText) => patch({ travelPeriodText })}
            className="confirmation-builder-field--wide"
          />
          <TextField label="차량" value={value.vehicleType} onChange={(vehicleType) => patch({ vehicleType })} />
        </div>
      </FormSection>

      <FormSection number={2} title="항공" description="항공권과 픽업·드랍 정보를 조정합니다.">
        <div className="confirmation-builder-field-grid">
          <TextField label="항공권 IN" value={value.flightInText} onChange={(flightInText) => patch({ flightInText })} multiline />
          <TextField label="항공권 OUT" value={value.flightOutText} onChange={(flightOutText) => patch({ flightOutText })} multiline />
          <TextField label="픽업" value={value.pickupText} onChange={(pickupText) => patch({ pickupText })} multiline />
          <TextField label="드랍" value={value.dropText} onChange={(dropText) => patch({ dropText })} multiline />
          <TextField
            label="실투어 외 픽드랍"
            value={value.externalPickupDropText}
            onChange={(externalPickupDropText) => patch({ externalPickupDropText })}
            multiline
            className="confirmation-builder-field--wide"
          />
        </div>
      </FormSection>

      <FormSection number={3} title="포함 정보" description="대여물품, 이벤트, 특이사항과 비고를 조정합니다.">
        <div className="confirmation-builder-field-grid">
          <TextField label="특이사항" value={value.specialNote} onChange={(specialNote) => patch({ specialNote })} multiline />
          <TextField label="기본 대여물품" value={value.rentalItemsText} onChange={(rentalItemsText) => patch({ rentalItemsText })} multiline />
          <TextField label="참여 이벤트" value={value.eventNames} onChange={(eventNames) => patch({ eventNames })} multiline />
          <TextField label="비고" value={value.remark} onChange={(remark) => patch({ remark })} multiline />
        </div>
      </FormSection>

      <FormSection number={4} title="금액" description="확정서 하단에 표시되는 1인 잔금을 관리합니다.">
        <div className="confirmation-builder-field-grid">
          <TextField
            label="잔금(1인)"
            value={value.balancePerPersonText}
            onChange={(balancePerPersonText) => patch({ balancePerPersonText })}
            multiline
            className="confirmation-builder-field--wide"
          />
        </div>
      </FormSection>

      <FormSection
        number={5}
        title="가이드 숙소 기사 명단"
        description={`여행객 ${value.travelers.length}명 · 숙소 ${value.accommodationLines.length}개 라인`}
        className="confirmation-builder-section--wide"
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              patch({
                travelers: [...value.travelers, { name: '', gender: '', birthCode: '' }],
              })
            }
          >
            여행객 추가
          </Button>
        }
      >
        <div className="confirmation-builder-field-grid">
          <TextField label="가이드님" value={value.guideName} onChange={(guideName) => patch({ guideName })} />
          <TextField
            label="미팅장소"
            value={value.meetingPlace || CONFIRMATION_MEETING_PLACE_DEFAULT}
            onChange={(meetingPlace) => patch({ meetingPlace })}
          />
        </div>
        <div className="grid gap-3">
        {value.travelers.map((traveler, index) => (
          <div key={`traveler-${index}`} className="confirmation-traveler-row">
            <div className="confirmation-traveler-row__header">
              <span>여행객 {index + 1}</span>
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
            </div>
          </div>
        ))}
        </div>
        <div className="confirmation-builder-subsection">
          <div className="confirmation-builder-subsection__header">
            <div>
              <h4>숙소</h4>
              <p>확정서 숙소 셀에 표시되는 라인입니다.</p>
            </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => patch({ accommodationLines: [...value.accommodationLines, ''] })}
          >
            숙소 추가
          </Button>
          </div>
        <div className="grid gap-3">
        {value.accommodationLines.map((line, index) => (
          <div key={`lodging-${index}`} className="confirmation-lodging-row">
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
        </div>
        </div>
      </FormSection>

      {scheduleEditor ? (
        <FormSection
          number={6}
          title="일정표"
          description="확정서 부록에 표시될 일정표 문구를 수정합니다. 식사 칸은 아침/점심/저녁 3칸 입력으로 편집됩니다."
          className="confirmation-builder-section--wide"
          action={
            scheduleEditor.loading ? null : (
              <Button
                type="button"
                variant="outline"
                disabled={scheduleEditor.restoreDisabled}
                onClick={() => setRestoreModalOpen(true)}
              >
                기존 일정으로 초기화
              </Button>
            )
          }
        >
          {scheduleEditor.loading ? (
            <Card className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              일정표 편집기를 불러오는 중...
            </Card>
          ) : (
            <ConfirmationScheduleEditor
              embedded
              rows={scheduleEditor.rows}
              rowMeta={scheduleEditor.rowMeta}
              onChange={scheduleEditor.onRowsChange}
            />
          )}
        </FormSection>
      ) : null}

      <RestoreScheduleConfirmModal
        open={restoreModalOpen}
        onCancel={() => setRestoreModalOpen(false)}
        onConfirm={() => {
          scheduleEditor?.onRestore();
          setRestoreModalOpen(false);
        }}
      />
    </div>
  );
}
