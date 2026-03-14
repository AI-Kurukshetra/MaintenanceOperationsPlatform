"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { getAssetById, searchAssets } from "@/app/(dashboard)/assets/actions";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type AssetOption = {
  id: string;
  name: string;
  asset_code: string;
};

type AssetComboboxProps = {
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
};

export function AssetCombobox({
  value,
  onChange,
  placeholder = "Select asset...",
}: AssetComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<AssetOption[]>([]);
  const [selected, setSelected] = useState<AssetOption | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSelected() {
      if (!value) {
        setSelected(null);
        return;
      }

      try {
        const asset = await getAssetById(value);
        if (!mounted || !asset) {
          return;
        }

        setSelected({
          id: asset.id,
          name: asset.name,
          asset_code: asset.asset_code,
        });
      } catch {
        if (mounted) {
          setSelected(null);
        }
      }
    }

    void loadSelected();

    return () => {
      mounted = false;
    };
  }, [value]);

  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(async () => {
      try {
        const result = await searchAssets(search);
        if (mounted) {
          setOptions(result as AssetOption[]);
        }
      } catch {
        if (mounted) {
          setOptions([]);
        }
      }
    }, 250);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [search, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <span className="font-mono text-xs text-muted-foreground">{selected.asset_code}</span>
              {selected.name}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <div className="flex items-center gap-1">
            {selected ? (
              <X
                className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelected(null);
                  onChange(null);
                }}
              />
            ) : null}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search assets..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No assets found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.id}
                  onSelect={() => {
                    setSelected(option);
                    onChange(option.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="mr-2 font-mono text-xs text-muted-foreground">
                    {option.asset_code}
                  </span>
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
