"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/primitives/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import type { ApiTransaction } from "@/types/api";
import { transactionLabel } from "./transaction-meta";

function formatDateTime(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatSigned(amount: number): string {
  const formatted = formatCurrency(Math.abs(amount));
  return amount < 0 ? `−${formatted}` : `+${formatted}`;
}

/**
 * Ledger read (endpoint #2). Positive amounts render green, negative muted-red;
 * the raw signed `amount` is shown. Type is a badge from the doc 14 §3.4 enum.
 */
export function TransactionsTable({
  transactions,
  loading,
  hasMore,
  onLoadMore,
  loadingMore,
}: {
  transactions: ApiTransaction[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  loadingMore: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="text-muted-foreground size-6 animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-muted-foreground text-sm">No transactions yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-muted-foreground pb-2 text-left font-medium">
                      Date
                    </th>
                    <th className="text-muted-foreground pb-2 text-left font-medium">
                      Type
                    </th>
                    <th className="text-muted-foreground pb-2 text-left font-medium">
                      Description
                    </th>
                    <th className="text-muted-foreground pb-2 text-right font-medium">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr
                      key={tx.transaction_id}
                      className="border-b last:border-0 hover:bg-muted/50"
                    >
                      <td className="text-muted-foreground py-2 whitespace-nowrap">
                        {formatDateTime(tx.created_at)}
                      </td>
                      <td className="py-2">
                        <Badge variant="secondary">
                          {transactionLabel(tx.type)}
                        </Badge>
                      </td>
                      <td className="text-muted-foreground py-2">
                        {tx.description ?? "—"}
                      </td>
                      <td
                        className={cn(
                          "py-2 text-right font-semibold tabular-nums",
                          tx.amount < 0
                            ? "text-destructive"
                            : "text-emerald-600 dark:text-emerald-500"
                        )}
                      >
                        {formatSigned(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore && <Loader2 className="size-4 animate-spin" />}
                  {loadingMore ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
