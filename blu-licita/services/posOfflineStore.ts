export type PosOutboxEventType = "REGISTER_OPENED" | "SALE_COMPLETED" | "REGISTER_CLOSED";
export type PosSyncStatus = "pending" | "syncing" | "synced" | "error";

export type PosOutboxEvent = {
  id: string;
  companyId: string;
  deviceId: string;
  userId: string;
  entityId: string;
  type: PosOutboxEventType;
  payload: Record<string, unknown>;
  sequence: number;
  status: PosSyncStatus;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
};

export type PosLocalSale<TSale = unknown> = {
  id: string;
  companyId: string;
  sale: TSale;
  syncStatus: PosSyncStatus;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
};

export type PosDraft<TCart = unknown> = {
  companyId: string;
  cart: TCart;
  checkout: Record<string, unknown>;
  updatedAt: string;
};

type StoredValue<T = unknown> = { key: string; value: T; updatedAt: string };

const DATABASE_NAME = "blu-pos-offline";
const DATABASE_VERSION = 1;
const STORES = {
  meta: "meta",
  cache: "cache",
  drafts: "drafts",
  sales: "sales",
  outbox: "outbox",
} as const;

const requestResult = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error("Falha no armazenamento local do PDV."));
});

const transactionDone = (transaction: IDBTransaction) => new Promise<void>((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onerror = () => reject(transaction.error || new Error("Falha na transação local do PDV."));
  transaction.onabort = () => reject(transaction.error || new Error("A transação local do PDV foi cancelada."));
});

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  if (typeof indexedDB === "undefined") return reject(new Error("Este navegador não oferece armazenamento transacional para operar o PDV offline."));
  const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(STORES.meta)) database.createObjectStore(STORES.meta, { keyPath: "key" });
    if (!database.objectStoreNames.contains(STORES.cache)) database.createObjectStore(STORES.cache, { keyPath: "key" });
    if (!database.objectStoreNames.contains(STORES.drafts)) database.createObjectStore(STORES.drafts, { keyPath: "companyId" });
    if (!database.objectStoreNames.contains(STORES.sales)) {
      const store = database.createObjectStore(STORES.sales, { keyPath: "id" });
      store.createIndex("companyId", "companyId", { unique: false });
    }
    if (!database.objectStoreNames.contains(STORES.outbox)) {
      const store = database.createObjectStore(STORES.outbox, { keyPath: "id" });
      store.createIndex("companyId", "companyId", { unique: false });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error("Não foi possível abrir o armazenamento local do PDV."));
});

const withDatabase = async <T>(operation: (database: IDBDatabase) => Promise<T>) => {
  const database = await openDatabase();
  try { return await operation(database); }
  finally { database.close(); }
};

const cacheKey = (companyId: string, resource: string) => `${companyId}:${resource}`;

export const getPosDeviceId = () => withDatabase(async (database) => {
  const transaction = database.transaction(STORES.meta, "readwrite");
  const store = transaction.objectStore(STORES.meta);
  const stored = await requestResult<StoredValue<string> | undefined>(store.get("deviceId"));
  if (stored?.value) { await transactionDone(transaction); return stored.value; }
  const deviceId = crypto.randomUUID();
  store.put({ key: "deviceId", value: deviceId, updatedAt: new Date().toISOString() } satisfies StoredValue<string>);
  await transactionDone(transaction);
  return deviceId;
});

export const readPosCache = <T>(companyId: string, resource: string) => withDatabase(async (database) => {
  const transaction = database.transaction(STORES.cache, "readonly");
  const stored = await requestResult<StoredValue<T> | undefined>(transaction.objectStore(STORES.cache).get(cacheKey(companyId, resource)));
  await transactionDone(transaction);
  return stored?.value;
});

export const writePosCache = <T>(companyId: string, resource: string, value: T) => withDatabase(async (database) => {
  const transaction = database.transaction(STORES.cache, "readwrite");
  transaction.objectStore(STORES.cache).put({ key: cacheKey(companyId, resource), value, updatedAt: new Date().toISOString() } satisfies StoredValue<T>);
  await transactionDone(transaction);
});

export const readPosDraft = <TCart>(companyId: string) => withDatabase(async (database) => {
  const transaction = database.transaction(STORES.drafts, "readonly");
  const draft = await requestResult<PosDraft<TCart> | undefined>(transaction.objectStore(STORES.drafts).get(companyId));
  await transactionDone(transaction);
  return draft;
});

export const savePosDraft = <TCart>(draft: PosDraft<TCart>) => withDatabase(async (database) => {
  const transaction = database.transaction(STORES.drafts, "readwrite");
  transaction.objectStore(STORES.drafts).put(draft);
  await transactionDone(transaction);
});

const nextSequence = async (store: IDBObjectStore) => {
  const current = await requestResult<StoredValue<number> | undefined>(store.get("outboxSequence"));
  const value = Number(current?.value || 0) + 1;
  store.put({ key: "outboxSequence", value, updatedAt: new Date().toISOString() } satisfies StoredValue<number>);
  return value;
};

export const commitOfflineSale = async <TSale>(input: {
  companyId: string;
  userId: string;
  sale: TSale & { id: string };
  payload: Record<string, unknown>;
}) => withDatabase(async (database) => {
  const transaction = database.transaction([STORES.meta, STORES.sales, STORES.outbox, STORES.drafts], "readwrite");
  const now = new Date().toISOString();
  const sequence = await nextSequence(transaction.objectStore(STORES.meta));
  const deviceIdRecord = await requestResult<StoredValue<string> | undefined>(transaction.objectStore(STORES.meta).get("deviceId"));
  const deviceId = deviceIdRecord?.value || crypto.randomUUID();
  if (!deviceIdRecord?.value) transaction.objectStore(STORES.meta).put({ key: "deviceId", value: deviceId, updatedAt: now });
  const localSale: PosLocalSale<TSale> = { id: input.sale.id, companyId: input.companyId, sale: input.sale, syncStatus: "pending", createdAt: now, updatedAt: now };
  const event: PosOutboxEvent = {
    id: input.sale.id,
    companyId: input.companyId,
    deviceId,
    userId: input.userId,
    entityId: input.sale.id,
    type: "SALE_COMPLETED",
    payload: { ...input.payload, saleId: input.sale.id, idempotencyKey: input.sale.id },
    sequence,
    status: "pending",
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };
  transaction.objectStore(STORES.sales).put(localSale);
  transaction.objectStore(STORES.outbox).put(event);
  transaction.objectStore(STORES.drafts).delete(input.companyId);
  await transactionDone(transaction);
  return { event, localSale };
});

export const commitOfflineRegister = async <TRegister>(input: {
  companyId: string;
  userId: string;
  register: TRegister & { id: string };
  action: "open" | "close";
  payload: Record<string, unknown>;
}) => withDatabase(async (database) => {
  const transaction = database.transaction([STORES.meta, STORES.cache, STORES.outbox], "readwrite");
  const now = new Date().toISOString();
  const sequence = await nextSequence(transaction.objectStore(STORES.meta));
  const deviceIdRecord = await requestResult<StoredValue<string> | undefined>(transaction.objectStore(STORES.meta).get("deviceId"));
  const deviceId = deviceIdRecord?.value || crypto.randomUUID();
  if (!deviceIdRecord?.value) transaction.objectStore(STORES.meta).put({ key: "deviceId", value: deviceId, updatedAt: now });
  const eventId = crypto.randomUUID();
  const event: PosOutboxEvent = {
    id: eventId,
    companyId: input.companyId,
    deviceId,
    userId: input.userId,
    entityId: input.register.id,
    type: input.action === "open" ? "REGISTER_OPENED" : "REGISTER_CLOSED",
    payload: { ...input.payload, action: input.action, registerId: input.register.id, idempotencyKey: eventId },
    sequence,
    status: "pending",
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };
  transaction.objectStore(STORES.cache).put({ key: cacheKey(input.companyId, "register"), value: input.action === "open" ? input.register : null, updatedAt: now });
  transaction.objectStore(STORES.outbox).put(event);
  await transactionDone(transaction);
  return event;
});

const companyRecords = async <T>(database: IDBDatabase, storeName: string, companyId: string) => {
  const transaction = database.transaction(storeName, "readonly");
  const store = transaction.objectStore(storeName);
  const index = store.index("companyId");
  const records = await requestResult<T[]>(index.getAll(IDBKeyRange.only(companyId)));
  await transactionDone(transaction);
  return records;
};

export const listPendingPosEvents = (companyId: string) => withDatabase(async (database) => {
  const records = await companyRecords<PosOutboxEvent>(database, STORES.outbox, companyId);
  return records.filter((event) => event.status !== "synced").sort((left, right) => left.sequence - right.sequence);
});

export const listLocalPosSales = <TSale>(companyId: string) => withDatabase(async (database) => {
  const records = await companyRecords<PosLocalSale<TSale>>(database, STORES.sales, companyId);
  return records.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
});

const updateSyncState = (event: PosOutboxEvent, status: PosSyncStatus, error?: string) => withDatabase(async (database) => {
  const transaction = database.transaction([STORES.outbox, STORES.sales], "readwrite");
  const now = new Date().toISOString();
  const nextEvent = { ...event, status, attempts: status === "syncing" ? event.attempts + 1 : event.attempts, updatedAt: now, ...(error ? { lastError: error } : {}) };
  transaction.objectStore(STORES.outbox).put(nextEvent);
  const saleStore = transaction.objectStore(STORES.sales);
  const localSale = await requestResult<PosLocalSale | undefined>(saleStore.get(event.entityId));
  if (localSale) saleStore.put({ ...localSale, syncStatus: status, updatedAt: now, ...(error ? { lastError: error } : {}) });
  await transactionDone(transaction);
  return nextEvent;
});

export const flushPosOutbox = async (
  companyId: string,
  send: (event: PosOutboxEvent) => Promise<void>,
) => {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { synced: 0, pending: (await listPendingPosEvents(companyId)).length };
  const events = await listPendingPosEvents(companyId);
  let synced = 0;
  for (const storedEvent of events) {
    const event = await updateSyncState(storedEvent, "syncing");
    try {
      await send(event);
      await updateSyncState(event, "synced");
      synced += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao sincronizar a operação.";
      await updateSyncState(event, "error", message);
      break;
    }
  }
  return { synced, pending: (await listPendingPosEvents(companyId)).length };
};
