import React from "react";
import { Check, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";
import { useBluAuth } from "../contexts/BluAuthContext";
import { accessControlService, accessPages, defaultAccessRoles, type AccessRole } from "../services/accessControlService";

export const AccessSettingsPage: React.FC = () => {
  const { user } = useBluAuth();
  const [roles, setRoles] = React.useState<AccessRole[]>(defaultAccessRoles);
  const [selectedRoleId, setSelectedRoleId] = React.useState(defaultAccessRoles[0].id);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    if (!user) return;
    accessControlService.get(user.companyId).then((settings) => {
      setRoles(settings.roles);
      setSelectedRoleId(settings.roles[0]?.id || defaultAccessRoles[0].id);
    }).finally(() => setLoading(false));
  }, [user]);

  const selected = roles.find((role) => role.id === selectedRoleId) || roles[0];
  const updateSelected = (value: Partial<AccessRole>) => {
    if (!selected) return;
    setRoles((current) => current.map((role) => role.id === selected.id ? { ...role, ...value } : role));
  };
  const togglePage = (key: any) => {
    if (!selected) return;
    const pages = selected.pages.includes(key)
      ? selected.pages.filter((item) => item !== key)
      : [...selected.pages, key];
    updateSelected({ pages });
  };
  const addRole = () => {
    const baseName = "Novo tipo de usuário";
    const id = `${accessControlService.normalizeRoleId(baseName)}-${Date.now().toString(36)}`;
    const role: AccessRole = { id, name: baseName, description: "Defina quais páginas este perfil poderá acessar.", pages: ["dashboard", "profile"] };
    setRoles((current) => [...current, role]);
    setSelectedRoleId(id);
  };
  const removeRole = () => {
    if (!selected || selected.system) return;
    const next = roles.filter((role) => role.id !== selected.id);
    setRoles(next);
    setSelectedRoleId(next[0]?.id || "");
  };
  const save = async () => {
    if (!user) return;
    setSaving(true);
    setMessage("");
    await accessControlService.save(user.companyId, user.id, { roles });
    setSaving(false);
    setMessage("Níveis de acesso salvos com sucesso.");
    setTimeout(() => setMessage(""), 2400);
  };

  if (loading) return <div className="h-96 animate-pulse rounded-3xl bg-slate-200" />;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Configurações</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Níveis de acesso</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">Configure quais páginas cada tipo de usuário pode acessar. A validação definitiva deve ser reforçada no backend quando as funções forem implantadas.</p>
        </div>
        <button onClick={save} disabled={saving} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
          <Save size={17} /> {saving ? "Salvando..." : "Salvar configurações"}
        </button>
      </header>

      {message && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</p>}

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold">Tipos de usuário</h2>
            <button onClick={addRole} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-white"><Plus size={16} /></button>
          </div>
          <div className="mt-4 space-y-2">
            {roles.map((role) => (
              <button key={role.id} onClick={() => setSelectedRoleId(role.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selected?.id === role.id ? "border-blue-200 bg-blue-50" : "border-slate-100 hover:border-slate-200"}`}>
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-blue-600"><ShieldCheck size={17} /></span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{role.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{role.pages.length} página(s)</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {selected && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="grid flex-1 gap-3 md:grid-cols-2">
                <label className="text-xs font-bold text-slate-600">Nome do perfil
                  <input value={selected.name} onChange={(event) => updateSelected({ name: event.target.value })} className="mt-2 w-full rounded-xl border px-3 py-2.5 text-sm font-normal" />
                </label>
                <label className="text-xs font-bold text-slate-600">Descrição
                  <input value={selected.description || ""} onChange={(event) => updateSelected({ description: event.target.value })} className="mt-2 w-full rounded-xl border px-3 py-2.5 text-sm font-normal" />
                </label>
              </div>
              {!selected.system && (
                <button onClick={removeRole} className="flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-600">
                  <Trash2 size={16} /> Remover
                </button>
              )}
            </div>

            <div className="mt-5">
              <h3 className="font-bold">Páginas permitidas</h3>
              <p className="mt-1 text-sm text-slate-500">Marque as áreas que este tipo de usuário poderá visualizar.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {accessPages.map((page) => {
                  const checked = selected.pages.includes(page.key);
                  return (
                    <button key={page.key} onClick={() => togglePage(page.key)} className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${checked ? "border-blue-200 bg-blue-50 text-blue-900" : "border-slate-100 hover:border-slate-200"}`}>
                      <span>
                        <b className="block text-sm">{page.label}</b>
                        <small className="mt-1 block text-slate-500">{page.path}</small>
                      </span>
                      <span className={`grid h-6 w-6 place-items-center rounded-full border ${checked ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 text-transparent"}`}><Check size={14} /></span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
