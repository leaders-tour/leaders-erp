import { gql, useMutation, useQuery } from '@apollo/client';
import { EmployeeRole } from '@tour/domain';

export interface EmployeeRow {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const EMPLOYEES_QUERY = gql`
  query Employees($activeOnly: Boolean) {
    employees(activeOnly: $activeOnly) {
      id
      name
      email
      role
      isActive
      createdAt
      updatedAt
    }
  }
`;

const CREATE_EMPLOYEE_MUTATION = gql`
  mutation CreateEmployee($input: EmployeeCreateInput!) {
    createEmployee(input: $input) {
      id
      name
      email
      role
      isActive
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_EMPLOYEE_MUTATION = gql`
  mutation UpdateEmployee($id: ID!, $input: EmployeeUpdateInput!) {
    updateEmployee(id: $id, input: $input) {
      id
      name
      email
      role
      isActive
      createdAt
      updatedAt
    }
  }
`;

const RESET_EMPLOYEE_PASSWORD_MUTATION = gql`
  mutation ResetEmployeePassword($id: ID!, $input: EmployeePasswordResetInput!) {
    resetEmployeePassword(id: $id, input: $input) {
      id
      name
      email
      role
      isActive
      createdAt
      updatedAt
    }
  }
`;

const DEACTIVATE_EMPLOYEE_MUTATION = gql`
  mutation DeactivateEmployee($id: ID!) {
    deactivateEmployee(id: $id) {
      id
      name
      email
      role
      isActive
      createdAt
      updatedAt
    }
  }
`;

export function useEmployees(activeOnly = true) {
  const { data, loading, refetch } = useQuery<{ employees: EmployeeRow[] }>(EMPLOYEES_QUERY, {
    variables: { activeOnly },
  });

  return { employees: data?.employees ?? [], loading, refetch };
}

export function useCreateEmployee() {
  const [mutate, { loading }] = useMutation<{ createEmployee: EmployeeRow }>(CREATE_EMPLOYEE_MUTATION);

  return {
    loading,
    createEmployee: async (input: { name: string; email: string; password: string; role: EmployeeRole }): Promise<EmployeeRow> => {
      const result = await mutate({
        variables: { input },
        refetchQueries: [{ query: EMPLOYEES_QUERY, variables: { activeOnly: false } }],
      });

      if (!result.data?.createEmployee) {
        throw new Error('직원 생성에 실패했습니다.');
      }

      return result.data.createEmployee;
    },
  };
}

export function useUpdateEmployee() {
  const [mutate, { loading }] = useMutation<{ updateEmployee: EmployeeRow }>(UPDATE_EMPLOYEE_MUTATION);

  return {
    loading,
    updateEmployee: async (
      id: string,
      input: { name?: string; email?: string; role?: EmployeeRole; isActive?: boolean },
    ): Promise<EmployeeRow> => {
      const result = await mutate({
        variables: { id, input },
        refetchQueries: [{ query: EMPLOYEES_QUERY, variables: { activeOnly: false } }],
      });

      if (!result.data?.updateEmployee) {
        throw new Error('직원 수정에 실패했습니다.');
      }

      return result.data.updateEmployee;
    },
  };
}

export function useResetEmployeePassword() {
  const [mutate, { loading }] = useMutation<{ resetEmployeePassword: EmployeeRow }>(RESET_EMPLOYEE_PASSWORD_MUTATION);

  return {
    loading,
    resetEmployeePassword: async (id: string, newPassword: string): Promise<EmployeeRow> => {
      const result = await mutate({
        variables: { id, input: { newPassword } },
        refetchQueries: [{ query: EMPLOYEES_QUERY, variables: { activeOnly: false } }],
      });

      if (!result.data?.resetEmployeePassword) {
        throw new Error('비밀번호 재설정에 실패했습니다.');
      }

      return result.data.resetEmployeePassword;
    },
  };
}

export function useDeactivateEmployee() {
  const [mutate, { loading }] = useMutation<{ deactivateEmployee: EmployeeRow }>(DEACTIVATE_EMPLOYEE_MUTATION);

  return {
    loading,
    deactivateEmployee: async (id: string): Promise<EmployeeRow> => {
      const result = await mutate({
        variables: { id },
        refetchQueries: [{ query: EMPLOYEES_QUERY, variables: { activeOnly: false } }],
      });

      if (!result.data?.deactivateEmployee) {
        throw new Error('직원 비활성화에 실패했습니다.');
      }

      return result.data.deactivateEmployee;
    },
  };
}
