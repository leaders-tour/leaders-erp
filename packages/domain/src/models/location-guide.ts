export interface LocationGuide {
  id: string;
  title: string;
  description: string;
  imageUrls: string[];
  locationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
