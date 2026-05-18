export function getPagination(query = {}) {
  const page = Math.max(Number(query.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize || 20), 1), 100);
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  return { page, pageSize, skip, take };
}
