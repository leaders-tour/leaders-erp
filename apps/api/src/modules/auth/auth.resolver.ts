import type { AppContext } from '../../context';
import { requireAdmin, requireEmployee } from '../../lib/auth-guards';
import { AuthService } from './auth.service';
import type {
  EmployeeCreateDto,
  EmployeePasswordResetDto,
  EmployeeSelfSignupDto,
  EmployeeUpdateDto,
  LoginDto,
} from './auth.types';

interface LoginArgs {
  input: LoginDto;
}

interface EmployeesArgs {
  activeOnly?: boolean;
}

interface EmployeeCreateArgs {
  input: EmployeeCreateDto;
}

interface EmployeeSelfSignupArgs {
  input: EmployeeSelfSignupDto;
}

interface EmployeeUpdateArgs {
  id: string;
  input: EmployeeUpdateDto;
}

interface EmployeePasswordResetArgs {
  id: string;
  input: EmployeePasswordResetDto;
}

interface IdArgs {
  id: string;
}

export const authResolver = {
  Query: {
    me: (_parent: unknown, _args: unknown, ctx: AppContext) => new AuthService(ctx.prisma).me(requireEmployee(ctx)),
    employees: (_parent: unknown, args: EmployeesArgs, ctx: AppContext) =>
      new AuthService(ctx.prisma).listEmployees(requireEmployee(ctx), args.activeOnly ?? true),
  },
  Mutation: {
    login: (_parent: unknown, args: LoginArgs, ctx: AppContext) =>
      new AuthService(ctx.prisma).login(args.input, {
        res: ctx.res,
        userAgent: Array.isArray(ctx.req.headers['user-agent']) ? ctx.req.headers['user-agent'][0] : ctx.req.headers['user-agent'],
      }),
    registerEmployee: (_parent: unknown, args: EmployeeSelfSignupArgs, ctx: AppContext) =>
      new AuthService(ctx.prisma).registerEmployee(args.input, {
        res: ctx.res,
        userAgent: Array.isArray(ctx.req.headers['user-agent']) ? ctx.req.headers['user-agent'][0] : ctx.req.headers['user-agent'],
      }),
    refreshAccessToken: (_parent: unknown, _args: unknown, ctx: AppContext) =>
      new AuthService(ctx.prisma).refreshAccessToken(ctx.refreshToken, { res: ctx.res }),
    logout: (_parent: unknown, _args: unknown, ctx: AppContext) =>
      new AuthService(ctx.prisma).logout(ctx.refreshToken, { res: ctx.res }),
    createEmployee: (_parent: unknown, args: EmployeeCreateArgs, ctx: AppContext) => {
      requireAdmin(ctx);
      return new AuthService(ctx.prisma).createEmployee(args.input);
    },
    updateEmployee: (_parent: unknown, args: EmployeeUpdateArgs, ctx: AppContext) => {
      requireAdmin(ctx);
      return new AuthService(ctx.prisma).updateEmployee(args.id, args.input);
    },
    resetEmployeePassword: (_parent: unknown, args: EmployeePasswordResetArgs, ctx: AppContext) => {
      requireAdmin(ctx);
      return new AuthService(ctx.prisma).resetEmployeePassword(args.id, args.input);
    },
    deactivateEmployee: (_parent: unknown, args: IdArgs, ctx: AppContext) => {
      requireAdmin(ctx);
      return new AuthService(ctx.prisma).deactivateEmployee(args.id);
    },
  },
};
