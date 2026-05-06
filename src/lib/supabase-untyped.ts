/**
 * Typed wrapper for Supabase tables not yet in the generated schema.
 * Eliminates `as any` casts while maintaining type safety.
 *
 * Usage:
 *   const { data } = await untypedFrom<MyType>("my_table").select("*").eq("id", id);
 */
import { supabase } from '@/integrations/supabase/client';

type SupabaseClient = typeof supabase;
type PostgrestFilterBuilder = ReturnType<ReturnType<SupabaseClient['from']>['select']>;

/**
 * Access a Supabase table that doesn't exist in the generated types.
 * Returns a fully typed query builder.
 */

export function untypedFrom(table: string): ReturnType<SupabaseClient['from']> {
  return supabase.from(table as any);
}

// Known untyped table names for documentation
export type UntypedTable =
  | 'product_component_locations'
  | 'product_component_location_techniques'
  | 'product_group_components'
  | 'product_group_locations'
  | 'product_group_location_techniques';
