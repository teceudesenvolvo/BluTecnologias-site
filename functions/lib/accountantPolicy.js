"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCompanyActionAllowed = void 0;
const administratorRoles = new Set(['administrador', 'administrator', 'proprietário', 'proprietario', 'owner']);
const isCompanyActionAllowed = (access, module, action, owner = false) => {
    if (owner)
        return true;
    if (!access || access.status !== 'active')
        return false;
    if (administratorRoles.has(String(access.role || '').trim().toLowerCase()))
        return true;
    return access.permissions?.[module]?.[action] === true;
};
exports.isCompanyActionAllowed = isCompanyActionAllowed;
//# sourceMappingURL=accountantPolicy.js.map