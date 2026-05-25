"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Inbox,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type SortDirection = "asc" | "desc";

export interface ColumnDef<T> {
  /** Stable identifier for the column. Used for sort state. */
  id: string;
  /** Header content. Plain string is preferred; arbitrary nodes work too. */
  header: React.ReactNode;
  /** Renders the cell for a row. */
  cell: (row: T) => React.ReactNode;
  /** When true the header is clickable and toggles sort direction. */
  sortable?: boolean;
  /** Primitive value used for comparison when sorting. Strings, numbers, null. */
  sortValue?: (row: T) => string | number | null | undefined;
  /** Text contribution this column makes to the searchable haystack. */
  searchValue?: (row: T) => string;
  align?: "left" | "right" | "center";
  /** CSS width (e.g. `"160px"`) hint. With `table-fixed` this is honored. */
  width?: string;
  /** Floor for the column when it would otherwise flex. Aggregated into the
   *  table's `min-width` so the layout scrolls horizontally on small screens
   *  instead of squishing. Pixel values only (e.g. `"280px"`). */
  minWidth?: string;
  headerClassName?: string;
  cellClassName?: string;
}

export interface BulkAction<T> {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "default" | "destructive";
  /** Runs the action for every selected row. Implementations are expected to
   *  parallelise internally (e.g. via `Promise.allSettled`). Throw to signal
   *  full or partial failure. */
  run: (rows: T[]) => Promise<void>;
  confirm?: {
    title: (rows: T[]) => string;
    description: (rows: T[]) => React.ReactNode;
    confirmLabel?: string;
  };
  /** Override the success toast. Defaults to `"{label} {n} {plural}"`. */
  successMessage?: (rows: T[]) => string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  getRowKey: (row: T) => string;

  /** Navigate to this href when a row is activated (click / Enter). */
  rowHref?: (row: T) => string;
  /** Alternative to `rowHref` for arbitrary side effects. */
  onRowClick?: (row: T) => void;

  loading?: boolean;
  loaded?: boolean;

  defaultSort?: { columnId: string; direction: SortDirection };
  searchPlaceholder?: string;

  /** Slot rendered on the right side of the toolbar when bulk mode is off. */
  toolbar?: React.ReactNode;
  /** Custom empty state for the no-data case. */
  emptyState?: React.ReactNode;

  /* Bulk-select API — controlled by the parent so the toggle button can sit
   * next to the page's primary action (e.g. "New agent"). */
  bulkSelectMode?: boolean;
  onBulkSelectModeChange?: (next: boolean) => void;
  bulkActions?: BulkAction<T>[];
  /** Used in toast copy: e.g. `{ singular: "agent", plural: "agents" }`. */
  resourceLabel?: { singular: string; plural: string };
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function parsePxWidth(w: string | undefined): number {
  if (!w) return 0;
  const m = /^(\d+(?:\.\d+)?)px$/i.exec(w.trim());
  return m ? parseFloat(m[1]) : 0;
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, {
    sensitivity: "base",
    numeric: true,
  });
}

function TriStateCheckbox({
  checked,
  indeterminate,
  onChange,
  ariaLabel,
  disabled,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
  disabled?: boolean;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate && !checked;
  }, [indeterminate, checked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={ariaLabel}
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
      className="accent-primary size-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export function DataTable<T>(props: DataTableProps<T>) {
  const {
    data,
    columns,
    getRowKey,
    rowHref,
    onRowClick,
    loading,
    loaded = true,
    defaultSort,
    searchPlaceholder = "Search…",
    toolbar,
    emptyState,
    bulkSelectMode = false,
    onBulkSelectModeChange,
    bulkActions = [],
    resourceLabel,
  } = props;

  const router = useRouter();
  const [navigatingKey, setNavigatingKey] = React.useState<string | null>(null);

  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<{
    columnId: string | null;
    direction: SortDirection | null;
  }>(() =>
    defaultSort
      ? { columnId: defaultSort.columnId, direction: defaultSort.direction }
      : { columnId: null, direction: null }
  );

  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());

  // Clear selection whenever bulk-mode flips off. Done during render via the
  // "adjusting state on prop change" pattern from the React docs — this is
  // preferred over an effect because it doesn't trigger an extra render and
  // it satisfies the no-set-state-in-effect lint rule.
  const [prevBulkMode, setPrevBulkMode] = React.useState(bulkSelectMode);
  if (prevBulkMode !== bulkSelectMode) {
    setPrevBulkMode(bulkSelectMode);
    if (!bulkSelectMode && selected.size > 0) setSelected(new Set());
  }

  const colById = React.useMemo(() => {
    const m = new Map<string, ColumnDef<T>>();
    for (const c of columns) m.set(c.id, c);
    return m;
  }, [columns]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((row) => {
      for (const c of columns) {
        const sv = c.searchValue?.(row);
        if (sv && sv.toLowerCase().includes(q)) return true;
      }
      return false;
    });
  }, [data, columns, query]);

  const sorted = React.useMemo(() => {
    const { columnId, direction } = sort;
    if (!columnId || !direction) return filtered;
    const col = colById.get(columnId);
    if (!col?.sortValue) return filtered;
    const list = [...filtered];
    list.sort((a, b) => {
      const cmp = compareValues(col.sortValue!(a), col.sortValue!(b));
      return direction === "asc" ? cmp : -cmp;
    });
    return list;
  }, [filtered, sort, colById]);

  // Selections by key — derive the actual row objects from the source `data`
  // so stale keys (e.g. after a delete) are silently dropped.
  const selectedRows = React.useMemo(
    () => data.filter((r) => selected.has(getRowKey(r))),
    [data, selected, getRowKey]
  );

  const visibleSelectedCount = React.useMemo(
    () =>
      sorted.reduce(
        (acc, r) => acc + (selected.has(getRowKey(r)) ? 1 : 0),
        0
      ),
    [sorted, selected, getRowKey]
  );
  const allVisibleSelected =
    sorted.length > 0 && visibleSelectedCount === sorted.length;
  const someVisibleSelected =
    visibleSelectedCount > 0 && !allVisibleSelected;

  function toggleAllVisible(next: boolean) {
    setSelected((prev) => {
      const s = new Set(prev);
      if (next) for (const r of sorted) s.add(getRowKey(r));
      else for (const r of sorted) s.delete(getRowKey(r));
      return s;
    });
  }

  function toggleRow(key: string) {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(key)) s.delete(key);
      else s.add(key);
      return s;
    });
  }

  function clickHeader(c: ColumnDef<T>) {
    if (!c.sortable) return;
    setSort((prev) => {
      if (prev.columnId !== c.id) {
        return { columnId: c.id, direction: "asc" };
      }
      return {
        columnId: c.id,
        direction: prev.direction === "asc" ? "desc" : "asc",
      };
    });
  }

  function activateRow(row: T) {
    if (bulkSelectMode) {
      toggleRow(getRowKey(row));
      return;
    }
    if (onRowClick) {
      onRowClick(row);
      return;
    }
    if (rowHref) {
      setNavigatingKey(getRowKey(row));
      router.push(rowHref(row));
    }
  }

  /* Bulk action runner --------------------------------------------------- */

  const [pendingAction, setPendingAction] =
    React.useState<BulkAction<T> | null>(null);
  const [running, setRunning] = React.useState(false);

  async function runAction(action: BulkAction<T>) {
    const rows = selectedRows;
    if (rows.length === 0) return;
    setRunning(true);
    try {
      await action.run(rows);
      const fallback = `${action.label} · ${rows.length} ${pluralWord(rows.length, resourceLabel)}`;
      toast.success(action.successMessage?.(rows) ?? fallback);
      setSelected(new Set());
      onBulkSelectModeChange?.(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : `${action.label} failed`;
      toast.error(msg);
    } finally {
      setRunning(false);
      setPendingAction(null);
    }
  }

  function onTriggerAction(action: BulkAction<T>) {
    if (selectedRows.length === 0) return;
    if (action.confirm) setPendingAction(action);
    else runAction(action);
  }

  /* Rendering ------------------------------------------------------------ */

  const hasData = data.length > 0;
  const isInitialLoading = !!loading && !loaded;
  const showEmptyState = loaded && !hasData;
  const showNoMatches = loaded && hasData && sorted.length === 0;
  const totalCols = columns.length + (bulkSelectMode ? 1 : 0);

  // Sum of explicit pixel widths + per-column floors. Applied as the table's
  // `min-width` so the surrounding `overflow-x-auto` scrolls on narrow
  // viewports instead of letting columns collapse.
  const tableMinWidth = React.useMemo(() => {
    let total = bulkSelectMode ? 40 : 0;
    for (const c of columns) total += parsePxWidth(c.width ?? c.minWidth);
    return total > 0 ? `${total}px` : undefined;
  }, [columns, bulkSelectMode]);

  return (
    <div className="bg-card border-border overflow-hidden rounded-xl border shadow-sm">
      {/* Toolbar */}
      <div className="border-border flex flex-wrap items-center gap-3 border-b p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {bulkSelectMode ? (
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-muted-foreground text-xs tabular-nums">
              {selected.size === 0
                ? "Select rows to act on"
                : `${selected.size} selected`}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={selected.size === 0 || running}
                  >
                    {running && <Loader2 className="size-3.5 animate-spin" />}
                    Actions
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="min-w-40">
                {bulkActions.length === 0 ? (
                  <div className="text-muted-foreground px-2 py-1 text-xs">
                    No actions
                  </div>
                ) : (
                  bulkActions.map((a) => {
                    const Icon = a.icon;
                    return (
                      <DropdownMenuItem
                        key={a.id}
                        variant={
                          a.variant === "destructive"
                            ? "destructive"
                            : "default"
                        }
                        onClick={() => onTriggerAction(a)}
                      >
                        {Icon && <Icon className="size-4" />}
                        {a.label}
                      </DropdownMenuItem>
                    );
                  })
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onBulkSelectModeChange?.(false)}
              disabled={running}
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-3">
            {loaded && (
              <span className="text-muted-foreground hidden text-xs tabular-nums sm:inline">
                {sorted.length}
                {query && sorted.length !== data.length
                  ? ` of ${data.length}`
                  : ""}{" "}
                {sorted.length === 1 ? "result" : "results"}
              </span>
            )}
            {toolbar}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="relative overflow-x-auto">
        <table
          className="w-full table-fixed border-separate border-spacing-0 text-sm"
          style={tableMinWidth ? { minWidth: tableMinWidth } : undefined}
        >
          <thead>
            <tr className="bg-muted/30">
              {bulkSelectMode && (
                <th
                  scope="col"
                  className="border-border h-10 w-10 border-b px-3"
                >
                  <TriStateCheckbox
                    checked={allVisibleSelected}
                    indeterminate={someVisibleSelected}
                    onChange={(next) => toggleAllVisible(next)}
                    ariaLabel="Select all visible rows"
                    disabled={sorted.length === 0}
                  />
                </th>
              )}
              {columns.map((c) => {
                const isActive =
                  c.sortable && sort.columnId === c.id && sort.direction;
                const Icon = !c.sortable
                  ? null
                  : isActive === "asc"
                    ? ArrowUp
                    : isActive === "desc"
                      ? ArrowDown
                      : ChevronsUpDown;
                return (
                  <th
                    key={c.id}
                    scope="col"
                    style={c.width ? { width: c.width } : undefined}
                    className={cn(
                      "border-border text-muted-foreground h-10 border-b px-3 text-left text-[0.7rem] font-medium tracking-wider uppercase",
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                      c.sortable &&
                        "hover:text-foreground cursor-pointer select-none",
                      c.headerClassName
                    )}
                    onClick={() => clickHeader(c)}
                    aria-sort={
                      isActive === "asc"
                        ? "ascending"
                        : isActive === "desc"
                          ? "descending"
                          : c.sortable
                            ? "none"
                            : undefined
                    }
                  >
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5",
                        c.align === "right" && "w-full justify-end",
                        c.align === "center" && "w-full justify-center"
                      )}
                    >
                      {c.header}
                      {Icon && (
                        <Icon
                          className={cn(
                            "size-3.5 transition-opacity",
                            isActive ? "text-foreground" : "opacity-40"
                          )}
                        />
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isInitialLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {bulkSelectMode && (
                    <td className="border-border border-b px-3 py-3.5">
                      <Skeleton className="size-4" />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td
                      key={c.id}
                      className="border-border border-b px-3 py-3.5"
                    >
                      <Skeleton className="h-4 w-full max-w-48" />
                    </td>
                  ))}
                </tr>
              ))
            ) : showEmptyState ? (
              <tr>
                <td colSpan={totalCols} className="p-0">
                  {emptyState ?? (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                      <Inbox className="text-muted-foreground mb-3 size-8" />
                      <p className="text-muted-foreground text-sm">
                        No items yet
                      </p>
                    </div>
                  )}
                </td>
              </tr>
            ) : showNoMatches ? (
              <tr>
                <td colSpan={totalCols} className="p-0">
                  <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                    <p className="text-muted-foreground text-sm">
                      No matches for{" "}
                      <span className="text-foreground font-medium">
                        “{query}”
                      </span>
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuery("")}
                    >
                      Clear search
                    </Button>
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((row) => {
                const key = getRowKey(row);
                const isSelected = selected.has(key);
                const isNavigating = navigatingKey === key;
                const clickable = bulkSelectMode || !!rowHref || !!onRowClick;
                return (
                  <tr
                    key={key}
                    role={clickable ? "button" : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    aria-busy={isNavigating || undefined}
                    aria-selected={bulkSelectMode ? isSelected : undefined}
                    onClick={clickable ? () => activateRow(row) : undefined}
                    onKeyDown={
                      clickable
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              activateRow(row);
                            }
                          }
                        : undefined
                    }
                    className={cn(
                      "group/row relative outline-none transition-colors",
                      clickable &&
                        "hover:bg-muted/40 focus-visible:bg-muted/60 cursor-pointer",
                      isSelected &&
                        bulkSelectMode &&
                        "bg-primary/5 hover:bg-primary/10",
                      isNavigating && "pointer-events-none opacity-70"
                    )}
                  >
                    {bulkSelectMode && (
                      <td className="border-border w-10 border-b px-3 align-middle">
                        <TriStateCheckbox
                          checked={isSelected}
                          onChange={() => toggleRow(key)}
                          ariaLabel="Select row"
                        />
                      </td>
                    )}
                    {columns.map((c, colIdx) => (
                      <td
                        key={c.id}
                        className={cn(
                          "border-border border-b px-3 py-3 align-middle",
                          c.align === "right" && "text-right",
                          c.align === "center" && "text-center",
                          c.cellClassName
                        )}
                      >
                        {colIdx === 0 && isNavigating ? (
                          <span className="flex min-w-0 items-center gap-2">
                            <Loader2
                              className="text-primary size-4 shrink-0 animate-spin"
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1">{c.cell(row)}</span>
                          </span>
                        ) : (
                          c.cell(row)
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Confirm dialog */}
      <Dialog
        open={!!pendingAction}
        onOpenChange={(open) => {
          if (!open && !running) setPendingAction(null);
        }}
      >
        {pendingAction && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {pendingAction.confirm!.title(selectedRows)}
              </DialogTitle>
              <DialogDescription>
                {pendingAction.confirm!.description(selectedRows)}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose
                render={
                  <Button variant="ghost" size="md" disabled={running}>
                    Cancel
                  </Button>
                }
              />
              <Button
                variant={
                  pendingAction.variant === "destructive"
                    ? "destructive"
                    : "solid"
                }
                onClick={() => runAction(pendingAction)}
                disabled={running}
              >
                {running && <Loader2 className="size-4 animate-spin" />}
                {pendingAction.confirm?.confirmLabel ?? pendingAction.label}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function pluralWord(
  n: number,
  label: { singular: string; plural: string } | undefined
): string {
  if (!label) return n === 1 ? "item" : "items";
  return n === 1 ? label.singular : label.plural;
}
