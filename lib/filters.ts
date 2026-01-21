export interface SortParams {
  orderBy: string;
  sortOrder: 'asc' | 'desc';
}

export function getSortParams(
  searchParams: URLSearchParams,
  allowedFields: string[],
  defaultField = 'createdAt'
): SortParams {
  const orderBy = searchParams.get('orderBy') || defaultField;
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
  
  // Sécurité : vérifier que le champ est autorisé
  if (!allowedFields.includes(orderBy)) {
    return { orderBy: defaultField, sortOrder: 'desc' };
  }
  
  if (sortOrder !== 'asc' && sortOrder !== 'desc') {
    return { orderBy, sortOrder: 'desc' };
  }
  
  return { orderBy, sortOrder };
}

export function buildDateFilter(searchParams: URLSearchParams) {
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  
  if (!from && !to) return undefined;
  
  const filter: { gte?: Date; lte?: Date } = {};
  
  if (from) {
    filter.gte = new Date(from);
  }
  
  if (to) {
    filter.lte = new Date(to);
  }
  
  return filter;
}
