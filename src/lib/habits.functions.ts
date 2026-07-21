import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const FrequencyFields = {
  frequency_type: z.enum(["daily", "weekdays", "weekly_count"]).optional(),
  frequency_days: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  frequency_count: z.number().int().min(1).max(7).optional(),
};

const HabitInput = z.object({
  name: z.string().trim().min(1).max(80),
  emoji: z.string().trim().min(1).max(8),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  reminder_time: z
    .string()
    .regex(TIME_REGEX)
    .nullable()
    .optional(),
  ...FrequencyFields,
});

const SELECT_COLS =
  "id, name, emoji, color, sort_order, archived, created_at, reminder_time, frequency_type, frequency_days, frequency_count";

export const listHabits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("habits")
      .select(SELECT_COLS)
      .eq("archived", false)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listAllHabits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("habits")
      .select(SELECT_COLS)
      .order("archived", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("habit_logs")
      .select("habit_id, log_date")
      .eq("completed", true);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

function normalizeTime(v: string | null | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  // Postgres returns HH:MM:SS — strip seconds for input consistency
  return v.length >= 5 ? v.slice(0, 5) : v;
}

export const createHabit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(HabitInput)
  .handler(async ({ context, data }) => {
    const { data: max } = await context.supabase
      .from("habits")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (max?.sort_order ?? -1) + 1;
    const { data: row, error } = await context.supabase
      .from("habits")
      .insert({
        user_id: context.userId,
        name: data.name,
        emoji: data.emoji,
        color: data.color,
        sort_order: nextOrder,
        reminder_time: normalizeTime(data.reminder_time) ?? null,
        frequency_type: data.frequency_type ?? "daily",
        frequency_days: data.frequency_days ?? [],
        frequency_count: data.frequency_count ?? 7,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const UpdateInput = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(80).optional(),
  emoji: z.string().trim().min(1).max(8).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  archived: z.boolean().optional(),
  reminder_time: z
    .string()
    .regex(TIME_REGEX)
    .nullable()
    .optional(),
  ...FrequencyFields,
});

export const updateHabit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(UpdateInput)
  .handler(async ({ context, data }) => {
    const { id, reminder_time, ...rest } = data;
    const patch = {
      ...rest,
      ...(reminder_time !== undefined
        ? { reminder_time: normalizeTime(reminder_time) }
        : {}),
    };
    const { data: row, error } = await context.supabase
      .from("habits")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteHabit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("habits").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ToggleInput = z.object({
  habitId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const toggleLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(ToggleInput)
  .handler(async ({ context, data }) => {
    const { data: existing } = await context.supabase
      .from("habit_logs")
      .select("id")
      .eq("habit_id", data.habitId)
      .eq("log_date", data.date)
      .maybeSingle();

    if (existing) {
      const { error } = await context.supabase
        .from("habit_logs")
        .delete()
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { completed: false };
    }

    const { error } = await context.supabase.from("habit_logs").insert({
      habit_id: data.habitId,
      user_id: context.userId,
      log_date: data.date,
      completed: true,
    });
    if (error) throw new Error(error.message);
    return { completed: true };
  });
