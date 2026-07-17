import type { SyncJob } from '../core/integrationTypes';
export const syncJobsMock: SyncJob[]=[
  {id:'sync-1042',companyId:'demo-company',providerId:'pncp',type:'OPPORTUNITIES',status:'COMPLETED',startedAt:'2026-07-16T08:30:00-03:00',completedAt:'2026-07-16T08:31:18-03:00',recordsRead:248,recordsCreated:31,recordsUpdated:12,recordsSkipped:205,errors:[]},
  {id:'sync-1039',companyId:'demo-company',providerId:'manual-import',type:'OPPORTUNITIES',status:'PARTIAL',startedAt:'2026-07-15T15:10:00-03:00',completedAt:'2026-07-15T15:10:09-03:00',recordsRead:42,recordsCreated:38,recordsUpdated:0,recordsSkipped:4,errors:[{code:'DUPLICATE_RECORD',message:'4 registros exigem revisão de possível duplicidade.',retryable:false}]},
  {id:'sync-1028',companyId:'demo-company',providerId:'pncp',type:'DOCUMENTS',status:'COMPLETED',startedAt:'2026-07-14T08:30:00-03:00',completedAt:'2026-07-14T08:32:41-03:00',recordsRead:96,recordsCreated:18,recordsUpdated:7,recordsSkipped:71,errors:[]},
];
