import { Input } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import { formatLocationNameInline, includesLocationNameKeyword } from '../location/display';

interface LocationOption {
  id: string;
  regionName: string;
  name: string[];
}

interface MultiDayBlockLocationSearchSelectProps {
  locations: LocationOption[];
  selectedLocationId: string;
  onSelect: (locationId: string) => void;
  placeholder?: string;
}

export function MultiDayBlockLocationSearchSelect({
  locations,
  selectedLocationId,
  onSelect,
  placeholder = '목적지 검색 또는 선택',
}: MultiDayBlockLocationSearchSelectProps): JSX.Element {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === selectedLocationId),
    [locations, selectedLocationId],
  );

  useEffect(() => {
    setSearch(selectedLocation ? formatLocationNameInline(selectedLocation.name) : '');
  }, [selectedLocation]);

  const filteredLocations = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return locations;
    }

    return locations.filter(
      (location) =>
        includesLocationNameKeyword(location.name, keyword) || location.regionName.toLowerCase().includes(keyword),
    );
  }, [locations, search]);

  return (
    <div className="relative">
      <Input
        value={search}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          setSearch(event.target.value);
          onSelect('');
          setOpen(true);
        }}
        placeholder={placeholder}
      />
      {open ? (
        <div className="absolute left-0 right-0 top-[44px] z-20 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          {filteredLocations.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">검색 결과가 없습니다.</div>
          ) : (
            filteredLocations.map((location) => (
              <button
                key={location.id}
                type="button"
                onClick={() => {
                  onSelect(location.id);
                  setSearch(formatLocationNameInline(location.name));
                  setOpen(false);
                }}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"
              >
                {formatLocationNameInline(location.name)} ({location.regionName})
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
