/**
 * @module operational-dashboard/components/routes/RouteAutocomplete
 * @purpose Autocomplete de origem/destino a partir de embarques reais.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchDistinctLocations } from '../../services/dashboard-queries';

interface RouteAutocompleteProps {
  label: string;
  field: 'origin' | 'destination';
  value: string;
  onChange: (value: string) => void;
}

export function RouteAutocomplete({ label, field, value, onChange }: RouteAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: options = [], isLoading } = useQuery({
    queryKey: ['op-dash-locations', field, search],
    queryFn: () => fetchDistinctLocations('embarques', field, search),
    enabled: open,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between sm:w-[280px]">
          {value || `Selecionar ${label.toLowerCase()}...`}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Buscar ${label.toLowerCase()}...`}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{isLoading ? 'Carregando...' : 'Nenhum resultado'}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__clear__"
                onSelect={() => {
                  onChange('');
                  setOpen(false);
                }}
              >
                Limpar filtro
              </CommandItem>
              {options.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  onSelect={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === opt ? 'opacity-100' : 'opacity-0')} />
                  {opt}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
