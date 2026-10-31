const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
module.exports=function harness() {
  const sheets=new Map(), props={SPREADSHEET_ID:'development_spreadsheet_123456',AUTH_MODE:'GOOGLE_WORKSPACE',
    ALLOWED_DOMAIN:'example.com',BOOTSTRAP_ADMIN_EMAIL:'admin@example.com',WORKER_EMAIL:'admin@example.com'};
  let active='admin@example.com', effective='admin@example.com', locked=false, failTable='', failOnce=false;
  class Sheet {
    constructor(name){this.name=name;this.rows=[];}
    getLastRow(){return this.rows.length;}
    getLastColumn(){return this.rows[0]?.length||0;}
    getMaxRows(){return Math.max(1000,this.rows.length);}
    setFrozenRows(){return this;}
    getRange(r,c,n,m) {
      const self=this;
      return {
        getValues(){return Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>self.rows[r-1+i]?.[c-1+j]??''));},
        setValues(values){
          if(self.name===failTable&&failOnce){failOnce=false;throw new Error('Injected write failure');}
          values.forEach((row,i)=>{self.rows[r-1+i]??=[];row.forEach((v,j)=>{self.rows[r-1+i][c-1+j]=typeof v==='string'&&v.startsWith("'")?v.slice(1):v;});});
          return this;
        },
        setNumberFormat(){return this;},setFontWeight(){return this;},setBackground(){return this;},setFontColor(){return this;}
      };
    }
  }
  const db={getSheetByName:n=>sheets.get(n),insertSheet:n=>{const s=new Sheet(n);sheets.set(n,s);return s;}};
  const messages=[],triggers=[];
  const ctx=vm.createContext({
    console,
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]??null})},
    SpreadsheetApp:{openById:()=>db,flush(){}},
    Session:{getActiveUser:()=>({getEmail:()=>active}),getEffectiveUser:()=>({getEmail:()=>effective})},
    LockService:{getScriptLock:()=>({waitLock(){if(locked)throw new Error('Nested lock');locked=true;},releaseLock(){locked=false;}})},
    Utilities:{getUuid:randomUUID,formatDate:()=> '2026-10-31'},
    MailApp:{getRemainingDailyQuota:()=>100,sendEmail:m=>messages.push(m)},
    ScriptApp:{getProjectTriggers:()=>triggers,newTrigger:name=>({timeBased(){return this;},everyHours(){return this;},create(){triggers.push({getHandlerFunction:()=>name});}})}
  });
  const root=path.join(__dirname,'..','src');
  for(const f of fs.readdirSync(root).filter(f=>f.endsWith('.gs')))new vm.Script(fs.readFileSync(path.join(root,f),'utf8'),{filename:f}).runInContext(ctx);
  ctx.setupERP_();
  const admin=ctx.read_(db,'Users')[0];
  ctx.saveDepartment({departmentName:'Dispatch',status:'ACTIVE'});
  ctx.saveDepartment({departmentName:'Quality',status:'ACTIVE'});
  const [d1,d2]=ctx.read_(db,'Departments');
  function add(name,role,departmentId){return ctx.saveUser({name,email:name.toLowerCase()+'@example.com',role,departmentId,mobile:'',managerUserId:'',status:'ACTIVE'});}
  const manager=add('Manager','MANAGER',d1.departmentId),staff=add('Staff','STAFF',d1.departmentId),
    peer=add('Peer','STAFF',d1.departmentId),other=add('Other','STAFF',d2.departmentId),md=add('Director','MD','');
  return {ctx,db,props,messages,triggers,admin,manager,staff,peer,other,md,d1,d2,
    login(u){active=typeof u==='string'?u:u.email;},
    effective(e){effective=e;},
    failNext(table){failTable=table;failOnce=true;},
    create(doer=staff,extra={}){return ctx.createTask({requestId:randomUUID(),doerUserId:doer.userId,targetDate:'2026-10-30',description:'Check shipment',priority:'HIGH',...extra});},
    rows(name){return ctx.read_(db,name);}
  };
};
