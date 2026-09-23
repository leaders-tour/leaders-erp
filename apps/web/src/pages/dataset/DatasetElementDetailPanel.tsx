import { useState } from 'react';
import {
  useAddCatalogElementSetItem,
  useCatalogElementUsages,
  useRemoveCatalogElementSetItem,
  useUpdateCatalogElement,
  type CatalogElementRow,
} from '../../features/dataset/hooks';
import { DatasetStubNotice, ELEMENT_KIND_LABEL, type CatalogElementKind } from '../../features/dataset/labels';
import { datasetTheme } from '../../features/dataset/theme';
import { DatasetButton, DatasetCard, DatasetField, DatasetTabs, datasetControlClass } from '../../features/dataset/ui';

interface DatasetElementDetailPanelProps {
  element: CatalogElementRow;
  elements: CatalogElementRow[];
  onClose: () => void;
}

export function DatasetElementDetailPanel({ element, elements, onClose }: DatasetElementDetailPanelProps): JSX.Element {
  const [tab, setTab] = useState('info');
  const [name, setName] = useState(element.name);
  const [kind, setKind] = useState<CatalogElementKind>(element.kind);
  const [customerText, setCustomerText] = useState(element.customerText ?? '');
  const [durationText, setDurationText] = useState(element.durationText ?? '');
  const [costRuleText, setCostRuleText] = useState(element.costRuleText ?? '');
  const [lifecycleStatus, setLifecycleStatus] = useState(element.lifecycleStatus);
  const [memberId, setMemberId] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const [updateElement, updateState] = useUpdateCatalogElement();
  const [addItem, addState] = useAddCatalogElementSetItem();
  const [removeItem] = useRemoveCatalogElementSetItem();
  const usages = useCatalogElementUsages(element.id);

  const save = async () => {
    await updateElement({
      variables: {
        id: element.id,
        input: { name, kind, customerText, durationText, costRuleText, lifecycleStatus },
      },
    });
    setNotice('원본을 새 버전으로 저장했습니다.');
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-[#2A2155]/35" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-3 py-6">
        <div className={`relative my-auto w-full max-w-3xl p-5 shadow-2xl ${datasetTheme.card}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-[#8B83B8]">일정요소 / 원본 상세</p>
              <h2 className="text-lg font-semibold">{element.name}</h2>
              <p className="text-xs text-[#9A93C2]">
                {element.code} · v{element.version} · {element.composition}
              </p>
            </div>
            <DatasetButton type="button" variant="outline" onClick={onClose}>
              닫기
            </DatasetButton>
          </div>

          <div className="mt-4">
            <DatasetTabs
              size="sm"
              items={[
                { id: 'info', label: '기본' },
                { id: 'set', label: '세트' },
                { id: 'display', label: '고객 표시' },
                { id: 'value', label: '값·수식' },
                { id: 'ops', label: '운영조건' },
                { id: 'usage', label: '사용처' },
              ]}
              activeId={tab}
              onChange={setTab}
            />
          </div>

          {notice ? <div className="mt-3"><DatasetStubNotice message={notice} /></div> : null}

          {tab === 'info' ? (
            <div className="mt-4 grid gap-3">
              <DatasetField label="이름">
                <input className={datasetControlClass} value={name} onChange={(event) => setName(event.target.value)} />
              </DatasetField>
              <DatasetField label="유형">
                <select className={datasetControlClass} value={kind} onChange={(event) => setKind(event.target.value as CatalogElementKind)}>
                  {(Object.keys(ELEMENT_KIND_LABEL) as CatalogElementKind[]).map((value) => (
                    <option key={value} value={value}>
                      {ELEMENT_KIND_LABEL[value]}
                    </option>
                  ))}
                </select>
              </DatasetField>
              <DatasetField label="시간 요약">
                <input className={datasetControlClass} value={durationText} onChange={(event) => setDurationText(event.target.value)} />
              </DatasetField>
              <DatasetField label="비용 규칙 요약">
                <input className={datasetControlClass} value={costRuleText} onChange={(event) => setCostRuleText(event.target.value)} />
              </DatasetField>
              <DatasetField label="수명 상태">
                <select className={datasetControlClass} value={lifecycleStatus} onChange={(event) => setLifecycleStatus(event.target.value)}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PENDING_REVIEW">PENDING_REVIEW</option>
                  <option value="DRAFT">DRAFT</option>
                </select>
              </DatasetField>
              <DatasetButton type="button" variant="primary" disabled={updateState.loading} onClick={() => void save()}>
                {updateState.loading ? '저장 중…' : '원본 저장'}
              </DatasetButton>
            </div>
          ) : null}

          {tab === 'set' ? (
            <div className="mt-4 grid gap-3">
              <p className="text-xs text-[#8B83B8]">세트 안에 세트 가능. 순환 참조는 서버에서 차단합니다.</p>
              <ul className="grid gap-2">
                {element.setItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm">
                    <span>
                      {item.memberElement.name} <span className="text-xs text-[#9A93C2]">({item.memberElement.code})</span>
                    </span>
                    <DatasetButton type="button" variant="ghost" onClick={() => void removeItem({ variables: { id: item.id } })}>
                      제외
                    </DatasetButton>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <select className={datasetControlClass} value={memberId} onChange={(event) => setMemberId(event.target.value)}>
                  <option value="">구성 추가</option>
                  {elements
                    .filter((row) => row.id !== element.id)
                    .map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                </select>
                <DatasetButton
                  type="button"
                  variant="primary"
                  disabled={!memberId || addState.loading}
                  onClick={() => void addItem({ variables: { input: { setElementId: element.id, memberElementId: memberId } } })}
                >
                  배치 추가
                </DatasetButton>
              </div>
            </div>
          ) : null}

          {tab === 'display' ? (
            <div className="mt-4 grid gap-3">
              <DatasetField label="고객 기본문구">
                <input className={datasetControlClass} value={customerText} onChange={(event) => setCustomerText(event.target.value)} />
              </DatasetField>
              <p className="text-xs text-[#9A93C2]">문구와 내부값은 독립입니다. 생성 엔진은 미정(D01).</p>
              <DatasetButton type="button" variant="primary" onClick={() => void save()}>
                문구만 저장
              </DatasetButton>
            </div>
          ) : null}

          {tab === 'value' || tab === 'ops' ? (
            <DatasetCard className="mt-4">
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                {tab === 'value' ? '값·수식' : '운영조건'} 골격입니다. 시험값 저장과 실제 원본 저장을 구분하며, 기본 수식은 하드코딩하지 않습니다.
              </div>
            </DatasetCard>
          ) : null}

          {tab === 'usage' ? (
            <div className="mt-4 grid gap-2">
              {(usages.data?.catalogElementUsages ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">사용처 없음. 고객 일정 사용본은 미연동입니다.</p>
              ) : (
                (usages.data?.catalogElementUsages ?? []).map((row) => (
                  <div key={`${row.kind}-${row.id}`} className="rounded-xl border border-slate-100 px-3 py-2 text-sm">
                    {row.kind} · {row.name} ({row.code})
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
