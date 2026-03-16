export interface RegionLodging {
  id: string;
  regionId: string;
  name: string;
  priceKrw: number | null;
  pricePerPersonKrw: number | null;
  pricePerTeamKrw: number | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
