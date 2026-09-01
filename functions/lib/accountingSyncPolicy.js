"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyMatchesSearch = exports.normalizeCompanySearch = exports.obligationStatusFromPayable = void 0;
const obligationStatusFromPayable = (payableStatus, current = "awaiting_payment") => {
    if (payableStatus === "paid")
        return "paid";
    if (["cancelled", "reversed"].includes(payableStatus))
        return "awaiting_payment";
    return current;
};
exports.obligationStatusFromPayable = obligationStatusFromPayable;
const normalizeCompanySearch = (value) => value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
exports.normalizeCompanySearch = normalizeCompanySearch;
const companyMatchesSearch = (company, search) => {
    const normalizedSearch = (0, exports.normalizeCompanySearch)(search);
    if (!normalizedSearch)
        return true;
    const text = (0, exports.normalizeCompanySearch)(`${company.name || ""} ${company.tradeName || ""} ${company.document || ""} ${company.city || ""}`);
    const digits = search.replace(/\D/g, "");
    return text.includes(normalizedSearch) || Boolean(digits && String(company.document || "").replace(/\D/g, "").includes(digits));
};
exports.companyMatchesSearch = companyMatchesSearch;
//# sourceMappingURL=accountingSyncPolicy.js.map