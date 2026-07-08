"use client";

import { createClient } from "@supabase/supabase-js";
import { useEffect } from "react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      })
    : null;

type RealtimeTable = {
  table: string;
  schema?: string;
};

const APP_DATA_CHANGED_EVENT = "app-data-changed";

type AppDataChangedDetail = {
  tables?: string[];
};

export function triggerAppDataRefresh(tables: string[] = []) {
  window.dispatchEvent(new CustomEvent<AppDataChangedDetail>(APP_DATA_CHANGED_EVENT, { detail: { tables } }));
}

export function canonicalDepartmentName(name: string) {
  const normalized = String(name || "").trim().toLowerCase();

  const aliases: Record<string, string> = {
    "human resource": "Human Resources",
    "human resources": "Human Resources",
    hr: "Human Resources",
    administration: "Administration",
    admin: "Administration",
    "marketing & sales": "Marketing & Sales",
    "operations & logistics": "Operations & Logistics",
    "health, safety & environment (hse)": "Health, Safety & Environment (HSE)",
    construction: "Construction",
    engineering: "Engineering",
    "accounting & finance": "Accounting & Finance",
    main: "Main",
  };

  return aliases[normalized] || String(name || "").trim();
}

export function uniqueCanonicalDepartments(departments: Array<{ id?: string; name: string }>) {
  return Array.from(
    new Map(
      departments
        .map((department) => ({
          id: department.id || department.name,
          name: canonicalDepartmentName(department.name),
        }))
        .filter((department) => Boolean(department.name))
        .map((department) => [department.name.toLowerCase(), department]),
    ).values(),
  );
}

export function useSupabaseTableRefresh(tables: RealtimeTable[], onChange: () => void) {
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase.channel(`ui-sync:${tables.map((table) => table.table).join("-")}`);

    tables.forEach(({ schema = "public", table }) => {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema,
          table,
        },
        () => {
          onChange();
        },
      );
    });

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [onChange, tables]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<AppDataChangedDetail>;
      const changedTables = customEvent.detail?.tables || [];
      if (changedTables.length === 0) {
        onChange();
        return;
      }

      if (tables.some((table) => changedTables.includes(table.table))) {
        onChange();
      }
    };

    window.addEventListener(APP_DATA_CHANGED_EVENT, handler);
    return () => window.removeEventListener(APP_DATA_CHANGED_EVENT, handler);
  }, [onChange, tables]);
}
