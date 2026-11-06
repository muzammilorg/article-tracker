export function buildAuthorBills(rows) {
  const authors = new Map();
  for (const row of rows) {
    const name = row.author?.trim() || 'Unknown author';
    const bill = authors.get(name) || { author: name, count: 0, pricedCount: 0, total: 0, sites: [] };
    bill.count += row.count;
    bill.pricedCount += row.pricedCount || 0;
    bill.total += row.totalPrice || 0;
    bill.sites.push({ domain: row.domain, count: row.count, pricedCount: row.pricedCount || 0, amount: row.totalPrice || 0 });
    authors.set(name, bill);
  }
  return [...authors.values()].map(bill => ({...bill, sites: bill.sites.sort((a,b) => a.domain.localeCompare(b.domain))})).sort((a,b) => b.total-a.total || a.author.localeCompare(b.author));
}
