export const obligationStatusFromPayable = (payableStatus: string, current = "awaiting_payment") => {
  if (payableStatus === "paid") return "paid";
  if (["cancelled", "reversed"].includes(payableStatus)) return "awaiting_payment";
  return current;
};

export const normalizeCompanySearch = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

export const companyMatchesSearch = (company: {name?: string; tradeName?: string; document?: string; city?: string}, search: string) => {
  const normalizedSearch = normalizeCompanySearch(search);
  if (!normalizedSearch) return true;
  const text = normalizeCompanySearch(`${company.name || ""} ${company.tradeName || ""} ${company.document || ""} ${company.city || ""}`);
  const digits = search.replace(/\D/g, "");
  return text.includes(normalizedSearch) || Boolean(digits && String(company.document || "").replace(/\D/g, "").includes(digits));
};
