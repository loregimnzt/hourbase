import { Card, CardHeader } from "@/components/ui/card";

/** Plain-language documentation of every financial number in Hourbase. */
export function RevenueExplainer({ totalLabel }: { totalLabel: string }) {
  return (
    <Card>
      <CardHeader title="How revenue is calculated" description={`This selection's recorded revenue: ${totalLabel}`} />
      <div className="grid gap-6 px-5 pt-4 pb-6 text-[13px] leading-relaxed text-muted md:grid-cols-2">
        <div>
          <h3 className="mb-1.5 font-medium text-fg">Hourly projects</h3>
          <p>
            <strong className="font-medium text-fg">Earned revenue</strong> = billable hours × billing rate (the project&apos;s rate, or your default rate if it has none). Non-billable hours earn nothing but still count as
            worked time, so they lower your effective rate.
          </p>
          <h3 className="mt-4 mb-1.5 font-medium text-fg">Fixed-price projects</h3>
          <p>
            <strong className="font-medium text-fg">Effective rate</strong> = agreed fee ÷ every hour tracked on the project (billable or not). For a period, each hour is worth that rate, so a period&apos;s share
            of the fee = hours in the period × effective rate. All periods together add up to exactly the agreed fee — never more. Logging more hours lowers the rate and shifts the
            split.
          </p>
        </div>
        <div>
          <h3 className="mb-1.5 font-medium text-fg">What each number means</h3>
          <dl className="grid gap-2">
            <div>
              <dt className="inline font-medium text-fg">Agreed fee — </dt>
              <dd className="inline">the fixed contract value.</dd>
            </div>
            <div>
              <dt className="inline font-medium text-fg">Estimated revenue — </dt>
              <dd className="inline">fixed: the fee; hourly: estimated hours × rate. A plan, never counted as earned.</dd>
            </div>
            <div>
              <dt className="inline font-medium text-fg">Recorded revenue — </dt>
              <dd className="inline">accrued value of tracked work as described above.</dd>
            </div>
            <div>
              <dt className="inline font-medium text-fg">Revenue per hour — </dt>
              <dd className="inline">recorded revenue ÷ all tracked hours.</dd>
            </div>
            <div>
              <dt className="inline font-medium text-fg">Not included — </dt>
              <dd className="inline">payments received, invoices, expenses and taxes. Revenue is therefore not net profit.</dd>
            </div>
          </dl>
          <p className="mt-3">Entries count toward the day they start, in your time zone. Currencies are never converted or summed together.</p>
        </div>
      </div>
    </Card>
  );
}
