"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processMailQueue = exports.handleInboundEmail = exports.sendBillingEmailHttp = exports.sendBillingEmail = exports.helloWorld = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const cors = require("cors");
const https = require("https");
// Inicializa o admin apenas uma vez. Em alguns ambientes a Database URL
// não é detectada automaticamente, então tentamos montar a databaseURL a
// partir de variáveis de ambiente conhecidas (FIREBASE_DATABASE_URL ou
// GCLOUD_PROJECT/GCP_PROJECT). Isso evita o erro "Can't determine Firebase Database URL.".
try {
    if (!admin.apps.length) {
        const envDb = process.env.FIREBASE_DATABASE_URL || process.env.FIREBASE_DATABASEURL || process.env.FIREBASE_DATABASE;
        const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || process.env.GAE_APPLICATION || undefined;
        // Prefer explicit env var. If missing, try common Realtime DB host patterns.
        let databaseURL = envDb;
        if (!databaseURL && projectId) {
            // Newer projects often use <project>-default-rtdb.firebaseio.com
            const candidate1 = `https://${projectId}-default-rtdb.firebaseio.com`;
            const candidate2 = `https://${projectId}.firebaseio.com`;
            // Prefer candidate1 then candidate2
            databaseURL = candidate1 || candidate2;
            console.log('admin: inferred database candidates=', [candidate1, candidate2]);
        }
        if (databaseURL) {
            admin.initializeApp({ databaseURL });
            console.log('admin initialized with databaseURL=', databaseURL);
        }
        else {
            admin.initializeApp();
            console.log('admin initialized without explicit databaseURL');
        }
    }
}
catch (e) {
    // já inicializado no ambiente do emulador ou em deploy
    console.log('admin.initializeApp skipped or failed (already initialized?):', String(e));
}
// Função HTTP de teste para verificar deploy/visibilidade
exports.helloWorld = functions.https.onRequest((req, res) => {
    res.send('Hello from BluTecnologias functions!');
});
// Helper to parse data URLs (data:<mime>;base64,<data>)
function parseDataUrl(dataUrl) {
    const match = /^data:([^;]+);base64,([\s\S]*)$/.exec(dataUrl);
    if (!match)
        return null;
    return { mime: match[1], base64: match[2].replace(/\s/g, '') };
}
// Normalize config values (strip surrounding quotes and trim)
function normalizeCfgValue(v) {
    if (typeof v !== 'string')
        return v;
    let s = v.trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        s = s.slice(1, -1);
    }
    return s;
}
// Module-scoped transporter memoization mirroring oassessor logic
let cachedTransporter = null;
let cachedFrom = undefined;
function getTransporter() {
    if (cachedTransporter)
        return { transporter: cachedTransporter, from: cachedFrom };
    // Prefer process.env, then functions.config().smtp
    const cfg = functions.config && functions.config().smtp ? functions.config().smtp : undefined;
    const host = normalizeCfgValue(process.env.SMTP_HOST) || normalizeCfgValue(cfg?.host) || undefined;
    const portRaw = normalizeCfgValue(process.env.SMTP_PORT) || normalizeCfgValue(cfg?.port) || undefined;
    const port = portRaw ? Number(portRaw) : undefined;
    const user = normalizeCfgValue(process.env.SMTP_USER) || normalizeCfgValue(cfg?.user) || undefined;
    const pass = normalizeCfgValue(process.env.SMTP_PASS) || normalizeCfgValue(cfg?.pass) || undefined;
    const fromEmail = normalizeCfgValue(process.env.FROM_EMAIL) || normalizeCfgValue(cfg?.from) || user;
    const fromName = normalizeCfgValue(process.env.FROM_NAME) || 'BluTecnologias';
    if (!user || !pass) {
        // can't build transporter without auth
        return { transporter: null, from: fromEmail };
    }
    // If host indicates Gmail or explicit SERVICE env var, prefer using 'service: "gmail"' which simplifies config
    const useGmailService = (String(host || '').toLowerCase().includes('gmail')) || (process.env.SMTP_SERVICE === 'gmail');
    const transportOpts = useGmailService ? { service: 'gmail', auth: { user, pass } } : { host, port, auth: { user, pass }, secure: port === 465 };
    try {
        cachedTransporter = nodemailer.createTransport(transportOpts);
        cachedFrom = `${fromName} <${fromEmail}>`;
        console.log('getTransporter: created transporter, gmail=', useGmailService, 'host=', host ? 'present' : 'none');
        return { transporter: cachedTransporter, from: cachedFrom };
    }
    catch (e) {
        console.error('getTransporter: error creating transporter', String(e));
        return { transporter: null, from: fromEmail };
    }
}
async function saveReportToStorageAndDb(clientId, reportFile, title, userId) {
    try {
        if (!reportFile || !reportFile.startsWith('data:'))
            return;
        const reportRef = admin.database().ref(`contacts/${clientId}/reports`).push();
        await reportRef.set({
            id: reportRef.key,
            title: title || 'Relatório',
            month: new Date().toISOString().slice(0, 7),
            fileUrl: reportFile,
            date: new Date().toISOString(),
            userId: userId || null
        });
        console.log('Report saved successfully (base64):', reportRef.key);
    }
    catch (e) {
        console.error('Error saving report:', e);
    }
}
async function saveInvoiceToStorageAndDb(clientId, invoiceFile, value, userId) {
    try {
        if (!invoiceFile || !invoiceFile.startsWith('data:'))
            return;
        const ref = admin.database().ref(`contacts/${clientId}/invoices`).push();
        await ref.set({
            id: ref.key,
            month: new Date().toISOString().slice(0, 7),
            amount: Number(value || 0),
            status: 'sent',
            fileUrl: invoiceFile,
            date: new Date().toISOString(),
            userId: userId || null
        });
        console.log('Invoice saved successfully (base64):', ref.key);
    }
    catch (e) {
        console.error('Error saving invoice:', e);
    }
}
function fetchUrlToBuffer(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                res.resume();
                return reject(new Error(`Request Failed. Status Code: ${res.statusCode}`));
            }
            const data = [];
            res.on('data', (chunk) => data.push(chunk));
            res.on('end', () => resolve(Buffer.concat(data)));
        }).on('error', reject);
    });
}
/**
 * Callable function to send billing emails.
 * Expects data: { clientId, title, value, bankAccount, invoiceFile?, reportFile?, emailText? }
 */
exports.sendBillingEmail = functions.https.onCall(async (data, context) => {
    try {
        const { clientId, title, value, bankAccount, pixKey, invoiceFile, reportFile, emailText, certificateFiles, selectedCertificates, solutionSelect, userId } = data || {};
        console.log('sendBillingEmail called with:', {
            clientId,
            hasInvoice: !!invoiceFile,
            hasReport: !!reportFile,
            certFilesCount: certificateFiles?.length,
            selectedCertsCount: selectedCertificates?.length
        });
        if (!clientId)
            throw new functions.https.HttpsError('invalid-argument', 'clientId is required');
        // Fetch client from Realtime Database
        const snap = await admin.database().ref(`/contacts/${clientId}`).get();
        if (!snap.exists())
            throw new functions.https.HttpsError('not-found', 'Client not found');
        const client = snap.val();
        const to = client.email || client.financialContact || null;
        if (!to)
            throw new functions.https.HttpsError('failed-precondition', 'Client has no email to send to');
        // Build or get cached transporter
        const { transporter, from: computedFrom } = getTransporter();
        if (!transporter) {
            console.error('sendBillingEmail: transporter not available; host/user/pass missing at runtime');
            throw new functions.https.HttpsError('failed-precondition', 'SMTP configuration is missing or invalid.');
        }
        const effectiveFrom = computedFrom;
        // Debug info (avoid logging secrets)
        console.log('sendBillingEmail: sending via transporter, from=', effectiveFrom);
        const attachments = [];
        if (invoiceFile && typeof invoiceFile === 'string') {
            const parsed = parseDataUrl(invoiceFile);
            if (parsed)
                attachments.push({ filename: 'invoice', content: Buffer.from(parsed.base64, 'base64'), contentType: parsed.mime });
        }
        if (reportFile && typeof reportFile === 'string') {
            const parsed = parseDataUrl(reportFile);
            if (parsed)
                attachments.push({ filename: 'report', content: Buffer.from(parsed.base64, 'base64'), contentType: parsed.mime });
        }
        // certificateFiles: optional array of { filename, dataUrl } OR selectedCertificates { name, fileUrl }
        const certs = certificateFiles || selectedCertificates;
        if (Array.isArray(certs)) {
            for (const cf of certs) {
                if (cf) {
                    const fname = cf.filename || cf.name || 'documento.pdf';
                    // Check for dataUrl or fileUrl being a data URI
                    const rawDataUrl = cf.dataUrl || (typeof cf.fileUrl === 'string' && cf.fileUrl.startsWith('data:') ? cf.fileUrl : null);
                    if (typeof rawDataUrl === 'string') {
                        const parsed = parseDataUrl(rawDataUrl);
                        if (parsed) {
                            attachments.push({ filename: fname, content: Buffer.from(parsed.base64, 'base64'), contentType: parsed.mime });
                            console.log(`Attached certificate (Base64): ${fname}`);
                        }
                        else {
                            console.warn(`Failed to parse Data URI for certificate: ${fname}`);
                        }
                    }
                    else if (typeof cf.fileUrl === 'string' && cf.fileUrl.startsWith('http')) {
                        try {
                            const buffer = await fetchUrlToBuffer(cf.fileUrl);
                            attachments.push({ filename: fname, content: buffer });
                            console.log(`Attached certificate (URL): ${fname}`);
                        }
                        catch (fetchErr) {
                            console.error(`Failed to fetch certificate ${fname}:`, fetchErr);
                        }
                    }
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
        ${pixKey ? `<li><strong>Chave PIX:</strong> ${pixKey}</li>` : ''}
      </ul>
      <p>${emailText || ''}</p>
      <p>Atenciosamente, LAVORO SERVIÇOS. <br/>
      
      <br/>Enviado utilizando o sistema Blu</p>
    `;
        const mailOptions = {
            from: effectiveFrom,
            to,
            subject: `Cobrança: ${title || 'Nova cobrança'}`,
            html,
            attachments
        };
        await transporter.sendMail(mailOptions);
        if (reportFile && typeof reportFile === 'string') {
            await saveReportToStorageAndDb(clientId, reportFile, `Relatório - ${title || 'Cobrança'}`, userId || context.auth?.uid);
        }
        if (invoiceFile && typeof invoiceFile === 'string') {
            await saveInvoiceToStorageAndDb(clientId, invoiceFile, value, userId || context.auth?.uid);
        }
        return { success: true };
    }
    catch (err) {
        console.error('sendBillingEmail error:', err);
        if (err instanceof functions.https.HttpsError)
            throw err;
        throw new functions.https.HttpsError('internal', err.message || 'Unknown error');
    }
});
// CORS middleware instance (allow all origins; the function will be protected by auth if needed)
const corsHandler = cors({ origin: true });
// HTTP endpoint that accepts POST from the frontend (handles CORS preflight)
exports.sendBillingEmailHttp = functions.https.onRequest((req, res) => {
    return corsHandler(req, res, async () => {
        // Diagnostic: log top-level functions.config keys and presence of env vars (avoid logging secrets)
        try {
            const topKeys = Object.keys(functions.config ? functions.config() : {});
            console.log('sendBillingEmailHttp: functions.config() top-level keys=', topKeys);
            const cfgKeys = Object.keys((functions.config().smtp) || {});
            console.log('sendBillingEmailHttp: functions.config().smtp keys=', cfgKeys);
        }
        catch (e) {
            console.log('sendBillingEmailHttp: functions.config() not available or error reading it', String(e));
        }
        // Also log whether env vars exist (do not print passwords)
        console.log('sendBillingEmailHttp: process.env has SMTP_HOST=', !!process.env.SMTP_HOST, 'SMTP_PORT=', !!process.env.SMTP_PORT, 'SMTP_USER=', !!process.env.SMTP_USER, 'SMTP_PASS=', !!process.env.SMTP_PASS);
        if (req.method !== 'POST') {
            return res.status(405).send('Method Not Allowed');
        }
        try {
            const data = req.body || {};
            const { clientId, to: directTo, title, value, bankAccount, pixKey, invoiceFile, reportFile, emailText, certificateFiles, selectedCertificates, solutionSelect, userId } = data;
            // Allow testing by passing `to` directly in the POST body. If `to` is
            // provided we skip the Realtime Database lookup. Otherwise `clientId` is required.
            if (!directTo && !clientId)
                return res.status(400).json({ success: false, message: 'clientId or to is required' });
            let to = null;
            let client = null;
            if (directTo) {
                to = String(directTo);
            }
            else {
                try {
                    const snap = await admin.database().ref(`/contacts/${clientId}`).get();
                    if (!snap.exists())
                        return res.status(404).json({ success: false, message: 'Client not found' });
                    client = snap.val();
                    to = client.email || client.financialContact || null;
                }
                catch (dbErr) {
                    console.error('sendBillingEmailHttp error: ', dbErr && (dbErr.stack || dbErr));
                    return res.status(500).json({ success: false, message: `Database error: ${dbErr?.message || String(dbErr)}` });
                }
            }
            if (!to)
                return res.status(412).json({ success: false, message: 'Client has no email to send to' });
            // Prefer module transporter (reads env or functions.config). If missing, return error.
            const { transporter, from: computedFrom } = getTransporter();
            if (!transporter) {
                console.error('sendBillingEmailHttp: transporter not available; host/user/pass missing at runtime');
                return res.status(500).json({ success: false, message: 'SMTP configuration is missing.' });
            }
            const effectiveFrom = computedFrom;
            const attachments = [];
            if (invoiceFile && typeof invoiceFile === 'string') {
                const parsed = parseDataUrl(invoiceFile);
                if (parsed)
                    attachments.push({ filename: 'invoice', content: Buffer.from(parsed.base64, 'base64'), contentType: parsed.mime });
            }
            if (reportFile && typeof reportFile === 'string') {
                const parsed = parseDataUrl(reportFile);
                if (parsed)
                    attachments.push({ filename: 'report', content: Buffer.from(parsed.base64, 'base64'), contentType: parsed.mime });
            }
            // certificateFiles: optional array of { filename, dataUrl } OR selectedCertificates { name, fileUrl }
            const certs = certificateFiles || selectedCertificates;
            if (Array.isArray(certs)) {
                for (const cf of certs) {
                    if (cf) {
                        const fname = cf.filename || cf.name || 'documento.pdf';
                        // Check for dataUrl or fileUrl being a data URI
                        const rawDataUrl = cf.dataUrl || (typeof cf.fileUrl === 'string' && cf.fileUrl.startsWith('data:') ? cf.fileUrl : null);
                        if (typeof rawDataUrl === 'string') {
                            const parsed = parseDataUrl(rawDataUrl);
                            if (parsed) {
                                attachments.push({ filename: fname, content: Buffer.from(parsed.base64, 'base64'), contentType: parsed.mime });
                                console.log(`Attached certificate (Base64): ${fname}`);
                            }
                            else {
                                console.warn(`Failed to parse Data URI for certificate: ${fname}`);
                            }
                        }
                        else if (typeof cf.fileUrl === 'string' && cf.fileUrl.startsWith('http')) {
                            try {
                                const buffer = await fetchUrlToBuffer(cf.fileUrl);
                                attachments.push({ filename: fname, content: buffer });
                                console.log(`Attached certificate (URL): ${fname}`);
                            }
                            catch (fetchErr) {
                                console.error(`Failed to fetch certificate ${fname}:`, fetchErr);
                            }
                        }
                    }
                }
            }
            const html = `
        <p>Olá, Prezados</p>
        <p>À ${client?.razaoSocial || ''}</p>
        <p>Espero que este email os encontre bem. <br/>
        Estamos entrando em contato para enviar os arquivos em relação à fatura referente à ${solutionSelect || client?.solutionSelect || 'serviços contratados'} </p>
        <ul>
          <li><strong>Título:</strong> ${title || '-'} </li>
          <li><strong>Valor:</strong> R$ ${Number(value || 0).toFixed(2)}</li>
          <li><strong>Conta para pagamento:</strong> ${bankAccount || '-'}</li>
          ${pixKey ? `<li><strong>Chave PIX:</strong> ${pixKey}</li>` : ''}
        </ul>
        <p>${emailText || ''}</p>
        <p>Atenciosamente, LAVORO SERVIÇOS. <br/>
        
        <br/>
        <strong>Enviado utilizando o sistema Blu</strong></p>
        <p> Para dúvidas ou suporte, entre em contato conosco através dos nossos canais oficiais. </p>
        <p> Este é um email automático, por favor, não responda. </p>
      `;
            const mailOptions = { from: effectiveFrom, to, subject: `${title || 'Nova Notificação Financeira'}`, html, attachments };
            console.log('sendBillingEmailHttp: sending mail', { to, from: effectiveFrom, attachments: attachments.length });
            try {
                await transporter.sendMail(mailOptions);
            }
            catch (sendErr) {
                console.error('sendBillingEmailHttp sendMail error:', sendErr && (sendErr.stack || sendErr));
                return res.status(500).json({ success: false, message: `sendMail error: ${sendErr?.message || 'unknown'}` });
            }
            if (reportFile && typeof reportFile === 'string' && clientId) {
                await saveReportToStorageAndDb(clientId, reportFile, `Relatório - ${title || 'Cobrança'}`, userId);
            }
            if (invoiceFile && typeof invoiceFile === 'string' && clientId) {
                await saveInvoiceToStorageAndDb(clientId, invoiceFile, value, userId);
            }
            return res.json({ success: true });
        }
        catch (err) {
            console.error('sendBillingEmailHttp error:', err && (err.stack || err));
            return res.status(500).json({ success: false, message: err?.message || 'Unknown error' });
        }
    });
});
exports.handleInboundEmail = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    try {
        const { to, from, subject, text, html } = req.body;
        if (!to) {
            res.status(400).send('Missing "to" field');
            return;
        }
        // Simplify "to" to pure email if it's formatted like "Name <email@domain.com>"
        const match = to.match(/<([^>]+)>/);
        const toEmail = match ? match[1] : to;
        let userRecord;
        try {
            userRecord = await admin.auth().getUserByEmail(toEmail);
        }
        catch (e) {
            console.log(`Email rejected: No user found for ${toEmail}`);
            res.status(200).send('Ignored: recipient not registered');
            return;
        }
        const uid = userRecord.uid;
        const dbRef = admin.database().ref(`users/${uid}/emails`);
        await dbRef.push({
            to,
            from: from || 'Desconhecido',
            subject: subject || 'Sem assunto',
            body: html || text || '',
            folder: 'inbox',
            read: false,
            timestamp: new Date().toISOString()
        });
        console.log(`Inbound email saved for user ${uid}`);
        res.status(200).send('Success');
    }
    catch (err) {
        console.error('handleInboundEmail error:', err);
        res.status(500).send('Internal Server Error');
    }
});
exports.processMailQueue = functions.database.ref('/mail_queue/{pushId}').onCreate(async (snapshot, context) => {
    const mailData = snapshot.val();
    const pushId = context.params.pushId;
    // Prevent processing if already processed or missing basic info
    if (!mailData || mailData.delivery || !mailData.to || !mailData.message) {
        console.log(`Skipping mailQueue ${pushId}: invalid or already processed.`);
        return null;
    }
    const { to, message, userId } = mailData;
    const { subject, html, text, attachments } = message;
    // Mark as processing
    await snapshot.ref.update({
        delivery: {
            state: 'PROCESSING',
            startTime: admin.database.ServerValue.TIMESTAMP
        }
    });
    try {
        let transporter = null;
        let computedFrom = 'Eu <contato@blutecnologias.com>';
        // Se o userId foi enviado na fila (como feito pelo EmailComposer do Webmail)
        if (userId) {
            const userSmtpSnap = await admin.database().ref(`users/${userId}/smtpSettings`).once('value');
            const smtpSettings = userSmtpSnap.val();
            if (smtpSettings && smtpSettings.host && smtpSettings.port && smtpSettings.user && smtpSettings.pass) {
                // Criar transporter customizado para este usuário
                transporter = nodemailer.createTransport({
                    host: smtpSettings.host,
                    port: Number(smtpSettings.port),
                    secure: Number(smtpSettings.port) === 465,
                    auth: {
                        user: smtpSettings.user,
                        pass: smtpSettings.pass
                    }
                });
                // Buscar o nome de exibição do usuário ou fallback pro email
                const userProfSnap = await admin.database().ref(`users/${userId}`).once('value');
                const userProfile = userProfSnap.val();
                const displName = userProfile?.displayName || smtpSettings.user;
                computedFrom = `${displName} <${smtpSettings.user}>`;
            }
        }
        // Fallback para getTransporter global caso o SMTP do usuário não exista ou não seja do Webmail
        if (!transporter) {
            const globalSmtp = getTransporter();
            transporter = globalSmtp.transporter;
            computedFrom = globalSmtp.from;
        }
        if (!transporter) {
            throw new Error('SMTP configuration missing: cannot dispatch email.');
        }
        const mailOptions = {
            from: computedFrom,
            to: Array.isArray(to) ? to.join(',') : to,
            subject: subject || 'Sem assunto',
            html: html || '',
            text: text || ''
        };
        if (attachments && Array.isArray(attachments)) {
            mailOptions.attachments = attachments.map((att) => {
                // Simple case: attach directly using path as the dataUrl string
                if (typeof att.path === 'string' && att.path.startsWith('data:')) {
                    return { path: att.path, filename: att.filename };
                }
                return att;
            });
        }
        const info = await transporter.sendMail(mailOptions);
        console.log(`Successfully dispatched email ${pushId}: ${info.messageId}`);
        // Mark as success
        await snapshot.ref.update({
            delivery: {
                state: 'SUCCESS',
                endTime: admin.database.ServerValue.TIMESTAMP,
                info: info.response || 'OK'
            }
        });
        return null;
    }
    catch (error) {
        console.error(`Error sending email ${pushId}:`, error);
        // Mark as error
        await snapshot.ref.update({
            delivery: {
                state: 'ERROR',
                endTime: admin.database.ServerValue.TIMESTAMP,
                error: error.message || String(error)
            }
        });
        return null;
    }
});
//# sourceMappingURL=index.js.map