/**
 * @module operational-dashboard/utils/product-match
 * @purpose Filtra registros por operação (produto) no dashboard.
 */

import type { OperationId } from '../constants/operations';
import { OPERATION_KEYWORDS } from '../constants/operations';

export function productMatchesOperations(
  produto: string | null | undefined,
  selected: OperationId[],
): boolean {
  if (selected.length === 0) return true;
  const p = (produto ?? '').toLowerCase();
  return selected.some((op) =>
    OPERATION_KEYWORDS[op].some((kw) => p.includes(kw)),
  );
}
