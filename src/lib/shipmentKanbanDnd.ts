export type OverDataLike = { status?: unknown; columnStatus?: unknown } | null | undefined;

export function resolveDropStatus(overId: unknown, overData: OverDataLike): string | null {
  const dataStatus = typeof overData?.status === 'string' ? overData.status : null;
  if (dataStatus) return dataStatus;

  const columnStatus = typeof overData?.columnStatus === 'string' ? overData.columnStatus : null;
  if (columnStatus) return columnStatus;

  const id =
    typeof overId === 'string' || typeof overId === 'number'
      ? String(overId)
      : '';
  if (id.startsWith('column:')) return id.slice('column:'.length);

  return null;
}

