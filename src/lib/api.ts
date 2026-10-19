// All HTTP calls to the API live here: one place for the base URL, the JWT, and error parsing.

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") ?? "";

// ---- token handling -------------------------------------------------------
let token: string | null = localStorage.getItem("token");
let onUnauthorized: (() => void) | null = null;

export function getToken() {
  return token;
}
export function setToken(value: string | null) {
  token = value;
  if (value) localStorage.setItem("token", value);
  else localStorage.removeItem("token");
}
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

// ---- types (mirror the API's response DTOs) -------------------------------
export interface Dashboard {
  date: string;
  caloriesIn: number;
  exerciseCaloriesBurned: number;
  bmrPerDay: number;
  bmrBurnedSoFar: number;
  netCalories: number;
  dailyCalorieTarget: number;
  hydrationMl: number;
  hydrationGoalMl: number;
}
export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}
export interface ExerciseType {
  id: string;
  name: string;
  metValue: number;
}
export interface ExerciseLog {
  id: string;
  exerciseTypeId: string;
  exerciseName: string;
  durationMinutes: number;
  loggedTimestamp: string;
  caloriesBurned: number;
}
export interface UsdaFood {
  fdcId: number;
  description: string;
}
export interface FoodItem {
  id: string;
  fdcId: number | null;
  name: string;
  caloriesPer100g: number;
}
export interface FoodLog {
  id: string;
  foodItemId: string;
  foodName: string;
  quantityGrams: number;
  loggedTimestamp: string;
  caloriesConsumed: number;
}
export interface HydrationLog {
  id: string;
  amountMl: number;
  loggedTimestamp: string;
}
export interface AppNotification {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}
export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  height: number; // metres
  weight: number; // kg
  sex: 0 | 1; // 0 = male, 1 = female
  dateOfBirth: string; // YYYY-MM-DD
  activityLevel: 1 | 2 | 3 | 4 | 5;
}

export type LogKind = "foodlog" | "exerciselog" | "hydrationlog";

// ---- request helper -------------------------------------------------------
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// The API answers errors in a few shapes: plain text, { error }, or ASP.NET validation { errors: {...} }.
async function readError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    if (typeof data === "string") return data;
    if (data?.error) return String(data.error);
    if (data?.errors) {
      const messages = Object.values(data.errors as Record<string, string[]>).flat();
      if (messages.length) return messages.join(" ");
    }
    if (data?.title) return String(data.title);
  } catch {
    // not JSON, fall through to the raw text
  }
  return text || `Request failed (${res.status}).`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(API_URL + path, { ...init, headers });
  } catch {
    throw new ApiError(0, "Can't reach the server. It may be waking up, so try again in a few seconds.");
  }

  if (res.status === 401 && token) onUnauthorized?.();
  if (!res.ok) throw new ApiError(res.status, await readError(res));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const json = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });
const now = () => new Date().toISOString();

// ---- endpoints -------------------------------------------------------------
export const api = {
  login: (email: string, password: string) =>
    request<{ token: string }>("/api/users/login", json({ email, password })),
  register: (payload: RegisterPayload) =>
    request<{ id: string; email: string }>("/api/users/register", json(payload)),

  dashboard: (tzOffsetMinutes: number) =>
    request<Dashboard>(`/api/dashboard?tzOffsetMinutes=${tzOffsetMinutes}`),

  searchFood: (query: string) =>
    request<UsdaFood[]>(`/api/fooditems/search?query=${encodeURIComponent(query)}`),
  resolveUsdaFood: (fdcId: number) =>
    request<FoodItem>(`/api/fooditems/from-usda?fdcId=${fdcId}`, { method: "POST" }),
  createManualFood: (name: string, caloriesPer100g: number) =>
    request<FoodItem>("/api/fooditems/manual", json({ name, caloriesPer100g })),
  logFood: (foodItemId: string, quantityGrams: number) =>
    request<FoodLog>("/api/foodlog", json({ foodItemId, quantityGrams, loggedTimestamp: now() })),

  exerciseTypes: () => request<ExerciseType[]>("/api/exercisetypes"),
  logExercise: (exerciseTypeId: string, durationMinutes: number) =>
    request<ExerciseLog>("/api/exerciselog", json({ exerciseTypeId, durationMinutes, loggedTimestamp: now() })),

  addWater: (amountMl: number) =>
    request<HydrationLog>("/api/hydrationlog", json({ amountMl, loggedTimestamp: now() })),

  history: <T>(kind: LogKind, page: number, pageSize = 10) =>
    request<Paged<T>>(`/api/${kind}?page=${page}&pageSize=${pageSize}`),
  deleteLog: (kind: LogKind, id: string) => request<void>(`/api/${kind}/${id}`, { method: "DELETE" }),

  notifications: () => request<AppNotification[]>("/api/notifications?count=20"),
  markRead: (id: string) => request<void>(`/api/notifications/${id}/read`, { method: "POST" }),
};
