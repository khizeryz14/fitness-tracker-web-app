import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api, type FoodItem, type FoodLog } from "../lib/api";
import { ErrorText, Field, Loading, fmt, ghostButton, inputClass, linkButton, primaryButton, tidy } from "../components/ui";

export default function LogFood() {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [term, setTerm] = useState("");
  const [food, setFood] = useState<FoodItem | null>(null);
  const [grams, setGrams] = useState("100");
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualKcal, setManualKcal] = useState("");
  const [logged, setLogged] = useState<FoodLog | null>(null);

  const search = useQuery({
    queryKey: ["foodSearch", term],
    queryFn: () => api.searchFood(term),
    enabled: term.length > 1,
    retry: false,
  });

  // Picking a USDA result caches it in our own database and returns our FoodItem.
  const resolve = useMutation({ mutationFn: (fdcId: number) => api.resolveUsdaFood(fdcId), onSuccess: (f) => setFood(f) });
  const manual = useMutation({
    mutationFn: () => api.createManualFood(manualName.trim(), Number(manualKcal)),
    onSuccess: (f) => {
      setFood(f);
      setShowManual(false);
    },
  });
  const log = useMutation({
    mutationFn: () => api.logFood(food!.id, Number(grams)),
    onSuccess: (entry) => {
      setLogged(entry);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });

  function reset() {
    setInput("");
    setTerm("");
    setFood(null);
    setGrams("100");
    setShowManual(false);
    setManualName("");
    setManualKcal("");
    setLogged(null);
    resolve.reset();
    manual.reset();
    log.reset();
  }

  const searchError =
    search.error instanceof ApiError && search.error.status === 503
      ? new Error("The food database isn't responding. Add the food manually instead.")
      : search.error;

  const gramsNumber = Number(grams);
  const canLog = food !== null && gramsNumber > 0 && !log.isPending;

  if (logged) {
    return (
      <div className="space-y-5 pt-2">
        <h1 className="text-xl font-semibold">Logged</h1>
        <p className="text-base">
          {tidy(logged.foodName)}, {fmt(logged.quantityGrams)} g, {fmt(logged.caloriesConsumed)} kcal.
        </p>
        <div className="flex gap-3">
          <button type="button" className={primaryButton} onClick={reset}>
            Log more food
          </button>
          <Link to="/" className={ghostButton}>
            Back to today
          </Link>
        </div>
      </div>
    );
  }

  if (food) {
    return (
      <div className="space-y-5 pt-2">
        <h1 className="text-xl font-semibold">{tidy(food.name)}</h1>
        <p className="text-base text-muted tabular-nums">{fmt(food.caloriesPer100g)} kcal per 100 g</p>
        <Field label="Amount in grams">
          <input className={inputClass} type="number" inputMode="decimal" min="1" max="10000" value={grams} onChange={(e) => setGrams(e.target.value)} />
        </Field>
        <p className="text-base tabular-nums">
          {gramsNumber > 0 ? fmt((food.caloriesPer100g * gramsNumber) / 100) : 0} kcal
        </p>
        <ErrorText error={log.error} />
        <div className="flex gap-3">
          <button type="button" className={primaryButton} disabled={!canLog} onClick={() => log.mutate()}>
            {log.isPending ? "Logging" : "Log food"}
          </button>
          <button type="button" className={ghostButton} onClick={reset}>
            Pick another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-2">
      <h1 className="text-xl font-semibold">Log food</h1>

      <form
        className="flex gap-3"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          setTerm(input.trim());
        }}
      >
        <input className={inputClass} type="search" placeholder="Search foods, e.g. banana" value={input} onChange={(e) => setInput(e.target.value)} />
        <button type="submit" className={primaryButton} disabled={input.trim().length < 2}>
          Search
        </button>
      </form>

      {search.isFetching && <Loading text="Searching" />}
      <ErrorText error={searchError} />
      <ErrorText error={resolve.error} />

      {search.data && search.data.length === 0 && (
        <p className="text-base text-muted">No matches. Try a simpler word, or add the food manually.</p>
      )}
      {search.data && search.data.length > 0 && (
        <ul className="divide-y divide-line border-y border-line">
          {search.data.map((f) => (
            <li key={f.fdcId}>
              <button type="button" className="block w-full py-3 text-left text-base" disabled={resolve.isPending} onClick={() => resolve.mutate(f.fdcId)}>
                {tidy(f.description)}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div>
        {!showManual ? (
          <button type="button" className={linkButton} onClick={() => setShowManual(true)}>
            Can't find it? Add it manually
          </button>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              manual.mutate();
            }}
          >
            <Field label="Food name">
              <input className={inputClass} required maxLength={200} value={manualName} onChange={(e) => setManualName(e.target.value)} />
            </Field>
            <Field label="Calories per 100 g">
              <input className={inputClass} required type="number" inputMode="decimal" min="0" max="900" value={manualKcal} onChange={(e) => setManualKcal(e.target.value)} />
            </Field>
            <ErrorText error={manual.error} />
            <div className="flex gap-3">
              <button type="submit" className={primaryButton} disabled={manual.isPending}>
                Continue
              </button>
              <button type="button" className={ghostButton} onClick={() => setShowManual(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
