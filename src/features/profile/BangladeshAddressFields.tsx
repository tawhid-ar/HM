import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Spinner } from '../../components/common/ui';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  EMPTY_ADDRESS_FORM,
  loadBangladeshLocations,
  locationLabel,
  type BangladeshDistrict,
  type BangladeshDivision,
  type BangladeshUpazila,
  type BangladeshArea,
  type AddressFormValue,
} from './bangladeshLocations';

export { EMPTY_ADDRESS_FORM };

interface SearchableLocationInputProps<T extends { id: string; name: { local: string; en: string } }> {
  id: string;
  label: string;
  valueId: string;
  options: T[];
  placeholder: string;
  language: 'en' | 'bn';
  disabled?: boolean;
  onSelect: (item: T | null) => void;
}

function SearchableLocationInput<T extends { id: string; name: { local: string; en: string } }>({
  id, label, valueId, options, placeholder, language, disabled = false, onSelect,
}: SearchableLocationInputProps<T>) {
  const selected = options.find((item) => item.id === valueId) ?? null;
  const selectedLabel = selected ? locationLabel(selected, language) : '';
  const [text, setText] = useState(selectedLabel);
  const listId = `${id}-options`;

  useEffect(() => setText(selectedLabel), [selectedLabel]);

  const labels = useMemo(() => {
    const map = new Map<string, T>();
    options.forEach((item) => {
      map.set(locationLabel(item, language).toLocaleLowerCase(), item);
      map.set(item.name.en.toLocaleLowerCase(), item);
      map.set(item.name.local.toLocaleLowerCase(), item);
    });
    return map;
  }, [options, language]);

  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <input
        id={id}
        type="text"
        list={listId}
        className="input"
        value={text}
        disabled={disabled}
        autoComplete="off"
        placeholder={placeholder}
        onChange={(event) => {
          const nextText = event.target.value;
          setText(nextText);
          const normalized = nextText.trim().toLocaleLowerCase();
          const exact = labels.get(normalized);
          if (exact) onSelect(exact);
          else if (!normalized) onSelect(null);
        }}
        onBlur={() => {
          const exact = labels.get(text.trim().toLocaleLowerCase());
          if (exact) {
            setText(locationLabel(exact, language));
            onSelect(exact);
          } else setText(selectedLabel);
        }}
      />
      <datalist id={listId}>
        {options.map((item) => <option key={item.id} value={locationLabel(item, language)} />)}
      </datalist>
    </div>
  );
}

export function BangladeshAddressFields({
  value, onChange, idPrefix, disabled = false,
}: {
  value: AddressFormValue;
  onChange: (value: AddressFormValue) => void;
  idPrefix: string;
  disabled?: boolean;
}) {
  const { tr, language } = useLanguage();
  const locations = useQuery({
    queryKey: ['bangladesh-location-hierarchy'],
    queryFn: loadBangladeshLocations,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 2,
  });

  const divisions = locations.data ?? [];
  const selectedDivision = divisions.find((item) => item.id === value.divisionId) ?? null;
  const districts: BangladeshDistrict[] = selectedDivision?.district ?? [];
  const selectedDistrict = districts.find((item) => item.id === value.districtId) ?? null;
  const upazilas: BangladeshUpazila[] = selectedDistrict?.upazila ?? [];
  const selectedUpazila = upazilas.find((item) => item.id === value.upazilaId) ?? null;
  const areas: BangladeshArea[] = selectedUpazila?.area ?? [];
  const selectedName = (item: { name: { local: string; en: string } } | null) => item ? (language === 'bn' ? item.name.local : item.name.en) : '';

  const selectDivision = (division: BangladeshDivision | null) => onChange({
    ...value,
    divisionId: division?.id ?? '', divisionName: selectedName(division),
    districtId: '', districtName: '', upazilaId: '', upazilaName: '', areaId: '', areaName: '',
  });
  const selectDistrict = (district: BangladeshDistrict | null) => onChange({
    ...value,
    districtId: district?.id ?? '', districtName: selectedName(district),
    upazilaId: '', upazilaName: '', areaId: '', areaName: '',
  });
  const selectUpazila = (upazila: BangladeshUpazila | null) => onChange({
    ...value, upazilaId: upazila?.id ?? '', upazilaName: selectedName(upazila), areaId: '', areaName: '',
  });
  const selectArea = (area: BangladeshArea | null) => onChange({
    ...value, areaId: area?.id ?? '', areaName: selectedName(area),
  });

  if (locations.isLoading) {
    return <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 text-sm text-gray-500"><Spinner className="h-4 w-4" /> {tr('Loading Bangladesh divisions, districts, thana/upazila and areas...', 'বাংলাদেশের বিভাগ, জেলা, থানা/উপজেলা ও এলাকা লোড হচ্ছে...')}</div>;
  }

  if (locations.isError) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-3 text-sm text-red-700">
        {tr('Could not load the location list. Check your internet connection and try again.', 'লোকেশন তালিকা লোড করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।')}
        <button type="button" className="ml-2 font-semibold underline" onClick={() => locations.refetch()}>{tr('Try again', 'আবার চেষ্টা করুন')}</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SearchableLocationInput
        id={`${idPrefix}-division`} label={tr('Division', 'বিভাগ')} valueId={value.divisionId} options={divisions} language={language}
        placeholder={tr('Search and select division', 'বিভাগ খুঁজে নির্বাচন করুন')} disabled={disabled} onSelect={selectDivision}
      />
      <SearchableLocationInput
        id={`${idPrefix}-district`} label={tr('District', 'জেলা')} valueId={value.districtId} options={districts} language={language}
        placeholder={selectedDivision ? tr('Search and select district', 'জেলা খুঁজে নির্বাচন করুন') : tr('Select a division first', 'আগে বিভাগ নির্বাচন করুন')}
        disabled={disabled || !selectedDivision} onSelect={selectDistrict}
      />
      <SearchableLocationInput
        id={`${idPrefix}-upazila`} label={tr('Thana / Upazila', 'থানা / উপজেলা')} valueId={value.upazilaId} options={upazilas} language={language}
        placeholder={selectedDistrict ? tr('Search and select thana/upazila', 'থানা/উপজেলা খুঁজে নির্বাচন করুন') : tr('Select a district first', 'আগে জেলা নির্বাচন করুন')}
        disabled={disabled || !selectedDistrict} onSelect={selectUpazila}
      />
      <SearchableLocationInput
        id={`${idPrefix}-area`} label={tr('Area / Union', 'এলাকা / ইউনিয়ন')} valueId={value.areaId} options={areas} language={language}
        placeholder={selectedUpazila ? tr('Search and select area/union', 'এলাকা/ইউনিয়ন খুঁজে নির্বাচন করুন') : tr('Select thana/upazila first', 'আগে থানা/উপজেলা নির্বাচন করুন')}
        disabled={disabled || !selectedUpazila} onSelect={selectArea}
      />
      <div>
        <label htmlFor={`${idPrefix}-address-line`} className="field-label">{tr('House / Road / Details', 'বাসা / রোড / বিস্তারিত')}</label>
        <textarea
          id={`${idPrefix}-address-line`} className="textarea min-h-[104px]" rows={3} value={value.addressLine} disabled={disabled} maxLength={500}
          onChange={(event) => onChange({ ...value, addressLine: event.target.value })}
          placeholder={tr('Example: House 12, Road 5, Mirpur-10', 'যেমন: বাড়ি ১২, রোড ৫, মিরপুর-১০')}
        />
      </div>
    </div>
  );
}
