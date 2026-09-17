import { DatasetPageFooter } from '../../features/dataset/labels';
import { DatasetPageHeader, DatasetPageShell } from '../../features/dataset/ui';

export function DatasetTemplatesPage(): JSX.Element {
  return (
    <DatasetPageShell>
      <section className="grid gap-5">
        <DatasetPageHeader
          breadcrumb="일정 데이터 관리 / 여행 템플릿"
          title="여행 템플릿"
          description="하루 블록을 모아 전체 여정을 만드는 레이어입니다. 이번 1차 범위에서는 준비 중입니다."
        />
        <div className="rounded-2xl border border-dashed border-[#D9D2F8] bg-slate-50 p-10 text-center">
          <p className="text-base font-semibold text-[#5B4BD6]">준비중</p>
          <p className="mt-2 text-sm text-slate-500">
            장소 → 일정요소 → 일정 블록까지 안정화한 뒤, 다음 단계에서 여행 템플릿을 붙입니다.
          </p>
        </div>
        <DatasetPageFooter screenId="T04-00 · 여행 템플릿 (준비중)" />
      </section>
    </DatasetPageShell>
  );
}
