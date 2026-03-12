import type {
  EmployeeCreateInput,
  EmployeePasswordResetInput,
  EmployeeSelfSignupInput,
  EmployeeUpdateInput,
  LoginInput,
} from '@tour/validation';

export type LoginDto = LoginInput;
export type EmployeeCreateDto = EmployeeCreateInput;
export type EmployeeSelfSignupDto = EmployeeSelfSignupInput;
export type EmployeeUpdateDto = EmployeeUpdateInput;
export type EmployeePasswordResetDto = EmployeePasswordResetInput;
