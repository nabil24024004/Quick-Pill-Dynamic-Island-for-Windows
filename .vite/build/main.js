"use strict";const{app:y,BrowserWindow:ve,screen:j,ipcMain:i,shell:x,dialog:De,Tray:qe,Menu:Ve,nativeImage:H,clipboard:M,powerMonitor:me,globalShortcut:Y}=require("electron");y.commandLine.appendSwitch("disable-background-timer-throttling");y.commandLine.appendSwitch("disable-backgrounding-occluded-windows");y.commandLine.appendSwitch("disable-renderer-backgrounding");const m=require("node:path"),l=require("fs"),Se=require("os"),Ce=require("https"),Oe=require("http"),He=require("crypto"),{EventEmitter:Ke}=require("events");function pe(t){const e=[m.join(__dirname,t),m.join(__dirname,"../../src",t),m.join(typeof y<"u"&&y.getAppPath?y.getAppPath():process.cwd(),"src",t),m.join(typeof y<"u"&&y.getAppPath?y.getAppPath():process.cwd(),".vite/build",t),m.join(process.cwd(),"src",t)];for(const n of e)try{if(l.existsSync(n)||l.existsSync(n+".js")||l.existsSync(m.join(n,"index.js")))return require(n)}catch{}return require(t)}const{createProgressEngine:ze}=pe("services/progress"),{createNotificationEngine:Qe,NOTIFICATION_ACTION_TYPES:Gt}=pe("services/notifications"),{createLauncherEngine:Ze}=pe("services/launcher"),{createNotesEngine:Ye}=pe("services/notes");let ee=null,s=null,W=!0;function k(){try{return m.join(y.getPath("userData"),"settings.json")}catch{return m.join(process.cwd(),"settings.json")}}function Xe(){try{const t=k();if(l.existsSync(t)){const e=JSON.parse(l.readFileSync(t,"utf8"));if(typeof e.alwaysOnTop=="boolean")return e.alwaysOnTop}}catch{}return!0}function et(t){try{const e=k();let n={};if(l.existsSync(e))try{n=JSON.parse(l.readFileSync(e,"utf8"))}catch{}n.alwaysOnTop=t,l.writeFileSync(e,JSON.stringify(n,null,2),"utf8")}catch{}}function tt(){try{const t=k();if(l.existsSync(t)){const e=JSON.parse(l.readFileSync(t,"utf8"));if(typeof e.autoDownloadInstall=="boolean")return e.autoDownloadInstall}}catch{}return!0}function nt(t,e){try{const n=k();let r={};if(l.existsSync(n))try{r=JSON.parse(l.readFileSync(n,"utf8"))}catch{}r[t]=e,l.writeFileSync(n,JSON.stringify(r,null,2),"utf8")}catch{}}function st(){try{const t=k();if(l.existsSync(t)){const e=JSON.parse(l.readFileSync(t,"utf8"));if(typeof e.mascotMode=="boolean")return e.mascotMode}}catch{}return!0}function We(t){try{const e=k();let n={};if(l.existsSync(e))try{n=JSON.parse(l.readFileSync(e,"utf8"))}catch{}n.mascotMode=t,l.writeFileSync(e,JSON.stringify(n,null,2),"utf8")}catch{}}function rt(){try{const t=k();if(l.existsSync(t)){const e=JSON.parse(l.readFileSync(t,"utf8"));if(typeof e.minimalNotch=="boolean")return e.minimalNotch}}catch{}return!1}function ae(t){try{const e=k();let n={};if(l.existsSync(e))try{n=JSON.parse(l.readFileSync(e,"utf8"))}catch{}n.minimalNotch=t,l.writeFileSync(e,JSON.stringify(n,null,2),"utf8")}catch{}}function it(){try{const t=k();if(l.existsSync(t)){const e=JSON.parse(l.readFileSync(t,"utf8"));if(typeof e.privacyDots=="boolean")return e.privacyDots}}catch{}return!1}function ot(t){try{const e=k();let n={};if(l.existsSync(e))try{n=JSON.parse(l.readFileSync(e,"utf8"))}catch{}n.privacyDots=t,l.writeFileSync(e,JSON.stringify(n,null,2),"utf8")}catch{}}function at(){try{const t=k();if(l.existsSync(t)){const e=JSON.parse(l.readFileSync(t,"utf8"));if(typeof e.smartBrowserAvoidance=="boolean")return e.smartBrowserAvoidance}}catch{}return!0}function ct(t){try{const e=k();let n={};if(l.existsSync(e))try{n=JSON.parse(l.readFileSync(e,"utf8"))}catch{}n.smartBrowserAvoidance=t,l.writeFileSync(e,JSON.stringify(n,null,2),"utf8")}catch{}}let G=st(),v=rt(),ie=it(),X=at();W=Xe();function lt(){try{const t=k();if(l.existsSync(t)){const e=JSON.parse(l.readFileSync(t,"utf8"));if(Array.isArray(e.hiddenTabs))return e.hiddenTabs}}catch{}return[6]}function dt(t){try{const e=k();let n={};if(l.existsSync(e))try{n=JSON.parse(l.readFileSync(e,"utf8"))}catch{}n.hiddenTabs=t,l.writeFileSync(e,JSON.stringify(n,null,2),"utf8")}catch{}}const ut=[2,11,12,13,14,15,16,4,5,6,7,8,10,0,1,3];function pt(){try{const t=k();if(l.existsSync(t)){const e=JSON.parse(l.readFileSync(t,"utf8"));if(Array.isArray(e.tabOrder)&&e.tabOrder.length>0)return e.tabOrder}}catch{}return[...ut]}function ht(t){try{const e=k();let n={};if(l.existsSync(e))try{n=JSON.parse(l.readFileSync(e,"utf8"))}catch{}n.tabOrder=t,l.writeFileSync(e,JSON.stringify(n,null,2),"utf8")}catch{}}let Q=lt(),Z=pt();const oe="http://127.0.0.1:8765/api/process";function he(){try{const t=k();if(l.existsSync(t)){const e=JSON.parse(l.readFileSync(t,"utf8"));let n=typeof e.jarvisEndpoint=="string"&&e.jarvisEndpoint.trim()?e.jarvisEndpoint.trim():oe;return n==="http://localhost:5000/api/ask"&&(n=oe),{enabled:typeof e.jarvisEnabled=="boolean"?e.jarvisEnabled:!0,endpoint:n}}}catch{}return{enabled:!0,endpoint:oe}}function ft(t){try{const e=k();let n={};if(l.existsSync(e))try{n=JSON.parse(l.readFileSync(e,"utf8"))}catch{}return typeof(t==null?void 0:t.enabled)=="boolean"&&(n.jarvisEnabled=t.enabled),typeof(t==null?void 0:t.endpoint)=="string"&&t.endpoint.trim()&&(n.jarvisEndpoint=t.endpoint.trim()),l.writeFileSync(e,JSON.stringify(n,null,2),"utf8"),!0}catch{return!1}}function I(){if(W&&!(!s||s.isDestroyed())){try{s.setAlwaysOnTop(!0,"screen-saver",1)}catch{try{s.setAlwaysOnTop(!0,"screen-saver")}catch{try{s.setAlwaysOnTop(!0)}catch{}}}try{s.moveTop()}catch{}}}function yt(t){if(W=!!t,et(W),s&&!s.isDestroyed()){try{W?I():s.setAlwaysOnTop(!1)}catch{}try{s.webContents.send("always-on-top-changed",W)}catch{}}E()}function mt(){try{return m.join(y.getPath("userData"),"quick-pill.log")}catch{return m.join(process.cwd(),"quick-pill.log")}}function u(t,e=null){const r=`[${new Date().toISOString()}] ${t}${e?` | Error: ${e.stack||e}`:""}
`;console.log(r.trim());try{const o=mt();l.appendFileSync(o,r,"utf8")}catch{}}process.on("uncaughtException",t=>{u("UNCAUGHT EXCEPTION (Main Process)",t)});process.on("unhandledRejection",t=>{u("UNHANDLED REJECTION (Main Process)",t)});const U={0:"Alt+B",1:"Alt+W",2:"Alt+O",11:"Alt+H",12:"Alt+A",13:"Alt+P",14:"Alt+L",15:"Alt+Q",16:"Alt+I",3:"Alt+M",4:"Alt+C",5:"Alt+N",6:"Alt+G",7:"Alt+V",8:"Alt+T",10:"Alt+R","minimal-notch":"Alt+Shift+M"};let z=[];function Me(){try{const t=k();if(l.existsSync(t)){const e=JSON.parse(l.readFileSync(t,"utf8"));if(e&&typeof e.tabShortcuts=="object"&&e.tabShortcuts!==null)return{...U,...e.tabShortcuts}}}catch{}return{...U}}function Re(t){try{const e=k();let n={};if(l.existsSync(e))try{n=JSON.parse(l.readFileSync(e,"utf8"))}catch{}return n.tabShortcuts=t,l.writeFileSync(e,JSON.stringify(n,null,2),"utf8"),!0}catch(e){return u("Failed to save tabShortcuts preference:",e),!1}}function wt(t){if(Number(t)===9){ke();return}if(!(!s||s.isDestroyed()))try{s.isVisible()||s.show(),I(),s.focus(),s.webContents.send("open-tab-instant",Number(t))}catch(e){u(`Failed to openTabInstant for tab ${t}:`,e)}}function Ae(t){for(const r of z)try{Y.unregister(r)}catch{}z=[];const e=t||Me();for(const[r,o]of Object.entries(e)){if(!o||typeof o!="string"||!o.trim())continue;const a=o.trim();if(a.toUpperCase().includes("CTRL")||a.toUpperCase().includes("CONTROL")){u(`Refusing to register shortcut with Ctrl: ${a}`);continue}if(r==="minimal-notch"){try{Y.register(a,()=>{v=!v,ae(v),s&&!s.isDestroyed()&&(s.webContents.send("settings:minimal-notch-changed",v),s.webContents.send("toggle-minimal-notch-hotkey")),E()})?z.push(a):u(`Global shortcut conflict/in-use for ${a} (minimal-notch)`)}catch(c){u(`Error registering global shortcut ${a}:`,c)}continue}try{Y.register(a,()=>{wt(parseInt(r,10))})?z.push(a):u(`Global shortcut conflict/in-use for ${a} (tab ${r})`)}catch(c){u(`Error registering global shortcut ${a}:`,c)}}const n=e["minimal-notch"]||"Alt+Shift+M";if(!z.includes(n))try{Y.register(n,()=>{v=!v,ae(v),s&&!s.isDestroyed()&&(s.webContents.send("settings:minimal-notch-changed",v),s.webContents.send("toggle-minimal-notch-hotkey")),E()})&&z.push(n)}catch(r){u("Error registering fallback global shortcut for minimal notch:",r)}}const{exec:_,execFile:le,spawn:Te}=require("child_process");function fe(t){return Buffer.from(t,"utf16le").toString("base64")}i.handle("log-message",(t,e,n,r)=>{u(`[RENDERER ${String(e).toUpperCase()}] ${n} ${r?JSON.stringify(r):""}`)});i.handle("log-renderer-error",(t,e)=>{u(`[RENDERER ERROR] Unhandled Renderer Exception ${JSON.stringify(e)}`)});let Ne=null;i.handle("set-ignore-mouse-events",(t,e,n)=>{if(s&&!s.isDestroyed())try{if(Ne===e)return;if(Ne=e,e){const r=n!==void 0?n:!0;s.setIgnoreMouseEvents(!0,{forward:r})}else s.setIgnoreMouseEvents(!1),I()}catch{try{s.setIgnoreMouseEvents(!0,{forward:!0})}catch{}}});i.handle("get-always-on-top",()=>W);i.handle("set-always-on-top",(t,e)=>(yt(e),W));i.handle("focus-window",()=>{s&&!s.isDestroyed()&&(I(),s.focus())});i.handle("open-external",async(t,e)=>{await x.openExternal(e)});i.handle("get-mascot-mode",()=>G);i.handle("set-mascot-mode",(t,e)=>(G=!!e,We(G),E(),G));i.handle("get-minimal-notch",()=>v);i.handle("set-minimal-notch",(t,e)=>(v=!!e,ae(v),s&&!s.isDestroyed()&&s.webContents.send("settings:minimal-notch-changed",v),E(),v));i.handle("toggle-minimal-notch",()=>(v=!v,ae(v),s&&!s.isDestroyed()&&(s.webContents.send("settings:minimal-notch-changed",v),s.webContents.send("toggle-minimal-notch-hotkey")),E(),v));i.handle("get-smart-browser-avoidance",()=>X);i.handle("set-smart-browser-avoidance",(t,e)=>(X=!!e,ct(X),s&&!s.isDestroyed()&&s.webContents.send("settings:smart-browser-avoidance-changed",X),X));i.handle("get-hidden-tabs",()=>Q);i.handle("set-hidden-tabs",(t,e)=>(Array.isArray(e)&&(Q=e,dt(Q),s&&!s.isDestroyed()&&s.webContents.send("settings:hidden-tabs-changed",Q),w&&!w.isDestroyed()&&w.webContents.send("settings:hidden-tabs-changed",Q)),Q));i.handle("get-tab-order",()=>Z);i.handle("set-tab-order",(t,e)=>(Array.isArray(e)&&(Z=e,ht(Z),s&&!s.isDestroyed()&&s.webContents.send("settings:tab-order-changed",Z),w&&!w.isDestroyed()&&w.webContents.send("settings:tab-order-changed",Z)),Z));i.handle("get-privacy-dots",()=>ie);i.handle("set-privacy-dots",(t,e)=>(ie=!!e,ot(ie),s&&!s.isDestroyed()&&s.webContents.send("settings:privacy-dots-changed",ie),ie));i.handle("open-settings-window",()=>(ke(),!0));i.on("settings-window:minimize",()=>{w&&!w.isDestroyed()&&w.minimize()});i.on("settings-window:close",()=>{w&&!w.isDestroyed()&&w.close()});const gt="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAMklEQVRYhe3OQQ0AIAwEwbf/h1GChwW0U4E2Z9Yk1fN7kG65AwAAAAAAAAAAAAAAwP8AO6kBX7K4Xy0AAAAASUVORK5CYII=";let B=null;try{const t=ce("png");l.existsSync(t)&&(B=H.createFromPath(t).resize({width:32,height:32}))}catch{}if(!B||B.isEmpty())try{B=H.createFromDataURL(gt).resize({width:32,height:32})}catch{B=H.createEmpty()}const ue=new Map;async function $t(t){try{if(!t||typeof t!="string")return null;const e=m.resolve(t);if(!l.existsSync(e))return null;if(ue.has(e)){const r=ue.get(e);return r&&!r.isEmpty()?r.toDataURL():null}let n=null;try{typeof H.createThumbnailFromPath=="function"&&(n=await H.createThumbnailFromPath(e,{width:32,height:32}))}catch{}if(!n||n.isEmpty())try{typeof y.getFileIcon=="function"&&(n=await y.getFileIcon(e,{size:"normal"}),n&&!n.isEmpty()&&(n=n.resize({width:32,height:32})))}catch{}return(!n||n.isEmpty())&&(n=B),ue.set(e,n),n&&!n.isEmpty()?n.toDataURL():null}catch(e){return u("cacheShelfIcon error:",e),null}}function Pe(t,e){try{if(!e||typeof e!="string")return!1;const n=m.resolve(e);if(!l.existsSync(n))return!1;let r=ue.get(n);return(!r||typeof r.isEmpty=="function"&&r.isEmpty())&&(r=B),t.startDrag({file:n,icon:r}),!0}catch(n){return u("executeStartDragSync error:",n),!1}}i.on("shelf:start-drag",(t,e)=>{Pe(t.sender,e)});i.on("ondragstart",(t,e)=>{Pe(t.sender,e)});i.handle("start-drag",(t,e)=>Pe(t.sender,e));i.handle("shelf:cache-icon",async(t,e)=>await $t(e));let q=null;function P(){if(!q){let t="";try{t=y.getPath("userData")}catch{t=process.cwd()}q=Ze({userDataPath:t,shell:x,getFileIcon:(e,n)=>y.getFileIcon(e,n)})}return q}i.handle("launcher:search-apps",async(t,e,n)=>{try{return await P().searchApps(e,n)}catch(r){return u("Error in launcher:search-apps:",r),[]}});i.handle("launcher:get-catalog",async()=>{try{return await P().getCatalog()}catch(t){return u("Error in launcher:get-catalog:",t),[]}});i.handle("launcher:reindex-catalog",async()=>{try{return await P().reindexCatalog()}catch(t){return u("Error in launcher:reindex-catalog:",t),{success:!1,count:0}}});i.handle("launcher:launch-app",async(t,e)=>{try{return await P().launchApp(e)}catch(n){return u("Error in launcher:launch-app:",n),{success:!1,error:n.message}}});i.handle("launcher:get-running-windows",async(t,e)=>{try{return await P().getRunningWindows(e)}catch(n){return u("Error in launcher:get-running-windows:",n),[]}});i.handle("launcher:activate-window",async(t,e)=>{try{const n=await P().activateWindow(e);return n.success&&s&&!s.isDestroyed()&&s.webContents.send("launcher:window-activated",{hWnd:e}),n}catch(n){return u("Error in launcher:activate-window:",n),{success:!1,code:"FAILED",error:n.message}}});i.handle("launcher:get-favorites",async()=>{try{return await P().getFavorites()}catch(t){return u("Error in launcher:get-favorites:",t),[]}});i.handle("launcher:set-favorites",async(t,e)=>{try{return await P().setFavorites(e)}catch(n){return u("Error in launcher:set-favorites:",n),{success:!1}}});i.handle("launcher:open-app",async(t,e)=>{try{return e?await x.openPath(e)?await P().launchApp(e):{success:!0}:{success:!1,error:"No target specified"}}catch(n){return u("Error in launcher:open-app:",n),{success:!1,error:n.message}}});i.on("launcher:open-app",async(t,e)=>{try{if(!e)return;await x.openPath(e)&&await P().launchApp(e)}catch(n){u("Error in launcher:open-app (event):",n)}});i.handle("launcher:open-url",async(t,e)=>{try{if(!e)return{success:!1,error:"No URL specified"};let n=String(e).trim();return/^https?:\/\//i.test(n)||(n="https://"+n),await x.openExternal(n),{success:!0}}catch(n){return u("Error in launcher:open-url:",n),{success:!1,error:n.message}}});i.on("launcher:open-url",async(t,e)=>{try{if(!e)return;let n=String(e).trim();/^https?:\/\//i.test(n)||(n="https://"+n),await x.openExternal(n)}catch(n){u("Error in launcher:open-url (event):",n)}});i.handle("launcher:select-file",async()=>{try{const t=await De.showOpenDialog({title:"Select Application or Shortcut",properties:["openFile"],filters:[{name:"Applications & Shortcuts",extensions:["exe","lnk","bat","cmd"]},{name:"All Files",extensions:["*"]}]});if(!t.canceled&&t.filePaths.length>0){const e=t.filePaths[0],n=m.basename(e,m.extname(e));return{canceled:!1,filePath:e,name:n}}return{canceled:!0}}catch(t){return u("Error in launcher:select-file:",t),{canceled:!0,error:t.message}}});i.handle("workspaces:get-workspaces",async()=>{try{return await P().getWorkspaces()}catch(t){return u("Error in workspaces:get-workspaces:",t),[]}});i.handle("workspaces:save-workspace",async(t,e)=>{try{return await P().saveWorkspace(e)}catch(n){return u("Error in workspaces:save-workspace:",n),{success:!1,error:n.message}}});i.handle("workspaces:delete-workspace",async(t,e)=>{try{return await P().deleteWorkspace(e)}catch(n){return u("Error in workspaces:delete-workspace:",n),{success:!1,error:n.message}}});i.handle("workspaces:launch-workspace",async(t,e,n)=>{try{return await P().launchWorkspace(e,n)}catch(r){return u("Error in workspaces:launch-workspace:",r),{success:!1,results:[],error:r.message}}});let we=null;function O(){if(!we){let t="";try{t=y.getPath("userData")}catch{t=process.cwd()}we=Ye({userDataPath:t,clipboard:M})}return we}i.handle("notes:get-notes",async(t,e,n)=>{try{return await O().getNotes(e,n)}catch(r){return u("Error in notes:get-notes:",r),[]}});i.handle("notes:save-note",async(t,e)=>{try{const n=await O().saveNote(e);return s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"save",note:n}),n}catch(n){return u("Error in notes:save-note:",n),{success:!1,error:n.message}}});i.handle("notes:delete-note",async(t,e)=>{try{const n=await O().deleteNote(e);return n.success&&s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"delete",id:e}),n}catch(n){return u("Error in notes:delete-note:",n),{success:!1,error:n.message}}});i.handle("notes:undo-delete",async()=>{try{const t=await O().undoDelete();return t.success&&s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"restore",note:t.note}),t}catch(t){return u("Error in notes:undo-delete:",t),{success:!1,error:t.message}}});i.handle("notes:toggle-pin",async(t,e)=>{try{const n=await O().togglePin(e);return n.success&&s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"togglePin",id:e,isPinned:n.isPinned}),n}catch(n){return u("Error in notes:toggle-pin:",n),{success:!1,error:n.message}}});i.handle("notes:toggle-archive",async(t,e)=>{try{const n=await O().toggleArchive(e);return n.success&&s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"toggleArchive",id:e,isArchived:n.isArchived}),n}catch(n){return u("Error in notes:toggle-archive:",n),{success:!1,error:n.message}}});i.handle("notes:save-draft",async(t,e)=>{try{return await O().saveDraft(e)}catch(n){return u("Error in notes:save-draft:",n),{success:!1,error:n.message}}});i.handle("notes:get-draft",async()=>{try{return await O().getDraft()}catch(t){return u("Error in notes:get-draft:",t),null}});i.handle("notes:clear-draft",async()=>{try{return await O().clearDraft()}catch(t){return u("Error in notes:clear-draft:",t),{success:!1,error:t.message}}});i.handle("notes:get-contextual-capture",async(t,e)=>{try{return await O().getContextualCapture(e)}catch(n){return u("Error in notes:get-contextual-capture:",n),{success:!1,code:"CAPTURE_ERROR",error:n.message}}});i.handle("notes:search-notes",async(t,e,n)=>{try{return await O().searchNotes(e,n)}catch(r){return u("Error in notes:search-notes:",r),[]}});i.handle("notes:get-tags",async()=>{try{return await O().getTags()}catch(t){return u("Error in notes:get-tags:",t),[]}});i.handle("notes:convert-to-task",async(t,e)=>{try{return await O().convertToTask(e)}catch(n){return u("Error in notes:convert-to-task:",n),{success:!1,error:n.message}}});i.handle("shortcuts:get-tab-shortcuts",()=>Me());i.handle("shortcuts:set-tab-shortcuts",(t,e)=>{if(!e||typeof e!="object")return{success:!1,error:"Invalid shortcuts object"};const n={};for(const[o,a]of Object.entries(e))if(typeof a=="string"){const c=a.toUpperCase();if(c.includes("CTRL")||c.includes("CONTROL"))return{success:!1,error:"Ctrl cannot be used in tab shortcuts (reserved for Click-Through)"};n[o]=a.trim()}const r={...U,...n};return Re(r),Ae(r),s&&!s.isDestroyed()&&s.webContents.send("shortcuts:updated",r),w&&!w.isDestroyed()&&w.webContents.send("shortcuts:updated",r),{success:!0,shortcuts:r}});i.handle("shortcuts:reset-tab-shortcuts",()=>(Re(U),Ae(U),s&&!s.isDestroyed()&&s.webContents.send("shortcuts:updated",U),w&&!w.isDestroyed()&&w.webContents.send("shortcuts:updated",U),{success:!0,shortcuts:U}));function te(t,e){try{i.removeHandler(t)}catch{}i.handle(t,e)}te("jarvis:ask",async(t,e)=>{if(!e||typeof e!="string"||!e.trim())return{success:!1,error:"Empty prompt provided."};const n=he();if(!n.enabled)return{success:!1,error:"JARVIS integration is currently disabled in Settings."};const r=n.endpoint||oe;try{const o=new AbortController,a=setTimeout(()=>o.abort(),45e3),c={text:e.trim(),prompt:e.trim(),audio_target:"laptop"},h=await fetch(r,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json, text/plain, */*"},body:JSON.stringify(c),signal:o.signal});if(clearTimeout(a),!h.ok){const d=await h.text().catch(()=>"");return{success:!1,error:`JARVIS responded with error ${h.status}: ${d||h.statusText}`}}if((h.headers.get("content-type")||"").includes("application/json")){const d=await h.json();return{success:!0,response:d.reply||d.response||d.text||d.message||d.answer||d.output||d.result||(typeof d=="string"?d:JSON.stringify(d)),raw:d}}else return{success:!0,response:await h.text()}}catch(o){return o.name==="AbortError"?{success:!1,error:"JARVIS query timed out (45s). Your local model may be busy."}:{success:!1,error:"JARVIS local server offline. Make sure D:/JARVIS is running."}}});te("jarvis:testConnection",async(t,e)=>{const n=he(),r=e||n.endpoint||oe;try{const o=new AbortController,a=setTimeout(()=>o.abort(),4e3);let c=!1,h="";try{const d=`${new URL(r).origin}/api/status`,f=await fetch(d,{method:"GET",signal:o.signal});if(f.ok){const b=await f.json().catch(()=>null);b&&b.name?(c=!0,h=`${b.name} v${b.version||"2.5"} (${b.model||"Online"})`):f.status<500&&(c=!0,h=`Online (${f.status})`)}}catch{}if(!c)try{const p=await fetch(r,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:"ping",prompt:"ping"}),signal:o.signal});p.status<500&&(c=!0,h=`HTTP ${p.status}`)}catch{try{const d=new URL(r),f=await fetch(d.origin,{method:"GET",signal:o.signal});f.status<500&&(c=!0,h=`Host online (${f.status})`)}catch(d){throw d}}return clearTimeout(a),{success:!0,connected:c,details:h}}catch(o){return{success:!1,connected:!1,error:o.message||"Cannot reach server"}}});te("jarvis:getConfig",async()=>he());te("jarvis:setConfig",async(t,e)=>{ft(e);const n=he();return s&&!s.isDestroyed()&&s.webContents.send("jarvis:configUpdated",n),w&&!w.isDestroyed()&&w.webContents.send("jarvis:configUpdated",n),{success:!0,config:n}});te("jarvis:stopServer",async()=>{try{try{const e=new AbortController,n=setTimeout(()=>e.abort(),1500);await fetch("http://127.0.0.1:8765/api/shutdown",{method:"POST",headers:{"Content-Type":"application/json"},signal:e.signal}).catch(()=>null),clearTimeout(n)}catch{}const t="D:\\JARVIS\\stop_jarvis.bat";return l.existsSync(t)&&_(`cmd /c "${t}"`,{cwd:"D:\\JARVIS"}),{success:!0,message:"JARVIS stopped and resources freed."}}catch(t){return{success:!1,error:t.message||"Failed to stop JARVIS"}}});te("jarvis:launchServer",async()=>{const t="D:\\JARVIS\\run_gui.bat";try{if(l.existsSync(t))return _(`cmd /c "${t}"`,{cwd:"D:\\JARVIS"}),{success:!0,message:"JARVIS launch initiated."}}catch(e){return{success:!1,error:e.message||"Failed to launch run_gui.bat"}}return{success:!1,error:"D:\\JARVIS\\run_gui.bat not found."}});i.handle("launch-app",async(t,e)=>await P().launchApp(e));i.handle("build-app-cache",async()=>await P().reindexCatalog());i.handle("search-apps",async(t,e)=>await P().searchApps(e));i.handle("get-displays",()=>j.getAllDisplays().map(e=>({id:e.id,label:e.label||`Display ${e.id}`,bounds:e.bounds})));i.handle("set-display",(t,e)=>{if(s&&!s.isDestroyed()){const r=j.getAllDisplays().find(p=>p.id.toString()===e.toString())||j.getPrimaryDisplay(),o=560,a=180,c=Math.round(r.bounds.x+(r.bounds.width-o)/2),h=r.bounds.y;s.setBounds({x:c,y:h,width:o,height:a}),s.show(),I()}});i.handle("update-window-position",(t,e,n)=>{});i.handle("set-auto-launch",(t,e)=>{try{y.setLoginItemSettings({openAtLogin:e,path:y.getPath("exe")}),e||Fe()}catch(n){console.error("Failed to set login item settings on Windows:",n)}});function Fe(){if(process.platform==="win32")try{const t=["electron.app.Ripple","electron.app.Electron","electron.app.Quick Pill","Ripple"];for(const e of t)_(`reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${e}" /f`,()=>{})}catch{}}const bt=["https://raw.githubusercontent.com/pikri-beep/Quick-Pill-Dynamic-Island-for-Windows/main/web%20app/public/version.json","https://raw.githubusercontent.com/nabil24024004/Quick-Pill/main/web%20app/public/version.json","https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/version.json","https://raw.githubusercontent.com/nabil24024004/Ripple/main/web%20app/public/version.json"];class St extends Ke{constructor(){super(),this.manifestUrls=[...bt],this.currentVersion=y?y.getVersion():"5.5.1",this.status="idle",this.updateInfo=null,this.downloadedFilePath=null,this.currentDownloadRequest=null,this.lastProgressEmit=0;const e=tt();this.autoDownload=e,this.autoInstall=e}compareVersions(e,n){const r=(e||"0.0.0").replace(/^v/i,"").trim(),o=(n||"0.0.0").replace(/^v/i,"").trim(),[a,c]=r.split("-"),[h,p]=o.split("-"),d=a.split(".").map(g=>parseInt(g,10)||0),f=h.split(".").map(g=>parseInt(g,10)||0),b=Math.max(d.length,f.length);for(let g=0;g<b;g++){const C=d[g]||0,A=f[g]||0;if(C>A)return 1;if(C<A)return-1}return!c&&p?1:c&&!p?-1:c&&p?c.localeCompare(p):0}getPlatformKey(){return`win32-${process.arch}`}fetchJson(e,n=12e3,r=5){return new Promise((o,a)=>{if(r<=0)return a(new Error("Too many redirects while fetching update manifest."));const h=(e.startsWith("https")?Ce:Oe).get(e,{headers:{"User-Agent":`QuickPill-Updater/${this.currentVersion} (${process.platform} ${process.arch})`,Accept:"application/json, text/plain, */*"},timeout:n},p=>{if(p.statusCode>=300&&p.statusCode<400&&p.headers.location){const f=new URL(p.headers.location,e).href;return this.fetchJson(f,n,r-1).then(o).catch(a)}if(p.statusCode!==200)return p.resume(),a(new Error(`Server returned HTTP ${p.statusCode}: ${p.statusMessage}`));let d="";p.setEncoding("utf8"),p.on("data",f=>{d+=f}),p.on("end",()=>{try{const f=JSON.parse(d);o(f)}catch(f){a(new Error(`Invalid JSON received from update manifest: ${f.message}`))}})});h.on("timeout",()=>{h.destroy(),a(new Error("Connection timed out while checking for updates."))}),h.on("error",p=>{a(p)})})}async checkForUpdates(){var e,n,r;if(this.status==="checking"||this.status==="downloading")return{status:this.status,updateInfo:this.updateInfo};this.status="checking",this.emit("checking");try{let o=null,a=null;for(const p of this.manifestUrls)try{const d=`${p}${p.includes("?")?"&":"?"}_t=${Date.now()}`,f=await this.fetchJson(d);if(f&&f.version){o=f;break}}catch(d){a=d}if(!o||!o.version)throw a||new Error('Update manifest is missing required "version" field.');const c=o.version;if(this.compareVersions(c,this.currentVersion)>0){const p=this.getPlatformKey(),d=((e=o.platforms)==null?void 0:e[p])||((n=o.platforms)==null?void 0:n[`${process.platform}-x64`])||((r=o.platforms)==null?void 0:r["win32-x64"]),f=(d==null?void 0:d.url)||"";return this.updateInfo={version:c,currentVersion:this.currentVersion,name:o.name||`Quick Pill v${c}`,releaseDate:o.releaseDate||"",mandatory:!!o.mandatory,changelog:Array.isArray(o.changelog)?o.changelog:[],downloadUrl:f,sha256:(d==null?void 0:d.sha256)||"",size:(d==null?void 0:d.size)||0,installerType:(d==null?void 0:d.installerType)||"nsis"},this.status="available",this.emit("update-available",this.updateInfo),this.autoDownload&&f&&(u(`[Auto-Updater] New update v${c} detected. Automatically downloading in background...`),setTimeout(()=>{this.startDownload().catch(b=>{u("[Auto-Updater] Automatic background download failed:",b)})},1e3)),{status:"available",updateInfo:this.updateInfo}}else{this.status="not-available";const p={currentVersion:this.currentVersion,latestVersion:c};return this.emit("update-not-available",p),{status:"not-available",updateInfo:p}}}catch(o){this.status="error";const a=o.message||"Unknown error occurred while checking for updates.";return this.emit("error",a),{status:"error",error:a}}}startDownload(){if(!this.updateInfo||!this.updateInfo.downloadUrl){const a=new Error("No update available or download URL is missing.");return this.emit("error",a.message),Promise.reject(a)}if(this.status==="downloading")return Promise.resolve({status:"downloading"});this.status="downloading",this.emit("download-started",this.updateInfo);const e=y.getPath("temp"),r=`quick-pill-update-v${this.updateInfo.version}.exe`,o=m.join(e,r);return new Promise((a,c)=>{if(l.existsSync(o))try{l.unlinkSync(o)}catch{}const h=l.createWriteStream(o);let p=0,d=this.updateInfo.size||0,f=0,b=Date.now(),g=0;const C=(A,F=5)=>{if(F<=0){h.close();const T=new Error("Too many redirects while downloading update binary.");return this.status="error",this.emit("error",T.message),c(T)}const ye=(A.startsWith("https")?Ce:Oe).get(A,{headers:{"User-Agent":`QuickPill-Updater/${this.currentVersion} (${process.platform} ${process.arch})`}},T=>{if(T.statusCode>=300&&T.statusCode<400&&T.headers.location){const N=new URL(T.headers.location,A).href;return C(N,F-1)}if(T.statusCode!==200){h.close();try{l.unlinkSync(o)}catch{}const N=new Error(`Download failed with status HTTP ${T.statusCode}: ${T.statusMessage}`);return this.status="error",this.emit("error",N.message),c(N)}const se=parseInt(T.headers["content-length"],10);!isNaN(se)&&se>0&&(d=se),T.on("data",N=>{p+=N.length,h.write(N);const K=Date.now();if(K-this.lastProgressEmit>=100||p===d){const xe=(K-b)/1e3;xe>=.5&&(g=Math.round((p-f)/xe),f=p,b=K);const Je={percent:d>0?Math.min(100,Math.round(p/d*1e3)/10):0,transferredBytes:p,totalBytes:d,speedBytesPerSec:g};this.lastProgressEmit=K,this.emit("download-progress",Je)}}),T.on("end",()=>{h.end()}),T.on("error",N=>{h.close();try{l.unlinkSync(o)}catch{}this.status="error",this.emit("error",N.message),c(N)})});this.currentDownloadRequest=ye,ye.on("error",T=>{h.close();try{l.unlinkSync(o)}catch{}this.status="error",this.emit("error",T.message),c(T)})};h.on("finish",()=>{if(this.currentDownloadRequest=null,this.updateInfo.sha256&&this.updateInfo.sha256.trim()!=="")try{const F=He.createHash("sha256"),Ie=l.readFileSync(o);if(F.update(Ie),F.digest("hex").toLowerCase()!==this.updateInfo.sha256.trim().toLowerCase()){try{l.unlinkSync(o)}catch{}const T=new Error("Integrity check failed (SHA-256 mismatch). The downloaded file might be corrupted.");return this.status="error",this.emit("error",T.message),c(T)}}catch(F){console.warn("Could not verify SHA-256 checksum:",F)}this.downloadedFilePath=o,this.status="downloaded";const A={version:this.updateInfo.version,filePath:o};this.emit("update-downloaded",A),a(A),this.autoInstall&&(u(`[Auto-Updater] Update v${this.updateInfo.version} downloaded successfully. Automatically installing in background in 2 seconds...`),setTimeout(()=>{this.installAndRelaunch()},2e3))}),h.on("error",A=>{try{l.unlinkSync(o)}catch{}this.status="error",this.emit("error",A.message),c(A)}),C(this.updateInfo.downloadUrl)})}cancelDownload(){if(this.currentDownloadRequest){try{this.currentDownloadRequest.destroy()}catch{}this.currentDownloadRequest=null}this.status="idle",this.emit("download-cancelled")}installAndRelaunch(){if(!this.downloadedFilePath||!l.existsSync(this.downloadedFilePath)){const n=new Error("No downloaded update file found to install.");return this.emit("error",n.message),!1}const e=this.downloadedFilePath;try{const n=`timeout /t 1 /nobreak >nul && start "" "${e}"`;return Te("cmd.exe",["/c",n],{detached:!0,stdio:"ignore",windowsHide:!1}).unref(),setTimeout(()=>{y?(y.isQuitting=!0,y.quit()):process.exit(0)},400),!0}catch(n){return this.emit("error",`Failed to launch installer: ${n.message}`),!1}}}const S=new St;function L(t,e){s&&!s.isDestroyed()&&s.webContents.send("update-event",{event:t,data:e}),w&&!w.isDestroyed()&&w.webContents.send("update-event",{event:t,data:e})}S.on("checking",()=>L("checking"));S.on("update-available",t=>L("available",t));S.on("update-not-available",t=>L("not-available",t));S.on("download-started",t=>L("download-started",t));S.on("download-progress",t=>L("download-progress",t));S.on("update-downloaded",t=>L("downloaded",t));S.on("download-cancelled",()=>L("cancelled"));S.on("error",t=>L("error",t));i.handle("check-for-updates",async()=>await S.checkForUpdates());i.handle("start-update-download",async()=>await S.startDownload());i.handle("cancel-update-download",()=>(S.cancelDownload(),!0));i.handle("install-update",()=>S.installAndRelaunch());i.handle("get-updater-state",()=>({status:S.status,updateInfo:S.updateInfo,downloadedFilePath:S.downloadedFilePath,currentVersion:S.currentVersion}));i.handle("get-app-version",()=>y.getVersion());i.handle("get-auto-download-install",()=>S.autoDownload&&S.autoInstall);i.handle("set-auto-download-install",(t,e)=>{const n=!!e;return S.autoDownload=n,S.autoInstall=n,nt("autoDownloadInstall",n),n});const ne=ze({autoUpdater:S,openPath:async t=>{try{l.existsSync(t)&&(l.statSync(t).isDirectory()?await x.openPath(t):x.showItemInFolder(t))}catch(e){u("[progress openPath error]",e)}}});ne.coordinator.on("update",t=>{s&&!s.isDestroyed()&&s.webContents.send("progress:update",t)});i.handle("progress:get-snapshot",()=>ne.coordinator.getSnapshot());i.handle("progress:execute-action",async(t,e,n,r)=>await ne.coordinator.executeAction(e,n,r));i.handle("progress:start-file-op",async(t,e)=>await ne.fileOpsProvider.startCopy(e));i.handle("progress:start-hash-op",async(t,e)=>await ne.fileOpsProvider.startHash(e));i.handle("progress:clear-history",()=>(ne.registry.clearHistory(),!0));i.handle("progress:select-file",async()=>{if(!s)return null;const t=await De.showOpenDialog(s,{properties:["openFile"]});return t.canceled||!t.filePaths.length?null:t.filePaths[0]});const ce=(t=null)=>{const e=t||"ico";try{const n=m.join(y.getAppPath(),`src/assets/icons/icon.${e}`);if(l.existsSync(n))return n}catch{}try{const n=m.join(process.resourcesPath,`icon.${e}`);if(l.existsSync(n))return n;const r=m.join(process.resourcesPath,`assets/icons/icon.${e}`);if(l.existsSync(r))return r}catch{}return m.join(__dirname,`../../src/assets/icons/icon.${e}`)},Ee=()=>{const t=j.getPrimaryDisplay(),{x:e,y:n,width:r,height:o}=t.bounds,a=560,c=180,h=Math.round(e+(r-a)/2),p=n;s=new ve({width:a,height:c,x:h,y:p,backgroundColor:"#00000000",transparent:!0,alwaysOnTop:!0,resizable:!1,minimizable:!1,maximizable:!1,fullscreenable:!1,frame:!1,thickFrame:!1,hasShadow:!1,skipTaskbar:!0,icon:ce(),type:"toolbar",fullscreen:!1,visibleOnFullScreen:!0,acceptFirstMouse:!0,webPreferences:{preload:m.join(__dirname,"preload.js"),devTools:!y.isPackaged,backgroundThrottling:!1},show:!0}),s.setIgnoreMouseEvents(!0,{forward:!0}),s.once("ready-to-show",()=>{s&&(s.show(),I(),s.focus())}),s.webContents.on("console-message",(d,f,b,g,C)=>{f>=2&&u(`[RENDERER CONSOLE ${f===3?"ERROR":"WARN"}] (${C?m.basename(C):"unknown"}:${g}) ${b}`)}),s.webContents.on("render-process-gone",(d,f)=>{if(u(`[RENDERER PROCESS GONE] reason=${f==null?void 0:f.reason}, exitCode=${f==null?void 0:f.exitCode}`),s&&!s.isDestroyed())try{s.setIgnoreMouseEvents(!0,{forward:!0})}catch{}}),s.on("blur",()=>{I()}),s.on("minimize",()=>{s&&!s.isDestroyed()&&(s.restore(),I())}),s.on("restore",()=>{I()}),s.on("show",()=>{I()}),setTimeout(()=>{s&&!s.isVisible()&&(s.show(),I(),s.focus())},5e3),s.on("closed",()=>{s=null});try{s.setVisibleOnAllWorkspaces(!0,{visibleOnFullScreen:!0})}catch{}if(!y.isPackaged&&process.env.NODE_ENV==="development")s.loadURL("http://localhost:5173");else{const d=[m.join(__dirname,"../renderer/main_window/index.html"),m.join(y.getAppPath(),".vite/renderer/main_window/index.html"),m.join(y.getAppPath(),"dist/index.html"),m.join(__dirname,"index.html"),m.join(y.getAppPath(),"index.html")];let f=!1;for(const b of d)if(l.existsSync(b)){u(`Loading renderer from: ${b}`),s.loadFile(b),f=!0;break}f||(u("No packaged renderer HTML found, falling back to localhost:5173"),s.loadURL("http://localhost:5173"))}};let w=null;function ke(){if(w&&!w.isDestroyed()){w.show(),w.focus();return}if(w=new ve({width:680,height:560,title:"Quick Pill Settings",backgroundColor:"#121212",autoHideMenuBar:!0,resizable:!0,minimizable:!0,maximizable:!1,frame:!1,icon:ce(),webPreferences:{preload:m.join(__dirname,"preload.js"),devTools:!y.isPackaged,backgroundThrottling:!1}}),!y.isPackaged&&process.env.NODE_ENV==="development")w.loadURL("http://localhost:5173#settings");else{const t=[m.join(__dirname,"../renderer/main_window/index.html"),m.join(y.getAppPath(),".vite/renderer/main_window/index.html"),m.join(y.getAppPath(),"dist/index.html"),m.join(__dirname,"index.html"),m.join(y.getAppPath(),"index.html")];for(const e of t)if(l.existsSync(e)){w.loadFile(e,{hash:"settings"});break}}w.on("closed",()=>{w=null})}function E(){if(!ee||ee.isDestroyed())return;const t=y.getLoginItemSettings().openAtLogin,e=Ve.buildFromTemplate([{label:"Start with Windows",type:"checkbox",checked:t,click:n=>{try{y.setLoginItemSettings({openAtLogin:n.checked,path:y.getPath("exe")})}catch{}E()}},{label:"Mascot Mode",type:"checkbox",checked:G,click:n=>{G=n.checked,We(G),s&&!s.isDestroyed()&&s.webContents.send("settings:mascot-mode-changed",G),E()}},{label:"Minimal Notch",type:"checkbox",checked:v,click:n=>{v=n.checked,ae(v),s&&!s.isDestroyed()&&s.webContents.send("settings:minimal-notch-changed",v),E()}},{type:"separator"},{label:"Settings...",click:()=>{ke()}},{type:"separator"},{label:"Exit",click:()=>{y.quit()}}]);ee.setContextMenu(e)}let _e=!1,D=null,vt=null;function At(){if(process.platform==="win32")try{const t=require("koffi"),e=t.load("user32.dll"),n=t.load("gdi32.dll"),r=t.struct("RECT",{left:"long",top:"long",right:"long",bottom:"long"});D={GetForegroundWindow:e.func("GetForegroundWindow","intptr_t",[]),IsZoomed:e.func("IsZoomed","bool",["intptr_t"]),GetWindowRect:e.func("GetWindowRect","bool",["intptr_t",t.out(t.pointer(r))]),GetClassNameA:e.func("GetClassNameA","int",["intptr_t",t.out(t.pointer("char")),"int"]),GetWindowTextA:e.func("GetWindowTextA","int",["intptr_t",t.out(t.pointer("char")),"int"]),GetDC:e.func("GetDC","intptr_t",["intptr_t"]),ReleaseDC:e.func("ReleaseDC","int",["intptr_t","intptr_t"]),GetKeyState:e.func("GetKeyState","int16_t",["int"])},vt={GetPixel:n.func("GetPixel","uint32_t",["intptr_t","int","int"])}}catch(t){u("[Obstruction] Koffi user32/gdi32 init failed, falling back:",t)}}function Tt(){process.platform==="win32"&&(At(),setInterval(()=>{if(!s||s.isDestroyed())return;let t=!1;if(D)try{const e=D.GetForegroundWindow();if(e&&e!==0){const n=Buffer.alloc(256);D.GetClassNameA(e,n,256);const r=n.toString("utf8").replace(/\0.*$/,"").trim(),o=r==="Progman"||r==="WorkerW"||r==="Shell_TrayWnd"||r==="Shell_SecondaryTrayWnd";let a=!1;try{const c=s.getNativeWindowHandle();c.readBigInt64LE&&c.readBigInt64LE(0)===BigInt(e)&&(a=!0)}catch{}try{if(w&&!w.isDestroyed()){const c=w.getNativeWindowHandle();c.readBigInt64LE&&c.readBigInt64LE(0)===BigInt(e)&&(a=!0)}}catch{}if(!o&&!a){const c={};D.GetWindowRect(e,c);const h=D.IsZoomed(e),p=j.getPrimaryDisplay(),d=p.bounds.width,f=p.bounds.height,b=(c.right||0)-(c.left||0),g=(c.bottom||0)-(c.top||0);c.left<=0&&c.top<=0&&c.right>=d&&c.bottom>=f&&!h?t=!0:h||c.top<=8&&b>=d*.9?X&&(t=!0):t=!1}}}catch{}t!==_e&&(_e=t,s&&!s.isDestroyed()&&s.webContents.send("desktop:obstruction-status",{isObstructed:t}))},250))}y.whenReady().then(()=>{y.setAppUserModelId("com.neosparkx.quickpill"),Fe(),Ee(),Ot(),Nt(),Tt(),Ct(),Ae(),P().getCatalog().catch(t=>u("Failed to warm launcher catalog:",t)),y.on("activate",()=>{ve.getAllWindows().length===0&&Ee()});try{let t=ce(),e=H.createFromPath(t);e.isEmpty()&&(t=ce("png"),e=H.createFromPath(t));const n=e.isEmpty()?t:e.resize({width:16,height:16});ee=new qe(n),ee.setToolTip("Quick Pill"),E()}catch(t){console.error("Failed to create tray:",t)}j.on("display-metrics-changed",()=>{I()}),j.on("display-added",()=>{I()}),j.on("display-removed",()=>{I()}),me&&(me.on("resume",()=>{s&&!s.isDestroyed()&&s.webContents.send("system-resume");try{typeof $<"u"&&($!=null&&$.registry)&&$.registry.checkSnoozedDue()}catch{}setTimeout(I,500),setTimeout(I,2e3)}),me.on("unlock-screen",()=>{s&&!s.isDestroyed()&&s.webContents.send("system-resume");try{typeof $<"u"&&($!=null&&$.registry)&&$.registry.checkSnoozedDue()}catch{}setTimeout(I,500),setTimeout(I,2e3)})),setInterval(()=>{if(W&&s&&!s.isDestroyed()&&s.isVisible())if(!s.isAlwaysOnTop())I();else try{s.moveTop()}catch{}},2500),setTimeout(()=>{S.checkForUpdates().catch(t=>{u("Auto-update check on startup error:",t)})},4e3),setInterval(()=>{S.checkForUpdates().catch(t=>{u("Periodic background update check error:",t)})},2*60*60*1e3)});const Ue=m.join(y.getPath("userData"),"get-media.ps1"),Pt=`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
Add-Type -AssemblyName System.Drawing

$asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { 
    $_.Name -eq 'AsTask' -and 
    $_.IsGenericMethodDefinition -and 
    $_.GetGenericArguments().Count -eq 1 -and 
    $_.GetParameters().Count -eq 1
} | Select-Object -First 1

function Await-Operation($asyncOp, $type) {
    if (-not $asyncOp) { return $null }
    try {
        $task = $asTaskGeneric.MakeGenericMethod($type).Invoke($null, @($asyncOp))
        [void]$task.Wait(2000)
        return $task.Result
    } catch {
        return $null
    }
}

function Get-AppIconBase64($appId) {
    try {
        $proc = $null
        if ($appId) {
            $cleanName = $appId.Split('!')[-1].Replace('.exe','')
            $proc = Get-Process | Where-Object { $_.ProcessName -eq $cleanName -or $cleanName -like "*$($_.ProcessName)*" } | Select-Object -First 1
        }
        if (-not $proc) {
            $proc = Get-Process | Where-Object { $_.MainWindowTitle -and ($_.ProcessName -match "chrome|msedge|brave|firefox|spotify|vlc|music") } | Select-Object -First 1
        }
        if ($proc) {
            $path = $proc.MainModule.FileName
            if ($path) {
                $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($path)
                if ($icon) {
                    $bmp = $icon.ToBitmap()
                    $ms = New-Object System.IO.MemoryStream
                    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
                    $bytes = $ms.ToArray()
                    $ms.Close()
                    $bmp.Dispose()
                    $icon.Dispose()
                    if ($bytes.Length -gt 0) {
                        return "data:image/png;base64," + [Convert]::ToBase64String($bytes)
                    }
                }
            }
        }
    } catch {}
    return ""
}

$inputInterface = [Windows.Storage.Streams.IInputStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
$asStreamMethod = [System.IO.WindowsRuntimeStreamExtensions].GetMethod('AsStreamForRead', [type[]]@($inputInterface))

$mgrType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
$propsType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType = WindowsRuntime]
$streamType = [Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType = WindowsRuntime]
$streamRefType = [Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]

$asyncOp = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]::RequestAsync()
$manager = Await-Operation $asyncOp $mgrType

if ($manager) {
    $session = $manager.GetCurrentSession()
    if (-not $session) {
        $sessions = $manager.GetSessions()
        if ($sessions -and $sessions.Count -gt 0) {
            $session = $sessions | Where-Object { $_.GetPlaybackInfo().PlaybackStatus -eq [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionPlaybackStatus]::Playing } | Select-Object -First 1
            if (-not $session) { $session = $sessions[0] }
        }
    }
    if ($session) {
        $propsOp = $session.TryGetMediaPropertiesAsync()
        $props = Await-Operation $propsOp $propsType
        $playback = $session.GetPlaybackInfo()
        $status = if ($playback) { $playback.PlaybackStatus.ToString().ToLower() } else { "stopped" }

        $timeline = $session.GetTimelineProperties()
        $basePos = if ($timeline -and $timeline.Position) { $timeline.Position.TotalSeconds } else { 0 }
        if ($status -eq "playing" -and $timeline -and $timeline.LastUpdatedTime) {
            $elapsed = ([DateTimeOffset]::UtcNow - $timeline.LastUpdatedTime).TotalSeconds
            if ($elapsed -gt 0 -and $elapsed -lt 86400) {
                $basePos += $elapsed
            }
        }
        $duration = if ($timeline -and $timeline.EndTime) { [math]::Round($timeline.EndTime.TotalSeconds) } else { 0 }
        if ($duration -gt 0 -and $basePos -gt $duration) { $basePos = $duration }
        $position = [math]::Round($basePos)

        $sourceApp = $session.SourceAppUserModelId
        $artwork = ""

        if ($props -and $props.Thumbnail) {
            try {
                $thumbOp = $props.Thumbnail.OpenReadAsync()
                $stream = Await-Operation $thumbOp $streamType
                if (-not $stream) {
                    $stream = Await-Operation $thumbOp $streamRefType
                }
                if ($stream) {
                    $netStream = $asStreamMethod.Invoke($null, @($stream))
                    if ($netStream) {
                        $mem = New-Object System.IO.MemoryStream
                        $netStream.CopyTo($mem)
                        $bytes = $mem.ToArray()
                        $mem.Close()
                        if ($bytes.Length -gt 0) {
                            $artwork = "data:image/png;base64," + [Convert]::ToBase64String($bytes)
                        }
                    }
                }
            } catch {}
        }

        if (-not $artwork) {
            $artwork = Get-AppIconBase64 $sourceApp
        }

        $info = @{
            Title = if ($props) { $props.Title } else { "" }
            Artist = if ($props) { $props.Artist } else { "" }
            Album = if ($props) { $props.AlbumTitle } else { "" }
            Status = $status
            Source = $sourceApp
            Artwork = $artwork
            Position = $position
            Duration = $duration
        }
        $info | ConvertTo-Json -Compress
        exit
    }
}
Write-Output "null"
`,Ge=m.join(y.getPath("userData"),"control-media.ps1"),kt=`param([string]$command = "playpause", [double]$seekSeconds = 0)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime

$asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { 
    $_.Name -eq 'AsTask' -and 
    $_.IsGenericMethodDefinition -and 
    $_.GetGenericArguments().Count -eq 1 -and 
    $_.GetParameters().Count -eq 1
} | Select-Object -First 1

function Await-Operation($asyncOp, $type) {
    if (-not $asyncOp) { return $null }
    try {
        $task = $asTaskGeneric.MakeGenericMethod($type).Invoke($null, @($asyncOp))
        [void]$task.Wait(2000)
        return $task.Result
    } catch {
        return $null
    }
}

$mgrType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
$asyncOp = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]::RequestAsync()
$manager = Await-Operation $asyncOp $mgrType

if ($manager) {
    $session = $manager.GetCurrentSession()
    if (-not $session) {
        $sessions = $manager.GetSessions()
        if ($sessions -and $sessions.Count -gt 0) {
            $session = $sessions | Where-Object { $_.GetPlaybackInfo().PlaybackStatus -eq [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionPlaybackStatus]::Playing } | Select-Object -First 1
            if (-not $session) { $session = $sessions[0] }
        }
    }
    if ($session) {
        $boolType = [bool]
        switch ($command.ToLower()) {
            "playpause" {
                $success = Await-Operation ($session.TryTogglePlayPauseAsync()) $boolType
                if (-not $success) {
                    $pb = $session.GetPlaybackInfo()
                    if ($pb.PlaybackStatus -eq [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionPlaybackStatus]::Playing) {
                        Await-Operation ($session.TryPauseAsync()) $boolType
                    } else {
                        Await-Operation ($session.TryPlayAsync()) $boolType
                    }
                }
            }
            "play" {
                Await-Operation ($session.TryPlayAsync()) $boolType
            }
            "pause" {
                Await-Operation ($session.TryPauseAsync()) $boolType
            }
            "next" {
                Await-Operation ($session.TrySkipNextAsync()) $boolType
            }
            "previous" {
                Await-Operation ($session.TrySkipPreviousAsync()) $boolType
            }
            "stop" {
                Await-Operation ($session.TryStopAsync()) $boolType
            }
            "seek" {
                $ticks = [long]($seekSeconds * 10000000)
                Await-Operation ($session.TryChangePlaybackPositionAsync($ticks)) $boolType
            }
        }
        exit 0
    }
}

# Fallback to keybd_event if GSMTC is unavailable or had no session
if ($command -in @("playpause", "next", "previous")) {
    $vk = 0xCD
    if ($command -eq "next") { $vk = 0xB0 }
    elseif ($command -eq "previous") { $vk = 0xB1 }
    $type = '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);'
    $MediaKey = Add-Type -MemberDefinition $type -Name "WinMediaKeyFallback" -Namespace "WinAPI" -PassThru
    $MediaKey::keybd_event($vk, 0, 0, [UIntPtr]::Zero)
    $MediaKey::keybd_event($vk, 0, 2, [UIntPtr]::Zero)
}
`;try{l.writeFileSync(Ue,Pt,"utf8")}catch(t){console.error("Failed to write get-media.ps1 script:",t)}try{l.writeFileSync(Ge,kt,"utf8")}catch(t){console.error("Failed to write control-media.ps1 script:",t)}let ge=!1;i.handle("get-system-media",async()=>ge?null:(ge=!0,new Promise(t=>{const e=n=>{ge=!1,t(n)};le("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-File",Ue],{maxBuffer:10*1024*1024,encoding:"utf8"},(n,r)=>{if(n||!r||r.trim()==="null"||r.trim()==="'null'"){_(`powershell -NoProfile -Command "Get-Process | Where-Object {$_.ProcessName -eq 'Spotify'} | Select-Object MainWindowTitle"`,{encoding:"utf8"},(o,a)=>{var h;if(o||!a)return e(null);const c=(h=a.split(`
`).find(p=>p.includes("-")))==null?void 0:h.trim();if(c){const p=c.split(" - ");let d="Unknown",f=c;p.length>1&&(d=p[0].trim(),f=p.slice(1).join(" - ").trim()),e({name:f||c,artist:d||"Unknown",state:"playing",source:"Spotify",position:0,duration:0})}else e(null)});return}try{const o=JSON.parse(r.trim());if(!o||!o.Title&&!o.Artist)return e(null);e({name:o.Title||"Unknown Title",artist:o.Artist||"Unknown Artist",album:o.Album||"",artwork_url:o.Artwork||null,state:o.Status==="playing"?"playing":"paused",source:o.Source||"System",position:Number(o.Position)||0,duration:Number(o.Duration)||0})}catch{e(null)}})})));i.handle("get-bluetooth-status",async()=>new Promise(t=>{const n=Buffer.from(`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$devs = @(Get-PnpDevice -Class Bluetooth -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'OK' -and $_.Present -eq $true -and $_.InstanceId -match 'BTHENUM' })
$names = @($devs | ForEach-Object { $_.FriendlyName })
@{ connected = ($devs.Count -gt 0); devices = $names } | ConvertTo-Json -Compress
`,"utf16le").toString("base64");_(`powershell -NoProfile -EncodedCommand ${n}`,(r,o)=>{if(r||!o)return t({connected:!1,devices:[]});try{const a=JSON.parse(o.trim());t({connected:!!a.connected,devices:Array.isArray(a.devices)?a.devices:a.devices?[a.devices]:[]})}catch{t({connected:!1,devices:[]})}})}));i.handle("get-camera-status",async()=>new Promise(t=>{le("reg",["query","HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam","/s"],(e,n)=>{if(e||!n)return t(!1);const r=n.match(/LastUsedTimeStop\s+REG_QWORD\s+0x0\b/i);t(!!r)})}));i.handle("get-microphone-status",async()=>new Promise(t=>{le("reg",["query","HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone","/s"],(e,n)=>{if(e||!n)return t(!1);const r=n.match(/LastUsedTimeStop\s+REG_QWORD\s+0x0\b/i);t(!!r)})}));y.on("window-all-closed",()=>{ee||y.quit()});i.handle("control-system-media",async(t,e,...n)=>{const r=typeof n[0]=="number"?n[0]:0;u(`Executing media control: ${e} ${r>0?`(seek: ${r}s)`:""}`),le("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-File",Ge,"-command",e,"-seekSeconds",r.toString()],{timeout:4e3},o=>{o&&u("Media control error:",o)})});let re=null;function It(){const t=Se.cpus();if(!t||t.length===0)return 0;if(!re||re.length!==t.length)return re=t,0;let e=0,n=0;for(let o=0;o<t.length;o++){const a=t[o],c=re[o];let h=a.times.idle-c.times.idle,p=0;for(const d in a.times)p+=a.times[d]-c.times[d];e+=h,n+=p}if(re=t,n===0)return 0;const r=e/n;return Math.max(0,Math.min(100,Math.round((1-r)*100)))}function xt(){const t=Se.totalmem(),e=Se.freemem();return t?Math.max(0,Math.min(100,Math.round((t-e)/t*100))):0}i.handle("get-system-metrics",async()=>({cpu:It(),ram:xt()}));let J=[],V="";function Ct(){try{const t=M.readText().trim();t&&(V=t,J.push({id:"clip-"+Date.now(),text:t,timestamp:Date.now()}))}catch{}setInterval(()=>{try{const t=M.readText().trim();t&&t!==V&&(V=t,J=[{id:"clip-"+Date.now()+"-"+Math.random().toString(36).slice(2,6),text:t,timestamp:Date.now()},...J.filter(n=>n.text!==t)].slice(0,15),s&&!s.isDestroyed()&&s.webContents.send("clipboard:update",J))}catch{}},600)}i.handle("clipboard:get-history",()=>J);i.on("clipboard:write",(t,e)=>{try{e&&(V=String(e).trim(),M.writeText(String(e)))}catch{}});i.on("clipboard:clear",()=>{try{J=[],V="",M.clear(),s&&!s.isDestroyed()&&s.webContents.send("clipboard:update",[])}catch{}});i.handle("get-clipboard-text",async()=>{try{return M.readText()}catch{return""}});i.handle("write-clipboard-text",async(t,e)=>{try{return e?(V=String(e).trim(),M.writeText(String(e))):M.clear(),!0}catch{return!1}});i.handle("clear-clipboard",async()=>{try{return J=[],V="",M.clear(),s&&!s.isDestroyed()&&s.webContents.send("clipboard:update",[]),!0}catch{return!1}});i.handle("control-system-volume",async(t,e)=>{if(process.platform==="win32"){let n="0xAF";e==="down"&&(n="0xAE"),e==="mute"&&(n="0xAD");const r=`
$type = '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);'
$MediaKey = Add-Type -MemberDefinition $type -Name "WinVolKey" -Namespace "WinAPI" -PassThru
$MediaKey::keybd_event(${n}, 0, 0, [UIntPtr]::Zero)
$MediaKey::keybd_event(${n}, 0, 2, [UIntPtr]::Zero)
`,o=fe(r);return _(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${o}`,a=>{a&&u("Volume control error:",a)}),!0}return!1});let $e=null;function Ot(){process.platform==="win32"&&setInterval(()=>{if(!(!s||s.isDestroyed()))try{if(D&&D.GetKeyState){const t=(D.GetKeyState(144)&1)!==0;$e!==null&&t!==$e&&s.webContents.send("key-lock-change",{key:"NumLock",state:t}),$e=t}}catch{}},150)}let de=null;function Nt(){if(process.platform!=="win32")return;let t=!1;setInterval(()=>{!s||s.isDestroyed()||t||(t=!0,_("wmic logicaldisk where drivetype=2 get name,volumename /format:csv",(e,n)=>{var a,c;if(t=!1,e)return;const r=new Map,o=n.trim().split(/\r?\n/).filter(h=>h.trim()&&!h.startsWith("Node"));for(const h of o){const p=h.trim().split(",");if(p.length>=3){const d=(a=p[1])==null?void 0:a.trim(),f=((c=p[2])==null?void 0:c.trim())||"USB Drive";d&&r.set(d,f)}}if(de!==null&&s&&!s.isDestroyed()){for(const[h,p]of r)de.has(h)||s.webContents.send("usb-change",{action:"connected",drive:h,name:p});for(const[h]of de)r.has(h)||s.webContents.send("usb-change",{action:"disconnected",drive:h,name:"USB Drive"})}de=r}))},5e3)}const je=m.join(y.getPath("userData"),"get-notifications.ps1"),Et=`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime

[void][Windows.UI.Notifications.Management.UserNotificationListener, Windows.UI.Notifications, ContentType = WindowsRuntime]
[void][Windows.UI.Notifications.UserNotification, Windows.UI.Notifications, ContentType = WindowsRuntime]

$asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name.StartsWith('IAsyncOperation')
}[0]

function Await-Op($asyncOp, $type) {
    if (-not $asyncOp) { return $null }
    try {
        $task = $asTaskGeneric.MakeGenericMethod($type).Invoke($null, @($asyncOp))
        [void]$task.Wait()
        return $task.Result
    } catch { return $null }
}

function Get-AppIconBase64($appId, $appName) {
    try {
        $proc = $null
        if ($appName) {
            $proc = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and ($_.ProcessName -like "*$appName*" -or $_.MainWindowTitle -like "*$appName*") } | Select-Object -First 1
        }
        if (-not $proc -and $appId) {
            $cleanName = $appId.Split('!')[-1].Split('.')[-1].Replace('.exe','')
            if ($cleanName -and $cleanName -ne "App") {
                $proc = Get-Process | Where-Object { $_.ProcessName -eq $cleanName -or $_.ProcessName -like "*$cleanName*" } | Select-Object -First 1
            }
        }
        if (-not $proc -and $appId -match '.([A-Za-z0-9]+)[_!]') {
            $extracted = $Matches[1]
            $proc = Get-Process | Where-Object { $_.ProcessName -like "*$extracted*" } | Select-Object -First 1
        }
        if (-not $proc) { return "" }
        $exePath = $proc.MainModule.FileName
        if (-not $exePath) { return "" }
        $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($exePath)
        if (-not $icon) { return "" }
        $bmp = $icon.ToBitmap()
        $ms = New-Object System.IO.MemoryStream
        $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $bytes = $ms.ToArray()
        $ms.Close(); $bmp.Dispose(); $icon.Dispose()
        if ($bytes.Length -gt 0) {
            return "data:image/png;base64," + [Convert]::ToBase64String($bytes)
        }
    } catch {}
    return ""
}

try {
    $listener = [Windows.UI.Notifications.Management.UserNotificationListener]::Current

    $accessType = [Windows.UI.Notifications.Management.UserNotificationListenerAccessStatus, Windows.UI.Notifications, ContentType = WindowsRuntime]
    $access = Await-Op ($listener.RequestAccessAsync()) $accessType

    if ($access -ne [Windows.UI.Notifications.Management.UserNotificationListenerAccessStatus]::Allowed) {
        Write-Output "[]"
        exit
    }

    $kinds = [Windows.UI.Notifications.NotificationKinds]::Toast
    $userNotifType = [Windows.UI.Notifications.UserNotification, Windows.UI.Notifications, ContentType = WindowsRuntime]
    $readOnlyListType = [System.Collections.Generic.IReadOnlyList\`\`1].MakeGenericType($userNotifType)
    $notifsOp = $listener.GetNotificationsAsync($kinds)
    $task = $asTaskGeneric.MakeGenericMethod($readOnlyListType).Invoke($null, @($notifsOp))
    [void]$task.Wait(10000)
    $notifs = $task.Result

    if (-not $notifs) {
        Write-Output "[]"
        exit
    }

    $results = [System.Collections.Generic.List[object]]::new()
    foreach ($n in $notifs) {
        try {
            $toast = $n.Notification.Visual.GetBinding([Windows.UI.Notifications.KnownNotificationBindings]::ToastGeneric)
            if (-not $toast) { continue }
            $texts = $toast.GetTextElements()
            $title = ""
            $body = ""
            $i = 0
            foreach ($t in $texts) {
                if ($i -eq 0) { $title = $t.Text }
                elseif ($i -eq 1) { $body = $t.Text }
                $i++
            }
            $appName = ""
            $appId = ""
            try {
                $appName = $n.AppInfo.DisplayInfo.DisplayName
                $appId = $n.AppInfo.AppUserModelId
            } catch {}
            $icon = Get-AppIconBase64 $appId $appName
            $results.Add([PSCustomObject]@{
                Id = $n.Id
                AppName = $appName
                AppId = $appId
                Title = $title
                Body = $body
                Timestamp = $n.CreationTime.ToString("o")
                Icon = $icon
            })
        } catch { continue }
    }
    @($results) | ConvertTo-Json -Compress -Depth 3
} catch {
    Write-Output "[]"
}
`;try{l.writeFileSync(je,Et,"utf8")}catch(t){u("Failed to write get-notifications.ps1:",t)}function _t(){try{const t=m.join(y.getPath("userData"),"notifications-store.json");if(l.existsSync(t))return JSON.parse(l.readFileSync(t,"utf8"))}catch(t){u("Failed to load notifications-store.json:",t)}return null}function Dt(t){try{const e=m.join(y.getPath("userData"),"notifications-store.json");l.writeFileSync(e,JSON.stringify(t,null,2),"utf8")}catch(e){u("Failed to save notifications-store.json:",e)}}async function Wt(t){return process.platform!=="win32"||!t?!1:new Promise(e=>{const n=`
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name.StartsWith('IAsyncOperation')
}[0]
function Await-Op($asyncOp, $type) {
    if (-not $asyncOp) { return $null }
    try { $task = $asTaskGeneric.MakeGenericMethod($type).Invoke($null, @($asyncOp)); [void]$task.Wait(); return $task.Result } catch { return $null }
}
try {
    $listener = [Windows.UI.Notifications.Management.UserNotificationListener, Windows.UI.Notifications, ContentType = WindowsRuntime]::Current
    $listener.RemoveNotification(${t})
    Write-Output "true"
} catch { Write-Output "false" }
`,r=fe(n);_(`powershell -NoProfile -EncodedCommand ${r}`,(o,a)=>{e((a==null?void 0:a.trim())==="true")})})}async function Mt(){return process.platform!=="win32"?!1:new Promise(t=>{const n=fe(`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
try {
    $listener = [Windows.UI.Notifications.Management.UserNotificationListener, Windows.UI.Notifications, ContentType = WindowsRuntime]::Current
    $listener.ClearNotifications()
    Write-Output "true"
} catch { Write-Output "false" }
`);_(`powershell -NoProfile -EncodedCommand ${n}`,(r,o)=>{t((o==null?void 0:o.trim())==="true")})})}async function Le(t,e){if(process.platform!=="win32"||!t&&!e)return!1;const n=(t||"").trim(),r=(e||"").trim();if(u(`focusNotificationApp: appId="${n}", appName="${r}"`),n&&(n.includes("!")||n.toLowerCase().startsWith("shell:appsfolder\\")))try{const a=n.toLowerCase().startsWith("shell:appsfolder\\")?n:`shell:AppsFolder\\${n}`,c=Te("explorer.exe",[a],{detached:!0,stdio:"ignore"});return c&&typeof c.unref=="function"&&c.unref(),!0}catch(a){u("UWP explorer.exe launch failed:",a)}try{const a=typeof P=="function"?P():null;if(a){if(r){const c=await a.launchApp(r);if(c&&c.success)return!0}if(n&&n!==r){const c=await a.launchApp(n);if(c&&c.success)return!0}if(typeof a.getRunningWindows=="function"&&typeof a.activateWindow=="function"){const c=await a.getRunningWindows({forceRefresh:!0}),h=[r,n].filter(Boolean).map(d=>d.toLowerCase()),p=c.find(d=>{if(!d)return!1;const f=(d.processName||"").toLowerCase(),b=(d.title||"").toLowerCase();return h.some(g=>f===g||f.includes(g)||g.includes(f)||b.toLowerCase().includes(g))});if(p&&p.hWnd){const d=await a.activateWindow(p.hWnd);if(d&&d.success)return!0}}}}catch(a){u("LauncherEngine resolution in focusNotificationApp failed:",a)}const o=`${r} ${n}`.toLowerCase();try{if(o.includes("whatsapp"))return await x.openExternal("whatsapp://"),!0;if(o.includes("spotify"))return await x.openExternal("spotify://"),!0;if(o.includes("telegram"))return await x.openExternal("tg://"),!0;if(o.includes("discord"))return await x.openExternal("discord://"),!0;if(o.includes("slack"))return await x.openExternal("slack://"),!0}catch(a){u("URI protocol fallback failed:",a)}return new Promise(a=>{const c=new Set;[r,n].forEach(g=>{g&&(c.add(g),g.split(/\s+/).forEach(A=>{A.length>2&&c.add(A)}),g.split(/[._!\\\/]/).filter(A=>A.length>2&&!/^[0-9A-Fa-f]{8,}$/.test(A)).forEach(A=>c.add(A)))});const h=Array.from(c).filter(g=>g&&g.length>=2),p=h.length>0?h.map(g=>g.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|"):(r||n).replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),d=n.replace(/'/g,"''"),f=`
$type = @'
using System;
using System.Runtime.InteropServices;
public class WinAPI {
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern void SwitchToThisWindow(IntPtr hWnd, bool fAltTab);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
}
'@
Add-Type -TypeDefinition $type -PassThru | Out-Null

$matched = $false
$pattern = '(?i)(${p})'

# Find by Process Name or Window Title
$procs = Get-Process | Where-Object { 
    $_.ProcessName -match $pattern -or $_.MainWindowTitle -match $pattern 
} | Select-Object -First 1

if ($procs -and $procs.MainWindowHandle -ne 0) {
    $hwnd = $procs.MainWindowHandle
    if ([WinAPI]::IsIconic($hwnd)) {
        [void][WinAPI]::ShowWindow($hwnd, 9)
    } else {
        [void][WinAPI]::ShowWindow($hwnd, 5)
    }
    [WinAPI]::keybd_event(0x12, 0, 0, 0)
    [WinAPI]::keybd_event(0x12, 0, 2, 0)
    [void][WinAPI]::BringWindowToTop($hwnd)
    [void][WinAPI]::SetForegroundWindow($hwnd)
    [void][WinAPI]::SwitchToThisWindow($hwnd, $true)
    $matched = $true
}

if (-not $matched -and '${d}') {
    try {
        Start-Process "explorer.exe" "shell:AppsFolder\\${d}"
        $matched = $true
    } catch {}
}

if ($matched) { Write-Output "true" } else { Write-Output "false" }
`,b=fe(f);_(`powershell -NoProfile -EncodedCommand ${b}`,(g,C)=>{a((C==null?void 0:C.trim())==="true")})})}const $=Qe({savePersistence:Dt,initialPersistedData:_t(),removeNotificationSource:Wt,focusApp:Le,openExternal:async t=>x.openExternal(t)});$.registry.on("change",t=>{if(s&&!s.isDestroyed()){s.webContents.send("notification:update",t);try{s.webContents.invalidate()}catch{}}});setInterval(()=>{try{$.registry.checkSnoozedDue()}catch{}},1e4);let be=!1;async function Be(){return process.platform!=="win32"?[]:be?[]:(be=!0,new Promise(t=>{le("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-File",je],{maxBuffer:5*1024*1024,encoding:"utf8",timeout:1e4},(e,n)=>{if(be=!1,e||!n)return t([]);try{const r=JSON.parse(n.trim()),o=Array.isArray(r)?r:r?[r]:[];$.syncNotifications(o,"windows-notification-listener"),t(o)}catch{t([])}})}))}i.handle("get-notifications",async()=>await Be());i.handle("dismiss-notification",async(t,e)=>{const n=await $.dismiss(e);return!!(n!=null&&n.success)});i.handle("focus-notification-app",async(t,e,n)=>await Le(e,n));i.handle("notification:get-snapshot",()=>$.getSnapshot());i.handle("notification:sync-now",async()=>(await Be(),$.getSnapshot()));i.handle("notification:execute-action",async(t,e,n,r)=>await $.executeAction(e,n,r));i.handle("notification:snooze",(t,e,n,r)=>$.snooze(e,n,r));i.handle("notification:cancel-snooze",(t,e)=>$.cancelSnooze(e));i.handle("notification:dismiss",async(t,e)=>await $.dismiss(e));i.handle("notification:dismiss-group",(t,e)=>$.dismissGroup(e));i.handle("notification:clear-all",async()=>{try{await Mt()}catch{}return $.clearAllActive()});i.handle("notification:undo-dismiss",(t,e)=>$.undoDismiss(e));i.handle("notification:mark-reviewed",(t,e)=>$.markReviewed(e));i.handle("notification:mark-all-reviewed",()=>$.markAllReviewed());i.handle("notification:set-hide-previews",(t,e)=>($.setHidePreviews(e),!0));i.handle("notification:set-app-excluded",(t,e,n)=>($.setAppExcluded(e,n),!0));i.handle("notification:clear-history",()=>($.clearHistory(),!0));i.handle("window:invalidate",()=>{if(s&&!s.isDestroyed())try{s.webContents.invalidate()}catch{}return!0});function Rt(){const t=[m.join(process.resourcesPath,"audio-helper.exe"),m.join(process.resourcesPath,"native","bin","audio-helper.exe"),m.join(process.resourcesPath,"native","audio-helper.exe"),m.join(y.getAppPath(),"native","bin","audio-helper.exe"),m.join(__dirname,"..","native","bin","audio-helper.exe"),m.join(__dirname,"native","bin","audio-helper.exe"),m.join(process.cwd(),"native","bin","audio-helper.exe")];for(const e of t)try{if(l.existsSync(e))return e}catch{}return null}class Ft{constructor(){this.child=null,this.reqId=0,this.pending=new Map,this.buffer="",this.isStopping=!1,this.restartAttempts=0,this.maxRestartAttempts=5,this.restartTimer=null}start(){if(process.platform!=="win32"||this.child&&!this.child.killed)return;const e=Rt();if(!e){u("[AudioMixer] audio-helper.exe not found in search paths.");return}try{this.child=Te(e,[],{stdio:["pipe","pipe","pipe"],windowsHide:!0}),this.child.stdout.on("data",n=>{this.buffer+=n.toString("utf8");let r;for(;(r=this.buffer.indexOf(`
`))!==-1;){const o=this.buffer.slice(0,r).trim();this.buffer=this.buffer.slice(r+1),o&&this.handleLine(o)}}),this.child.stderr.on("data",n=>{u(`[AudioMixer stderr] ${n.toString("utf8").trim()}`)}),this.child.on("error",n=>{u("[AudioMixer process error]",n)}),this.child.on("close",n=>{u(`[AudioMixer] Process exited with code ${n}`),this.child=null;for(const[r,o]of this.pending.entries())clearTimeout(o.timer),o.reject(new Error("Audio helper process exited"));if(this.pending.clear(),!this.isStopping&&this.restartAttempts<this.maxRestartAttempts){this.restartAttempts++;const r=Math.min(1e3*Math.pow(2,this.restartAttempts),1e4);this.restartTimer=setTimeout(()=>{u(`[AudioMixer] Restarting audio-helper (attempt ${this.restartAttempts})...`),this.start()},r)}}),u(`[AudioMixer] Successfully spawned audio-helper from ${e}`),this.restartAttempts=0}catch(n){u("[AudioMixer] Failed to spawn audio-helper:",n)}}handleLine(e){try{const n=JSON.parse(e);if(typeof n.id=="number"&&this.pending.has(n.id)){const{resolve:r,reject:o,timer:a}=this.pending.get(n.id);clearTimeout(a),this.pending.delete(n.id),n.success?r(n.data):o(new Error(n.error||"Unknown audio helper error"))}}catch(n){u(`[AudioMixer] Failed to parse stdout line: ${e}`,n)}}send(e,n={},r=5e3){return new Promise((o,a)=>{if((!this.child||!this.child.stdin||this.child.killed)&&(this.start(),!this.child||!this.child.stdin))return a(new Error("Audio helper is not running"));const c=++this.reqId,h={id:c,cmd:e,...n},p=setTimeout(()=>{this.pending.has(c)&&(this.pending.delete(c),a(new Error(`Command '${e}' timed out after ${r}ms`)))},r);this.pending.set(c,{resolve:o,reject:a,timer:p});try{this.child.stdin.write(JSON.stringify(h)+`
`)}catch(d){clearTimeout(p),this.pending.delete(c),a(d)}})}stop(){if(this.isStopping=!0,this.restartTimer&&(clearTimeout(this.restartTimer),this.restartTimer=null),this.child){try{this.child.stdin&&!this.child.stdin.destroyed&&(this.child.stdin.on("error",()=>{}),this.child.stdin.write(JSON.stringify({id:0,cmd:"shutdown"})+`
`))}catch{}setTimeout(()=>{if(this.child){try{this.child.kill()}catch{}this.child=null}},400)}}}const R=new Ft;y.whenReady().then(()=>{R.start()});y.on("will-quit",()=>{R.stop();try{Y.unregisterAll()}catch{}if(q)try{q.destroy()}catch{}});y.on("before-quit",()=>{R.stop();try{Y.unregisterAll()}catch{}if(q)try{q.destroy()}catch{}});i.handle("audio-mixer:get-devices",async()=>{if(process.platform!=="win32")return{devices:[],defaultDeviceId:""};try{return await R.send("listDevices")}catch(t){return u("[audio-mixer:get-devices error]",t),{devices:[],defaultDeviceId:"",error:t.message}}});i.handle("audio-mixer:get-sessions",async(t,e)=>{if(process.platform!=="win32")return{sessions:[]};try{return await R.send("listSessions",{deviceId:e})}catch(n){return u("[audio-mixer:get-sessions error]",n),{sessions:[],error:n.message}}});i.handle("audio-mixer:set-volume",async(t,e={})=>{if(process.platform!=="win32")return!1;try{return await R.send("setSessionVolume",e)}catch(n){return u("[audio-mixer:set-volume error]",n),!1}});i.handle("audio-mixer:set-mute",async(t,e={})=>{if(process.platform!=="win32")return!1;try{return await R.send("setSessionMute",e)}catch(n){return u("[audio-mixer:set-mute error]",n),!1}});i.handle("audio-mixer:set-master-volume",async(t,e={})=>{if(process.platform!=="win32")return!1;try{return await R.send("setMasterVolume",e)}catch(n){return u("[audio-mixer:set-master-volume error]",n),!1}});i.handle("audio-mixer:set-master-mute",async(t,e={})=>{if(process.platform!=="win32")return!1;try{return await R.send("setMasterMute",e)}catch(n){return u("[audio-mixer:set-master-mute error]",n),!1}});
