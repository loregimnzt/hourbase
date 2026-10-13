import { formatDuration } from "@/lib/time";
import { formatPercent } from "@/lib/format";
import { BILLABLE_COLOR, NON_BILLABLE_COLOR } from "./hours-chart";

export function BillableSplit({ billable, nonBillable }: { billable: number; nonBillable: number }) {
  const total = billable + nonBillable;
  const share = total > 0 ? billable / total : 0;
  return (
    <div>
      <div className="mb-3 flex items-baseline gap-2">
        <span className="tabular text-3xl font-semibold tracking-tight">{total > 0 ? formatPercent(share) : "—"}</span>
        <span className="text-sm text-muted">billable</span>
      </div>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-elevated" role="img" aria-label={`${formatPercent(share)} billable, ${formatPercent(1 - share)} non-billable`}>
        {billable > 0 && <div className="h-full rounded-l-full" style={{ width: `${share * 100}%`, backgroundColor: BILLABLE_COLOR }} />}
        {nonBillable > 0 && <div className="h-full flex-1 rounded-r-full" style={{ backgroundColor: NON_BILLABLE_COLOR }} />}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="flex items-center gap-1.5 text-muted">
            <span aria-hidden className="size-2.5 rounded-sm" style={{ backgroundColor: BILLABLE_COLOR }} />
            Billable
          </dt>
          <dd className="tabular mt-0.5 font-medium">{formatDuration(billable)}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-muted">
            <span aria-hidden className="size-2.5 rounded-sm" style={{ backgroundColor: NON_BILLABLE_COLOR }} />
            Non-billable
          </dt>
          <dd className="tabular mt-0.5 font-medium">{formatDuration(nonBillable)}</dd>
        </div>
      </dl>
    </div>
  );
}
