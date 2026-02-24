import type { LocationGuideCreateInput, LocationGuideUpdateInput } from '@tour/validation';
import type { UploadFile } from '../../lib/file-storage/client';

export type FileUploadInput = Promise<UploadFile>;
export type FileUploadLike = UploadFile | Promise<UploadFile>;

export interface LocationGuideCreateDto extends Omit<LocationGuideCreateInput, 'images'> {
  images: FileUploadLike[];
}

export interface LocationGuideUpdateDto extends Omit<LocationGuideUpdateInput, 'images'> {
  images?: FileUploadLike[];
}
