import { adminServices } from '../server/admin';
import { defaultContent } from '../src/data/defaultContent';
import { PROFILE_INFO, SERVICES, TECHNICAL_TOOLKIT, WORK_PROCESS_STEPS } from '../src/data/initialData';
import { FieldValue } from 'firebase-admin/firestore';
const {db}=adminServices(); const batch=db.batch();
async function create(path:string,data:Record<string,unknown>){const ref=db.doc(path);if(!(await ref.get()).exists)batch.create(ref,{...data,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp(),schemaVersion:1});}
await create('siteContent/general',{...defaultContent});
await create('settings/public',{headshot:PROFILE_INFO.headshot,resumeUrl:process.env.VITE_RESUME_URL||'',availability:PROFILE_INFO.availability,bookingsWindow:PROFILE_INFO.bookingsWindow,responseWindow:PROFILE_INFO.responseWindow});
for(const [order,s] of SERVICES.entries())await create(`services/${s.id}`,{...s,order,published:true,id:s.id,updatedBy:'migration'});
for(const [group,names] of Object.entries(TECHNICAL_TOOLKIT))for(const [offset,name] of names.entries()){const id=`${group}-${name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')}`;await create(`skills/${id}`,{id,name,group:group==='tools'?'Tools & Delivery':group[0].toUpperCase()+group.slice(1),order:offset,published:true,updatedBy:'migration'});}
for(const [order,p] of WORK_PROCESS_STEPS.entries()){const id=p.title.toLowerCase().replace(/[^a-z0-9]+/g,'-');await create(`process/${id}`,{id,title:p.title,description:p.description,order,published:true,updatedBy:'migration'});}
for(const [order,name] of ['Websites','Posters','Logos','Automations','Apps'].entries()){const id=name.toLowerCase();await create(`categories/${id}`,{id,name,slug:id,description:'',iconName:'',order,published:true,mediaLayout:name==='Logos'?'logo':name==='Posters'?'gallery':'cover',accent:'indigo',updatedBy:'migration'});}
await batch.commit(); console.log('CMS seed completed. Existing documents were preserved.');
