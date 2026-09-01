import {httpsCallable} from 'firebase/functions';
import {functions} from '../../services/firebase';

export type ServiceSection='overview'|'catalog'|'schedule'|'appointments'|'professionals'|'resources'|'clients'|'packages'|'commissions'|'reports'|'settings';
export type ServiceLocation={id:string;name:string;code?:string;timezone:string;active:boolean;address?:Record<string,string>};
export type ServiceCategory={id:string;name:string;description?:string;parentId?:string;active:boolean;displayOrder?:number};
export type ServiceDefinition={id:string;productId:string;slug:string;categoryId?:string;durationMinutes:number;bufferBeforeMinutes:number;bufferAfterMinutes:number;slotIntervalMinutes:number;capacityMode:'FIXED'|'RESOURCE_BASED'|'PROFESSIONAL_BASED'|'HYBRID';simultaneousCapacity:number;minimumAdvanceMinutes:number;maximumAdvanceDays:number;onlineBookingEnabled:boolean;requiresConfirmation:boolean;paymentMode:'PAY_ON_SITE'|'FULL_PREPAYMENT'|'DEPOSIT_FIXED'|'DEPOSIT_PERCENTAGE';depositValue:number;publishOnEcommerce?:boolean;active:boolean;product?:{name:string;category?:string;description?:string;notes?:string;salePriceCents:number;promotionalPriceCents?:number;images?:string[];active:boolean;salesChannels?:{bluStore?:boolean}}};
export type BusinessHour={id:string;locationId:string;weekday:number;closed:boolean;intervals:Array<{start:string;end:string}>};
export type SpecialHour={id:string;locationId:string;date:string;kind:'open'|'closed';intervals:Array<{start:string;end:string}>;reason?:string};
export type ServiceSettings={defaultSlotIntervalMinutes:number;defaultDurationMinutes:number;minimumAdvanceMinutes:number;maximumAdvanceDays:number;lateToleranceMinutes:number;timezone:string;automaticConfirmation:boolean;onlineBookingEnabled:boolean;weeklyHours?:Array<{weekday:number;closed:boolean;intervals:Array<{start:string;end:string}>}>};
export type ServiceEntity={id:string;name?:string;title?:string;clientName?:string;professionalName?:string;serviceId?:string;professionalId?:string;clientId?:string;date?:string;startTime?:string;endTime?:string;status?:string;active?:boolean;priceCents?:number;commissionType?:string;commissionValue?:number;capacity?:number;description?:string;items?:string[]};
export type ServiceProfessional={id:string;name:string;email:string;phone?:string;role:string;department?:string;status:string;userId?:string};
export type ServiceFoundation={services:ServiceDefinition[];categories:ServiceCategory[];professionals:ServiceProfessional[];clients:ServiceEntity[];appointments:ServiceEntity[];resources:ServiceEntity[];packages:ServiceEntity[];commissions:ServiceEntity[];settings:ServiceSettings|null};

const call=<T>(companyId:string,action:string,value?:unknown,id?:string)=>httpsCallable<Record<string,unknown>,T>(functions,'serviceScheduling')({companyId,action,value,id}).then(result=>result.data);
export const serviceSchedulingService={
  load:(companyId:string)=>call<ServiceFoundation>(companyId,'get_foundation'),
  saveService:(companyId:string,value:unknown,id?:string)=>call<{id:string}>(companyId,'save_service',value,id),
  saveCategory:(companyId:string,value:unknown,id?:string)=>call<{id:string}>(companyId,'save_category',value,id),
  saveLocation:(companyId:string,value:unknown,id?:string)=>call<{id:string}>(companyId,'save_location',value,id),
  saveHours:(companyId:string,value:unknown)=>call(companyId,'save_hours',value),
  saveSpecialHours:(companyId:string,value:unknown,id?:string)=>call(companyId,'save_special_hours',value,id),
  saveSettings:(companyId:string,value:unknown)=>call(companyId,'save_settings',value),
  saveAppointment:(companyId:string,value:unknown,id?:string)=>call(companyId,'save_appointment',value,id),
  saveResource:(companyId:string,value:unknown,id?:string)=>call(companyId,'save_resource',value,id),
  savePackage:(companyId:string,value:unknown,id?:string)=>call(companyId,'save_package',value,id),
  saveCommission:(companyId:string,value:unknown,id?:string)=>call(companyId,'save_commission',value,id),
};
