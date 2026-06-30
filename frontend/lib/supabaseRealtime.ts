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
