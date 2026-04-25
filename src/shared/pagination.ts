export function parsePagination(query: { page?: number; limit?: number }) {
  const page = query.page && query.page > 0 ? query.page : 1;
  const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
