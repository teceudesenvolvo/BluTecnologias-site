import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

export interface InterestArea { id:string; name:string; keywords:string[]; active:boolean }
const storage=(companyId:string)=>`blu:interest-settings:${companyId}`;
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const unique=(values:string[])=>[...new Map(values.map((value)=>[normalize(value),value.trim()])).values()].filter(Boolean);
const migrate=(value:unknown):InterestArea[]=>{
  if(Array.isArray(value)&&value.every((item)=>typeof item==='string'))return (value as string[]).map((keyword,index)=>({id:`legacy-${index}-${normalize(keyword).replace(/ /g,'-')}`,name:keyword,keywords:[keyword],active:true}));
  if(Array.isArray(value))return (value as InterestArea[]).filter((area)=>area&&area.name).map((area,index)=>({id:area.id||`area-${index}`,name:area.name,keywords:unique([area.name,...(area.keywords||[])]),active:area.active!==false}));
  return [];
};
const localAreas=(companyId:string)=>{try{return migrate(JSON.parse(localStorage.getItem(storage(companyId))||'[]'))}catch{return[]}};

export const interestSettingsService={
  async getAreas(companyId:string):Promise<InterestArea[]>{try{const snapshot=await getDoc(doc(db,'companies',companyId,'settings','interests'));if(snapshot.exists()){const data=snapshot.data();const areas=migrate(data.areas||data.keywords||[]);localStorage.setItem(storage(companyId),JSON.stringify(areas));return areas}}catch{/* Modo demonstrativo. */}return localAreas(companyId)},
  async get(companyId:string):Promise<string[]>{const areas=await this.getAreas(companyId);return unique(areas.filter((area)=>area.active).flatMap((area)=>[area.name,...area.keywords]))},
  async saveAreas(companyId:string,userId:string,areas:InterestArea[]){const clean=migrate(areas);localStorage.setItem(storage(companyId),JSON.stringify(clean));await setDoc(doc(db,'companies',companyId,'settings','interests'),{areas:clean,keywords:unique(clean.filter((area)=>area.active).flatMap((area)=>[area.name,...area.keywords])),updatedBy:userId,updatedAt:serverTimestamp()},{merge:true}).catch(()=>{/* Modo demonstrativo. */})},
  async save(companyId:string,userId:string,keywords:string[]){return this.saveAreas(companyId,userId,migrate(keywords))},
  matches(text:string,keywords:string[]){const haystack=` ${normalize(text)} `;return keywords.some((keyword)=>{const needle=normalize(keyword);if(!needle)return false;if(haystack.includes(` ${needle} `)||haystack.includes(needle))return true;const meaningful=needle.split(' ').filter((part)=>part.length>=4);return meaningful.length>1&&meaningful.every((part)=>haystack.includes(part))})}
};
