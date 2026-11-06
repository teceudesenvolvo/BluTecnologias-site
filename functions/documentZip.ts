import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const allowedOrigins = new Set([
  'https://www.blutecnologias.com.br',
  'https://blutecnologias.com.br',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);
const maxDocuments = 100;
const maxTotalBytes = 40 * 1024 * 1024;

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});
const crc32 = (bytes: Buffer) => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};
const u16 = (value: number) => { const out = Buffer.alloc(2); out.writeUInt16LE(value & 0xffff); return out; };
const u32 = (value: number) => { const out = Buffer.alloc(4); out.writeUInt32LE(value >>> 0); return out; };
const dosDateTime = () => {
  const now = new Date();
  const year = Math.max(1980, now.getFullYear());
  return {
    date: ((year - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate(),
    time: (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1),
  };
};

const safeName = (value: unknown, index: number, used: Set<string>) => {
  const raw = String(value || `documento-${index + 1}`).trim();
  const safe = (raw.includes('.') ? raw : `${raw}.pdf`).replace(/[\\/:*?"<>|]/g, '_');
  const dot = safe.lastIndexOf('.');
  const base = dot > 0 ? safe.slice(0, dot) : safe;
  const ext = dot > 0 ? safe.slice(dot) : '.pdf';
  let candidate = safe;
  let count = 2;
  while (used.has(candidate.toLowerCase())) candidate = `${base} (${count++})${ext}`;
  used.add(candidate.toLowerCase());
  return candidate;
};

const objectPathFromUrl = (value: string, bucketName: string) => {
  try {
    const url = new URL(value);
    if (url.hostname === 'firebasestorage.googleapis.com') {
      const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
      if (!match || decodeURIComponent(match[1]) !== bucketName) return '';
      return decodeURIComponent(match[2]);
    }
    if (url.hostname === 'storage.googleapis.com') {
      const segments = url.pathname.split('/').filter(Boolean);
      if (decodeURIComponent(segments[0] || '') !== bucketName || segments.length < 2) return '';
      return segments.slice(1).map(decodeURIComponent).join('/');
    }
  } catch { return ''; }
  return '';
};

const zipBuffers = (files: Array<{ name: string; data: Buffer }>) => {
  const used = new Set<string>();
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  const { date, time } = dosDateTime();
  const utf8Flag = 0x0800;
  let offset = 0;

  files.forEach((file, index) => {
    const name = Buffer.from(safeName(file.name, index, used), 'utf8');
    const checksum = crc32(file.data);
    const local = Buffer.concat([
      u32(0x04034b50), u16(20), u16(utf8Flag), u16(0), u16(time), u16(date),
      u32(checksum), u32(file.data.length), u32(file.data.length), u16(name.length), u16(0), name, file.data,
    ]);
    localParts.push(local);
    centralParts.push(Buffer.concat([
      u32(0x02014b50), u16(20), u16(20), u16(utf8Flag), u16(0), u16(time), u16(date),
      u32(checksum), u32(file.data.length), u32(file.data.length), u16(name.length), u16(0),
      u16(0), u16(0), u16(0), u32(0), u32(offset), name,
    ]));
    offset += local.length;
  });

  const central = Buffer.concat(centralParts);
  const end = Buffer.concat([
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(central.length), u32(offset), u16(0),
  ]);
  return Buffer.concat([...localParts, central, end]);
};

async function authorizedCompanyIds(uid: string) {
  const db = admin.firestore();
  const ids = new Set([uid, `company-${uid}`]);
  const [legacyMemberships, memberships, ownedByUserId, ownedByCreator] = await Promise.all([
    db.collection('companyUsers').where('userId', '==', uid).get(),
    db.collection('companyMemberships').where('userId', '==', uid).get(),
    db.collection('companies').where('ownerUserId', '==', uid).get(),
    db.collection('companies').where('createdBy', '==', uid).get(),
  ]);
  legacyMemberships.docs.forEach((item) => { if (!item.data().status || item.data().status === 'active') ids.add(String(item.data().companyId || '')); });
  memberships.docs.forEach((item) => { if (item.data().status === 'active') ids.add(String(item.data().companyId || '')); });
  [...ownedByUserId.docs, ...ownedByCreator.docs].forEach((item) => ids.add(item.id));
  ids.delete('');
  return ids;
}

export const downloadDocumentsZip = functions.https.onRequest(async (req, res) => {
  const origin = String(req.headers.origin || '');
  if (allowedOrigins.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
  }
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.set('Access-Control-Expose-Headers', 'Content-Disposition');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'method-not-allowed' }); return; }
  if (origin && !allowedOrigins.has(origin)) { res.status(403).json({ error: 'origin-not-allowed' }); return; }

  try {
    const authorization = String(req.headers.authorization || '');
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!token) { res.status(401).json({ error: 'authentication-required' }); return; }
    let decoded: admin.auth.DecodedIdToken;
    try { decoded = await admin.auth().verifyIdToken(token); }
    catch { res.status(401).json({ error: 'Sua sessão expirou. Entre novamente para baixar os documentos.' }); return; }
    const ids: string[] = Array.isArray(req.body?.documentIds)
      ? [...new Set<string>((req.body.documentIds as unknown[]).map((id) => String(id)))]
      : [];
    if (!ids.length || ids.length > maxDocuments || ids.some((id) => !/^[^/]{1,150}$/.test(id))) {
      res.status(400).json({ error: `Selecione de 1 a ${maxDocuments} documentos.` }); return;
    }

    const allowedCompanies = await authorizedCompanyIds(decoded.uid);
    const db = admin.firestore();
    const snapshots = await Promise.all(ids.map((id) => db.collection('companyDocuments').doc(id).get()));
    if (snapshots.some((snapshot) => !snapshot.exists || !allowedCompanies.has(String(snapshot.data()?.companyId || '')))) {
      res.status(403).json({ error: 'Um ou mais documentos não estão acessíveis para sua conta.' }); return;
    }

    const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'blutecnologias-site';
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`;
    const bucket = admin.storage().bucket(bucketName);
    const files: Array<{ name: string; data: Buffer }> = [];
    let totalBytes = 0;
    for (const [index, snapshot] of snapshots.entries()) {
      const document = snapshot.data() || {};
      const fileUrl = String(document.fileUrl || '');
      const path = objectPathFromUrl(fileUrl, bucket.name);
      if (!path) throw new Error(`Não foi possível identificar o arquivo de “${String(document.originalName || document.name || `documento ${index + 1}`)}”.`);
      const [data] = await bucket.file(path).download();
      totalBytes += data.length;
      if (totalBytes > maxTotalBytes) throw new Error('O ZIP ultrapassou o limite de 40 MB. Baixe menos documentos por vez.');
      files.push({ name: String(document.originalName || document.name || `documento-${index + 1}`), data });
    }

    const zip = zipBuffers(files);
    const filename = `documentos-selecionados-${new Date().toISOString().slice(0, 10)}.zip`;
    res.set('Content-Type', 'application/zip');
    res.set('Content-Length', String(zip.length));
    res.set('Content-Disposition', `attachment; filename="${filename}"`);
    res.set('Cache-Control', 'no-store');
    res.status(200).send(zip);
  } catch (error: any) {
    console.error('Falha ao gerar ZIP de documentos:', error?.code || error?.name || 'unknown-error');
    const message = String(error?.message || 'Não foi possível gerar o ZIP.');
    res.status(500).json({ error: message });
  }
});
