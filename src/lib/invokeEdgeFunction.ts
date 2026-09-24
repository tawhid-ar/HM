import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * supabase-js's `functions.invoke()` has a sharp edge: when the Edge
 * Function responds with a non-2xx status, the `error` it returns is a
 * `FunctionsHttpError` whose `.message` is always the same generic string
 * — "Edge Function returned a non-2xx status code" — regardless of what
 * the function actually said. The real body (e.g. our functions'
 * `{ error: "..." }` JSON) is sitting on `error.context`, which is the raw
 * `Response` object, and has to be read with `await error.context.json()`.
 *
 * Every hook that calls `manage-role`/`manage-user` used to do
 * `if (error) throw error`, which threw that generic wrapper and lost
 * whatever specific reason the function actually gave (wrong role, bad
 * input, a missing env var on the function's side, etc.) — so every
 * failure surfaced identically no matter the cause. This normalizes that:
 * always throws a plain Error whose message is the function's real one
 * when available.
 */
export async function invokeEdgeFunction<T = unknown>(
  name: string,
  body: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      let message = error.message;
      try {
        const body = await error.context.json();
        if (body?.error) message = body.error;
      } catch {
        // response body wasn't JSON (e.g. a gateway error page) — keep the generic message
      }
      throw new Error(message);
    }
    // FunctionsFetchError (network) / FunctionsRelayError — no useful body to read
    throw new Error(error.message);
  }

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String((data as { error: unknown }).error));
  }

  return data as T;
}
