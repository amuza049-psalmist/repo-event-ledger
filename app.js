

(function () {
  "use strict";
  const ACCOUNT_KEY="unza-event-ledger-account-v1";
  const EVENTS_KEY="unza-event-ledger-events-v1";
  const ROUTINES_KEY="unza-event-ledger-routines-v1";
  const ENCRYPTION_ITERATIONS=310000;
  let events=[], routines=[], audioContext=null, alarmTimer=null, activeAlarm=null, routineTimer=null, routineAlarmTimer=null, audioEnabled=false, routineAudioEnabled=false, encryptionKey=null, activityEntries=[];
  let routineSaveQueue=Promise.resolve();
  const $=id=>document.getElementById(id);
  function setButtonLabel(button,icon,label){const iconNode=document.createElement("span"),textNode=document.createElement("span");iconNode.className="button-icon";iconNode.setAttribute("aria-hidden","true");iconNode.textContent=icon;textNode.textContent=label;button.replaceChildren(iconNode,textNode)}
  function setPasswordVisibility(button,visible){const input=$(button.getAttribute("aria-controls"));input.type=visible?"text":"password";setButtonLabel(button,"👁",visible?"Hide":"Show");button.setAttribute("aria-label",visible?"Hide password":"Show password");button.setAttribute("aria-pressed",String(visible))}
  function setAppView(viewName){["schedule","events","files","routine"].forEach(name=>{const tab=$("tab"+name[0].toUpperCase()+name.slice(1)),panel=$(name==="routine"?"routinePanel":name+"View"),active=name===viewName;tab.setAttribute("aria-selected",String(active));tab.tabIndex=active?0:-1;panel.hidden=!active});if(viewName==="routine")renderRoutines()}
  const appTabs=Array.from(document.querySelectorAll(".app-tab"));
  appTabs.forEach((button,index)=>{
    button.addEventListener("click",()=>setAppView(button.id.slice(3).toLowerCase()));
    button.addEventListener("keydown",event=>{
      let nextIndex=index;
      if(event.key==="ArrowRight")nextIndex=(index+1)%appTabs.length;
      else if(event.key==="ArrowLeft")nextIndex=(index+appTabs.length-1)%appTabs.length;
      else if(event.key==="Home")nextIndex=0;
      else if(event.key==="End")nextIndex=appTabs.length-1;
      else return;
      event.preventDefault();
      appTabs[nextIndex].focus();
      setAppView(appTabs[nextIndex].id.slice(3).toLowerCase());
    });
  });
  document.querySelectorAll(".password-toggle").forEach(button=>button.addEventListener("click",()=>{const input=$(button.getAttribute("aria-controls"));setPasswordVisibility(button,input.type==="password")}));
  function isValidComputerNumber(value){return /^2\d{9}$/.test(value)}
  function isValidPassword(value){return value.startsWith("unza")&&value.length>=6}
  const PASSWORD_REQUIREMENT='Password must start with "unza" and contain at least 6 characters.';
  const textEncoder=new TextEncoder();
  function renderActivityLog(){const list=$("activityLog");if(!list)return;list.replaceChildren();if(!activityEntries.length){const empty=document.createElement("li");empty.textContent="No activity yet.";list.appendChild(empty);return}activityEntries.forEach(entry=>{const item=document.createElement("li");const message=document.createElement("div");message.textContent=entry.message;const time=document.createElement("small");time.textContent=new Date(entry.time).toLocaleString();item.append(message,time);list.appendChild(item)})}
  function addActivity(message){activityEntries.unshift({message,time:new Date().toISOString()});if(activityEntries.length>30)activityEntries.length=30;console.info("[MY UNILIFE(UNZA)]",message);renderActivityLog()}
  function toBase64(bytes){let binary="";for(let offset=0;offset<bytes.length;offset+=0x8000)binary+=String.fromCharCode(...bytes.subarray(offset,offset+0x8000));return btoa(binary)}
  function fromBase64(value){const binary=atob(value),bytes=new Uint8Array(binary.length);for(let index=0;index<binary.length;index++)bytes[index]=binary.charCodeAt(index);return bytes}
  async function deriveEncryptionKey(password,salt){if(!window.crypto?.subtle)throw new Error("Secure browser encryption is unavailable. Open the app over HTTPS or localhost.");const material=await crypto.subtle.importKey("raw",textEncoder.encode(password),"PBKDF2",false,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:ENCRYPTION_ITERATIONS,hash:"SHA-256"},material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])}
  async function encryptBytes(bytes,key){const iv=crypto.getRandomValues(new Uint8Array(12));const data=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,bytes);return{iv,data}}
  async function decryptBytes(record,key){return new Uint8Array(await crypto.subtle.decrypt({name:"AES-GCM",iv:record.iv},key,record.data))}
  async function sealJson(value,key){const encrypted=await encryptBytes(textEncoder.encode(JSON.stringify(value)),key);return JSON.stringify({version:2,iv:toBase64(encrypted.iv),data:toBase64(new Uint8Array(encrypted.data))})}
  async function openJson(record,key){const bytes=await decryptBytes({iv:fromBase64(record.iv),data:fromBase64(record.data)},key);return JSON.parse(new TextDecoder().decode(bytes))}
  async function createEncryptedAccount(computerNumber,password){const salt=crypto.getRandomValues(new Uint8Array(16)),key=await deriveEncryptionKey(password,salt),verification=await encryptBytes(textEncoder.encode("UNZA Event Ledger account verification"),key);return{account:{version:2,computerNumber,salt:toBase64(salt),verification:{iv:toBase64(verification.iv),data:toBase64(new Uint8Array(verification.data))}},key}}
  async function verifyEncryptedAccount(account,password){const key=await deriveEncryptionKey(password,fromBase64(account.salt));let verification;try{const bytes=await decryptBytes({iv:fromBase64(account.verification.iv),data:fromBase64(account.verification.data)},key);verification=new TextDecoder().decode(bytes)}catch(_){throw new Error("Wrong password.")}if(verification!=="UNZA Event Ledger account verification")throw new Error("Wrong password.");return key}
  async function encryptStoredFile(file,key){const bytes=new Uint8Array(await file.data.arrayBuffer()),encrypted=await encryptBytes(bytes,key),metadata=await encryptBytes(textEncoder.encode(JSON.stringify({name:file.name,size:file.size,type:file.type,added:file.added})),key);return{id:file.id,encrypted:true,metadataIv:metadata.iv,metadata:metadata.data,dataIv:encrypted.iv,data:encrypted.data}}
  async function decryptStoredFile(file,key){if(!file.encrypted)throw new Error("A stored file is not encrypted.");const [bytes,metadataBytes]=await Promise.all([decryptBytes({iv:file.dataIv,data:file.data},key),decryptBytes({iv:file.metadataIv,data:file.metadata},key)]),metadata=JSON.parse(new TextDecoder().decode(metadataBytes));return{id:file.id,...metadata,data:new Blob([bytes],{type:metadata.type})}}
  async function migrateStoredData(key){const previousEvents=localStorage.getItem(EVENTS_KEY);let currentEvents=[];if(previousEvents){currentEvents=JSON.parse(previousEvents);if(!Array.isArray(currentEvents))throw new Error("Existing event data is invalid; it was not changed.")}const previousFiles=await fileTransaction("readonly",store=>store.getAll());const encryptedEvents=await sealJson(currentEvents,key);const encryptedFiles=await Promise.all(previousFiles.map(file=>file.encrypted?file:encryptStoredFile(file,key)));try{localStorage.setItem(EVENTS_KEY,encryptedEvents);await fileTransaction("readwrite",store=>{encryptedFiles.forEach(file=>store.put(file));return null})}catch(error){if(previousEvents===null)localStorage.removeItem(EVENTS_KEY);else localStorage.setItem(EVENTS_KEY,previousEvents);throw error}}
  async function saveAccountAndMigrate(account,key){const previousAccount=localStorage.getItem(ACCOUNT_KEY);try{localStorage.setItem(ACCOUNT_KEY,JSON.stringify(account));await migrateStoredData(key)}catch(error){if(previousAccount===null)localStorage.removeItem(ACCOUNT_KEY);else localStorage.setItem(ACCOUNT_KEY,previousAccount);throw error}}
  async function loadEncryptedEvents(key){const raw=localStorage.getItem(EVENTS_KEY);if(!raw)return[];const record=JSON.parse(raw);if(record.version!==2)throw new Error("Event data has not been encrypted.");const value=await openJson(record,key);if(!Array.isArray(value))throw new Error("Encrypted event data is invalid.");return value}
  function isValidRoutine(routine){if(!routine||typeof routine.id!=="string"||!routine.id||typeof routine.title!=="string"||!routine.title||typeof routine.time!=="string"||!/^([01]\d|2[0-3]):[0-5]\d$/.test(routine.time)||!["once","daily","weekly"].includes(routine.repeat))return false;if(routine.repeat==="once"&&(typeof routine.date!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(routine.date)))return false;if(routine.repeat==="weekly"&&(!Number.isInteger(routine.weekday)||routine.weekday<0||routine.weekday>6))return false;if(routine.nextAt===null)return routine.repeat==="once"&&typeof routine.completedAt==="string"&&!Number.isNaN(Date.parse(routine.completedAt));return typeof routine.nextAt==="string"&&!Number.isNaN(Date.parse(routine.nextAt))}
  async function loadEncryptedRoutines(key){const raw=localStorage.getItem(ROUTINES_KEY);if(!raw)return[];const record=JSON.parse(raw);if(record.version!==2)throw new Error("Routine data has not been encrypted.");const value=await openJson(record,key);if(!Array.isArray(value)||value.some(routine=>!isValidRoutine(routine)))throw new Error("Encrypted routine data is invalid.");return value}
  function saveRoutineSnapshot(snapshot,key){if(!key)return Promise.reject(new Error("Log in before saving routine alarms."));const serialized=JSON.stringify(snapshot);const operation=routineSaveQueue.catch(()=>{}).then(async()=>{try{localStorage.setItem(ROUTINES_KEY,await sealJson(JSON.parse(serialized),key))}catch(error){$("routineAlarmStatus").textContent="Could not encrypt or save routine alarms. Check browser storage and try again.";throw error}});routineSaveQueue=operation;return operation}
  function localDateAtRoutineTime(date,time){const [hours,minutes]=time.split(":").map(Number);return new Date(date.getFullYear(),date.getMonth(),date.getDate(),hours,minutes,0,0)}
  function nextRoutineOccurrence(routine,now){
    const current=new Date(now);
    if(routine.repeat==="once"){const occurrence=new Date(routine.date+"T"+routine.time);return !Number.isNaN(occurrence.getTime())&&occurrence.getTime()>now?occurrence:null}
    if(routine.repeat==="daily"){const occurrence=localDateAtRoutineTime(current,routine.time);if(occurrence.getTime()<=now)occurrence.setDate(occurrence.getDate()+1);return occurrence}
    const daysAhead=(routine.weekday-current.getDay()+7)%7;
    const occurrence=localDateAtRoutineTime(current,routine.time);
    occurrence.setDate(occurrence.getDate()+daysAhead);
    if(occurrence.getTime()<=now)occurrence.setDate(occurrence.getDate()+7);
    return occurrence;
  }
  function normalizeRoutineSchedules(items,now){let changed=false;items.forEach(routine=>{if(!routine.nextAt||new Date(routine.nextAt).getTime()>now)return;if(routine.repeat==="once"){routine.completedAt=routine.nextAt;routine.nextAt=null}else routine.nextAt=nextRoutineOccurrence(routine,now).toISOString();changed=true});return changed}
  function showAuthMode(mode){const login=mode==="login";$("loginForm").hidden=!login;$("registerForm").hidden=login;$("showLogin").classList.toggle("active",login);$("showRegister").classList.toggle("active",!login);$("showLogin").setAttribute("aria-selected",String(login));$("showRegister").setAttribute("aria-selected",String(!login));$("authMessage").textContent=""}
  $("showLogin").addEventListener("click",()=>showAuthMode("login"));
  $("showRegister").addEventListener("click",()=>showAuthMode("register"));
  $("loginForm").addEventListener("submit",async event=>{
    event.preventDefault();
    const computerNumber=$("loginComputerNumber").value.trim(),password=$("loginPassword").value;
    if(!isValidComputerNumber(computerNumber)){$("authMessage").textContent="Enter a 10-digit computer number starting with 2.";return}
    if(!password){$("authMessage").textContent="Enter your password.";return}
    try{
      const account=JSON.parse(localStorage.getItem(ACCOUNT_KEY)||"null");
      if(!account||account.computerNumber!==computerNumber){$("authMessage").textContent="No account found for this computer number.";return}
      let key;
      if(account.version===2)key=await verifyEncryptedAccount(account,password);
      else{
        const legacyHash=await crypto.subtle.digest("SHA-256",textEncoder.encode(password));
        const hash=Array.from(new Uint8Array(legacyHash)).map(byte=>byte.toString(16).padStart(2,"0")).join("");
        if(account.passwordHash?account.passwordHash!==hash:account.password!==password)throw new Error("Wrong password.");
        const encrypted=await createEncryptedAccount(computerNumber,password);
        await saveAccountAndMigrate(encrypted.account,encrypted.key);
        key=encrypted.key;
      }
      $("loginPassword").value="";
      setPasswordVisibility($("toggleLoginPassword"),false);
      await openApp(computerNumber,key);
    }catch(error){
      const wrongPassword=error.message==="Wrong password."||error.message==="Incorrect password.";
      $("authMessage").textContent=wrongPassword?"Wrong password. "+PASSWORD_REQUIREMENT:"Could not unlock or protect local data: "+error.message;
    }
  });
  $("registerForm").addEventListener("submit",async event=>{event.preventDefault();const computerNumber=$("registerComputerNumber").value.trim(),password=$("registerPassword").value;if(!isValidComputerNumber(computerNumber)){$("authMessage").textContent="Enter a 10-digit computer number starting with 2.";return}if(!isValidPassword(password)){$("authMessage").textContent=PASSWORD_REQUIREMENT;return}try{if(localStorage.getItem(ACCOUNT_KEY)){showAuthMode("login");$("authMessage").textContent="An account already exists in this browser. Log in instead.";return}const encrypted=await createEncryptedAccount(computerNumber,password);await saveAccountAndMigrate(encrypted.account,encrypted.key);$("registerPassword").value="";setPasswordVisibility($("toggleRegisterPassword"),false);await openApp(computerNumber,encrypted.key)}catch(error){$("authMessage").textContent="Could not create or protect the account data: "+error.message}});
  async function openApp(computerNumber,key){const decryptedEvents=await loadEncryptedEvents(key),decryptedRoutines=await loadEncryptedRoutines(key);if(normalizeRoutineSchedules(decryptedRoutines,Date.now()))await saveRoutineSnapshot(decryptedRoutines,key);encryptionKey=key;events=decryptedEvents;routines=decryptedRoutines;$("loginScreen").style.display="none";$("app").style.display="block";$("loggedInUser").textContent="Computer number: "+computerNumber;setAppView("schedule");renderEvents();renderRoutines();renderActivityLog();addActivity("Logged in.");await renderFiles()}
  $("logout").addEventListener("click",()=>{addActivity("Logged out.");encryptionKey=null;events=[];routines=[];clearFilePreviewUrls();audioEnabled=false;routineAudioEnabled=false;clearActiveAlarm();clearRoutineAlarm();$("eventList").replaceChildren();$("routineList").replaceChildren();$("fileList").replaceChildren();$("filePicker").value="";$("activateAlarm").disabled=false;setButtonLabel($("activateAlarm"),"🔔","Enable");$("activateRoutineSound").disabled=false;setButtonLabel($("activateRoutineSound"),"🔔","Enable");$("testRoutineSound").disabled=true;$("routineAlarmStatus").textContent="Routine alarms are separate from scheduled event alarms.";$("app").style.display="none";setAppView("schedule");$("loginScreen").style.display="flex";$("loginForm").reset();$("registerForm").reset();showAuthMode("login");$("activityLogPanel").hidden=true;$("activityLogButton").setAttribute("aria-expanded","false")});
  $("activityLogButton").addEventListener("click",()=>{const panel=$("activityLogPanel"),opening=panel.hidden;panel.hidden=!opening;$("activityLogButton").setAttribute("aria-expanded",String(opening));renderActivityLog()});
  let eventSaveQueue=Promise.resolve();
  function saveEvents(){if(!encryptionKey)return Promise.reject(new Error("Log in before saving event data."));const key=encryptionKey,snapshot=JSON.stringify(events);const operation=eventSaveQueue.catch(()=>{}).then(async()=>{try{localStorage.setItem(EVENTS_KEY,await sealJson(JSON.parse(snapshot),key))}catch(error){alert("Could not encrypt or save events. Check browser storage and try again.");throw error}});eventSaveQueue=operation;return operation}
  function makeId(){return Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9)}
  function formatDate(value){const date=new Date(value);return Number.isNaN(date.getTime())?"Invalid date":date.toLocaleString()}
  function escapeICS(value){return String(value||"").replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;")}
  function renderEvents(){
    const list=$("eventList");
    list.replaceChildren();
    const sorted=[...events].sort((a,b)=>new Date(a.when)-new Date(b.when));
    if(!sorted.length){const empty=document.createElement("li");empty.className="empty";empty.textContent="No events yet.";list.appendChild(empty);return}
    sorted.forEach(event=>{
      const missed=new Date(event.when).getTime()<=Date.now();
      const li=document.createElement("li");
      li.className="row"+(missed?" missed-event":"");
      const main=document.createElement("div");
      main.className="row-main";
      const title=document.createElement("div");
      title.className="row-title";
      const badge=document.createElement("span");
      badge.className="badge"+(event.source?" imported":"");
      badge.textContent=event.category||"Other";
      title.append(badge);
      if(missed){const missedBadge=document.createElement("span");missedBadge.className="badge missed";missedBadge.textContent="Missed";title.append(missedBadge)}
      title.appendChild(document.createTextNode(event.title));
      const meta=document.createElement("small");
      meta.textContent=(missed?"Missed · Scheduled for ":"")+formatDate(event.when)+(event.details?" · "+event.details:"");
      main.append(title,meta);
      const actions=document.createElement("div");
      actions.className="row-actions";
      const alarm=document.createElement("button");
      alarm.type="button";
      alarm.className="teal";
      setButtonLabel(alarm,"⏰","Phone alarm");
      alarm.addEventListener("click",()=>{downloadICS([event],event.title);addActivity("Exported phone alarm: "+event.title)});
      const remove=document.createElement("button");
      remove.type="button";
      remove.className="danger";
      setButtonLabel(remove,"🗑","Delete");
      remove.addEventListener("click",async()=>{
        const previousEvents=events;
        events=events.filter(item=>item.id!==event.id);
        try{await saveEvents();renderEvents();addActivity("Deleted event: "+event.title)}
        catch(_){events=previousEvents}
      });
      actions.append(alarm,remove);
      li.append(main,actions);
      list.appendChild(li);
    });
  }
  async function startAudioFromGesture(){const AudioContextClass=window.AudioContext||window.webkitAudioContext;if(!AudioContextClass)return false;try{audioContext=audioContext||new AudioContextClass();if(audioContext.state==="suspended")await audioContext.resume();return audioContext.state==="running"}catch(_){ }return false}
  $("eventForm").addEventListener("submit",async event=>{event.preventDefault();const title=$("title").value.trim();const date=new Date($("when").value);if(!title||Number.isNaN(date.getTime())){alert("Enter an event title and a valid date and time.");return}if(date.getTime()<=Date.now()){alert("Choose a date and time in the future so the alarm can ring.");return}startAudioFromGesture().then(enabled=>{if(enabled)audioEnabled=true});const previousEvents=events;events=[...events,{id:makeId(),title,category:$("category").value,when:date.toISOString(),details:$("details").value.trim(),source:""}];try{await saveEvents();renderEvents();event.currentTarget.reset();addActivity("Added event: "+title);$("alarmStatus").textContent="Event saved and encrypted. Keep this page open for the alarm; sound is enabled when your browser allows it."}catch(_){events=previousEvents}});
  function parseICS(text){const unfolded=text.replace(/\r?\n[ \t]/g,"").split(/\r?\n/),items=[];let item=null;for(const line of unfolded){if(line==="BEGIN:VEVENT"){item={};continue}if(line==="END:VEVENT"&&item){const start=item.DTSTART;if(start){const value=start.split(":").pop();let date=null;if(/^\d{8}$/.test(value)){date=new Date(value.slice(0,4)+"-"+value.slice(4,6)+"-"+value.slice(6,8)+"T00:00:00")}else if(/^\d{8}T\d{6}Z?$/.test(value)){date=new Date(value.slice(0,4)+"-"+value.slice(4,6)+"-"+value.slice(6,8)+"T"+value.slice(9,11)+":"+value.slice(11,13)+":"+value.slice(13,15)+(value.endsWith("Z")?"Z":""))}if(date&&!Number.isNaN(date.getTime()))items.push({title:(item.SUMMARY||"Imported event").replace(/\\([nN])/g," ").replace(/\\([,;\\])/g,"$1"),when:date.toISOString(),details:(item.DESCRIPTION||"").replace(/\\n/g," ").replace(/\\,/g,",").slice(0,500)})}item=null;continue}if(item){const colon=line.indexOf(":");if(colon>0){const key=line.slice(0,colon).split(";")[0].toUpperCase();if(key==="DTSTART"||key==="SUMMARY"||key==="DESCRIPTION")item[key]=line.slice(colon+1)}}}return items}
  $("chooseICS").addEventListener("click",()=>$("icsPicker").click());
  $("icsPicker").addEventListener("change",function(){const file=this.files?.[0];if(!file)return;if(file.size>5*1024*1024){$("importMessage").textContent="The calendar file is too large.";this.value="";return}const reader=new FileReader();reader.onload=async()=>{const previousEvents=[...events];try{const parsed=parseICS(String(reader.result||""));let added=0;parsed.forEach(item=>{if(!events.some(old=>old.title===item.title&&old.when===item.when)){events.push({id:makeId(),title:item.title,category:"Other",when:item.when,details:item.details,source:"ics"});added++}});await saveEvents();renderEvents();addActivity(`Imported ${added} event(s) from `+file.name);$("importMessage").textContent=`${added} event(s) imported from ${file.name}.`}catch(error){events=previousEvents;$("importMessage").textContent="Could not read or securely save this calendar file: "+error.message}};reader.onerror=()=>{$("importMessage").textContent="Could not read this calendar file."};reader.readAsText(file);this.value=""});
  function downloadICS(items,label){const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//MY UNILIFE(UNZA)//EN","CALSCALE:GREGORIAN"];items.forEach(item=>{const date=new Date(item.when);if(Number.isNaN(date.getTime()))return;const stamp=date.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");lines.push("BEGIN:VEVENT","UID:"+(item.id||makeId())+"@unza-event-ledger","DTSTAMP:"+stamp,"DTSTART:"+stamp,"SUMMARY:"+escapeICS(item.title),"DESCRIPTION:"+escapeICS(item.details||""),"BEGIN:VALARM","TRIGGER:-PT0M","ACTION:DISPLAY","DESCRIPTION:"+escapeICS(item.title),"END:VALARM","END:VEVENT")});lines.push("END:VCALENDAR");const blob=new Blob([lines.join("\r\n")],{type:"text/calendar;charset=utf-8"}),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=(String(label).replace(/[^a-z0-9-_]+/gi,"-").slice(0,50)||"unza-events")+".ics";document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  $("exportICS").addEventListener("click",()=>{downloadICS(events,"unza-events");addActivity("Exported all events as .ics.")});
  async function ring(enabled=audioEnabled){if(!enabled||!audioContext)return;if(audioContext.state==="suspended"){try{await audioContext.resume()}catch(_){return}}if(audioContext.state!=="running")return;try{const now=audioContext.currentTime,master=audioContext.createGain();master.gain.setValueAtTime(0.0001,now);master.gain.exponentialRampToValueAtTime(0.28,now+0.025);master.gain.setValueAtTime(0.28,now+0.38);master.gain.exponentialRampToValueAtTime(0.0001,now+0.82);master.connect(audioContext.destination);[880,660,880].forEach((frequency,index)=>{const oscillator=audioContext.createOscillator(),gain=audioContext.createGain(),start=now+(index*0.24);oscillator.type="triangle";oscillator.frequency.setValueAtTime(frequency,start);gain.gain.setValueAtTime(0.0001,start);gain.gain.exponentialRampToValueAtTime(0.55,start+0.02);gain.gain.exponentialRampToValueAtTime(0.0001,start+0.19);oscillator.connect(gain);gain.connect(master);oscillator.start(start);oscillator.stop(start+0.2)})}catch(_){}}
  function clearActiveAlarm(){if(alarmTimer){clearInterval(alarmTimer);alarmTimer=null}activeAlarm=null;$("alarmBanner").classList.remove("show")}
  function setAlarmStatus(message){$("alarmStatus").textContent=message}
  async function requestNotificationPermission(){if(!("Notification" in window))return false;if(Notification.permission==="default")await Notification.requestPermission();return Notification.permission==="denied"}
  async function checkAlarms(){if(!encryptionKey)return;if(activeAlarm){const stillActive=events.some(event=>event===activeAlarm&&!event.alarmedAt);if(stillActive)return;clearActiveAlarm()}const now=Date.now();const due=events.find(event=>!event.alarmedAt&&new Date(event.when).getTime()<=now);if(!due)return;due.alarmedAt=new Date().toISOString();renderEvents();try{await saveEvents()}catch(_){setAlarmStatus("Alarm triggered, but its state could not be securely saved.")}activeAlarm=due;$("alarmText").textContent="⏰ "+due.title+" — "+formatDate(due.when);$("alarmBanner").classList.add("show");await ring();if(audioEnabled&&!alarmTimer)alarmTimer=setInterval(ring,1100);if("Notification" in window&&Notification.permission==="granted"){try{new Notification("MY UNILIFE(UNZA): "+due.title,{body:formatDate(due.when),requireInteraction:true})}catch(_){}}if(navigator.vibrate)navigator.vibrate([300,150,300,150,600])}
  function renderRoutines(){
    const list=$("routineList");
    list.replaceChildren();
    if(!routines.length){const empty=document.createElement("li");empty.className="empty";empty.textContent="No routine alarms yet.";list.appendChild(empty);return}
    const weekdays=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    [...routines].sort((a,b)=>(a.nextAt||a.completedAt||"").localeCompare(b.nextAt||b.completedAt||"")).forEach(routine=>{
      const item=document.createElement("li");
      item.className="row";
      const main=document.createElement("div");
      main.className="row-main";
      const title=document.createElement("div");
      title.className="row-title";
      title.textContent=routine.title;
      const meta=document.createElement("small");
      if(!routine.nextAt)meta.textContent="Once · Completed "+formatDate(routine.completedAt);
      else if(routine.repeat==="once")meta.textContent="Once · "+formatDate(routine.nextAt);
      else if(routine.repeat==="daily")meta.textContent="Daily at "+routine.time+" · Next: "+formatDate(routine.nextAt);
      else meta.textContent="Weekly on "+weekdays[routine.weekday]+" at "+routine.time+" · Next: "+formatDate(routine.nextAt);
      main.append(title,meta);
      const remove=document.createElement("button");
      remove.type="button";
      remove.className="danger";
      setButtonLabel(remove,"🗑","Delete");
      remove.addEventListener("click",async()=>{
        const previous=routines;
        routines=routines.filter(item=>item.id!==routine.id);
        try{await saveRoutineSnapshot(routines,encryptionKey);renderRoutines();addActivity("Deleted routine alarm: "+routine.title)}
        catch(error){routines=previous;$("routineAlarmStatus").textContent="Could not delete the routine alarm: "+error.message}
      });
      item.append(main,remove);
      list.appendChild(item);
    });
  }
  function clearRoutineAlarm(){if(routineAlarmTimer){clearInterval(routineAlarmTimer);routineAlarmTimer=null}$("routineAlarmBanner").classList.remove("show")}
  async function checkRoutineAlarms(){
    if(!encryptionKey)return;
    const now=Date.now();
    const due=routines.filter(routine=>routine.nextAt&&new Date(routine.nextAt).getTime()<=now);
    if(!due.length)return;
    due.forEach(routine=>{
      const triggeredAt=routine.nextAt;
      routine.lastTriggeredAt=triggeredAt;
      if(routine.repeat==="once"){routine.completedAt=triggeredAt;routine.nextAt=null}
      else routine.nextAt=nextRoutineOccurrence(routine,now).toISOString();
    });
    let saveError=null;
    try{await saveRoutineSnapshot(routines,encryptionKey)}
    catch(error){saveError=error;console.error("Could not save the next routine alarm.",error)}
    renderRoutines();
    const message=due.map(routine=>routine.title+" — "+formatDate(routine.lastTriggeredAt)).join("; ");
    $("routineAlarmText").textContent="⏰ Routine alarm: "+message;
    $("routineAlarmStatus").textContent=saveError?"Routine alarm is due: "+message+". Could not save its next occurrence: "+saveError.message:"Routine alarm is due: "+message;
    $("routineAlarmBanner").classList.add("show");
    await ring(routineAudioEnabled);
    if(routineAudioEnabled&&!routineAlarmTimer)routineAlarmTimer=setInterval(()=>ring(true),1100);
    if("Notification" in window&&Notification.permission==="granted"){try{new Notification("MY UNILIFE(UNZA): Routine alarm",{body:message,requireInteraction:true})}catch(error){console.error("Could not show the routine notification.",error)}}
    if(navigator.vibrate)navigator.vibrate([300,150,300,150,600]);
  }
  function updateRoutineFields(){const once=$("routineRepeat").value==="once",weekly=$("routineRepeat").value==="weekly";$("routineDateField").hidden=!once;$("routineWeekdayField").hidden=!weekly}
  $("routineRepeat").addEventListener("change",updateRoutineFields);
  const today=new Date();
  $("routineDate").value=[today.getFullYear(),String(today.getMonth()+1).padStart(2,"0"),String(today.getDate()).padStart(2,"0")].join("-");
  $("routineWeekday").value=String(today.getDay());
  updateRoutineFields();
  $("routineForm").addEventListener("submit",async event=>{
    event.preventDefault();
    const title=$("routineTitle").value.trim(),time=$("routineTime").value,repeat=$("routineRepeat").value;
    if(!title||!time){$("routineAlarmStatus").textContent="Enter a routine name and alarm time.";return}
    const routine={id:makeId(),title,time,repeat,nextAt:null};
    if(repeat==="once")routine.date=$("routineDate").value;
    if(repeat==="weekly")routine.weekday=Number($("routineWeekday").value);
    const next=nextRoutineOccurrence(routine,Date.now());
    if(!next){$("routineAlarmStatus").textContent="Choose a future date and time for this routine alarm.";return}
    routine.nextAt=next.toISOString();
    const previous=routines;
    routines=[...routines,routine];
    try{await saveRoutineSnapshot(routines,encryptionKey);renderRoutines();event.currentTarget.reset();$("routineDate").value=[new Date().getFullYear(),String(new Date().getMonth()+1).padStart(2,"0"),String(new Date().getDate()).padStart(2,"0")].join("-");$("routineWeekday").value=String(new Date().getDay());updateRoutineFields();$("routineAlarmStatus").textContent="Routine alarm saved and encrypted.";addActivity("Added routine alarm: "+title)}
    catch(error){routines=previous;renderRoutines();$("routineAlarmStatus").textContent="Could not save this routine alarm: "+error.message}
  });
  $("activateRoutineSound").addEventListener("click",async function(){const enabled=await startAudioFromGesture();if(!enabled){$("routineAlarmStatus").textContent="Routine sound could not be unlocked. Allow audio for this page, then try again.";return}routineAudioEnabled=true;const notificationDenied=await requestNotificationPermission();$("routineAlarmStatus").textContent=notificationDenied?"Routine sound activated. Notifications are blocked; keep this page open for sound.":"Routine alarm sound activated. Keep this page open for audible alarms.";setButtonLabel(this,"✓","Enabled");this.disabled=true;$("testRoutineSound").disabled=false;await ring(true)});
  $("testRoutineSound").addEventListener("click",async()=>{if(!routineAudioEnabled){$("routineAlarmStatus").textContent="Activate routine alarm sound first.";return}await ring(true);$("routineAlarmStatus").textContent="Routine alarm test sound played."});
  $("stopRoutineAlarm").addEventListener("click",()=>clearRoutineAlarm());
  $("activateAlarm").addEventListener("click",async function(){const enabled=await startAudioFromGesture();if(!enabled){setAlarmStatus("Sound could not be unlocked. Allow audio for this page, then try again.");return}audioEnabled=true;const notificationDenied=await requestNotificationPermission();setAlarmStatus(notificationDenied?"Alarm sound activated. Browser notifications are blocked; keep this page open for sound.":"Alarm sound activated. Keep this page open for audible alarms.");setButtonLabel(this,"✓","Enabled");this.disabled=true;$("testAlarm").disabled=false;await ring();});
  $("testAlarm").addEventListener("click",async function(){if(!audioEnabled){setAlarmStatus("Activate alarm sound first.");return}await ring();setAlarmStatus("Test sound played. Alarm sound is active.");});
  $("stopAlarm").addEventListener("click",()=>{clearActiveAlarm();checkAlarms()});
  setInterval(checkAlarms,1000);routineTimer=setInterval(checkRoutineAlarms,1000);document.addEventListener("visibilitychange",()=>{if(!document.hidden){checkAlarms();checkRoutineAlarms()}});renderEvents();
  const DB="unza-event-ledger-files-v1";let dbPromise;
  function openDB(){if(!( "indexedDB" in window))return Promise.reject(new Error("IndexedDB unavailable"));if(dbPromise)return dbPromise;dbPromise=new Promise((resolve,reject)=>{const request=indexedDB.open(DB,1);request.onupgradeneeded=()=>request.result.createObjectStore("files",{keyPath:"id"});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});return dbPromise}
  function deleteStoredFiles(){if(!("indexedDB" in window))return Promise.reject(new Error("IndexedDB is unavailable."));const closeCurrentDB=dbPromise?dbPromise.then(db=>db.close()):Promise.resolve();dbPromise=null;return closeCurrentDB.then(()=>new Promise((resolve,reject)=>{const request=indexedDB.deleteDatabase(DB);request.onsuccess=()=>resolve();request.onerror=()=>reject(request.error||new Error("IndexedDB could not delete the stored files."));request.onblocked=()=>{$("authMessage").textContent="Close other MY UNILIFE(UNZA) tabs. The reset will continue once they are closed."}}))}
  $("resetAccount").addEventListener("click",async()=>{if(!window.confirm("Reset this account? This permanently deletes the account, all encrypted events, routine alarms, and stored files in this browser. This cannot be undone and will not recover old data."))return;const button=$("resetAccount");button.disabled=true;$("authMessage").textContent="Deleting the local account and encrypted data...";try{await deleteStoredFiles();localStorage.removeItem(EVENTS_KEY);localStorage.removeItem(ROUTINES_KEY);localStorage.removeItem(ACCOUNT_KEY);$("loginForm").reset();$("registerForm").reset();setPasswordVisibility($("toggleLoginPassword"),false);setPasswordVisibility($("toggleRegisterPassword"),false);showAuthMode("register");$("authMessage").textContent="Account and local data deleted. Create a new account and password. Previous events, routine alarms, and files cannot be recovered."}catch(error){console.error("Could not reset the local account and data.",error);$("authMessage").textContent="Could not reset the account or all local data: "+error.message}finally{button.disabled=false}});
  function fileTransaction(mode,operation){return openDB().then(db=>new Promise((resolve,reject)=>{const tx=db.transaction("files",mode),store=tx.objectStore("files"),request=operation(store);if(request){request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)}else{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)}}))}
  function showFileError(error){console.error("Could not load encrypted files.",error);const list=$("fileList"),message=document.createElement("li");message.className="notice";message.textContent="Local file storage is unavailable, the password did not unlock the files, or storage is full.";list.replaceChildren(message)}
  function setFileMessage(message){$("fileMessage").textContent=message}
  let filePreviewUrls=[];
  function clearFilePreviewUrls(){filePreviewUrls.forEach(url=>URL.revokeObjectURL(url));filePreviewUrls=[]}
  function createFilePreviewUrl(file){if(!window.URL||typeof URL.createObjectURL!=="function")return null;const safeType=/^(application\/pdf|text\/plain|text\/csv|image\/(png|jpeg|gif|webp|avif)|audio\/|video\/)/.test(file.type),preview=safeType?file.data:new Blob([file.data],{type:"application/octet-stream"}),url=URL.createObjectURL(preview);filePreviewUrls.push(url);return url}
  function downloadStoredFile(file){if(!window.URL||typeof URL.createObjectURL!=="function")throw new Error("This browser cannot download saved files.");const url=URL.createObjectURL(file.data),link=document.createElement("a");link.href=url;link.download=file.name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);setFileMessage("Downloaded "+file.name+".");addActivity("Downloaded file: "+file.name)}
  async function shareStoredFile(file){if(!navigator.share||typeof File!=="function"){setFileMessage("File sharing is not supported here. Download the file and share it from your device.");return}const sharedFile=new File([file.data],file.name,{type:file.type||"application/octet-stream"});try{if(navigator.canShare&&!navigator.canShare({files:[sharedFile]})){setFileMessage("This browser cannot share this file. Download it and share it from your device.");return}await navigator.share({files:[sharedFile],title:file.name});setFileMessage("Shared "+file.name+".");addActivity("Shared file: "+file.name)}catch(error){if(error.name==="AbortError")return;console.error("Could not share the saved file.",error);setFileMessage("Could not share this file. Download it and share it from your device.")}}
  async function renderFiles(){
    clearFilePreviewUrls();
    let files;
    setFileMessage("");
    try{files=await fileTransaction("readonly",store=>store.getAll());files=await Promise.all(files.map(file=>decryptStoredFile(file,encryptionKey)))}
    catch(error){showFileError(error);return}
    const list=$("fileList");
    list.replaceChildren();
    if(!files.length){const empty=document.createElement("li");empty.className="empty";empty.textContent="No files saved yet.";list.appendChild(empty);return}
    files.sort((a,b)=>a.name.localeCompare(b.name));
    files.forEach(file=>{
      const item=document.createElement("li");
      item.className="row";
      const open=document.createElement("a");
      open.className="file-open";
      const previewUrl=createFilePreviewUrl(file);
      if(previewUrl){open.href=previewUrl;open.target="_blank";open.rel="noopener noreferrer"}
      else{open.setAttribute("aria-disabled","true")}
      const name=document.createElement("span");
      name.className="row-title";
      name.textContent=file.name;
      const meta=document.createElement("small");
      meta.textContent=(file.size/1024).toFixed(1)+" KB · "+new Date(file.added).toLocaleString();
      open.append(name,meta);
      open.addEventListener("click",event=>{if(!previewUrl){event.preventDefault();setFileMessage("This browser cannot open files. Try downloading it from the three-dot menu.");return}setFileMessage("Opening "+file.name+". Your browser may download file types it cannot preview.");addActivity("Opened file: "+file.name)});
      const actions=document.createElement("div");
      actions.className="row-actions";
      const menu=document.createElement("details");
      menu.className="file-actions-menu";
      const summary=document.createElement("summary");
      summary.textContent="⋮";
      summary.setAttribute("aria-label","Actions for "+file.name);
      const options=document.createElement("div");
      options.className="file-menu";
      const addAction=(icon,label,action)=>{
        const button=document.createElement("button");
        button.type="button";
        setButtonLabel(button,icon,label);
        button.addEventListener("click",async()=>{menu.open=false;try{await action()}catch(error){console.error("Could not complete the file action.",error);setFileMessage(error.message||"Could not complete this file action.")}});
        options.appendChild(button);
      };
      const openAction=document.createElement("a");
      setButtonLabel(openAction,"↗","Open");
      openAction.className="file-menu-open";
      if(previewUrl){openAction.href=previewUrl;openAction.target="_blank";openAction.rel="noopener noreferrer";openAction.addEventListener("click",()=>{menu.open=false;setFileMessage("Opening "+file.name+". Your browser may download file types it cannot preview.");addActivity("Opened file: "+file.name)})}
      else{openAction.setAttribute("aria-disabled","true")}
      options.appendChild(openAction);
      addAction("⬇","Download",()=>downloadStoredFile(file));
      addAction("↗","Share",()=>shareStoredFile(file));
      addAction("🗑","Delete",async()=>{
        await fileTransaction("readwrite",store=>store.delete(file.id));
        addActivity("Deleted file: "+file.name);
        await renderFiles();
      });
      menu.append(summary,options);
      actions.appendChild(menu);
      item.append(open,actions);
      list.appendChild(item);
    });
  }
  $("chooseFiles").addEventListener("click",()=>$("filePicker").click());
  $("filePicker").addEventListener("change",async function(){const files=Array.from(this.files||[]);if(files.some(file=>file.size>25*1024*1024)){alert("Each file must be 25 MB or smaller.");this.value="";return}try{if(!encryptionKey){alert("Log in before saving files.");this.value="";return}const encryptedFiles=await Promise.all(files.map(file=>encryptStoredFile({id:makeId(),name:file.name,size:file.size,type:file.type,added:new Date().toISOString(),data:file},encryptionKey)));await fileTransaction("readwrite",store=>{encryptedFiles.forEach(file=>store.put(file));return null});await renderFiles();if(files.length===1)addActivity("Saved file: "+files[0].name);else addActivity(`Saved ${files.length} files.`)}catch(error){showFileError(error)}this.value=""});
})();

