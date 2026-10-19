import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ExerciseLog } from "../lib/api";
import { ErrorText, Field, Loading, fmt, ghostButton, inputClass, primaryButton } from "../components/ui";

const quickMinutes = [15, 30, 45, 60];

export default function LogExercise() {
  const queryClient = useQueryClient();
  const types = useQuery({ queryKey: ["exerciseTypes"], queryFn: api.exerciseTypes, staleTime: Infinity });
  const [typeId, setTypeId] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [logged, setLogged] = useState<ExerciseLog | null>(null);

  const selectedId = typeId || types.data?.[0]?.id || "";
  const minutesNumber = Number(minutes);

  const log = useMutation({
    mutationFn: () => api.logExercise(selectedId, minutesNumber),
    onSuccess: (entry) => {
      setLogged(entry);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });

  if (logged) {
    return (
      <div className="space-y-5 pt-2">
        <h1 className="text-xl font-semibold">Logged</h1>
        <p className="text-base">
          {logged.exerciseName}, {fmt(logged.durationMinutes)} min, about {fmt(logged.caloriesBurned)} kcal burned.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            className={primaryButton}
            onClick={() => {
              setLogged(null);
              log.reset();
            }}
          >
            Log more
          </button>
          <Link to="/" className={ghostButton}>
            Back to today
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-5 pt-2"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        log.mutate();
      }}
    >
      <h1 className="text-xl font-semibold">Log exercise</h1>

      {types.isPending && <Loading />}
      <ErrorText error={types.error} />

      {types.data && (
        <>
          <Field label="Activity">
            <select className={inputClass} value={selectedId} onChange={(e) => setTypeId(e.target.value)}>
              {types.data.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Minutes">
            <input className={inputClass} type="number" inputMode="numeric" min="1" max="1440" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </Field>

          <div className="flex gap-2">
            {quickMinutes.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMinutes(String(m))}
                className={`rounded-md border px-3 py-2 text-base ${minutesNumber === m ? "border-ink font-semibold" : "border-line text-muted"}`}
              >
                {m}
              </button>
            ))}
          </div>

          <ErrorText error={log.error} />
          <button type="submit" className={primaryButton} disabled={!selectedId || !(minutesNumber > 0) || log.isPending}>
            {log.isPending ? "Logging" : "Log exercise"}
          </button>
        </>
      )}
    </form>
  );
}
