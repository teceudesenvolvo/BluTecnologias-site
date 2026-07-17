export type CostCenterStatus='active'|'inactive';
export type CostCenterType='administrative'|'commercial'|'operational'|'legal'|'technology'|'contracts'|'projects'|'branch'|'department'|'other';
export interface CostCenter{id:string;companyId:string;code:string;name:string;description?:string;parentId?:string|null;responsibleUserId?:string;responsibleName?:string;type:CostCenterType;budgetCents:number;budgetPeriod:'monthly'|'annual';startDate:string;endDate:string;status:CostCenterStatus;allowsEntries:boolean;projectIds?:string[];contractIds?:string[];categoryIds?:string[];notes?:string;createdAt:string;updatedAt:string;createdBy:string;updatedBy:string;version:number}
export type CostCenterInput=Omit<CostCenter,'id'|'companyId'|'createdAt'|'updatedAt'|'createdBy'|'updatedBy'|'version'>;
export interface CostCenterAllocation{id:string;companyId:string;transactionId:string;costCenterId:string;percentageBasisPoints:number;amountCents:number;createdAt:string;createdBy:string}
export interface CostCenterResult{expenseCents:number;incomeCents:number;budgetCents:number;balanceCents:number;overBudget:boolean;transactionCount:number}
export interface CostCenterDashboard{active:number;budgetCents:number;expenseCents:number;incomeCents:number;balanceCents:number;overBudget:number}
