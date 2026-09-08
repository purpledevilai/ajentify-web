"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { useDoPageAction, useGetPageData } from "@ajentify/chat";
import { PageHeader } from "@/components/blocks/page-header";
import { Button } from "@/components/primitives/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrgStore } from "@/lib/stores/org-store";
import { usageApi } from "@/lib/api/usage";
import { getErrorMessage } from "@/lib/api/errors";
import { formatCurrency } from "@/lib/utils";
import type { DailyUsage, UsageResponse } from "@/types/api";

/**
 * The four cost buckets rendered as stacked segments in the daily bar chart.
 * Bucket order is always input / cache_hit / cache_write / output. Each entry
 * maps to its numeric cost + token fields on {@link DailyUsage} plus a color.
 */
const COST_BUCKETS: {
  key: string;
  label: string;
  costKey: keyof DailyUsage;
  tokenKey: keyof DailyUsage;
  color: string;
}[] = [
  {
    key: "input",
    label: "Input",
    costKey: "input_cost",
    tokenKey: "input_tokens",
    color: "bg-sky-500",
  },
  {
    key: "cache_hit",
    label: "Cache read",
    costKey: "cache_hit_cost",
    tokenKey: "cache_hit_tokens",
    color: "bg-violet-500",
  },
  {
    key: "cache_write",
    label: "Cache write",
    costKey: "cache_write_cost",
    tokenKey: "cache_write_tokens",
    color: "bg-amber-500",
  },
  {
    key: "output",
    label: "Output",
    costKey: "output_cost",
    tokenKey: "output_tokens",
    color: "bg-emerald-500",
  },
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getMonthDateRange(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { start_date: fmt(start), end_date: fmt(end) };
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

export default function UsagePage() {
  const now = new Date();
  const orgId = useOrgStore((s) => s.activeOrgId);

  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(
    async (year: number, month: number) => {
      if (!orgId) return;
      setLoading(true);
      setError(null);
      try {
        const { start_date, end_date } = getMonthDateRange(year, month);
        const data = await usageApi.get({ start_date, end_date, org_id: orgId });
        setUsage(data);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load usage data"));
        setUsage(null);
      } finally {
        setLoading(false);
      }
    },
    [orgId]
  );

  useEffect(() => {
    fetchUsage(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, fetchUsage]);

  const handleCurrentMonth = () => {
    const today = new Date();
    setSelectedMonth(today.getMonth());
    setSelectedYear(today.getFullYear());
  };

  const isCurrentMonth =
    selectedMonth === now.getMonth() && selectedYear === now.getFullYear();

  const maxDayTotalCost = usage
    ? Math.max(...usage.daily_usage.map((d) => d.total_cost), 0)
    : 0;

  const yearOptions: number[] = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) {
    yearOptions.push(y);
  }

  const SetMonthArgs = useMemo(
    () =>
      z.object({
        month: z
          .enum([
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December",
          ])
          .describe("The month name to view usage for."),
      }),
    []
  );

  const SetYearArgs = useMemo(
    () =>
      z.object({
        year: z
          .number()
          .int()
          .describe("The year to view usage for."),
      }),
    []
  );

  useGetPageData(
    () => ({
      data: {
        page: "usage",
        selected_month: MONTHS[selectedMonth],
        selected_year: selectedYear,
        loading,
        error,
        total_cost: usage?.total_cost ?? null,
        daily_usage_days: usage?.daily_usage.length ?? 0,
        model_costs: usage?.model_costs.map((mc) => ({
          model: mc.model,
          modality: mc.modality,
          input_tokens: mc.input_tokens,
          cache_hit_tokens: mc.cache_hit_tokens,
          cache_write_tokens: mc.cache_write_tokens,
          output_tokens: mc.output_tokens,
          cost: mc.cost,
        })) ?? [],
      },
      actions: {
        set_month: {
          description: "Change the selected month to view usage for.",
          argsSchema: z.toJSONSchema(SetMonthArgs),
        },
        set_year: {
          description: "Change the selected year to view usage for.",
          argsSchema: z.toJSONSchema(SetYearArgs),
        },
        go_to_current_month: {
          description:
            "Reset the filters to the current month and year.",
          argsSchema: { type: "object", properties: {}, additionalProperties: false },
        },
      },
    }),
    [usage, selectedMonth, selectedYear, loading, error, SetMonthArgs, SetYearArgs]
  );

  useDoPageAction(
    async (key, args) => {
      if (key === "set_month") {
        const parsed = SetMonthArgs.parse(args);
        const idx = MONTHS.indexOf(parsed.month);
        if (idx === -1) return { ok: false, error: "Invalid month name" };
        setSelectedMonth(idx);
        return { ok: true, month: parsed.month };
      }
      if (key === "set_year") {
        const parsed = SetYearArgs.parse(args);
        setSelectedYear(parsed.year);
        return { ok: true, year: parsed.year };
      }
      if (key === "go_to_current_month") {
        handleCurrentMonth();
        return { ok: true, month: MONTHS[now.getMonth()], year: now.getFullYear() };
      }
      return { ok: false, error: `unknown action: ${key}` };
    },
    [SetMonthArgs, SetYearArgs, handleCurrentMonth, now]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usage"
        subtitle="Monitor your organization's token usage and costs."
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={MONTHS[selectedMonth]}
          onValueChange={(val) => setSelectedMonth(MONTHS.indexOf(val as string))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(selectedYear)}
          onValueChange={(val) => setSelectedYear(Number(val))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {String(y)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCurrentMonth}
          disabled={isCurrentMonth}
        >
          Current Month
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="text-muted-foreground size-8 animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {!loading && usage && (
        <>
          {/* Total Cost */}
          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <p className="text-muted-foreground mb-1 text-sm">
              Total Cost &mdash; {MONTHS[selectedMonth]} {selectedYear}
            </p>
            <p className="text-3xl font-bold">
              {formatCurrency(usage.total_cost)}
            </p>
          </div>

          {/* Daily Cost Bar Chart (stacked by cost bucket) */}
          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-baseline justify-between">
              <p className="font-semibold">Daily Cost</p>
              <p className="text-muted-foreground text-xs">
                Times shown in UTC
              </p>
            </div>

            {/* Legend */}
            <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2">
              {COST_BUCKETS.map((bucket) => (
                <div key={bucket.key} className="flex items-center gap-1.5">
                  <span
                    className={`inline-block size-3 rounded-sm ${bucket.color}`}
                    aria-hidden
                  />
                  <span className="text-muted-foreground text-xs">
                    {bucket.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto">
              <div
                className="flex h-[220px] items-end gap-[2px]"
                style={{
                  minWidth: `${usage.daily_usage.length * 22}px`,
                }}
              >
                {usage.daily_usage.map((day) => {
                  const date = new Date(day.date + "T00:00:00");
                  const dayLabel = date.getDate();

                  return (
                    <div
                      key={day.date}
                      className="group relative flex h-full min-w-[18px] flex-1 flex-col items-center justify-end"
                    >
                      {/* Tooltip: per-bucket cost + tokens */}
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-max -translate-x-1/2 rounded bg-popover px-2 py-1.5 text-xs text-popover-foreground shadow-md ring-1 ring-border group-hover:block">
                        <p className="mb-1 font-medium">{day.date}</p>
                        {COST_BUCKETS.map((bucket) => (
                          <div
                            key={bucket.key}
                            className="flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <span
                              className={`inline-block size-2 rounded-sm ${bucket.color}`}
                              aria-hidden
                            />
                            <span className="text-muted-foreground">
                              {bucket.label}:
                            </span>
                            <span className="tabular-nums">
                              {formatCurrency(day[bucket.costKey] as number)}
                            </span>
                            <span className="text-muted-foreground tabular-nums">
                              ({formatNumber(day[bucket.tokenKey] as number)} tok)
                            </span>
                          </div>
                        ))}
                        <div className="mt-1 border-t pt-1 font-medium">
                          Total: {formatCurrency(day.total_cost)}
                        </div>
                      </div>

                      {/* Stacked bar (bottom → top: input, cache read, cache write, output) */}
                      <div className="flex w-full flex-1 flex-col-reverse">
                        {COST_BUCKETS.map((bucket) => {
                          const cost = day[bucket.costKey] as number;
                          const heightPct =
                            maxDayTotalCost > 0
                              ? (cost / maxDayTotalCost) * 100
                              : 0;
                          if (heightPct <= 0) return null;
                          return (
                            <div
                              key={bucket.key}
                              className={`w-full cursor-pointer ${bucket.color} transition-opacity duration-300 group-hover:opacity-80`}
                              style={{ height: `${heightPct}%` }}
                            />
                          );
                        })}
                      </div>

                      {/* Day label */}
                      <span className="text-muted-foreground mt-1 select-none text-[10px]">
                        {dayLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cost by Model Table */}
          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <p className="mb-4 font-semibold">Cost by Model</p>
            {usage.model_costs.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No model usage for this period.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-muted-foreground pb-2 text-left font-medium">
                        Model
                      </th>
                      <th className="text-muted-foreground pb-2 text-left font-medium">
                        Modality
                      </th>
                      <th className="text-muted-foreground pb-2 text-right font-medium">
                        Input Tokens
                      </th>
                      <th className="text-muted-foreground pb-2 text-right font-medium">
                        Cache Read Tokens
                      </th>
                      <th className="text-muted-foreground pb-2 text-right font-medium">
                        Cache Write Tokens
                      </th>
                      <th className="text-muted-foreground pb-2 text-right font-medium">
                        Output Tokens
                      </th>
                      <th className="text-muted-foreground pb-2 text-right font-medium">
                        Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.model_costs.map((mc) => (
                      <tr
                        key={`${mc.model}::${mc.modality}`}
                        className="border-b last:border-0 hover:bg-muted/50"
                      >
                        <td className="py-2 font-mono text-sm">{mc.model}</td>
                        <td className="py-2 text-sm">{mc.modality}</td>
                        <td className="py-2 text-right tabular-nums">
                          {formatNumber(mc.input_tokens)}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {formatNumber(mc.cache_hit_tokens)}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {formatNumber(mc.cache_write_tokens)}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {formatNumber(mc.output_tokens)}
                        </td>
                        <td className="py-2 text-right font-semibold tabular-nums">
                          {formatCurrency(mc.cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {!loading && !usage && !error && (
        <div className="flex justify-center py-12">
          <p className="text-muted-foreground">
            Select a month to view usage data.
          </p>
        </div>
      )}
    </div>
  );
}
