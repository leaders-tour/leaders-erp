import type { AppContext } from '../../context';
import { requireStaffOrAbove } from '../../lib/auth-guards';
import { AppSettingsService } from './app-settings.service';

interface UpdateAppSettingsArgs {
  input: {
    movementIntensityColors: Array<{ level: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4' | 'LEVEL_5'; color: string }>;
    rentalItemPresets: Array<{
      id: string;
      name: string;
      current: boolean;
      sharedQuantityRules: Array<{ id: string; minHeadcount: number; maxHeadcount: number | null; quantity: number }>;
      items: Array<{ id: string; label: string; unit: string; quantityFormula: string }>;
    }>;
    tourListRentalItemStock: {
      drone: number;
      starlink: number;
      powerbank: number;
    };
  };
}

export const appSettingsResolver = {
  Query: {
    appSettings: (_parent: unknown, _args: unknown, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      return new AppSettingsService(ctx.prisma).get();
    },
  },
  Mutation: {
    updateAppSettings: (_parent: unknown, args: UpdateAppSettingsArgs, ctx: AppContext) => {
      requireStaffOrAbove(ctx);
      return new AppSettingsService(ctx.prisma).update(args.input);
    },
  },
};
