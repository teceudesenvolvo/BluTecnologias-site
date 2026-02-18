import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import * as cors from 'cors';

// Inicializa o admin apenas uma vez
try {
	admin.initializeApp();
} catch (e) {
	// já inicializado no ambiente do emulador ou em deploy
}

// Função HTTP de teste para verificar deploy/visibilidade
export const helloWorld = functions.https.onRequest((req, res) => {
	res.send('Hello from BluTecnologias functions!');
});

// Exemplo: exporte outras funções aqui quando necessário

// Helper to parse data URLs (data:<mime>;base64,<data>)
function parseDataUrl(dataUrl: string) {
	const match = /^data:(.+);base64,(.*)$/.exec(dataUrl);
	if (!match) return null;
	return { mime: match[1], base64: match[2] };
}

// Normalize config values (strip surrounding quotes and trim)
function normalizeCfgValue(v: any) {
	if (typeof v !== 'string') return v;
	let s = v.trim();
	if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
		s = s.slice(1, -1);
	}
	return s;
}

/**
 * Callable function to send billing emails.
 * Expects data: { clientId, title, value, bankAccount, invoiceFile?, reportFile?, selectedCertificates?, emailText? }
 */
export const sendBillingEmail = functions.https.onCall(async (data, context) => {
	try {
		const { clientId, title, value, bankAccount, invoiceFile, reportFile, emailText, certificateFiles } = data || {};

		if (!clientId) throw new functions.https.HttpsError('invalid-argument', 'clientId is required');

		// Fetch client from Realtime Database
		const snap = await admin.database().ref(`/contacts/${clientId}`).get();
		if (!snap.exists()) throw new functions.https.HttpsError('not-found', 'Client not found');
		const client = snap.val();

		const to = client.email || client.financialContact || null;
		if (!to) throw new functions.https.HttpsError('failed-precondition', 'Client has no email to send to');

		// Determine SMTP config: prefer functions config, then env vars
		const cfg = functions.config && (functions.config() as any).smtp ? (functions.config() as any).smtp : undefined;
		const host = normalizeCfgValue(cfg?.host) || process.env.SMTP_HOST;
		const portRaw = normalizeCfgValue(cfg?.port) || process.env.SMTP_PORT;
		const port = portRaw ? Number(portRaw) : undefined;
		const user = normalizeCfgValue(cfg?.user) || process.env.SMTP_USER;
		const pass = normalizeCfgValue(cfg?.pass) || process.env.SMTP_PASS;
		const from = normalizeCfgValue(cfg?.from) || process.env.FROM_EMAIL || user;

		if (!host || !port || !user || !pass || !from) {
			throw new functions.https.HttpsError('failed-precondition', 'SMTP configuration is missing. Set functions config or env vars.');
		}

		const transporter = nodemailer.createTransport({ host, port, auth: { user, pass }, secure: port === 465 });

		// Debug info (avoid logging secrets)
		console.log('sendBillingEmailHttp: smtp=', { host, port, user, from });

		const attachments: any[] = [];
		if (invoiceFile && typeof invoiceFile === 'string') {
			const parsed = parseDataUrl(invoiceFile);
			if (parsed) attachments.push({ filename: 'invoice', content: Buffer.from(parsed.base64, 'base64'), contentType: parsed.mime });
		}
		if (reportFile && typeof reportFile === 'string') {
			const parsed = parseDataUrl(reportFile);
			if (parsed) attachments.push({ filename: 'report', content: Buffer.from(parsed.base64, 'base64'), contentType: parsed.mime });
		}

		if (Array.isArray(certificateFiles)) {
			for (const cf of certificateFiles) {
				if (cf && typeof cf.filename === 'string' && typeof cf.dataUrl === 'string') {
					const parsed = parseDataUrl(cf.dataUrl);
					if (parsed) attachments.push({ filename: cf.filename, content: Buffer.from(parsed.base64, 'base64'), contentType: parsed.mime });
				}
			}
		}

		const html = `
			<p>Olá, Prezados</p>
      <p>À ${client.razaoSocial}</p>
      <p>Espero que este email os encontre bem. <br/>
      Estamos entrando em contato para enviar os arquivos em relação à fatura referente à ${solutionSelect || client.solutionSelect || 'serviços contratados'} </p>
      <ul>
        <li><strong>Título:</strong> ${title || '-'} </li>
        <li><strong>Valor:</strong> R$ ${Number(value || 0).toFixed(2)}</li>
        <li><strong>Conta para pagamento:</strong> ${bankAccount || '-'}</li>
      </ul>
      <p>${emailText || ''}</p>
      <p>Atenciosamente, LAVORO SERVIÇOS. <br/>
      
      <br/>Enviado utilizando o sistema Blu</p>
		`;

		const mailOptions = {
			from,
			to,
			subject: `Cobrança: ${title || 'Nova cobrança'}`,
			html,
			attachments
		} as any;

		await transporter.sendMail(mailOptions);

		return { success: true };
	} catch (err: any) {
		console.error('sendBillingEmail error:', err);
		if (err instanceof functions.https.HttpsError) throw err;
		throw new functions.https.HttpsError('internal', err.message || 'Unknown error');
	}
});

// CORS middleware instance (allow all origins; the function will be protected by auth if needed)
const corsHandler = cors({ origin: true });

// HTTP endpoint that accepts POST from the frontend (handles CORS preflight)
export const sendBillingEmailHttp = functions.https.onRequest((req, res) => {
	return corsHandler(req, res, async () => {
		// Log whether functions.config().smtp is present (do not log secrets)
		try {
			const cfgKeys = Object.keys(((functions.config() as any).smtp) || {});
			console.log('sendBillingEmailHttp: functions.config().smtp keys=', cfgKeys);
		} catch (e) {
			console.log('sendBillingEmailHttp: functions.config() not available or error reading it');
		}
		if (req.method !== 'POST') {
			return res.status(405).send('Method Not Allowed');
		}

		try {
			const data = req.body || {};
			const { clientId, title, value, bankAccount, invoiceFile, reportFile, emailText, certificateFiles } = data;
			if (!clientId) return res.status(400).json({ success: false, message: 'clientId is required' });

			const snap = await admin.database().ref(`/contacts/${clientId}`).get();
			if (!snap.exists()) return res.status(404).json({ success: false, message: 'Client not found' });
			const client = snap.val();

			const to = client.email || client.financialContact || null;
			if (!to) return res.status(412).json({ success: false, message: 'Client has no email to send to' });

			const cfg = functions.config && (functions.config() as any).smtp ? (functions.config() as any).smtp : undefined;
			const host = normalizeCfgValue(cfg?.host) || process.env.SMTP_HOST;
			const portRaw = normalizeCfgValue(cfg?.port) || process.env.SMTP_PORT;
			const port = portRaw ? Number(portRaw) : undefined;
			const user = normalizeCfgValue(cfg?.user) || process.env.SMTP_USER;
			const pass = normalizeCfgValue(cfg?.pass) || process.env.SMTP_PASS;
			const from = normalizeCfgValue(cfg?.from) || process.env.FROM_EMAIL || user;

			if (!host || !port || !user || !pass || !from) {
				return res.status(500).json({ success: false, message: 'SMTP configuration is missing.' });
			}

			const transporter = nodemailer.createTransport({ host, port, auth: { user, pass }, secure: port === 465 });

			const attachments: any[] = [];
			if (invoiceFile && typeof invoiceFile === 'string') {
				const parsed = parseDataUrl(invoiceFile);
				if (parsed) attachments.push({ filename: 'invoice', content: Buffer.from(parsed.base64, 'base64'), contentType: parsed.mime });
			}
			if (reportFile && typeof reportFile === 'string') {
				const parsed = parseDataUrl(reportFile);
				if (parsed) attachments.push({ filename: 'report', content: Buffer.from(parsed.base64, 'base64'), contentType: parsed.mime });
			}

			if (Array.isArray(certificateFiles)) {
				for (const cf of certificateFiles) {
					if (cf && typeof cf.filename === 'string' && typeof cf.dataUrl === 'string') {
						const parsed = parseDataUrl(cf.dataUrl);
						if (parsed) attachments.push({ filename: cf.filename, content: Buffer.from(parsed.base64, 'base64'), contentType: parsed.mime });
					}
				}
			}

			const html = `
				<p>Olá, Prezados</p>
      <p>À ${client.razaoSocial}</p>
      <p>Espero que este email os encontre bem. <br/>
      Estamos entrando em contato para enviar os arquivos em relação à fatura referente à ${solutionSelect || client.solutionSelect || 'serviços contratados'} </p>
      <ul>
        <li><strong>Título:</strong> ${title || '-'} </li>
        <li><strong>Valor:</strong> R$ ${Number(value || 0).toFixed(2)}</li>
        <li><strong>Conta para pagamento:</strong> ${bankAccount || '-'}</li>
      </ul>
      <p>${emailText || ''}</p>
      <p>Atenciosamente, LAVORO SERVIÇOS. <br/>
      
      <br/>Enviado utilizando o sistema Blu</p>
			`;

			const mailOptions = { from, to, subject: `Cobrança: ${title || 'Nova cobrança'}`, html, attachments } as any;
			console.log('sendBillingEmailHttp: sending mail', { to, from, attachments: attachments.length });
			try {
				await transporter.sendMail(mailOptions);
			} catch (sendErr: any) {
				console.error('sendBillingEmailHttp sendMail error:', sendErr && (sendErr.stack || sendErr));
				return res.status(500).json({ success: false, message: `sendMail error: ${sendErr?.message || 'unknown'}` });
			}
			return res.json({ success: true });
		} catch (err: any) {
			console.error('sendBillingEmailHttp error:', err && (err.stack || err));
			return res.status(500).json({ success: false, message: err?.message || 'Unknown error' });
		}
	});
});