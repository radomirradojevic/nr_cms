"use client";

import { createContext, useContext, useMemo } from "react";

import {
  DEFAULT_REGIONAL_SETTINGS,
  formatRegionalDate,
  formatRegionalDateTime,
  formatRegionalTime,
  type RegionalSettings,
} from "@/lib/regional-settings";

type RegionalSettingsContextValue = RegionalSettings & {
  formatDate: (date: Date | string | number) => string;
  formatDateTime: (date: Date | string | number) => string;
  formatTime: (date: Date | string | number) => string;
};

const RegionalSettingsContext =
  createContext<RegionalSettingsContextValue | null>(null);

export function RegionalSettingsProvider({
  value,
  children,
}: {
  value: RegionalSettings;
  children: React.ReactNode;
}) {
  const contextValue = useMemo<RegionalSettingsContextValue>(
    () => ({
      ...value,
      formatDate: (date) => formatRegionalDate(date, value),
      formatDateTime: (date) => formatRegionalDateTime(date, value),
      formatTime: (date) => formatRegionalTime(date, value),
    }),
    [value],
  );

  return (
    <RegionalSettingsContext.Provider value={contextValue}>
      {children}
    </RegionalSettingsContext.Provider>
  );
}

export function useRegionalSettings(): RegionalSettingsContextValue {
  return (
    useContext(RegionalSettingsContext) ?? {
      ...DEFAULT_REGIONAL_SETTINGS,
      formatDate: (date) => formatRegionalDate(date, DEFAULT_REGIONAL_SETTINGS),
      formatDateTime: (date) =>
        formatRegionalDateTime(date, DEFAULT_REGIONAL_SETTINGS),
      formatTime: (date) => formatRegionalTime(date, DEFAULT_REGIONAL_SETTINGS),
    }
  );
}
