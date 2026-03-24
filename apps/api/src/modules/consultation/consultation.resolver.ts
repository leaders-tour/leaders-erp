import type { AppContext } from '../../context';
import { ConsultationService } from './consultation.service';

export const consultationResolver = {
  Mutation: {
    extractConsultationForm: async (
      _parent: unknown,
      args: { rawText: string },
      ctx: AppContext,
    ) => {
      const apiKey = process.env.OPENAI_API_KEY?.trim() || null;
      const { default: OpenAI } = await import('openai');
      const openai = apiKey ? new OpenAI({ apiKey }) : null;
      const service = new ConsultationService(ctx.prisma, openai);
      return service.toDraft(args.rawText);
    },
  },
};
