import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';

export type EmailTemplateKey =
  | 'team_invite'
  | 'platform_team_invite'
  | 'collection_notice'
  | 'billing_pending'
  | 'billing_grace'
  | 'gateway_checkout';

export type EmailTemplateDoc = {
  key: EmailTemplateKey;
  name: string;
  subject: string;
  html: string;
  text: string;
  updatedAt?: string;
  updatedBy?: string;
};

const defaults: Record<EmailTemplateKey, EmailTemplateDoc> = {
  team_invite: {
    key: 'team_invite',
    name: 'Convite de equipe',
    subject: 'Convite para fazer parte da equipe Blu',
    html: '<p>Olá, {{name}}.</p><p>Você foi convidado para fazer parte da equipe na Blu.</p><p><strong>E-mail vinculado:</strong> {{email}}</p><p><a href="{{link}}">Criar minha conta</a></p>',
    text: 'Olá, {{name}}.\n\nVocê foi convidado para fazer parte da equipe na Blu.\nE-mail vinculado: {{email}}\nAcesse: {{link}}',
  },
  platform_team_invite: {
    key: 'platform_team_invite',
    name: 'Convite da equipe Blu',
    subject: 'Convite para a equipe Blu',
    html: '<p>Olá, {{name}}.</p><p>Você foi convidado para a equipe Blu.</p><p><strong>E-mail vinculado:</strong> {{email}}</p><p><a href="{{link}}">Criar minha conta</a></p>',
    text: 'Olá, {{name}}.\n\nVocê foi convidado para a equipe Blu.\nE-mail vinculado: {{email}}\nAcesse: {{link}}',
  },
  collection_notice: {
    key: 'collection_notice',
    name: 'Cobrança enviada',
    subject: 'Sua cobrança Blu está disponível',
    html: '<p>Olá, {{name}}.</p><p>Sua cobrança <strong>{{reference}}</strong> está disponível.</p><p><a href="{{link}}">Abrir cobrança</a></p>',
    text: 'Olá, {{name}}.\n\nSua cobrança {{reference}} está disponível.\nAcesse: {{link}}',
  },
  billing_pending: {
    key: 'billing_pending',
    name: 'Pagamento pendente',
    subject: 'Pagamento pendente na Blu',
    html: '<p>Olá, {{name}}.</p><p>Identificamos um pagamento pendente do plano <strong>{{planName}}</strong>.</p><p><a href="{{link}}">Regularizar pagamento</a></p>',
    text: 'Olá, {{name}}.\n\nIdentificamos um pagamento pendente do plano {{planName}}.\nRegularize em: {{link}}',
  },
  billing_grace: {
    key: 'billing_grace',
    name: 'Período de tolerância',
    subject: 'Sua assinatura Blu está no período de tolerância',
    html: '<p>Olá, {{name}}.</p><p>Sua assinatura entrou no período de tolerância.</p><p><a href="{{link}}">Atualizar pagamento</a></p>',
    text: 'Olá, {{name}}.\n\nSua assinatura entrou no período de tolerância.\nAtualize o pagamento em: {{link}}',
  },
  gateway_checkout: {
    key: 'gateway_checkout',
    name: 'Checkout e cobrança',
    subject: 'Conclua seu pagamento na Blu',
    html: '<p>Olá, {{name}}.</p><p>Seu checkout do plano <strong>{{planName}}</strong> está pronto.</p><p><a href="{{link}}">Concluir pagamento</a></p>',
    text: 'Olá, {{name}}.\n\nSeu checkout do plano {{planName}} está pronto.\nConclua em: {{link}}',
  },
};

const templateRef = (key: EmailTemplateKey) => doc(db, 'platformEmailTemplates', key);

const mergeTemplate = (key: EmailTemplateKey, value?: Partial<EmailTemplateDoc> | null): EmailTemplateDoc => ({
  ...defaults[key],
  ...(value || {}),
  key,
});

export const emailTemplateAdminService = {
  keys: Object.keys(defaults) as EmailTemplateKey[],
  defaults,

  async list(): Promise<EmailTemplateDoc[]> {
    const entries = await Promise.all(
      this.keys.map(async (key) => {
        try {
          const snapshot = await getDoc(templateRef(key));
          return mergeTemplate(key, snapshot.exists() ? (snapshot.data() as Partial<EmailTemplateDoc>) : null);
        } catch {
          return defaults[key];
        }
      }),
    );
    return entries;
  },

  async save(template: EmailTemplateDoc) {
    await setDoc(
      templateRef(template.key),
      {
        ...template,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.uid || '',
      },
      { merge: true },
    );
    return template;
  },

  render(template: EmailTemplateDoc, payload: Record<string, string | number | undefined | null>) {
    const apply = (source: string) =>
      source.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => String(payload[key] ?? ''));
    return {
      subject: apply(template.subject),
      html: apply(template.html),
      text: apply(template.text),
    };
  },
};
