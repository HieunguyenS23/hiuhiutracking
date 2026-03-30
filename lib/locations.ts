const subVN = require('sub-vn');

type RawWard = {
  code: string;
  name: string;
  unit: string;
};

type RawDistrict = {
  code: string;
  name: string;
  unit: string;
  wards?: Record<string, RawWard>;
};

type RawProvince = {
  code: string;
  name: string;
  unit: string;
  districts?: Record<string, RawDistrict>;
};

export type WardOption = {
  code: string;
  name: string;
  fullName: string;
};

export type DistrictOption = {
  code: string;
  name: string;
  fullName: string;
  wards: WardOption[];
};

export type ProvinceOption = {
  code: string;
  name: string;
  fullName: string;
  districts: DistrictOption[];
};

function normalizeProvinceName(name: string) {
  return name.trim();
}

function normalizeDistrictName(name: string) {
  return name.trim();
}

function normalizeWardName(name: string) {
  return name.trim();
}

const rawTree = subVN.getProvincesWithDetail() as Record<string, RawProvince>;

export const locationTree: ProvinceOption[] = Object.values(rawTree)
  .map((province) => ({
    code: province.code,
    name: province.name,
    fullName: normalizeProvinceName(province.name),
    districts: Object.values(province.districts || {}).map((district) => ({
      code: district.code,
      name: district.name,
      fullName: normalizeDistrictName(district.name),
      wards: Object.values(district.wards || {}).map((ward) => ({
        code: ward.code,
        name: ward.name,
        fullName: normalizeWardName(ward.name),
      })),
    })),
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
