"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X, Plus, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
}

interface FilterCondition {
  id: string;
  column: string;
  operator: string;
  value: string;
}

interface FilterBarProps {
  columns: Column[];
  filters: Record<string, string>;
  onFilterChange: (filters: Record<string, string>) => void;
}

const OPERATORS = [
  { value: "equals", label: "等于" },
  { value: "contains", label: "包含" },
  { value: "starts_with", label: "开头是" },
  { value: "ends_with", label: "结尾是" },
  { value: "is_null", label: "为 null" },
  { value: "is_not_null", label: "不为 null" },
];

const NO_VALUE_OPERATORS = ["is_null", "is_not_null"];

export function FilterBar({
  columns,
  filters,
  onFilterChange,
}: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({});

  const pkColumn = columns.find((col) => col.isPrimaryKey);

  useEffect(() => {
    if (Object.keys(filters).length > 0) {
      const newConditions = Object.entries(filters).map(([key, value], index) => {
        const parts = key.split("__");
        const column = parts[0];
        const operator = parts.length === 2 ? parts[1] : "equals";
        return {
          id: `filter-${index}-${Date.now()}`,
          column,
          operator,
          value,
        };
      });
      setConditions(newConditions);
      if (newConditions.length > 0) {
        setShowFilters(true);
      }
    }
  }, []);

  const addCondition = () => {
    const defaultColumn = pkColumn?.name || columns[0]?.name || "";
    const newCondition: FilterCondition = {
      id: `filter-${Date.now()}`,
      column: defaultColumn,
      operator: "equals",
      value: "",
    };
    setConditions([...conditions, newCondition]);
  };

  const removeCondition = (id: string) => {
    const newConditions = conditions.filter((c) => c.id !== id);
    setConditions(newConditions);
    applyFilters(newConditions);
  };

  const updateCondition = (id: string, field: keyof FilterCondition, value: string) => {
    setConditions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const applyFilters = (conditionsToApply: FilterCondition[] = conditions) => {
    const activeFilters: Record<string, string> = {};
    conditionsToApply.forEach((c) => {
      if (c.column) {
        if (NO_VALUE_OPERATORS.includes(c.operator)) {
          const key = `${c.column}__${c.operator}`;
          activeFilters[key] = "1";
        } else if (c.value) {
          const key = `${c.column}__${c.operator}`;
          activeFilters[key] = c.value;
        }
      }
    });
    onFilterChange(activeFilters);
  };

  const clearFilters = () => {
    setConditions([]);
    onFilterChange({});
  };

  const toggleFilters = () => {
    if (!showFilters && conditions.length === 0) {
      addCondition();
    }
    setShowFilters(!showFilters);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      applyFilters();
    }
  };

  const activeFilterCount = Object.values(filters).filter((v) => v !== "").length;

  if (columns.length === 0) {
    return null;
  }

  return (
    <div className="border-neutral-100 border-b">
      <div className="flex items-center gap-2 px-5 py-3">
        <Button
          variant={showFilters ? "secondary" : "outline"}
          size="sm"
          onClick={toggleFilters}
          className="rounded-lg"
        >
          <Filter className="size-4" />
          筛选
          {activeFilterCount > 0 && (
            <span className="bg-neutral-900 ml-1 px-1.5 py-0.5 rounded-full tabular-nums text-white text-xs">
              {activeFilterCount}
            </span>
          )}
        </Button>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-neutral-500">
            <X className="size-4" />
            清除筛选
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="space-y-2 px-5 pb-4">
          {conditions.map((condition, index) => (
            <div key={condition.id} className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-neutral-400 hover:text-neutral-600 shrink-0"
                onClick={() => removeCondition(condition.id)}
                aria-label="删除筛选条件"
              >
                <X className="size-4" />
              </Button>

              <span className="w-12 text-neutral-400 text-sm shrink-0">
                {index === 0 ? "where" : "and"}
              </span>

              <Popover
                open={openPopovers[condition.id]}
                onOpenChange={(open) =>
                  setOpenPopovers((prev) => ({ ...prev, [condition.id]: open }))
                }
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openPopovers[condition.id]}
                    className="justify-between rounded-lg w-40 h-8 text-sm"
                  >
                    <span className="truncate">
                      {condition.column || "选择字段"}
                    </span>
                    <ChevronDown className="opacity-50 ml-2 w-4 h-4 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 rounded-xl w-48" align="start">
                  <Command>
                    <CommandInput placeholder="搜索字段..." />
                    <CommandList>
                      <CommandEmpty>未找到字段</CommandEmpty>
                      <CommandGroup>
                        {columns.map((column) => (
                          <CommandItem
                            key={column.name}
                            value={column.name}
                            onSelect={(value) => {
                              updateCondition(condition.id, "column", value);
                              setOpenPopovers((prev) => ({
                                ...prev,
                                [condition.id]: false,
                              }));
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 w-4 h-4",
                                condition.column === column.name
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <span className="truncate">{column.name}</span>
                            {column.isPrimaryKey && (
                              <span className="ml-1 text-neutral-400 text-xs">(PK)</span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <Select
                value={condition.operator}
                onValueChange={(value) =>
                  updateCondition(condition.id, "operator", value)
                }
              >
                <SelectTrigger className="rounded-lg w-28 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {OPERATORS.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {!NO_VALUE_OPERATORS.includes(condition.operator) && (
                <Input
                  placeholder="输入值"
                  value={condition.value}
                  onChange={(e) =>
                    updateCondition(condition.id, "value", e.target.value)
                  }
                  onKeyDown={handleKeyDown}
                  className="flex-1 rounded-lg min-w-32 h-8 text-sm"
                />
              )}
            </div>
          ))}

          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={addCondition}
              className="text-neutral-500"
            >
              <Plus className="size-4" />
              添加筛选
            </Button>
            {conditions.length > 0 && (
              <>
                <Button size="sm" onClick={() => applyFilters()} className="rounded-lg">
                  应用
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-neutral-500"
                >
                  清除筛选
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
