import { useState, type ChangeEvent, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth";
import { ErrorText, Field, inputClass, linkButton, primaryButton } from "../components/ui";

const initialForm = {
  name: "",
  email: "",
  password: "",
  heightCm: "",
  weightKg: "",
  sex: "0",
  dob: "",
  activity: "3",
};

const activityOptions = [
  { value: "1", label: "Sedentary, mostly sitting" },
  { value: "2", label: "Low, light activity" },
  { value: "3", label: "Average, moderate activity" },
  { value: "4", label: "High, very active" },
  { value: "5", label: "Athletic, daily training" },
];

export default function Login() {
  const { token, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  if (token) return <Navigate to="/" replace />;

  const set = (key: keyof typeof initialForm) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        await login(form.email.trim(), form.password);
      } else {
        await register({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          height: Number(form.heightCm) / 100, // the API stores metres
          weight: Number(form.weightKg),
          sex: Number(form.sex) as 0 | 1,
          dateOfBirth: form.dob,
          activityLevel: Number(form.activity) as 1 | 2 | 3 | 4 | 5,
        });
      }
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pb-12 pt-[calc(env(safe-area-inset-top)+3rem)]">
      <h1 className="text-2xl font-semibold">{mode === "login" ? "Sign in" : "Create account"}</h1>

      <form className="mt-6 space-y-4" onSubmit={submit}>
        {mode === "register" && (
          <Field label="Name">
            <input className={inputClass} required minLength={2} maxLength={100} autoComplete="name" value={form.name} onChange={set("name")} />
          </Field>
        )}
        <Field label="Email">
          <input className={inputClass} required type="email" autoComplete="email" value={form.email} onChange={set("email")} />
        </Field>
        <Field label={mode === "register" ? "Password (at least 8 characters)" : "Password"}>
          <input
            className={inputClass}
            required
            type="password"
            minLength={mode === "register" ? 8 : undefined}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={form.password}
            onChange={set("password")}
          />
        </Field>

        {mode === "register" && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Height (cm)">
                <input className={inputClass} required type="number" inputMode="decimal" min="50" max="250" value={form.heightCm} onChange={set("heightCm")} />
              </Field>
              <Field label="Weight (kg)">
                <input className={inputClass} required type="number" inputMode="decimal" min="20" max="500" value={form.weightKg} onChange={set("weightKg")} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Sex">
                <select className={inputClass} value={form.sex} onChange={set("sex")}>
                  <option value="0">Male</option>
                  <option value="1">Female</option>
                </select>
              </Field>
              <Field label="Date of birth">
                <input className={inputClass} required type="date" max={today} value={form.dob} onChange={set("dob")} />
              </Field>
            </div>
            <Field label="Activity level">
              <select className={inputClass} value={form.activity} onChange={set("activity")}>
                {activityOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}

        <ErrorText error={error} />
        <button type="submit" className={`${primaryButton} w-full`} disabled={busy}>
          {busy ? "One moment" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-base">
        {mode === "login" ? "New here? " : "Already registered? "}
        <button
          type="button"
          className={linkButton}
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
          }}
        >
          {mode === "login" ? "Create an account" : "Sign in"}
        </button>
      </p>

      <p className="mt-8 text-sm text-muted">
        The server sleeps when idle, so the first request after a quiet period can take up to a minute.
      </p>
    </div>
  );
}
