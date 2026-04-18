import { GRAPHQL_URL } from './graphql-endpoint';

/**
 * GraphQL multipart spec 기반 파일 업로드 유틸.
 * Apollo HttpLink는 파일 업로드를 지원하지 않으므로 직접 FormData를 구성해 fetch로 전송한다.
 *
 * files 에는 실제 File 객체 배열을, variablePaths 에는 해당 파일이 매핑될 GraphQL variable 경로를 전달한다.
 * 예: files=[file1, file2], variablePaths=["variables.images.0", "variables.images.1"]
 */
export async function runUploadMutation<TData>(
  query: string,
  variables: Record<string, unknown>,
  files: File[],
  variablePaths: string[],
  accessToken: string | null,
): Promise<TData> {
  const map: Record<string, string[]> = {};
  files.forEach((_, index) => {
    map[String(index)] = [variablePaths[index]!];
  });

  const formData = new FormData();
  formData.append('operations', JSON.stringify({ query, variables }));
  formData.append('map', JSON.stringify(map));
  files.forEach((file, index) => {
    formData.append(String(index), file);
  });

  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers: {
      'apollo-require-preflight': 'true',
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  const json = (await response.json()) as {
    data?: TData;
    errors?: Array<{ message?: string }>;
  };

  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors[0]?.message ?? 'GraphQL upload failed');
  }
  if (!response.ok || !json.data) {
    throw new Error(`Upload request failed: ${response.status}`);
  }

  return json.data;
}
