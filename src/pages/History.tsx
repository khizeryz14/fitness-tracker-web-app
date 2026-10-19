import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ExerciseLog, type FoodLog, type HydrationLog, type LogKind, type Paged } from "../lib/api";
import { ErrorText, Loading, fmt, formatWhen, ghostButton, linkButton, tidy } from "../components/ui";

type Tab = "food" | "exercise" | "water";

const tabs: { id: Tab; label: string; kind: LogKind }[] = [
  { id: "food", label: "Food", kind: "foodlog" },
  { id: "exercise", label: "Exercise", kind: "exerciselog" },
  { id: "water", label: "Water", kind: "hydrationlog" },
];

interface RowData {
  id: string;
  title: string;
  detail: string;
  amount: string;
}

function mapPaged<T>(paged: Paged<T>, toRow: (item: T) => RowData): Paged<RowData> {
  return { ...paged, items: paged.items.map(toRow) };
}

async function loadRows(tab: Tab, page: number): Promise<Paged<RowData>> {
  if (tab === "food") {
    return mapPaged(await api.history<FoodLog>("foodlog", page), (f) => ({
      id: f.id,
      title: tidy(f.foodName),
      detail: `${fmt(f.quantityGrams)} g, ${formatWhen(f.loggedTimestamp)}`,
      amount: `${fmt(f.caloriesConsumed)} kcal`,
    }));
  }
  if (tab === "exercise") {
    return mapPaged(await api.history<ExerciseLog>("exerciselog", page), (e) => ({
      id: e.id,
      title: e.exerciseName,
      detail: `${fmt(e.durationMinutes)} min, ${formatWhen(e.loggedTimestamp)}`,
      amount: `${fmt(e.caloriesBurned)} kcal`,
    }));
  }
  return mapPaged(await api.history<HydrationLog>("hydrationlog", page), (h) => ({
    id: h.id,
    title: "Water",
    detail: formatWhen(h.loggedTimestamp),
    amount: `${fmt(h.amountMl)} ml`,
  }));
}

export default function History() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("food");
  const [page, setPage] = useState(1);
  const kind = tabs.find((t) => t.id === tab)!.kind;

  const { data, isPending, error, isPlaceholderData } = useQuery({
    queryKey: ["history", tab, page],
    queryFn: () => loadRows(tab, page),
    placeholderData: keepPreviousData,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteLog(kind, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  // After deleting the last item on a later page, step back one page.
  useEffect(() => {
    if (data && data.items.length === 0 && page > 1 && !isPlaceholderData) setPage(page - 1);
  }, [data, page, isPlaceholderData]);

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;

  return (
    <div className="space-y-5 pt-2">
      <h1 className="text-xl font-semibold">History</h1>

      <div className="flex gap-6 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setPage(1);
            }}
            className={`-mb-px border-b-2 pb-2 text-base ${tab === t.id ? "border-ink font-semibold" : "border-transparent text-muted"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isPending && <Loading />}
      <ErrorText error={error} />
      <ErrorText error={remove.error} />

      {data && data.items.length === 0 && <p className="text-base text-muted">Nothing logged yet.</p>}

      {data && data.items.length > 0 && (
        <ul className={`divide-y divide-line border-y border-line ${isPlaceholderData ? "opacity-60" : ""}`}>
          {data.items.map((row) => (
            <li key={row.id} className="flex items-start justify-between gap-4 py-3">
              <div>
                <p className="text-base">{row.title}</p>
                <p className="text-sm text-muted">{row.detail}</p>
              </div>
              <div className="text-right">
                <p className="text-base tabular-nums">{row.amount}</p>
                <button
                  type="button"
                  className={`${linkButton} text-sm`}
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm("Delete this entry?")) remove.mutate(row.id);
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {data && data.totalCount > data.pageSize && (
        <div className="flex items-center justify-between">
          <button type="button" className={ghostButton} disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span className="text-sm text-muted tabular-nums">
            Page {page} of {totalPages}
          </span>
          <button type="button" className={ghostButton} disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
