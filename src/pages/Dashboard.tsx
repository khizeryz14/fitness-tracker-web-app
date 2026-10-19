import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { ErrorText, Gauge, Loading, fmt, formatWhen, ghostButton, linkButton } from "../components/ui";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-2.5">
      <dt className="text-base">{label}</dt>
      <dd className="text-base tabular-nums">{value}</dd>
    </div>
  );
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  // minutes ahead of UTC, so the API can work out the user's local day
  const tzOffset = -new Date().getTimezoneOffset();

  const dashboard = useQuery({ queryKey: ["dashboard", tzOffset], queryFn: () => api.dashboard(tzOffset) });
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: api.notifications });

  const addWater = useMutation({
    mutationFn: (ml: number) => api.addWater(ml),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });
  const dismiss = useMutation({
    mutationFn: (id: string) => api.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = notifications.data?.filter((n) => !n.isRead) ?? [];
  const d = dashboard.data;
  const net = d?.netCalories ?? 0;
  const netRounded = Math.round(net);
  const sign = netRounded > 0 ? "+" : netRounded < 0 ? "−" : "";
  const dateText = new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-8 pt-2">
      <h1 className="text-xl font-semibold">{dateText}</h1>

      {unread.length > 0 && (
        <section className="space-y-3">
          {unread.map((n) => (
            <div key={n.id} className="border-l-2 border-water pl-3">
              <p className="text-base">{n.message}</p>
              <p className="flex items-baseline gap-4 text-sm text-muted">
                {formatWhen(n.createdAt)}
                <button type="button" className={linkButton} onClick={() => dismiss.mutate(n.id)} disabled={dismiss.isPending}>
                  Dismiss
                </button>
              </p>
            </div>
          ))}
        </section>
      )}

      {dashboard.isPending && <Loading text="Loading your day" />}
      {dashboard.error && (
        <div className="space-y-3">
          <ErrorText error={dashboard.error} />
          <button type="button" className={ghostButton} onClick={() => dashboard.refetch()}>
            Try again
          </button>
        </div>
      )}

      {d && (
        <>
          <section>
            <h2 className="text-base font-semibold">Energy balance</h2>
            <dl className="mt-2 divide-y divide-line border-y border-line">
              <Row label="Eaten" value={`+${fmt(d.caloriesIn)}`} />
              <Row label="Exercise" value={`−${fmt(d.exerciseCaloriesBurned)}`} />
              <Row label="Resting burn so far" value={`−${fmt(d.bmrBurnedSoFar)}`} />
            </dl>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-base text-muted">Net</span>
              <span className="text-4xl font-semibold tabular-nums">
                {sign}
                {fmt(Math.abs(net))} <span className="text-base font-normal text-muted">kcal</span>
              </span>
            </div>
            <p className="mt-1 text-right text-sm text-muted">
              {netRounded > 0 ? "Surplus" : netRounded < 0 ? "Deficit" : "Even"} so far today
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">Eaten vs. maintenance</h2>
            <Gauge value={d.caloriesIn} max={d.dailyCalorieTarget} tone="food" />
            <p className="text-sm text-muted tabular-nums">
              {fmt(d.caloriesIn)} of about {fmt(d.dailyCalorieTarget)} kcal to hold your weight
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">Water</h2>
            <Gauge value={d.hydrationMl} max={d.hydrationGoalMl} tone="water" />
            <p className="text-sm text-muted tabular-nums">
              {fmt(d.hydrationMl)} of {fmt(d.hydrationGoalMl)} ml
            </p>
            <div className="flex gap-3 pt-1">
              {[250, 500].map((ml) => (
                <button key={ml} type="button" className={ghostButton} onClick={() => addWater.mutate(ml)} disabled={addWater.isPending}>
                  Add {ml} ml
                </button>
              ))}
            </div>
            <ErrorText error={addWater.error} />
          </section>
        </>
      )}
    </div>
  );
}
