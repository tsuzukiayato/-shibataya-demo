
const STAFF=["本院","山口","竹谷","赤尾","中西","釆野","増田","都築","伊藤","長谷川","山梨","松田"];
const AM=["09:00","09:20","09:40","10:00","10:20","10:40","11:00","11:20","11:40","12:00"],PM=["15:00","15:20","15:40","16:00","16:20","16:40","17:00","17:20","17:40","18:00","18:20","18:40","19:00"];
const P=[{id:"10012",name:"天塚 文隆",t:"general"},{id:"10021",name:"加藤 花子",t:"bundle"},{id:"10046",name:"山口 一郎",t:"care"},{id:"10056",name:"伊藤 美咲",t:"general"}];
const KEY="shibataya_v11";let D=JSON.parse(localStorage.getItem(KEY)||"null")||{date:"2026-10-01",shift:{},override:{},slotOverride:{},slots:{}};if(!D.slotOverride)D.slotOverride={};if(!Object.keys(D.shift||{}).length){D.shift={};STAFF.forEach(s=>D.shift[s]="normal");D.shift["本院"]="phys";D.shift["松田"]="full"}if(!D.override)D.override={};if(!D.slots)D.slots={};
let current="山口",edit=null;
function save(){localStorage.setItem(KEY,JSON.stringify(D))}
function eff(s){return D.override[s]||D.shift[s]||"normal"}function closed(s,t){let x=eff(s),h=parseInt(t);return x==="full"||(x==="amoff"&&h<15)||(x==="pmoff"&&h>=15)||(x==="600"&&h>=18)}function phys(s,t){let x=eff(s),h=parseInt(t);return x==="phys"||(x==="physam"&&h<15)||(x==="physpm"&&h>=15)}function base(s,t){return closed(s,t)?"closed":phys(s,t)?"phys":"normal"}function state(s,t){return D.slotOverride[t+"|"+s]||base(s,t)}
function renderStaffs(){document.getElementById("staffs").innerHTML=STAFF.map(s=>`<button class="${s===current?"on":""}" onclick="current='${s}';renderStaffs();renderSchedule()">${s}</button>`).join("")}
function label(t){return t==="care"?"介護":t==="bundle"?"まとめ":"一般"}function block(title,a){return `<div class="sectiontitle"><b>${title}</b><span class="small">${current}</span></div><div class="card">${a.map(t=>slot(t)).join("")}</div>`}
function slot(t){let k=t+"|"+current,st=state(current,t),x=D.slots[k],ov=D.slotOverride[k],body=st==="closed"?`<div class="box closed">閉鎖</div>`:st==="phys"?`<div class="box phys">物療担当・予約不可</div>`:x?`<div class="box"><div class="name ${x.t}">${x.name}${x.borrow?` <span class="borrow">(${x.borrow})</span>`:""}</div><div class="small">#${x.id} / ${label(x.t)}</div></div>`:`<div class="box empty">空き</div>`;return `<div class="slot" onclick="openSlot('${t}')"><div class="time">${t}${ov?`<div style="font-size:9px;color:#ff7b00">手動</div>`:""}</div>${body}<div class="chev">›</div></div>`}
function renderSchedule(){document.getElementById("schedule").innerHTML=block("午前",AM)+block("午後",PM)}
function openSlot(t){edit={s:current,t,k:t+"|"+current};document.getElementById("mtitle").textContent=current+" "+t;let b=base(current,t);document.getElementById("mstatus").textContent="シフト由来："+(b==="closed"?"閉鎖":b==="phys"?"物療":"通常")+" ／ 現在："+({closed:"閉鎖",phys:"物療",normal:"通常"}[state(current,t)]);document.getElementById("modal").classList.add("show")}
function closeM(){document.getElementById("modal").classList.remove("show")}function slotAct(v){
 if(!edit)return;
 if(v==="normal"&&base(edit.s,edit.t)!=="normal"&&!confirm("シフト設定をこの20分だけ上書きして開放しますか？"))return;
 if(v==="base"){delete D.slotOverride[edit.k];}
 else{D.slotOverride[edit.k]=v;}
 save();
 closeM();
 renderSchedule();
 setTimeout(renderSchedule,0);
}
function choosePatient(){closeM();document.getElementById("psearch").value="";renderPicker();document.getElementById("patientmodal").classList.add("show")}
function renderPicker(){let q=document.getElementById("psearch").value.toLowerCase();document.getElementById("picker").innerHTML=P.filter(p=>!q||p.name.toLowerCase().includes(q)||p.id.includes(q)).map(p=>`<div class="result" onclick="book('${p.id}')"><b>${p.name}</b> <span class="badge">${label(p.t)}</span><div class="small">患者番号 ${p.id}</div></div>`).join("")}
function book(id){let p=P.find(x=>x.id===id);D.slots[edit.k]={id:p.id,name:p.name,t:p.t};D.slotOverride[edit.k]="normal";save();document.getElementById("patientmodal").classList.remove("show");renderSchedule()}
function renderSearch(){let q=document.getElementById("search").value.toLowerCase();document.getElementById("results").innerHTML=P.filter(p=>!q||p.name.toLowerCase().includes(q)||p.id.includes(q)).map(p=>`<div class="result"><b>${p.name}</b> <span class="badge">${label(p.t)}</span><div class="small">#${p.id}</div></div>`).join("")}
function desc(x){return {normal:"通常",full:"全日休み",amoff:"午前休み",pmoff:"午後休み","600":"18時上がり",phys:"終日物療",physam:"午前物療",physpm:"午後物療"}[x]||x}
function renderShift(){document.getElementById("shiftlist").innerHTML=STAFF.map(s=>`<div class="shiftrow"><b>${s}</b><select onchange="D.override['${s}']=this.value==='base'?undefined:this.value;if(this.value==='base')delete D.override['${s}'];save();renderSchedule()"><option value="base">シフト：${desc(D.shift[s]||"normal")}</option><option value="normal">通常</option><option value="full">全日休み</option><option value="amoff">午前休み</option><option value="pmoff">午後休み</option><option value="600">18時上がり</option><option value="phys">終日物療</option><option value="physam">午前物療</option><option value="physpm">午後物療</option></select></div>`).join("")}
function view(v){["pt","search","shift"].forEach(x=>{document.getElementById(x+"view").style.display=x===v?"block":"none";document.getElementById("nav"+x).classList.toggle("on",x===v)});if(v==="shift")renderShift();if(v==="search")renderSearch()}
renderStaffs();renderSchedule();
