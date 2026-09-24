export interface AddressFormValue {
  divisionId: string;
  divisionName: string;
  districtId: string;
  districtName: string;
  upazilaId: string;
  upazilaName: string;
  areaId: string;
  areaName: string;
  addressLine: string;
}

export const EMPTY_ADDRESS_FORM: AddressFormValue = {
  divisionId: '', divisionName: '', districtId: '', districtName: '', upazilaId: '', upazilaName: '', areaId: '', areaName: '', addressLine: '',
};

export function formatAddress(value: AddressFormValue) {
  return [value.addressLine, value.areaName, value.upazilaName, value.districtName, value.divisionName].map((part) => part.trim()).filter(Boolean).join(', ');
}

export function isAddressComplete(value: AddressFormValue) {
  return Boolean(value.divisionId && value.districtId && value.upazilaId && value.areaId && value.addressLine.trim().length >= 3);
}

export function savedAddressToFormValue(address: {
  division_id: string | null; division_name: string | null; district_id: string | null; district_name: string | null;
  upazila_id: string | null; upazila_name: string | null; area_id?: string | null; area_name?: string | null; address_line: string | null; address: string;
}): AddressFormValue {
  return {
    divisionId: address.division_id ?? '', divisionName: address.division_name ?? '', districtId: address.district_id ?? '', districtName: address.district_name ?? '',
    upazilaId: address.upazila_id ?? '', upazilaName: address.upazila_name ?? '', areaId: address.area_id ?? '', areaName: address.area_name ?? '',
    addressLine: address.address_line?.trim() || address.address,
  };
}

export interface BangladeshLocationName { local: string; en: string; }
export interface BangladeshArea { id: string; name: BangladeshLocationName; }
export interface BangladeshUpazila { id: string; name: BangladeshLocationName; area: BangladeshArea[]; }
export interface BangladeshDistrict { id: string; name: BangladeshLocationName; upazila: BangladeshUpazila[]; }
export interface BangladeshDivision { id: string; name: BangladeshLocationName; district: BangladeshDistrict[]; }

type RawDivision = { id: string; name: string; bn_name: string };
type RawDistrict = { id: string; division_id: string; name: string; bn_name: string };
type RawUpazila = { id: string; district_id: string; name: string; bn_name: string };
type RawArea = { id: string; upazilla_id?: string; upazila_id?: string; name: string; bn_name: string };
type PhpMyAdminJson = Array<{ type?: string; data?: unknown[] }>;

const DATA_URLS = {
  divisions: 'https://raw.githubusercontent.com/nuhil/bangladesh-geocode/master/divisions/divisions.json',
  districts: 'https://raw.githubusercontent.com/nuhil/bangladesh-geocode/master/districts/districts.json',
  upazilas: 'https://raw.githubusercontent.com/nuhil/bangladesh-geocode/master/upazilas/upazilas.json',
  areas: 'https://raw.githubusercontent.com/nuhil/bangladesh-geocode/master/unions/unions.json',
};
const CACHE_KEY = 'hadiya-mart:bd-location-hierarchy:v4';
let pendingRequest: Promise<BangladeshDivision[]> | null = null;

function readTableData<T>(payload: unknown): T[] {
  if (!Array.isArray(payload)) throw new Error('লোকেশন তালিকার ফরম্যাট সঠিক নয়');
  const table = (payload as PhpMyAdminJson).find((entry) => entry.type === 'table');
  if (table && Array.isArray(table.data)) return table.data as T[];
  // Some mirrors publish the same dataset as a plain array.
  if (payload.length && typeof payload[0] === 'object' && payload[0] !== null && 'id' in payload[0]) return payload as T[];
  throw new Error('লোকেশন তালিকার ফরম্যাট সঠিক নয়');
}

function isValidHierarchy(value: unknown): value is BangladeshDivision[] {
  if (!Array.isArray(value) || value.length !== 8) return false;
  const districts = value.flatMap((division) => Array.isArray((division as BangladeshDivision).district) ? (division as BangladeshDivision).district : []);
  const upazilas = districts.flatMap((district) => Array.isArray(district.upazila) ? district.upazila : []);
  const areas = upazilas.flatMap((upazila) => Array.isArray(upazila.area) ? upazila.area : []);
  return districts.length === 64 && upazilas.length >= 450 && areas.length >= 4000;
}

function readCache(): BangladeshDivision[] | null {
  try { const raw = window.localStorage.getItem(CACHE_KEY); if (!raw) return null; const parsed = JSON.parse(raw) as unknown; return isValidHierarchy(parsed) ? parsed : null; } catch { return null; }
}
function writeCache(data: BangladeshDivision[]) { try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* session still works */ } }
async function fetchJson(url: string) { const response = await fetch(url, { cache: 'force-cache' }); if (!response.ok) throw new Error('বাংলাদেশের লোকেশন তালিকা লোড করা যায়নি'); return response.json() as Promise<unknown>; }

/** Complete selectable hierarchy: Division -> District -> Thana/Upazila -> Union/Area. */
export function loadBangladeshLocations(): Promise<BangladeshDivision[]> {
  const cached = readCache(); if (cached) return Promise.resolve(cached); if (pendingRequest) return pendingRequest;
  pendingRequest = Promise.all([fetchJson(DATA_URLS.divisions), fetchJson(DATA_URLS.districts), fetchJson(DATA_URLS.upazilas), fetchJson(DATA_URLS.areas)])
    .then(([divisionPayload, districtPayload, upazilaPayload, areaPayload]) => {
      const divisions = readTableData<RawDivision>(divisionPayload);
      const districts = readTableData<RawDistrict>(districtPayload);
      const upazilas = readTableData<RawUpazila>(upazilaPayload);
      const areas = readTableData<RawArea>(areaPayload);
      const hierarchy: BangladeshDivision[] = divisions.map((division) => ({
        id: division.id, name: { local: division.bn_name.trim(), en: division.name.trim() },
        district: districts.filter((d) => d.division_id === division.id).map((district) => ({
          id: district.id, name: { local: district.bn_name.trim(), en: district.name.trim() },
          upazila: upazilas.filter((u) => u.district_id === district.id).map((upazila) => ({
            id: upazila.id, name: { local: upazila.bn_name.trim(), en: upazila.name.trim() },
            area: areas.filter((a) => (a.upazilla_id ?? a.upazila_id) === upazila.id).map((area) => ({ id: area.id, name: { local: area.bn_name.trim(), en: area.name.trim() } })),
          })),
        })),
      }));
      if (!isValidHierarchy(hierarchy)) throw new Error('সম্পূর্ণ লোকেশন তালিকা পাওয়া যায়নি');
      writeCache(hierarchy); return hierarchy;
    }).finally(() => { pendingRequest = null; });
  return pendingRequest;
}

export function locationLabel(item: { name: BangladeshLocationName }, language: 'en' | 'bn' = 'en') {
  if (language === 'bn') return item.name.en && item.name.en !== item.name.local ? `${item.name.local} (${item.name.en})` : item.name.local;
  return item.name.local && item.name.local !== item.name.en ? `${item.name.en} (${item.name.local})` : item.name.en;
}
