import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';
import { loadWorkspaceEnv } from './load-workspace-env';

let supabaseAdminClient: SupabaseClient | null = null;

function requireSupabaseEnv(name: 'SUPABASE_URL' | 'SUPABASE_SECRET_KEY'): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} 환경변수가 설정되지 않았습니다.`);
  }
  return value;
}

/**
 * 서버 전용 Supabase 클라이언트입니다.
 *
 * SUPABASE_SECRET_KEY는 RLS를 우회할 수 있으므로 브라우저 코드에 노출하거나
 * 사용자 입력만으로 임의 테이블을 조회하는 용도로 사용하면 안 됩니다.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (supabaseAdminClient) {
    return supabaseAdminClient;
  }

  loadWorkspaceEnv();
  const supabaseUrl = requireSupabaseEnv('SUPABASE_URL');
  const supabaseSecretKey = requireSupabaseEnv('SUPABASE_SECRET_KEY');

  try {
    new URL(supabaseUrl);
  } catch {
    throw new Error('SUPABASE_URL이 올바른 URL 형식이 아닙니다.');
  }

  supabaseAdminClient = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    realtime: {
      // `ws` constructor types differ from DOM WebSocket but are runtime-compatible in Node.
      transport: ws as never,
    },
  });

  return supabaseAdminClient;
}
