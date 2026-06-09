"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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
import type { UsageResponse } from "@/types/api";

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

  const maxTokens = usage
    ? Math.max(...usage.daily_usage.map((d) => d.total_tokens), 1)
    : 1;

  const yearOptions: number[] = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) {
    yearOptions.push(y);
  }

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
            <p className="text-3xl font-bold">{usage.total_cost}</p>
          </div>

          {/* Daily Token Usage Bar Chart */}
          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-baseline justify-between">
              <p className="font-semibold">Daily Token Usage</p>
              <p className="text-muted-foreground text-xs">
                Times shown in UTC
              </p>
            </div>
            <div className="overflow-x-auto">
              <div
                className="flex h-[220px] items-end gap-[2px]"
                style={{
                  minWidth: `${usage.daily_usage.length * 22}px`,
                }}
              >
                {usage.daily_usage.map((day) => {
                  const heightPct =
                    maxTokens > 0
                      ? (day.total_tokens / maxTokens) * 100
                      : 0;
                  const date = new Date(day.date + "T00:00:00");
                  const dayLabel = date.getDate();

                  return (
                    <div
                      key={day.date}
                      className="group relative flex h-full min-w-[18px] flex-1 flex-col items-center justify-end"
                    >
                      {/* Tooltip */}
                      <div className="pointer-events-none absolute bottom-full mb-2 hidden rounded bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md ring-1 ring-border group-hover:block">
                        {day.date}: {formatNumber(day.total_tokens)} tokens
                      </div>
                      {/* Bar */}
                      <div
                        className="w-full cursor-pointer rounded-sm bg-primary transition-all duration-300 hover:bg-primary/80"
                        style={{
                          height: `${Math.max(heightPct, day.total_tokens > 0 ? 2 : 0)}%`,
                        }}
                      />
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
                      <th className="text-muted-foreground pb-2 text-right font-medium">
                        Input Tokens
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
                        key={mc.model}
                        className="border-b last:border-0 hover:bg-muted/50"
                      >
                        <td className="py-2 font-mono text-sm">{mc.model}</td>
                        <td className="py-2 text-right tabular-nums">
                          {formatNumber(mc.input_tokens)}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {formatNumber(mc.output_tokens)}
                        </td>
                        <td className="py-2 text-right font-semibold tabular-nums">
                          {mc.cost}
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
