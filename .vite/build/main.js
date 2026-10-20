"use strict";const{app:h,BrowserWindow:ge,screen:G,ipcMain:i,shell:O,dialog:Ge,Tray:Le,Menu:je,nativeImage:H,clipboard:D,powerMonitor:pe,globalShortcut:Q}=require("electron");h.commandLine.appendSwitch("disable-background-timer-throttling");h.commandLine.appendSwitch("disable-backgrounding-occluded-windows");h.commandLine.appendSwitch("disable-renderer-backgrounding");const y=require("node:path"),d=require("fs"),we=require("os"),Pe=require("https"),ke=require("http"),Be=require("crypto"),{EventEmitter:qe}=require("events");function le(t){const e=[y.join(__dirname,t),y.join(__dirname,"../../src",t),y.join(typeof h<"u"&&h.getAppPath?h.getAppPath():process.cwd(),"src",t),y.join(typeof h<"u"&&h.getAppPath?h.getAppPath():process.cwd(),".vite/build",t),y.join(process.cwd(),"src",t)];for(const n of e)try{if(d.existsSync(n)||d.existsSync(n+".js")||d.existsSync(y.join(n,"index.js")))return require(n)}catch{}return require(t)}const{createProgressEngine:Je}=le("services/progress"),{createNotificationEngine:Ve,NOTIFICATION_ACTION_TYPES:Wt}=le("services/notifications"),{createLauncherEngine:He}=le("services/launcher"),{createNotesEngine:Ke}=le("services/notes");let Y=null,s=null,_=!0;function x(){try{return y.join(h.getPath("userData"),"settings.json")}catch{return y.join(process.cwd(),"settings.json")}}function ze(){try{const t=x();if(d.existsSync(t)){const e=JSON.parse(d.readFileSync(t,"utf8"));if(typeof e.alwaysOnTop=="boolean")return e.alwaysOnTop}}catch{}return!0}function Qe(t){try{const e=x();let n={};if(d.existsSync(e))try{n=JSON.parse(d.readFileSync(e,"utf8"))}catch{}n.alwaysOnTop=t,d.writeFileSync(e,JSON.stringify(n,null,2),"utf8")}catch{}}function Ze(){try{const t=x();if(d.existsSync(t)){const e=JSON.parse(d.readFileSync(t,"utf8"));if(typeof e.autoDownloadInstall=="boolean")return e.autoDownloadInstall}}catch{}return!0}function Ye(t,e){try{const n=x();let r={};if(d.existsSync(n))try{r=JSON.parse(d.readFileSync(n,"utf8"))}catch{}r[t]=e,d.writeFileSync(n,JSON.stringify(r,null,2),"utf8")}catch{}}function Xe(){try{const t=x();if(d.existsSync(t)){const e=JSON.parse(d.readFileSync(t,"utf8"));if(typeof e.mascotMode=="boolean")return e.mascotMode}}catch{}return!0}function Ne(t){try{const e=x();let n={};if(d.existsSync(e))try{n=JSON.parse(d.readFileSync(e,"utf8"))}catch{}n.mascotMode=t,d.writeFileSync(e,JSON.stringify(n,null,2),"utf8")}catch{}}function et(){try{const t=x();if(d.existsSync(t)){const e=JSON.parse(d.readFileSync(t,"utf8"));if(typeof e.minimalNotch=="boolean")return e.minimalNotch}}catch{}return!1}function re(t){try{const e=x();let n={};if(d.existsSync(e))try{n=JSON.parse(d.readFileSync(e,"utf8"))}catch{}n.minimalNotch=t,d.writeFileSync(e,JSON.stringify(n,null,2),"utf8")}catch{}}function tt(){try{const t=x();if(d.existsSync(t)){const e=JSON.parse(d.readFileSync(t,"utf8"));if(typeof e.privacyDots=="boolean")return e.privacyDots}}catch{}return!1}function nt(t){try{const e=x();let n={};if(d.existsSync(e))try{n=JSON.parse(d.readFileSync(e,"utf8"))}catch{}n.privacyDots=t,d.writeFileSync(e,JSON.stringify(n,null,2),"utf8")}catch{}}function st(){try{const t=x();if(d.existsSync(t)){const e=JSON.parse(d.readFileSync(t,"utf8"));if(typeof e.smartBrowserAvoidance=="boolean")return e.smartBrowserAvoidance}}catch{}return!0}function rt(t){try{const e=x();let n={};if(d.existsSync(e))try{n=JSON.parse(d.readFileSync(e,"utf8"))}catch{}n.smartBrowserAvoidance=t,d.writeFileSync(e,JSON.stringify(n,null,2),"utf8")}catch{}}let U=Xe(),b=et(),ne=tt(),Z=st();_=ze();function it(){try{const t=x();if(d.existsSync(t)){const e=JSON.parse(d.readFileSync(t,"utf8"));if(Array.isArray(e.hiddenTabs))return e.hiddenTabs}}catch{}return[6]}function ot(t){try{const e=x();let n={};if(d.existsSync(e))try{n=JSON.parse(d.readFileSync(e,"utf8"))}catch{}n.hiddenTabs=t,d.writeFileSync(e,JSON.stringify(n,null,2),"utf8")}catch{}}let se=it();function T(){if(_&&!(!s||s.isDestroyed())){try{s.setAlwaysOnTop(!0,"screen-saver",1)}catch{try{s.setAlwaysOnTop(!0,"screen-saver")}catch{try{s.setAlwaysOnTop(!0)}catch{}}}try{s.moveTop()}catch{}}}function at(t){if(_=!!t,Qe(_),s&&!s.isDestroyed()){try{_?T():s.setAlwaysOnTop(!1)}catch{}try{s.webContents.send("always-on-top-changed",_)}catch{}}W()}function ct(){try{return y.join(h.getPath("userData"),"quick-pill.log")}catch{return y.join(process.cwd(),"quick-pill.log")}}function l(t,e=null){const r=`[${new Date().toISOString()}] ${t}${e?` | Error: ${e.stack||e}`:""}
`;console.log(r.trim());try{const o=ct();d.appendFileSync(o,r,"utf8")}catch{}}process.on("uncaughtException",t=>{l("UNCAUGHT EXCEPTION (Main Process)",t)});process.on("unhandledRejection",t=>{l("UNHANDLED REJECTION (Main Process)",t)});const F={0:"Alt+B",1:"Alt+W",2:"Alt+O",11:"Alt+H",12:"Alt+A",13:"Alt+P",14:"Alt+L",15:"Alt+Q",3:"Alt+M",4:"Alt+C",5:"Alt+N",6:"Alt+G",7:"Alt+V",8:"Alt+T",10:"Alt+R","minimal-notch":"Alt+Shift+M"};let z=[];function Oe(){try{const t=x();if(d.existsSync(t)){const e=JSON.parse(d.readFileSync(t,"utf8"));if(e&&typeof e.tabShortcuts=="object"&&e.tabShortcuts!==null)return{...F,...e.tabShortcuts}}}catch{}return{...F}}function We(t){try{const e=x();let n={};if(d.existsSync(e))try{n=JSON.parse(d.readFileSync(e,"utf8"))}catch{}return n.tabShortcuts=t,d.writeFileSync(e,JSON.stringify(n,null,2),"utf8"),!0}catch(e){return l("Failed to save tabShortcuts preference:",e),!1}}function lt(t){if(Number(t)===9){Ae();return}if(!(!s||s.isDestroyed()))try{s.isVisible()||s.show(),T(),s.focus(),s.webContents.send("open-tab-instant",Number(t))}catch(e){l(`Failed to openTabInstant for tab ${t}:`,e)}}function $e(t){for(const r of z)try{Q.unregister(r)}catch{}z=[];const e=t||Oe();for(const[r,o]of Object.entries(e)){if(!o||typeof o!="string"||!o.trim())continue;const a=o.trim();if(a.toUpperCase().includes("CTRL")||a.toUpperCase().includes("CONTROL")){l(`Refusing to register shortcut with Ctrl: ${a}`);continue}if(r==="minimal-notch"){try{Q.register(a,()=>{b=!b,re(b),s&&!s.isDestroyed()&&(s.webContents.send("settings:minimal-notch-changed",b),s.webContents.send("toggle-minimal-notch-hotkey")),W()})?z.push(a):l(`Global shortcut conflict/in-use for ${a} (minimal-notch)`)}catch(c){l(`Error registering global shortcut ${a}:`,c)}continue}try{Q.register(a,()=>{lt(parseInt(r,10))})?z.push(a):l(`Global shortcut conflict/in-use for ${a} (tab ${r})`)}catch(c){l(`Error registering global shortcut ${a}:`,c)}}const n=e["minimal-notch"]||"Alt+Shift+M";if(!z.includes(n))try{Q.register(n,()=>{b=!b,re(b),s&&!s.isDestroyed()&&(s.webContents.send("settings:minimal-notch-changed",b),s.webContents.send("toggle-minimal-notch-hotkey")),W()})&&z.push(n)}catch(r){l("Error registering fallback global shortcut for minimal notch:",r)}}const{exec:L,execFile:oe,spawn:be}=require("child_process");function de(t){return Buffer.from(t,"utf16le").toString("base64")}i.handle("log-message",(t,e,n,r)=>{l(`[RENDERER ${String(e).toUpperCase()}] ${n} ${r?JSON.stringify(r):""}`)});i.handle("log-renderer-error",(t,e)=>{l(`[RENDERER ERROR] Unhandled Renderer Exception ${JSON.stringify(e)}`)});let xe=null;i.handle("set-ignore-mouse-events",(t,e,n)=>{if(s&&!s.isDestroyed())try{if(xe===e)return;if(xe=e,e){const r=n!==void 0?n:!0;s.setIgnoreMouseEvents(!0,{forward:r})}else s.setIgnoreMouseEvents(!1),T()}catch{try{s.setIgnoreMouseEvents(!0,{forward:!0})}catch{}}});i.handle("get-always-on-top",()=>_);i.handle("set-always-on-top",(t,e)=>(at(e),_));i.handle("focus-window",()=>{s&&!s.isDestroyed()&&(T(),s.focus())});i.handle("open-external",async(t,e)=>{await O.openExternal(e)});i.handle("get-mascot-mode",()=>U);i.handle("set-mascot-mode",(t,e)=>(U=!!e,Ne(U),W(),U));i.handle("get-minimal-notch",()=>b);i.handle("set-minimal-notch",(t,e)=>(b=!!e,re(b),s&&!s.isDestroyed()&&s.webContents.send("settings:minimal-notch-changed",b),W(),b));i.handle("toggle-minimal-notch",()=>(b=!b,re(b),s&&!s.isDestroyed()&&(s.webContents.send("settings:minimal-notch-changed",b),s.webContents.send("toggle-minimal-notch-hotkey")),W(),b));i.handle("get-smart-browser-avoidance",()=>Z);i.handle("set-smart-browser-avoidance",(t,e)=>(Z=!!e,rt(Z),s&&!s.isDestroyed()&&s.webContents.send("settings:smart-browser-avoidance-changed",Z),Z));i.handle("get-hidden-tabs",()=>se);i.handle("set-hidden-tabs",(t,e)=>(Array.isArray(e)&&(se=e,ot(se),s&&!s.isDestroyed()&&s.webContents.send("settings:hidden-tabs-changed",se)),se));i.handle("get-privacy-dots",()=>ne);i.handle("set-privacy-dots",(t,e)=>(ne=!!e,nt(ne),s&&!s.isDestroyed()&&s.webContents.send("settings:privacy-dots-changed",ne),ne));i.handle("open-settings-window",()=>(Ae(),!0));i.on("settings-window:minimize",()=>{$&&!$.isDestroyed()&&$.minimize()});i.on("settings-window:close",()=>{$&&!$.isDestroyed()&&$.close()});const dt="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAMklEQVRYhe3OQQ0AIAwEwbf/h1GChwW0U4E2Z9Yk1fN7kG65AwAAAAAAAAAAAAAAwP8AO6kBX7K4Xy0AAAAASUVORK5CYII=";let B=null;try{const t=ie("png");d.existsSync(t)&&(B=H.createFromPath(t).resize({width:32,height:32}))}catch{}if(!B||B.isEmpty())try{B=H.createFromDataURL(dt).resize({width:32,height:32})}catch{B=H.createEmpty()}const ce=new Map;async function ut(t){try{if(!t||typeof t!="string")return null;const e=y.resolve(t);if(!d.existsSync(e))return null;if(ce.has(e)){const r=ce.get(e);return r&&!r.isEmpty()?r.toDataURL():null}let n=null;try{typeof H.createThumbnailFromPath=="function"&&(n=await H.createThumbnailFromPath(e,{width:32,height:32}))}catch{}if(!n||n.isEmpty())try{typeof h.getFileIcon=="function"&&(n=await h.getFileIcon(e,{size:"normal"}),n&&!n.isEmpty()&&(n=n.resize({width:32,height:32})))}catch{}return(!n||n.isEmpty())&&(n=B),ce.set(e,n),n&&!n.isEmpty()?n.toDataURL():null}catch(e){return l("cacheShelfIcon error:",e),null}}function Se(t,e){try{if(!e||typeof e!="string")return!1;const n=y.resolve(e);if(!d.existsSync(n))return!1;let r=ce.get(n);return(!r||typeof r.isEmpty=="function"&&r.isEmpty())&&(r=B),t.startDrag({file:n,icon:r}),!0}catch(n){return l("executeStartDragSync error:",n),!1}}i.on("shelf:start-drag",(t,e)=>{Se(t.sender,e)});i.on("ondragstart",(t,e)=>{Se(t.sender,e)});i.handle("start-drag",(t,e)=>Se(t.sender,e));i.handle("shelf:cache-icon",async(t,e)=>await ut(e));let J=null;function k(){if(!J){let t="";try{t=h.getPath("userData")}catch{t=process.cwd()}J=He({userDataPath:t,shell:O,getFileIcon:(e,n)=>h.getFileIcon(e,n)})}return J}i.handle("launcher:search-apps",async(t,e,n)=>{try{return await k().searchApps(e,n)}catch(r){return l("Error in launcher:search-apps:",r),[]}});i.handle("launcher:get-catalog",async()=>{try{return await k().getCatalog()}catch(t){return l("Error in launcher:get-catalog:",t),[]}});i.handle("launcher:reindex-catalog",async()=>{try{return await k().reindexCatalog()}catch(t){return l("Error in launcher:reindex-catalog:",t),{success:!1,count:0}}});i.handle("launcher:launch-app",async(t,e)=>{try{return await k().launchApp(e)}catch(n){return l("Error in launcher:launch-app:",n),{success:!1,error:n.message}}});i.handle("launcher:get-running-windows",async(t,e)=>{try{return await k().getRunningWindows(e)}catch(n){return l("Error in launcher:get-running-windows:",n),[]}});i.handle("launcher:activate-window",async(t,e)=>{try{const n=await k().activateWindow(e);return n.success&&s&&!s.isDestroyed()&&s.webContents.send("launcher:window-activated",{hWnd:e}),n}catch(n){return l("Error in launcher:activate-window:",n),{success:!1,code:"FAILED",error:n.message}}});i.handle("launcher:get-favorites",async()=>{try{return await k().getFavorites()}catch(t){return l("Error in launcher:get-favorites:",t),[]}});i.handle("launcher:set-favorites",async(t,e)=>{try{return await k().setFavorites(e)}catch(n){return l("Error in launcher:set-favorites:",n),{success:!1}}});i.handle("workspaces:get-workspaces",async()=>{try{return await k().getWorkspaces()}catch(t){return l("Error in workspaces:get-workspaces:",t),[]}});i.handle("workspaces:save-workspace",async(t,e)=>{try{return await k().saveWorkspace(e)}catch(n){return l("Error in workspaces:save-workspace:",n),{success:!1,error:n.message}}});i.handle("workspaces:delete-workspace",async(t,e)=>{try{return await k().deleteWorkspace(e)}catch(n){return l("Error in workspaces:delete-workspace:",n),{success:!1,error:n.message}}});i.handle("workspaces:launch-workspace",async(t,e,n)=>{try{return await k().launchWorkspace(e,n)}catch(r){return l("Error in workspaces:launch-workspace:",r),{success:!1,results:[],error:r.message}}});let he=null;function C(){if(!he){let t="";try{t=h.getPath("userData")}catch{t=process.cwd()}he=Ke({userDataPath:t,clipboard:D})}return he}i.handle("notes:get-notes",async(t,e,n)=>{try{return await C().getNotes(e,n)}catch(r){return l("Error in notes:get-notes:",r),[]}});i.handle("notes:save-note",async(t,e)=>{try{const n=await C().saveNote(e);return s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"save",note:n}),n}catch(n){return l("Error in notes:save-note:",n),{success:!1,error:n.message}}});i.handle("notes:delete-note",async(t,e)=>{try{const n=await C().deleteNote(e);return n.success&&s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"delete",id:e}),n}catch(n){return l("Error in notes:delete-note:",n),{success:!1,error:n.message}}});i.handle("notes:undo-delete",async()=>{try{const t=await C().undoDelete();return t.success&&s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"restore",note:t.note}),t}catch(t){return l("Error in notes:undo-delete:",t),{success:!1,error:t.message}}});i.handle("notes:toggle-pin",async(t,e)=>{try{const n=await C().togglePin(e);return n.success&&s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"togglePin",id:e,isPinned:n.isPinned}),n}catch(n){return l("Error in notes:toggle-pin:",n),{success:!1,error:n.message}}});i.handle("notes:toggle-archive",async(t,e)=>{try{const n=await C().toggleArchive(e);return n.success&&s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"toggleArchive",id:e,isArchived:n.isArchived}),n}catch(n){return l("Error in notes:toggle-archive:",n),{success:!1,error:n.message}}});i.handle("notes:save-draft",async(t,e)=>{try{return await C().saveDraft(e)}catch(n){return l("Error in notes:save-draft:",n),{success:!1,error:n.message}}});i.handle("notes:get-draft",async()=>{try{return await C().getDraft()}catch(t){return l("Error in notes:get-draft:",t),null}});i.handle("notes:clear-draft",async()=>{try{return await C().clearDraft()}catch(t){return l("Error in notes:clear-draft:",t),{success:!1,error:t.message}}});i.handle("notes:get-contextual-capture",async(t,e)=>{try{return await C().getContextualCapture(e)}catch(n){return l("Error in notes:get-contextual-capture:",n),{success:!1,code:"CAPTURE_ERROR",error:n.message}}});i.handle("notes:search-notes",async(t,e,n)=>{try{return await C().searchNotes(e,n)}catch(r){return l("Error in notes:search-notes:",r),[]}});i.handle("notes:get-tags",async()=>{try{return await C().getTags()}catch(t){return l("Error in notes:get-tags:",t),[]}});i.handle("notes:convert-to-task",async(t,e)=>{try{return await C().convertToTask(e)}catch(n){return l("Error in notes:convert-to-task:",n),{success:!1,error:n.message}}});i.handle("shortcuts:get-tab-shortcuts",()=>Oe());i.handle("shortcuts:set-tab-shortcuts",(t,e)=>{if(!e||typeof e!="object")return{success:!1,error:"Invalid shortcuts object"};const n={};for(const[o,a]of Object.entries(e))if(typeof a=="string"){const c=a.toUpperCase();if(c.includes("CTRL")||c.includes("CONTROL"))return{success:!1,error:"Ctrl cannot be used in tab shortcuts (reserved for Click-Through)"};n[o]=a.trim()}const r={...F,...n};return We(r),$e(r),s&&!s.isDestroyed()&&s.webContents.send("shortcuts:updated",r),$&&!$.isDestroyed()&&$.webContents.send("shortcuts:updated",r),{success:!0,shortcuts:r}});i.handle("shortcuts:reset-tab-shortcuts",()=>(We(F),$e(F),s&&!s.isDestroyed()&&s.webContents.send("shortcuts:updated",F),$&&!$.isDestroyed()&&$.webContents.send("shortcuts:updated",F),{success:!0,shortcuts:F}));i.handle("launch-app",async(t,e)=>await k().launchApp(e));i.handle("build-app-cache",async()=>await k().reindexCatalog());i.handle("search-apps",async(t,e)=>await k().searchApps(e));i.handle("get-displays",()=>G.getAllDisplays().map(e=>({id:e.id,label:e.label||`Display ${e.id}`,bounds:e.bounds})));i.handle("set-display",(t,e)=>{if(s&&!s.isDestroyed()){const r=G.getAllDisplays().find(u=>u.id.toString()===e.toString())||G.getPrimaryDisplay(),o=560,a=180,c=Math.round(r.bounds.x+(r.bounds.width-o)/2),m=r.bounds.y;s.setBounds({x:c,y:m,width:o,height:a}),s.show(),T()}});i.handle("update-window-position",(t,e,n)=>{});i.handle("set-auto-launch",(t,e)=>{try{h.setLoginItemSettings({openAtLogin:e,path:h.getPath("exe")}),e||Ee()}catch(n){console.error("Failed to set login item settings on Windows:",n)}});function Ee(){if(process.platform==="win32")try{const t=["electron.app.Ripple","electron.app.Electron","electron.app.Quick Pill","Ripple"];for(const e of t)L(`reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${e}" /f`,()=>{})}catch{}}const pt=["https://raw.githubusercontent.com/nabil24024004/Quick-Pill/main/web%20app/public/version.json","https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/version.json","https://raw.githubusercontent.com/nabil24024004/Ripple/main/web%20app/public/version.json"];class ht extends qe{constructor(){super(),this.manifestUrls=[...pt],this.currentVersion=h?h.getVersion():"5.5.1",this.status="idle",this.updateInfo=null,this.downloadedFilePath=null,this.currentDownloadRequest=null,this.lastProgressEmit=0;const e=Ze();this.autoDownload=e,this.autoInstall=e}compareVersions(e,n){const r=(e||"0.0.0").replace(/^v/i,"").trim(),o=(n||"0.0.0").replace(/^v/i,"").trim(),[a,c]=r.split("-"),[m,u]=o.split("-"),p=a.split(".").map(w=>parseInt(w,10)||0),f=m.split(".").map(w=>parseInt(w,10)||0),v=Math.max(p.length,f.length);for(let w=0;w<v;w++){const I=p[w]||0,S=f[w]||0;if(I>S)return 1;if(I<S)return-1}return!c&&u?1:c&&!u?-1:c&&u?c.localeCompare(u):0}getPlatformKey(){return`win32-${process.arch}`}fetchJson(e,n=12e3,r=5){return new Promise((o,a)=>{if(r<=0)return a(new Error("Too many redirects while fetching update manifest."));const m=(e.startsWith("https")?Pe:ke).get(e,{headers:{"User-Agent":`QuickPill-Updater/${this.currentVersion} (${process.platform} ${process.arch})`,Accept:"application/json, text/plain, */*"},timeout:n},u=>{if(u.statusCode>=300&&u.statusCode<400&&u.headers.location){const f=new URL(u.headers.location,e).href;return this.fetchJson(f,n,r-1).then(o).catch(a)}if(u.statusCode!==200)return u.resume(),a(new Error(`Server returned HTTP ${u.statusCode}: ${u.statusMessage}`));let p="";u.setEncoding("utf8"),u.on("data",f=>{p+=f}),u.on("end",()=>{try{const f=JSON.parse(p);o(f)}catch(f){a(new Error(`Invalid JSON received from update manifest: ${f.message}`))}})});m.on("timeout",()=>{m.destroy(),a(new Error("Connection timed out while checking for updates."))}),m.on("error",u=>{a(u)})})}async checkForUpdates(){var e,n,r;if(this.status==="checking"||this.status==="downloading")return{status:this.status,updateInfo:this.updateInfo};this.status="checking",this.emit("checking");try{let o=null,a=null;for(const u of this.manifestUrls)try{const p=`${u}${u.includes("?")?"&":"?"}_t=${Date.now()}`,f=await this.fetchJson(p);if(f&&f.version){o=f;break}}catch(p){a=p}if(!o||!o.version)throw a||new Error('Update manifest is missing required "version" field.');const c=o.version;if(this.compareVersions(c,this.currentVersion)>0){const u=this.getPlatformKey(),p=((e=o.platforms)==null?void 0:e[u])||((n=o.platforms)==null?void 0:n[`${process.platform}-x64`])||((r=o.platforms)==null?void 0:r["win32-x64"]),f=(p==null?void 0:p.url)||"";return this.updateInfo={version:c,currentVersion:this.currentVersion,name:o.name||`Quick Pill v${c}`,releaseDate:o.releaseDate||"",mandatory:!!o.mandatory,changelog:Array.isArray(o.changelog)?o.changelog:[],downloadUrl:f,sha256:(p==null?void 0:p.sha256)||"",size:(p==null?void 0:p.size)||0,installerType:(p==null?void 0:p.installerType)||"nsis"},this.status="available",this.emit("update-available",this.updateInfo),this.autoDownload&&f&&(l(`[Auto-Updater] New update v${c} detected. Automatically downloading in background...`),setTimeout(()=>{this.startDownload().catch(v=>{l("[Auto-Updater] Automatic background download failed:",v)})},1e3)),{status:"available",updateInfo:this.updateInfo}}else{this.status="not-available";const u={currentVersion:this.currentVersion,latestVersion:c};return this.emit("update-not-available",u),{status:"not-available",updateInfo:u}}}catch(o){this.status="error";const a=o.message||"Unknown error occurred while checking for updates.";return this.emit("error",a),{status:"error",error:a}}}startDownload(){if(!this.updateInfo||!this.updateInfo.downloadUrl){const a=new Error("No update available or download URL is missing.");return this.emit("error",a.message),Promise.reject(a)}if(this.status==="downloading")return Promise.resolve({status:"downloading"});this.status="downloading",this.emit("download-started",this.updateInfo);const e=h.getPath("temp"),r=`quick-pill-update-v${this.updateInfo.version}.exe`,o=y.join(e,r);return new Promise((a,c)=>{if(d.existsSync(o))try{d.unlinkSync(o)}catch{}const m=d.createWriteStream(o);let u=0,p=this.updateInfo.size||0,f=0,v=Date.now(),w=0;const I=(S,R=5)=>{if(R<=0){m.close();const A=new Error("Too many redirects while downloading update binary.");return this.status="error",this.emit("error",A.message),c(A)}const ue=(S.startsWith("https")?Pe:ke).get(S,{headers:{"User-Agent":`QuickPill-Updater/${this.currentVersion} (${process.platform} ${process.arch})`}},A=>{if(A.statusCode>=300&&A.statusCode<400&&A.headers.location){const N=new URL(A.headers.location,S).href;return I(N,R-1)}if(A.statusCode!==200){m.close();try{d.unlinkSync(o)}catch{}const N=new Error(`Download failed with status HTTP ${A.statusCode}: ${A.statusMessage}`);return this.status="error",this.emit("error",N.message),c(N)}const ee=parseInt(A.headers["content-length"],10);!isNaN(ee)&&ee>0&&(p=ee),A.on("data",N=>{u+=N.length,m.write(N);const K=Date.now();if(K-this.lastProgressEmit>=100||u===p){const Te=(K-v)/1e3;Te>=.5&&(w=Math.round((u-f)/Te),f=u,v=K);const Ue={percent:p>0?Math.min(100,Math.round(u/p*1e3)/10):0,transferredBytes:u,totalBytes:p,speedBytesPerSec:w};this.lastProgressEmit=K,this.emit("download-progress",Ue)}}),A.on("end",()=>{m.end()}),A.on("error",N=>{m.close();try{d.unlinkSync(o)}catch{}this.status="error",this.emit("error",N.message),c(N)})});this.currentDownloadRequest=ue,ue.on("error",A=>{m.close();try{d.unlinkSync(o)}catch{}this.status="error",this.emit("error",A.message),c(A)})};m.on("finish",()=>{if(this.currentDownloadRequest=null,this.updateInfo.sha256&&this.updateInfo.sha256.trim()!=="")try{const R=Be.createHash("sha256"),ve=d.readFileSync(o);if(R.update(ve),R.digest("hex").toLowerCase()!==this.updateInfo.sha256.trim().toLowerCase()){try{d.unlinkSync(o)}catch{}const A=new Error("Integrity check failed (SHA-256 mismatch). The downloaded file might be corrupted.");return this.status="error",this.emit("error",A.message),c(A)}}catch(R){console.warn("Could not verify SHA-256 checksum:",R)}this.downloadedFilePath=o,this.status="downloaded";const S={version:this.updateInfo.version,filePath:o};this.emit("update-downloaded",S),a(S),this.autoInstall&&(l(`[Auto-Updater] Update v${this.updateInfo.version} downloaded successfully. Automatically installing in background in 2 seconds...`),setTimeout(()=>{this.installAndRelaunch()},2e3))}),m.on("error",S=>{try{d.unlinkSync(o)}catch{}this.status="error",this.emit("error",S.message),c(S)}),I(this.updateInfo.downloadUrl)})}cancelDownload(){if(this.currentDownloadRequest){try{this.currentDownloadRequest.destroy()}catch{}this.currentDownloadRequest=null}this.status="idle",this.emit("download-cancelled")}installAndRelaunch(){if(!this.downloadedFilePath||!d.existsSync(this.downloadedFilePath)){const n=new Error("No downloaded update file found to install.");return this.emit("error",n.message),!1}const e=this.downloadedFilePath;try{return be(e,["/S"],{detached:!0,stdio:"ignore"}).unref(),setTimeout(()=>{h?(h.isQuitting=!0,h.quit()):process.exit(0)},300),!0}catch(n){return this.emit("error",`Failed to launch installer: ${n.message}`),!1}}}const P=new ht;function j(t,e){s&&!s.isDestroyed()&&s.webContents.send("update-event",{event:t,data:e})}P.on("checking",()=>j("checking"));P.on("update-available",t=>j("available",t));P.on("update-not-available",t=>j("not-available",t));P.on("download-started",t=>j("download-started",t));P.on("download-progress",t=>j("download-progress",t));P.on("update-downloaded",t=>j("downloaded",t));P.on("download-cancelled",()=>j("cancelled"));P.on("error",t=>j("error",t));i.handle("check-for-updates",async()=>await P.checkForUpdates());i.handle("start-update-download",async()=>await P.startDownload());i.handle("cancel-update-download",()=>(P.cancelDownload(),!0));i.handle("install-update",()=>P.installAndRelaunch());i.handle("get-app-version",()=>h.getVersion());i.handle("get-auto-download-install",()=>P.autoDownload&&P.autoInstall);i.handle("set-auto-download-install",(t,e)=>{const n=!!e;return P.autoDownload=n,P.autoInstall=n,Ye("autoDownloadInstall",n),n});const X=Je({autoUpdater:P,openPath:async t=>{try{d.existsSync(t)&&(d.statSync(t).isDirectory()?await O.openPath(t):O.showItemInFolder(t))}catch(e){l("[progress openPath error]",e)}}});X.coordinator.on("update",t=>{s&&!s.isDestroyed()&&s.webContents.send("progress:update",t)});i.handle("progress:get-snapshot",()=>X.coordinator.getSnapshot());i.handle("progress:execute-action",async(t,e,n,r)=>await X.coordinator.executeAction(e,n,r));i.handle("progress:start-file-op",async(t,e)=>await X.fileOpsProvider.startCopy(e));i.handle("progress:start-hash-op",async(t,e)=>await X.fileOpsProvider.startHash(e));i.handle("progress:clear-history",()=>(X.registry.clearHistory(),!0));i.handle("progress:select-file",async()=>{if(!s)return null;const t=await Ge.showOpenDialog(s,{properties:["openFile"]});return t.canceled||!t.filePaths.length?null:t.filePaths[0]});const ie=(t=null)=>{const e=t||"ico";try{const n=y.join(h.getAppPath(),`src/assets/icons/icon.${e}`);if(d.existsSync(n))return n}catch{}try{const n=y.join(process.resourcesPath,`icon.${e}`);if(d.existsSync(n))return n;const r=y.join(process.resourcesPath,`assets/icons/icon.${e}`);if(d.existsSync(r))return r}catch{}return y.join(__dirname,`../../src/assets/icons/icon.${e}`)},Ie=()=>{const t=G.getPrimaryDisplay(),{x:e,y:n,width:r,height:o}=t.bounds,a=560,c=180,m=Math.round(e+(r-a)/2),u=n;s=new ge({width:a,height:c,x:m,y:u,backgroundColor:"#00000000",transparent:!0,alwaysOnTop:!0,resizable:!1,minimizable:!1,maximizable:!1,fullscreenable:!1,frame:!1,thickFrame:!1,hasShadow:!1,skipTaskbar:!0,icon:ie(),type:"toolbar",fullscreen:!1,visibleOnFullScreen:!0,acceptFirstMouse:!0,webPreferences:{preload:y.join(__dirname,"preload.js"),devTools:!h.isPackaged,backgroundThrottling:!1},show:!0}),s.setIgnoreMouseEvents(!0,{forward:!0}),s.once("ready-to-show",()=>{s&&(s.show(),T(),s.focus())}),s.webContents.on("console-message",(p,f,v,w,I)=>{f>=2&&l(`[RENDERER CONSOLE ${f===3?"ERROR":"WARN"}] (${I?y.basename(I):"unknown"}:${w}) ${v}`)}),s.webContents.on("render-process-gone",(p,f)=>{if(l(`[RENDERER PROCESS GONE] reason=${f==null?void 0:f.reason}, exitCode=${f==null?void 0:f.exitCode}`),s&&!s.isDestroyed())try{s.setIgnoreMouseEvents(!0,{forward:!0})}catch{}}),s.on("blur",()=>{T()}),s.on("minimize",()=>{s&&!s.isDestroyed()&&(s.restore(),T())}),s.on("restore",()=>{T()}),s.on("show",()=>{T()}),setTimeout(()=>{s&&!s.isVisible()&&(s.show(),T(),s.focus())},5e3),s.on("closed",()=>{s=null});try{s.setVisibleOnAllWorkspaces(!0,{visibleOnFullScreen:!0})}catch{}if(!h.isPackaged)s.loadURL("http://localhost:5173");else if(!h.isPackaged&&process.env.NODE_ENV==="development")s.loadURL("http://localhost:5173");else{const p=[y.join(__dirname,"../renderer/main_window/index.html"),y.join(h.getAppPath(),".vite/renderer/main_window/index.html"),y.join(h.getAppPath(),"dist/index.html"),y.join(__dirname,"index.html"),y.join(h.getAppPath(),"index.html")];let f=!1;for(const v of p)if(d.existsSync(v)){l(`Loading renderer from: ${v}`),s.loadFile(v),f=!0;break}f||(l("No packaged renderer HTML found, falling back to localhost:5173"),s.loadURL("http://localhost:5173"))}};let $=null;function Ae(){if($&&!$.isDestroyed()){$.show(),$.focus();return}if($=new ge({width:680,height:560,title:"Quick Pill Settings",backgroundColor:"#121212",autoHideMenuBar:!0,resizable:!0,minimizable:!0,maximizable:!1,frame:!1,icon:ie(),webPreferences:{preload:y.join(__dirname,"preload.js"),devTools:!h.isPackaged,backgroundThrottling:!1}}),!h.isPackaged)$.loadURL("http://localhost:5173#settings");else if(!h.isPackaged&&process.env.NODE_ENV==="development")$.loadURL("http://localhost:5173#settings");else{const t=[y.join(__dirname,"../renderer/main_window/index.html"),y.join(h.getAppPath(),".vite/renderer/main_window/index.html"),y.join(h.getAppPath(),"dist/index.html"),y.join(__dirname,"index.html"),y.join(h.getAppPath(),"index.html")];for(const e of t)if(d.existsSync(e)){$.loadFile(e,{hash:"settings"});break}}$.on("closed",()=>{$=null})}function W(){if(!Y||Y.isDestroyed())return;const t=h.getLoginItemSettings().openAtLogin,e=je.buildFromTemplate([{label:"Start with Windows",type:"checkbox",checked:t,click:n=>{try{h.setLoginItemSettings({openAtLogin:n.checked,path:h.getPath("exe")})}catch{}W()}},{label:"Mascot Mode",type:"checkbox",checked:U,click:n=>{U=n.checked,Ne(U),s&&!s.isDestroyed()&&s.webContents.send("settings:mascot-mode-changed",U),W()}},{label:"Minimal Notch",type:"checkbox",checked:b,click:n=>{b=n.checked,re(b),s&&!s.isDestroyed()&&s.webContents.send("settings:minimal-notch-changed",b),W()}},{type:"separator"},{label:"Settings...",click:()=>{Ae()}},{type:"separator"},{label:"Exit",click:()=>{h.quit()}}]);Y.setContextMenu(e)}let Ce=!1,E=null,ft=null;function mt(){if(process.platform==="win32")try{const t=require("koffi"),e=t.load("user32.dll"),n=t.load("gdi32.dll"),r=t.struct("RECT",{left:"long",top:"long",right:"long",bottom:"long"});E={GetForegroundWindow:e.func("GetForegroundWindow","intptr_t",[]),IsZoomed:e.func("IsZoomed","bool",["intptr_t"]),GetWindowRect:e.func("GetWindowRect","bool",["intptr_t",t.out(t.pointer(r))]),GetClassNameA:e.func("GetClassNameA","int",["intptr_t",t.out(t.pointer("char")),"int"]),GetWindowTextA:e.func("GetWindowTextA","int",["intptr_t",t.out(t.pointer("char")),"int"]),GetDC:e.func("GetDC","intptr_t",["intptr_t"]),ReleaseDC:e.func("ReleaseDC","int",["intptr_t","intptr_t"]),GetKeyState:e.func("GetKeyState","int16_t",["int"])},ft={GetPixel:n.func("GetPixel","uint32_t",["intptr_t","int","int"])}}catch(t){l("[Obstruction] Koffi user32/gdi32 init failed, falling back:",t)}}function yt(){process.platform==="win32"&&(mt(),setInterval(()=>{if(!s||s.isDestroyed())return;let t=!1;if(E)try{const e=E.GetForegroundWindow();if(e&&e!==0){const n=Buffer.alloc(256);E.GetClassNameA(e,n,256);const r=n.toString("utf8").replace(/\0.*$/,"").trim(),o=r==="Progman"||r==="WorkerW"||r==="Shell_TrayWnd"||r==="Shell_SecondaryTrayWnd";let a=!1;try{const c=s.getNativeWindowHandle();c.readBigInt64LE&&c.readBigInt64LE(0)===BigInt(e)&&(a=!0)}catch{}try{if($&&!$.isDestroyed()){const c=$.getNativeWindowHandle();c.readBigInt64LE&&c.readBigInt64LE(0)===BigInt(e)&&(a=!0)}}catch{}if(!o&&!a){const c={};E.GetWindowRect(e,c);const m=E.IsZoomed(e),u=G.getPrimaryDisplay(),p=u.bounds.width,f=u.bounds.height,v=(c.right||0)-(c.left||0),w=(c.bottom||0)-(c.top||0);c.left<=0&&c.top<=0&&c.right>=p&&c.bottom>=f&&!m?t=!0:m||c.top<=8&&v>=p*.9?Z&&(t=!0):t=!1}}}catch{}t!==Ce&&(Ce=t,s&&!s.isDestroyed()&&s.webContents.send("desktop:obstruction-status",{isObstructed:t}))},250))}h.whenReady().then(()=>{h.setAppUserModelId("com.neosparkx.quickpill"),Ee(),Ie(),At(),vt(),yt(),St(),$e(),k().getCatalog().catch(t=>l("Failed to warm launcher catalog:",t)),h.on("activate",()=>{ge.getAllWindows().length===0&&Ie()});try{let t=ie(),e=H.createFromPath(t);e.isEmpty()&&(t=ie("png"),e=H.createFromPath(t));const n=e.isEmpty()?t:e.resize({width:16,height:16});Y=new Le(n),Y.setToolTip("Quick Pill"),W()}catch(t){console.error("Failed to create tray:",t)}G.on("display-metrics-changed",()=>{T()}),G.on("display-added",()=>{T()}),G.on("display-removed",()=>{T()}),pe&&(pe.on("resume",()=>{s&&!s.isDestroyed()&&s.webContents.send("system-resume");try{typeof g<"u"&&(g!=null&&g.registry)&&g.registry.checkSnoozedDue()}catch{}setTimeout(T,500),setTimeout(T,2e3)}),pe.on("unlock-screen",()=>{s&&!s.isDestroyed()&&s.webContents.send("system-resume");try{typeof g<"u"&&(g!=null&&g.registry)&&g.registry.checkSnoozedDue()}catch{}setTimeout(T,500),setTimeout(T,2e3)})),setInterval(()=>{if(_&&s&&!s.isDestroyed()&&s.isVisible())if(!s.isAlwaysOnTop())T();else try{s.moveTop()}catch{}},2500),setTimeout(()=>{P.checkForUpdates().catch(t=>{l("Auto-update check on startup error:",t)})},4e3),setInterval(()=>{P.checkForUpdates().catch(t=>{l("Periodic background update check error:",t)})},2*60*60*1e3)});const _e=y.join(h.getPath("userData"),"get-media.ps1"),wt=`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
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
`,De=y.join(h.getPath("userData"),"control-media.ps1"),gt=`param([string]$command = "playpause", [double]$seekSeconds = 0)

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
`;try{d.writeFileSync(_e,wt,"utf8")}catch(t){console.error("Failed to write get-media.ps1 script:",t)}try{d.writeFileSync(De,gt,"utf8")}catch(t){console.error("Failed to write control-media.ps1 script:",t)}let fe=!1;i.handle("get-system-media",async()=>fe?null:(fe=!0,new Promise(t=>{const e=n=>{fe=!1,t(n)};oe("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-File",_e],{maxBuffer:10*1024*1024,encoding:"utf8"},(n,r)=>{if(n||!r||r.trim()==="null"||r.trim()==="'null'"){L(`powershell -NoProfile -Command "Get-Process | Where-Object {$_.ProcessName -eq 'Spotify'} | Select-Object MainWindowTitle"`,{encoding:"utf8"},(o,a)=>{var m;if(o||!a)return e(null);const c=(m=a.split(`
`).find(u=>u.includes("-")))==null?void 0:m.trim();if(c){const u=c.split(" - ");let p="Unknown",f=c;u.length>1&&(p=u[0].trim(),f=u.slice(1).join(" - ").trim()),e({name:f||c,artist:p||"Unknown",state:"playing",source:"Spotify",position:0,duration:0})}else e(null)});return}try{const o=JSON.parse(r.trim());if(!o||!o.Title&&!o.Artist)return e(null);e({name:o.Title||"Unknown Title",artist:o.Artist||"Unknown Artist",album:o.Album||"",artwork_url:o.Artwork||null,state:o.Status==="playing"?"playing":"paused",source:o.Source||"System",position:Number(o.Position)||0,duration:Number(o.Duration)||0})}catch{e(null)}})})));i.handle("get-bluetooth-status",async()=>new Promise(t=>{const n=Buffer.from(`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$devs = @(Get-PnpDevice -Class Bluetooth -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'OK' -and $_.Present -eq $true -and $_.InstanceId -match 'BTHENUM' })
$names = @($devs | ForEach-Object { $_.FriendlyName })
@{ connected = ($devs.Count -gt 0); devices = $names } | ConvertTo-Json -Compress
`,"utf16le").toString("base64");L(`powershell -NoProfile -EncodedCommand ${n}`,(r,o)=>{if(r||!o)return t({connected:!1,devices:[]});try{const a=JSON.parse(o.trim());t({connected:!!a.connected,devices:Array.isArray(a.devices)?a.devices:a.devices?[a.devices]:[]})}catch{t({connected:!1,devices:[]})}})}));i.handle("get-camera-status",async()=>new Promise(t=>{oe("reg",["query","HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam","/s"],(e,n)=>{if(e||!n)return t(!1);const r=n.match(/LastUsedTimeStop\s+REG_QWORD\s+0x0\b/i);t(!!r)})}));i.handle("get-microphone-status",async()=>new Promise(t=>{oe("reg",["query","HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone","/s"],(e,n)=>{if(e||!n)return t(!1);const r=n.match(/LastUsedTimeStop\s+REG_QWORD\s+0x0\b/i);t(!!r)})}));h.on("window-all-closed",()=>{Y||h.quit()});i.handle("control-system-media",async(t,e,...n)=>{const r=typeof n[0]=="number"?n[0]:0;l(`Executing media control: ${e} ${r>0?`(seek: ${r}s)`:""}`),oe("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-File",De,"-command",e,"-seekSeconds",r.toString()],{timeout:4e3},o=>{o&&l("Media control error:",o)})});let te=null;function $t(){const t=we.cpus();if(!t||t.length===0)return 0;if(!te||te.length!==t.length)return te=t,0;let e=0,n=0;for(let o=0;o<t.length;o++){const a=t[o],c=te[o];let m=a.times.idle-c.times.idle,u=0;for(const p in a.times)u+=a.times[p]-c.times[p];e+=m,n+=u}if(te=t,n===0)return 0;const r=e/n;return Math.max(0,Math.min(100,Math.round((1-r)*100)))}function bt(){const t=we.totalmem(),e=we.freemem();return t?Math.max(0,Math.min(100,Math.round((t-e)/t*100))):0}i.handle("get-system-metrics",async()=>({cpu:$t(),ram:bt()}));let q=[],V="";function St(){try{const t=D.readText().trim();t&&(V=t,q.push({id:"clip-"+Date.now(),text:t,timestamp:Date.now()}))}catch{}setInterval(()=>{try{const t=D.readText().trim();t&&t!==V&&(V=t,q=[{id:"clip-"+Date.now()+"-"+Math.random().toString(36).slice(2,6),text:t,timestamp:Date.now()},...q.filter(n=>n.text!==t)].slice(0,15),s&&!s.isDestroyed()&&s.webContents.send("clipboard:update",q))}catch{}},600)}i.handle("clipboard:get-history",()=>q);i.on("clipboard:write",(t,e)=>{try{e&&(V=String(e).trim(),D.writeText(String(e)))}catch{}});i.on("clipboard:clear",()=>{try{q=[],V="",D.clear(),s&&!s.isDestroyed()&&s.webContents.send("clipboard:update",[])}catch{}});i.handle("get-clipboard-text",async()=>{try{return D.readText()}catch{return""}});i.handle("write-clipboard-text",async(t,e)=>{try{return e?(V=String(e).trim(),D.writeText(String(e))):D.clear(),!0}catch{return!1}});i.handle("clear-clipboard",async()=>{try{return q=[],V="",D.clear(),s&&!s.isDestroyed()&&s.webContents.send("clipboard:update",[]),!0}catch{return!1}});i.handle("control-system-volume",async(t,e)=>{if(process.platform==="win32"){let n="0xAF";e==="down"&&(n="0xAE"),e==="mute"&&(n="0xAD");const r=`
$type = '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);'
$MediaKey = Add-Type -MemberDefinition $type -Name "WinVolKey" -Namespace "WinAPI" -PassThru
$MediaKey::keybd_event(${n}, 0, 0, [UIntPtr]::Zero)
$MediaKey::keybd_event(${n}, 0, 2, [UIntPtr]::Zero)
`,o=de(r);return L(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${o}`,a=>{a&&l("Volume control error:",a)}),!0}return!1});let me=null;function At(){process.platform==="win32"&&setInterval(()=>{if(!(!s||s.isDestroyed()))try{if(E&&E.GetKeyState){const t=(E.GetKeyState(144)&1)!==0;me!==null&&t!==me&&s.webContents.send("key-lock-change",{key:"NumLock",state:t}),me=t}}catch{}},150)}let ae=null;function vt(){if(process.platform!=="win32")return;let t=!1;setInterval(()=>{!s||s.isDestroyed()||t||(t=!0,L("wmic logicaldisk where drivetype=2 get name,volumename /format:csv",(e,n)=>{var a,c;if(t=!1,e)return;const r=new Map,o=n.trim().split(/\r?\n/).filter(m=>m.trim()&&!m.startsWith("Node"));for(const m of o){const u=m.trim().split(",");if(u.length>=3){const p=(a=u[1])==null?void 0:a.trim(),f=((c=u[2])==null?void 0:c.trim())||"USB Drive";p&&r.set(p,f)}}if(ae!==null&&s&&!s.isDestroyed()){for(const[m,u]of r)ae.has(m)||s.webContents.send("usb-change",{action:"connected",drive:m,name:u});for(const[m]of ae)r.has(m)||s.webContents.send("usb-change",{action:"disconnected",drive:m,name:"USB Drive"})}ae=r}))},5e3)}const Me=y.join(h.getPath("userData"),"get-notifications.ps1"),Tt=`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
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
`;try{d.writeFileSync(Me,Tt,"utf8")}catch(t){l("Failed to write get-notifications.ps1:",t)}function Pt(){try{const t=y.join(h.getPath("userData"),"notifications-store.json");if(d.existsSync(t))return JSON.parse(d.readFileSync(t,"utf8"))}catch(t){l("Failed to load notifications-store.json:",t)}return null}function kt(t){try{const e=y.join(h.getPath("userData"),"notifications-store.json");d.writeFileSync(e,JSON.stringify(t,null,2),"utf8")}catch(e){l("Failed to save notifications-store.json:",e)}}async function xt(t){return process.platform!=="win32"||!t?!1:new Promise(e=>{const n=`
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
`,r=de(n);L(`powershell -NoProfile -EncodedCommand ${r}`,(o,a)=>{e((a==null?void 0:a.trim())==="true")})})}async function It(){return process.platform!=="win32"?!1:new Promise(t=>{const n=de(`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
try {
    $listener = [Windows.UI.Notifications.Management.UserNotificationListener, Windows.UI.Notifications, ContentType = WindowsRuntime]::Current
    $listener.ClearNotifications()
    Write-Output "true"
} catch { Write-Output "false" }
`);L(`powershell -NoProfile -EncodedCommand ${n}`,(r,o)=>{t((o==null?void 0:o.trim())==="true")})})}async function Re(t,e){if(process.platform!=="win32"||!t&&!e)return!1;const n=(t||"").trim(),r=(e||"").trim();if(l(`focusNotificationApp: appId="${n}", appName="${r}"`),n&&(n.includes("!")||n.toLowerCase().startsWith("shell:appsfolder\\")))try{const a=n.toLowerCase().startsWith("shell:appsfolder\\")?n:`shell:AppsFolder\\${n}`,c=be("explorer.exe",[a],{detached:!0,stdio:"ignore"});return c&&typeof c.unref=="function"&&c.unref(),!0}catch(a){l("UWP explorer.exe launch failed:",a)}try{const a=typeof k=="function"?k():null;if(a){if(r){const c=await a.launchApp(r);if(c&&c.success)return!0}if(n&&n!==r){const c=await a.launchApp(n);if(c&&c.success)return!0}if(typeof a.getRunningWindows=="function"&&typeof a.activateWindow=="function"){const c=await a.getRunningWindows({forceRefresh:!0}),m=[r,n].filter(Boolean).map(p=>p.toLowerCase()),u=c.find(p=>{if(!p)return!1;const f=(p.processName||"").toLowerCase(),v=(p.title||"").toLowerCase();return m.some(w=>f===w||f.includes(w)||w.includes(f)||v.toLowerCase().includes(w))});if(u&&u.hWnd){const p=await a.activateWindow(u.hWnd);if(p&&p.success)return!0}}}}catch(a){l("LauncherEngine resolution in focusNotificationApp failed:",a)}const o=`${r} ${n}`.toLowerCase();try{if(o.includes("whatsapp"))return await O.openExternal("whatsapp://"),!0;if(o.includes("spotify"))return await O.openExternal("spotify://"),!0;if(o.includes("telegram"))return await O.openExternal("tg://"),!0;if(o.includes("discord"))return await O.openExternal("discord://"),!0;if(o.includes("slack"))return await O.openExternal("slack://"),!0}catch(a){l("URI protocol fallback failed:",a)}return new Promise(a=>{const c=new Set;[r,n].forEach(w=>{w&&(c.add(w),w.split(/\s+/).forEach(S=>{S.length>2&&c.add(S)}),w.split(/[._!\\\/]/).filter(S=>S.length>2&&!/^[0-9A-Fa-f]{8,}$/.test(S)).forEach(S=>c.add(S)))});const m=Array.from(c).filter(w=>w&&w.length>=2),u=m.length>0?m.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|"):(r||n).replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),p=n.replace(/'/g,"''"),f=`
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
$pattern = '(?i)(${u})'

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

if (-not $matched -and '${p}') {
    try {
        Start-Process "explorer.exe" "shell:AppsFolder\\${p}"
        $matched = $true
    } catch {}
}

if ($matched) { Write-Output "true" } else { Write-Output "false" }
`,v=de(f);L(`powershell -NoProfile -EncodedCommand ${v}`,(w,I)=>{a((I==null?void 0:I.trim())==="true")})})}const g=Ve({savePersistence:kt,initialPersistedData:Pt(),removeNotificationSource:xt,focusApp:Re,openExternal:async t=>O.openExternal(t)});g.registry.on("change",t=>{if(s&&!s.isDestroyed()){s.webContents.send("notification:update",t);try{s.webContents.invalidate()}catch{}}});setInterval(()=>{try{g.registry.checkSnoozedDue()}catch{}},1e4);let ye=!1;async function Fe(){return process.platform!=="win32"?[]:ye?[]:(ye=!0,new Promise(t=>{oe("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-File",Me],{maxBuffer:5*1024*1024,encoding:"utf8",timeout:1e4},(e,n)=>{if(ye=!1,e||!n)return t([]);try{const r=JSON.parse(n.trim()),o=Array.isArray(r)?r:r?[r]:[];g.syncNotifications(o,"windows-notification-listener"),t(o)}catch{t([])}})}))}i.handle("get-notifications",async()=>await Fe());i.handle("dismiss-notification",async(t,e)=>{const n=await g.dismiss(e);return!!(n!=null&&n.success)});i.handle("focus-notification-app",async(t,e,n)=>await Re(e,n));i.handle("notification:get-snapshot",()=>g.getSnapshot());i.handle("notification:sync-now",async()=>(await Fe(),g.getSnapshot()));i.handle("notification:execute-action",async(t,e,n,r)=>await g.executeAction(e,n,r));i.handle("notification:snooze",(t,e,n,r)=>g.snooze(e,n,r));i.handle("notification:cancel-snooze",(t,e)=>g.cancelSnooze(e));i.handle("notification:dismiss",async(t,e)=>await g.dismiss(e));i.handle("notification:dismiss-group",(t,e)=>g.dismissGroup(e));i.handle("notification:clear-all",async()=>{try{await It()}catch{}return g.clearAllActive()});i.handle("notification:undo-dismiss",(t,e)=>g.undoDismiss(e));i.handle("notification:mark-reviewed",(t,e)=>g.markReviewed(e));i.handle("notification:mark-all-reviewed",()=>g.markAllReviewed());i.handle("notification:set-hide-previews",(t,e)=>(g.setHidePreviews(e),!0));i.handle("notification:set-app-excluded",(t,e,n)=>(g.setAppExcluded(e,n),!0));i.handle("notification:clear-history",()=>(g.clearHistory(),!0));i.handle("window:invalidate",()=>{if(s&&!s.isDestroyed())try{s.webContents.invalidate()}catch{}return!0});function Ct(){const t=[y.join(process.resourcesPath,"audio-helper.exe"),y.join(process.resourcesPath,"native","bin","audio-helper.exe"),y.join(process.resourcesPath,"native","audio-helper.exe"),y.join(h.getAppPath(),"native","bin","audio-helper.exe"),y.join(__dirname,"..","native","bin","audio-helper.exe"),y.join(__dirname,"native","bin","audio-helper.exe"),y.join(process.cwd(),"native","bin","audio-helper.exe")];for(const e of t)try{if(d.existsSync(e))return e}catch{}return null}class Nt{constructor(){this.child=null,this.reqId=0,this.pending=new Map,this.buffer="",this.isStopping=!1,this.restartAttempts=0,this.maxRestartAttempts=5,this.restartTimer=null}start(){if(process.platform!=="win32"||this.child&&!this.child.killed)return;const e=Ct();if(!e){l("[AudioMixer] audio-helper.exe not found in search paths.");return}try{this.child=be(e,[],{stdio:["pipe","pipe","pipe"],windowsHide:!0}),this.child.stdout.on("data",n=>{this.buffer+=n.toString("utf8");let r;for(;(r=this.buffer.indexOf(`
`))!==-1;){const o=this.buffer.slice(0,r).trim();this.buffer=this.buffer.slice(r+1),o&&this.handleLine(o)}}),this.child.stderr.on("data",n=>{l(`[AudioMixer stderr] ${n.toString("utf8").trim()}`)}),this.child.on("error",n=>{l("[AudioMixer process error]",n)}),this.child.on("close",n=>{l(`[AudioMixer] Process exited with code ${n}`),this.child=null;for(const[r,o]of this.pending.entries())clearTimeout(o.timer),o.reject(new Error("Audio helper process exited"));if(this.pending.clear(),!this.isStopping&&this.restartAttempts<this.maxRestartAttempts){this.restartAttempts++;const r=Math.min(1e3*Math.pow(2,this.restartAttempts),1e4);this.restartTimer=setTimeout(()=>{l(`[AudioMixer] Restarting audio-helper (attempt ${this.restartAttempts})...`),this.start()},r)}}),l(`[AudioMixer] Successfully spawned audio-helper from ${e}`),this.restartAttempts=0}catch(n){l("[AudioMixer] Failed to spawn audio-helper:",n)}}handleLine(e){try{const n=JSON.parse(e);if(typeof n.id=="number"&&this.pending.has(n.id)){const{resolve:r,reject:o,timer:a}=this.pending.get(n.id);clearTimeout(a),this.pending.delete(n.id),n.success?r(n.data):o(new Error(n.error||"Unknown audio helper error"))}}catch(n){l(`[AudioMixer] Failed to parse stdout line: ${e}`,n)}}send(e,n={},r=5e3){return new Promise((o,a)=>{if((!this.child||!this.child.stdin||this.child.killed)&&(this.start(),!this.child||!this.child.stdin))return a(new Error("Audio helper is not running"));const c=++this.reqId,m={id:c,cmd:e,...n},u=setTimeout(()=>{this.pending.has(c)&&(this.pending.delete(c),a(new Error(`Command '${e}' timed out after ${r}ms`)))},r);this.pending.set(c,{resolve:o,reject:a,timer:u});try{this.child.stdin.write(JSON.stringify(m)+`
`)}catch(p){clearTimeout(u),this.pending.delete(c),a(p)}})}stop(){if(this.isStopping=!0,this.restartTimer&&(clearTimeout(this.restartTimer),this.restartTimer=null),this.child){try{this.child.stdin&&!this.child.stdin.destroyed&&(this.child.stdin.on("error",()=>{}),this.child.stdin.write(JSON.stringify({id:0,cmd:"shutdown"})+`
`))}catch{}setTimeout(()=>{if(this.child){try{this.child.kill()}catch{}this.child=null}},400)}}}const M=new Nt;h.whenReady().then(()=>{M.start()});h.on("will-quit",()=>{M.stop();try{Q.unregisterAll()}catch{}if(J)try{J.destroy()}catch{}});h.on("before-quit",()=>{M.stop();try{Q.unregisterAll()}catch{}if(J)try{J.destroy()}catch{}});i.handle("audio-mixer:get-devices",async()=>{if(process.platform!=="win32")return{devices:[],defaultDeviceId:""};try{return await M.send("listDevices")}catch(t){return l("[audio-mixer:get-devices error]",t),{devices:[],defaultDeviceId:"",error:t.message}}});i.handle("audio-mixer:get-sessions",async(t,e)=>{if(process.platform!=="win32")return{sessions:[]};try{return await M.send("listSessions",{deviceId:e})}catch(n){return l("[audio-mixer:get-sessions error]",n),{sessions:[],error:n.message}}});i.handle("audio-mixer:set-volume",async(t,e={})=>{if(process.platform!=="win32")return!1;try{return await M.send("setSessionVolume",e)}catch(n){return l("[audio-mixer:set-volume error]",n),!1}});i.handle("audio-mixer:set-mute",async(t,e={})=>{if(process.platform!=="win32")return!1;try{return await M.send("setSessionMute",e)}catch(n){return l("[audio-mixer:set-mute error]",n),!1}});i.handle("audio-mixer:set-master-volume",async(t,e={})=>{if(process.platform!=="win32")return!1;try{return await M.send("setMasterVolume",e)}catch(n){return l("[audio-mixer:set-master-volume error]",n),!1}});i.handle("audio-mixer:set-master-mute",async(t,e={})=>{if(process.platform!=="win32")return!1;try{return await M.send("setMasterMute",e)}catch(n){return l("[audio-mixer:set-master-mute error]",n),!1}});
