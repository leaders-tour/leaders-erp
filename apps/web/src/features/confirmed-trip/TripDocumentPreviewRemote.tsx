export type TripDocumentPreviewRemoteTarget = 'estimate' | 'confirmation';

interface TripDocumentPreviewRemoteProps {
  onJump: (target: TripDocumentPreviewRemoteTarget) => void;
}

export function TripDocumentPreviewRemote({ onJump }: TripDocumentPreviewRemoteProps) {
  return (
    <div className="hidden shrink-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:flex">
      <button
        type="button"
        onClick={() => onJump('confirmation')}
        className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
      >
        확정서
      </button>
      <button
        type="button"
        onClick={() => onJump('estimate')}
        className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
      >
        견적서
      </button>
    </div>
  );
}
