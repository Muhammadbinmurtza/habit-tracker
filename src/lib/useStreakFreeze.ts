import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "habit-freezes";
const MAX_FREEZES = 2;
const WINDOW_DAYS = 30;

type FreezeState = { usedAt: string[] };

function loadFreezes(): FreezeState {
  if (typeof window === "undefined") return { usedAt: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { usedAt: [] };
  } catch {
    return { usedAt: [] };
  }
}

function saveFreezes(state: FreezeState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export function useStreakFreeze() {
  const [freezes, setFreezes] = useState<FreezeState>({ usedAt: [] });

  useEffect(() => {
    setFreezes(loadFreezes());
  }, []);

  const available = useCallback(() => {
    const recent = freezes.usedAt.filter((d) => daysAgo(d) <= WINDOW_DAYS);
    return MAX_FREEZES - recent.length;
  }, [freezes]);

  const useFreeze = useCallback(() => {
    const recent = freezes.usedAt.filter((d) => daysAgo(d) <= WINDOW_DAYS);
    if (recent.length >= MAX_FREEZES) return false;
    const updated = { usedAt: [...recent, new Date().toISOString()] };
    setFreezes(updated);
    saveFreezes(updated);
    return true;
  }, [freezes]);

  const resetIn = useCallback(() => {
    const recent = freezes.usedAt.filter((d) => daysAgo(d) <= WINDOW_DAYS);
    if (recent.length === 0) return 0;
    const oldest = recent.reduce((min, d) =>
      daysAgo(d) < daysAgo(min) ? d : min,
    );
    return WINDOW_DAYS - daysAgo(oldest);
  }, [freezes]);

  return { available: available(), useFreeze, remaining: available(), resetIn: resetIn() };
}
