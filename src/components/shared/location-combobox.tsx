"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { searchLocations } from "@/app/(dashboard)/assets/actions";
import { getLocationById } from "@/app/(dashboard)/locations/actions";
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

type LocationOption = {
  id: string;
  name: string;
  city: string | null;
};

type LocationComboboxProps = {
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
};

export function LocationCombobox({
  value,
  onChange,
  placeholder = "Select location...",
}: LocationComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<LocationOption[]>([]);
  const [selected, setSelected] = useState<LocationOption | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSelected() {
      if (!value) {
        setSelected(null);
        return;
      }

      try {
        const location = await getLocationById(value);
        if (!mounted || !location) {
          return;
        }

        setSelected({
          id: location.id,
          name: location.name,
          city: location.city,
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
        const result = await searchLocations(search);
        if (mounted) {
          setOptions(result as LocationOption[]);
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
            <span className="truncate">
              {selected.name}
              {selected.city ? `, ${selected.city}` : ""}
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
            placeholder="Search locations..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No locations found.</CommandEmpty>
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
                  {option.name}
                  {option.city ? (
                    <span className="ml-2 text-xs text-muted-foreground">{option.city}</span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
