"use strict";const{app:h,BrowserWindow:he,screen:F,ipcMain:o,shell:O,dialog:Ee,Tray:Me,Menu:De,nativeImage:ge,clipboard:X,powerMonitor:ae,globalShortcut:Z}=require("electron");h.commandLine.appendSwitch("disable-background-timer-throttling");h.commandLine.appendSwitch("disable-backgrounding-occluded-windows");h.commandLine.appendSwitch("disable-renderer-backgrounding");const y=require("node:path"),d=require("fs"),pe=require("os"),$e=require("https"),be=require("http"),Re=require("crypto"),{EventEmitter:Fe}=require("events");function ne(t){const e=[y.join(__dirname,t),y.join(__dirname,"../../src",t),y.join(typeof h<"u"&&h.getAppPath?h.getAppPath():process.cwd(),"src",t),y.join(typeof h<"u"&&h.getAppPath?h.getAppPath():process.cwd(),".vite/build",t),y.join(process.cwd(),"src",t)];for(const n of e)try{if(d.existsSync(n)||d.existsSync(n+".js")||d.existsSync(y.join(n,"index.js")))return require(n)}catch{}return require(t)}const{createProgressEngine:Ue}=ne("services/progress"),{createNotificationEngine:Ge,NOTIFICATION_ACTION_TYPES:St}=ne("services/notifications"),{createLauncherEngine:je}=ne("services/launcher"),{createNotesEngine:Le}=ne("services/notes");let q=null,s=null,E=!0;function I(){try{return y.join(h.getPath("userData"),"settings.json")}catch{return y.join(process.cwd(),"settings.json")}}function qe(){try{const t=I();if(d.existsSync(t)){const e=JSON.parse(d.readFileSync(t,"utf8"));if(typeof e.alwaysOnTop=="boolean")return e.alwaysOnTop}}catch{}return!0}function Be(t){try{const e=I();let n={};if(d.existsSync(e))try{n=JSON.parse(d.readFileSync(e,"utf8"))}catch{}n.alwaysOnTop=t,d.writeFileSync(e,JSON.stringify(n,null,2),"utf8")}catch{}}function Je(){try{const t=I();if(d.existsSync(t)){const e=JSON.parse(d.readFileSync(t,"utf8"));if(typeof e.autoDownloadInstall=="boolean")return e.autoDownloadInstall}}catch{}return!0}function Ve(t,e){try{const n=I();let r={};if(d.existsSync(n))try{r=JSON.parse(d.readFileSync(n,"utf8"))}catch{}r[t]=e,d.writeFileSync(n,JSON.stringify(r,null,2),"utf8")}catch{}}function He(){try{const t=I();if(d.existsSync(t)){const e=JSON.parse(d.readFileSync(t,"utf8"));if(typeof e.mascotMode=="boolean")return e.mascotMode}}catch{}return!0}function Ae(t){try{const e=I();let n={};if(d.existsSync(e))try{n=JSON.parse(d.readFileSync(e,"utf8"))}catch{}n.mascotMode=t,d.writeFileSync(e,JSON.stringify(n,null,2),"utf8")}catch{}}function Ke(){try{const t=I();if(d.existsSync(t)){const e=JSON.parse(d.readFileSync(t,"utf8"));if(typeof e.minimalNotch=="boolean")return e.minimalNotch}}catch{}return!1}function se(t){try{const e=I();let n={};if(d.existsSync(e))try{n=JSON.parse(d.readFileSync(e,"utf8"))}catch{}n.minimalNotch=t,d.writeFileSync(e,JSON.stringify(n,null,2),"utf8")}catch{}}function ze(){try{const t=I();if(d.existsSync(t)){const e=JSON.parse(d.readFileSync(t,"utf8"));if(typeof e.privacyDots=="boolean")return e.privacyDots}}catch{}return!1}function Qe(t){try{const e=I();let n={};if(d.existsSync(e))try{n=JSON.parse(d.readFileSync(e,"utf8"))}catch{}n.privacyDots=t,d.writeFileSync(e,JSON.stringify(n,null,2),"utf8")}catch{}}let R=He(),T=Ke(),z=ze();E=qe();function Ze(){try{const t=I();if(d.existsSync(t)){const e=JSON.parse(d.readFileSync(t,"utf8"));if(Array.isArray(e.hiddenTabs))return e.hiddenTabs}}catch{}return[6]}function Xe(t){try{const e=I();let n={};if(d.existsSync(e))try{n=JSON.parse(d.readFileSync(e,"utf8"))}catch{}n.hiddenTabs=t,d.writeFileSync(e,JSON.stringify(n,null,2),"utf8")}catch{}}let Q=Ze();function v(){if(E&&!(!s||s.isDestroyed())){try{s.setAlwaysOnTop(!0,"screen-saver",1)}catch{try{s.setAlwaysOnTop(!0,"screen-saver")}catch{try{s.setAlwaysOnTop(!0)}catch{}}}try{s.moveTop()}catch{}}}function Ye(t){if(E=!!t,Be(E),s&&!s.isDestroyed()){try{E?v():s.setAlwaysOnTop(!1)}catch{}try{s.webContents.send("always-on-top-changed",E)}catch{}}M()}function et(){try{return y.join(h.getPath("userData"),"quick-pill.log")}catch{return y.join(process.cwd(),"quick-pill.log")}}function l(t,e=null){const r=`[${new Date().toISOString()}] ${t}${e?` | Error: ${e.stack||e}`:""}
`;console.log(r.trim());try{const i=et();d.appendFileSync(i,r,"utf8")}catch{}}process.on("uncaughtException",t=>{l("UNCAUGHT EXCEPTION (Main Process)",t)});process.on("unhandledRejection",t=>{l("UNHANDLED REJECTION (Main Process)",t)});const B={0:"Alt+B",1:"Alt+W",2:"Alt+O",11:"Alt+H",12:"Alt+A",13:"Alt+P",14:"Alt+L",15:"Alt+Q",3:"Alt+M",4:"Alt+C",5:"Alt+N",6:"Alt+G",7:"Alt+V",8:"Alt+T",10:"Alt+R"};let ee=[];function Pe(){try{const t=I();if(d.existsSync(t)){const e=JSON.parse(d.readFileSync(t,"utf8"));if(e&&typeof e.tabShortcuts=="object"&&e.tabShortcuts!==null)return{...B,...e.tabShortcuts}}}catch{}return{...B}}function ke(t){try{const e=I();let n={};if(d.existsSync(e))try{n=JSON.parse(d.readFileSync(e,"utf8"))}catch{}return n.tabShortcuts=t,d.writeFileSync(e,JSON.stringify(n,null,2),"utf8"),!0}catch(e){return l("Failed to save tabShortcuts preference:",e),!1}}function tt(t){if(Number(t)===9){ye();return}if(!(!s||s.isDestroyed()))try{s.isVisible()||s.show(),v(),s.focus(),s.webContents.send("open-tab-instant",Number(t))}catch(e){l(`Failed to openTabInstant for tab ${t}:`,e)}}function fe(t){for(const n of ee)try{Z.unregister(n)}catch{}ee=[];const e=t||Pe();for(const[n,r]of Object.entries(e)){if(!r||typeof r!="string"||!r.trim())continue;const i=r.trim();if(i.toUpperCase().includes("CTRL")||i.toUpperCase().includes("CONTROL")){l(`Refusing to register shortcut with Ctrl: ${i}`);continue}try{Z.register(i,()=>{tt(parseInt(n,10))})?ee.push(i):l(`Global shortcut conflict/in-use for ${i} (tab ${n})`)}catch(a){l(`Error registering global shortcut ${i}:`,a)}}try{Z.register("Alt+Shift+M",()=>{T=!T,se(T),s&&!s.isDestroyed()&&s.webContents.send("settings:minimal-notch-changed",T),M()})&&ee.push("Alt+Shift+M")}catch(n){l("Error registering global shortcut Alt+Shift+M:",n)}}const{exec:U,execFile:Y,spawn:me}=require("child_process");function re(t){return Buffer.from(t,"utf16le").toString("base64")}o.handle("log-message",(t,e,n,r)=>{l(`[RENDERER ${String(e).toUpperCase()}] ${n} ${r?JSON.stringify(r):""}`)});o.handle("log-renderer-error",(t,e)=>{l(`[RENDERER ERROR] Unhandled Renderer Exception ${JSON.stringify(e)}`)});let Se=null;o.handle("set-ignore-mouse-events",(t,e,n)=>{if(s&&!s.isDestroyed())try{if(Se===e)return;if(Se=e,e){const r=n!==void 0?n:!0;s.setIgnoreMouseEvents(!0,{forward:r})}else s.setIgnoreMouseEvents(!1),v()}catch{try{s.setIgnoreMouseEvents(!0,{forward:!0})}catch{}}});o.handle("get-always-on-top",()=>E);o.handle("set-always-on-top",(t,e)=>(Ye(e),E));o.handle("focus-window",()=>{s&&!s.isDestroyed()&&(v(),s.focus())});o.handle("open-external",async(t,e)=>{await O.openExternal(e)});o.handle("get-mascot-mode",()=>R);o.handle("set-mascot-mode",(t,e)=>(R=!!e,Ae(R),M(),R));o.handle("get-minimal-notch",()=>T);o.handle("set-minimal-notch",(t,e)=>(T=!!e,se(T),s&&!s.isDestroyed()&&s.webContents.send("settings:minimal-notch-changed",T),M(),T));o.handle("toggle-minimal-notch",()=>(T=!T,se(T),s&&!s.isDestroyed()&&s.webContents.send("settings:minimal-notch-changed",T),M(),T));o.handle("get-hidden-tabs",()=>Q);o.handle("set-hidden-tabs",(t,e)=>(Array.isArray(e)&&(Q=e,Xe(Q),s&&!s.isDestroyed()&&s.webContents.send("settings:hidden-tabs-changed",Q)),Q));o.handle("get-privacy-dots",()=>z);o.handle("set-privacy-dots",(t,e)=>(z=!!e,Qe(z),s&&!s.isDestroyed()&&s.webContents.send("settings:privacy-dots-changed",z),z));o.handle("open-settings-window",()=>(ye(),!0));o.on("settings-window:minimize",()=>{k&&!k.isDestroyed()&&k.minimize()});o.on("settings-window:close",()=>{k&&!k.isDestroyed()&&k.close()});o.on("ondragstart",(t,e)=>{try{e&&d.existsSync(e)&&t.sender.startDrag({file:e,icon:J("png")})}catch(n){l("ondragstart error:",n)}});o.handle("start-drag",(t,e)=>{try{if(e&&d.existsSync(e))return t.sender.startDrag({file:e,icon:J("png")}),!0}catch(n){l("start-drag error:",n)}return!1});let j=null;function P(){if(!j){let t="";try{t=h.getPath("userData")}catch{t=process.cwd()}j=je({userDataPath:t,shell:O,getFileIcon:(e,n)=>h.getFileIcon(e,n)})}return j}o.handle("launcher:search-apps",async(t,e,n)=>{try{return await P().searchApps(e,n)}catch(r){return l("Error in launcher:search-apps:",r),[]}});o.handle("launcher:get-catalog",async()=>{try{return await P().getCatalog()}catch(t){return l("Error in launcher:get-catalog:",t),[]}});o.handle("launcher:reindex-catalog",async()=>{try{return await P().reindexCatalog()}catch(t){return l("Error in launcher:reindex-catalog:",t),{success:!1,count:0}}});o.handle("launcher:launch-app",async(t,e)=>{try{return await P().launchApp(e)}catch(n){return l("Error in launcher:launch-app:",n),{success:!1,error:n.message}}});o.handle("launcher:get-running-windows",async(t,e)=>{try{return await P().getRunningWindows(e)}catch(n){return l("Error in launcher:get-running-windows:",n),[]}});o.handle("launcher:activate-window",async(t,e)=>{try{const n=await P().activateWindow(e);return n.success&&s&&!s.isDestroyed()&&s.webContents.send("launcher:window-activated",{hWnd:e}),n}catch(n){return l("Error in launcher:activate-window:",n),{success:!1,code:"FAILED",error:n.message}}});o.handle("launcher:get-favorites",async()=>{try{return await P().getFavorites()}catch(t){return l("Error in launcher:get-favorites:",t),[]}});o.handle("launcher:set-favorites",async(t,e)=>{try{return await P().setFavorites(e)}catch(n){return l("Error in launcher:set-favorites:",n),{success:!1}}});o.handle("workspaces:get-workspaces",async()=>{try{return await P().getWorkspaces()}catch(t){return l("Error in workspaces:get-workspaces:",t),[]}});o.handle("workspaces:save-workspace",async(t,e)=>{try{return await P().saveWorkspace(e)}catch(n){return l("Error in workspaces:save-workspace:",n),{success:!1,error:n.message}}});o.handle("workspaces:delete-workspace",async(t,e)=>{try{return await P().deleteWorkspace(e)}catch(n){return l("Error in workspaces:delete-workspace:",n),{success:!1,error:n.message}}});o.handle("workspaces:launch-workspace",async(t,e,n)=>{try{return await P().launchWorkspace(e,n)}catch(r){return l("Error in workspaces:launch-workspace:",r),{success:!1,results:[],error:r.message}}});let ce=null;function C(){if(!ce){let t="";try{t=h.getPath("userData")}catch{t=process.cwd()}ce=Le({userDataPath:t,clipboard:X})}return ce}o.handle("notes:get-notes",async(t,e,n)=>{try{return await C().getNotes(e,n)}catch(r){return l("Error in notes:get-notes:",r),[]}});o.handle("notes:save-note",async(t,e)=>{try{const n=await C().saveNote(e);return s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"save",note:n}),n}catch(n){return l("Error in notes:save-note:",n),{success:!1,error:n.message}}});o.handle("notes:delete-note",async(t,e)=>{try{const n=await C().deleteNote(e);return n.success&&s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"delete",id:e}),n}catch(n){return l("Error in notes:delete-note:",n),{success:!1,error:n.message}}});o.handle("notes:undo-delete",async()=>{try{const t=await C().undoDelete();return t.success&&s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"restore",note:t.note}),t}catch(t){return l("Error in notes:undo-delete:",t),{success:!1,error:t.message}}});o.handle("notes:toggle-pin",async(t,e)=>{try{const n=await C().togglePin(e);return n.success&&s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"togglePin",id:e,isPinned:n.isPinned}),n}catch(n){return l("Error in notes:toggle-pin:",n),{success:!1,error:n.message}}});o.handle("notes:toggle-archive",async(t,e)=>{try{const n=await C().toggleArchive(e);return n.success&&s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"toggleArchive",id:e,isArchived:n.isArchived}),n}catch(n){return l("Error in notes:toggle-archive:",n),{success:!1,error:n.message}}});o.handle("notes:save-draft",async(t,e)=>{try{return await C().saveDraft(e)}catch(n){return l("Error in notes:save-draft:",n),{success:!1,error:n.message}}});o.handle("notes:get-draft",async()=>{try{return await C().getDraft()}catch(t){return l("Error in notes:get-draft:",t),null}});o.handle("notes:clear-draft",async()=>{try{return await C().clearDraft()}catch(t){return l("Error in notes:clear-draft:",t),{success:!1,error:t.message}}});o.handle("notes:get-contextual-capture",async(t,e)=>{try{return await C().getContextualCapture(e)}catch(n){return l("Error in notes:get-contextual-capture:",n),{success:!1,code:"CAPTURE_ERROR",error:n.message}}});o.handle("notes:search-notes",async(t,e,n)=>{try{return await C().searchNotes(e,n)}catch(r){return l("Error in notes:search-notes:",r),[]}});o.handle("notes:get-tags",async()=>{try{return await C().getTags()}catch(t){return l("Error in notes:get-tags:",t),[]}});o.handle("notes:convert-to-task",async(t,e)=>{try{return await C().convertToTask(e)}catch(n){return l("Error in notes:convert-to-task:",n),{success:!1,error:n.message}}});o.handle("shortcuts:get-tab-shortcuts",()=>Pe());o.handle("shortcuts:set-tab-shortcuts",(t,e)=>{if(!e||typeof e!="object")return{success:!1,error:"Invalid shortcuts object"};const n={};for(const[i,a]of Object.entries(e))if(typeof a=="string"){const c=a.toUpperCase();if(c.includes("CTRL")||c.includes("CONTROL"))return{success:!1,error:"Ctrl cannot be used in tab shortcuts (reserved for Click-Through)"};n[i]=a.trim()}const r={...B,...n};return ke(r),fe(r),{success:!0,shortcuts:r}});o.handle("shortcuts:reset-tab-shortcuts",()=>(ke(B),fe(B),{success:!0,shortcuts:B}));o.handle("launch-app",async(t,e)=>await P().launchApp(e));o.handle("build-app-cache",async()=>await P().reindexCatalog());o.handle("search-apps",async(t,e)=>await P().searchApps(e));o.handle("get-displays",()=>F.getAllDisplays().map(e=>({id:e.id,label:e.label||`Display ${e.id}`,bounds:e.bounds})));o.handle("set-display",(t,e)=>{if(s&&!s.isDestroyed()){const r=F.getAllDisplays().find(u=>u.id.toString()===e.toString())||F.getPrimaryDisplay(),i=560,a=180,c=Math.round(r.bounds.x+(r.bounds.width-i)/2),m=r.bounds.y;s.setBounds({x:c,y:m,width:i,height:a}),s.show(),v()}});o.handle("update-window-position",(t,e,n)=>{});o.handle("set-auto-launch",(t,e)=>{try{h.setLoginItemSettings({openAtLogin:e,path:h.getPath("exe")}),e||xe()}catch(n){console.error("Failed to set login item settings on Windows:",n)}});function xe(){if(process.platform==="win32")try{const t=["electron.app.Ripple","electron.app.Electron","electron.app.Quick Pill","Ripple"];for(const e of t)U(`reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${e}" /f`,()=>{})}catch{}}const nt=["https://raw.githubusercontent.com/nabil24024004/Quick-Pill/main/web%20app/public/version.json","https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/version.json","https://raw.githubusercontent.com/nabil24024004/Ripple/main/web%20app/public/version.json"];class st extends Fe{constructor(){super(),this.manifestUrls=[...nt],this.currentVersion=h?h.getVersion():"5.5.1",this.status="idle",this.updateInfo=null,this.downloadedFilePath=null,this.currentDownloadRequest=null,this.lastProgressEmit=0;const e=Je();this.autoDownload=e,this.autoInstall=e}compareVersions(e,n){const r=(e||"0.0.0").replace(/^v/i,"").trim(),i=(n||"0.0.0").replace(/^v/i,"").trim(),[a,c]=r.split("-"),[m,u]=i.split("-"),p=a.split(".").map(w=>parseInt(w,10)||0),f=m.split(".").map(w=>parseInt(w,10)||0),S=Math.max(p.length,f.length);for(let w=0;w<S;w++){const x=p[w]||0,$=f[w]||0;if(x>$)return 1;if(x<$)return-1}return!c&&u?1:c&&!u?-1:c&&u?c.localeCompare(u):0}getPlatformKey(){return`win32-${process.arch}`}fetchJson(e,n=12e3,r=5){return new Promise((i,a)=>{if(r<=0)return a(new Error("Too many redirects while fetching update manifest."));const m=(e.startsWith("https")?$e:be).get(e,{headers:{"User-Agent":`QuickPill-Updater/${this.currentVersion} (${process.platform} ${process.arch})`,Accept:"application/json, text/plain, */*"},timeout:n},u=>{if(u.statusCode>=300&&u.statusCode<400&&u.headers.location){const f=new URL(u.headers.location,e).href;return this.fetchJson(f,n,r-1).then(i).catch(a)}if(u.statusCode!==200)return u.resume(),a(new Error(`Server returned HTTP ${u.statusCode}: ${u.statusMessage}`));let p="";u.setEncoding("utf8"),u.on("data",f=>{p+=f}),u.on("end",()=>{try{const f=JSON.parse(p);i(f)}catch(f){a(new Error(`Invalid JSON received from update manifest: ${f.message}`))}})});m.on("timeout",()=>{m.destroy(),a(new Error("Connection timed out while checking for updates."))}),m.on("error",u=>{a(u)})})}async checkForUpdates(){var e,n,r;if(this.status==="checking"||this.status==="downloading")return{status:this.status,updateInfo:this.updateInfo};this.status="checking",this.emit("checking");try{let i=null,a=null;for(const u of this.manifestUrls)try{const p=`${u}${u.includes("?")?"&":"?"}_t=${Date.now()}`,f=await this.fetchJson(p);if(f&&f.version){i=f;break}}catch(p){a=p}if(!i||!i.version)throw a||new Error('Update manifest is missing required "version" field.');const c=i.version;if(this.compareVersions(c,this.currentVersion)>0){const u=this.getPlatformKey(),p=((e=i.platforms)==null?void 0:e[u])||((n=i.platforms)==null?void 0:n[`${process.platform}-x64`])||((r=i.platforms)==null?void 0:r["win32-x64"]),f=(p==null?void 0:p.url)||"";return this.updateInfo={version:c,currentVersion:this.currentVersion,name:i.name||`Quick Pill v${c}`,releaseDate:i.releaseDate||"",mandatory:!!i.mandatory,changelog:Array.isArray(i.changelog)?i.changelog:[],downloadUrl:f,sha256:(p==null?void 0:p.sha256)||"",size:(p==null?void 0:p.size)||0,installerType:(p==null?void 0:p.installerType)||"nsis"},this.status="available",this.emit("update-available",this.updateInfo),this.autoDownload&&f&&(l(`[Auto-Updater] New update v${c} detected. Automatically downloading in background...`),setTimeout(()=>{this.startDownload().catch(S=>{l("[Auto-Updater] Automatic background download failed:",S)})},1e3)),{status:"available",updateInfo:this.updateInfo}}else{this.status="not-available";const u={currentVersion:this.currentVersion,latestVersion:c};return this.emit("update-not-available",u),{status:"not-available",updateInfo:u}}}catch(i){this.status="error";const a=i.message||"Unknown error occurred while checking for updates.";return this.emit("error",a),{status:"error",error:a}}}startDownload(){if(!this.updateInfo||!this.updateInfo.downloadUrl){const a=new Error("No update available or download URL is missing.");return this.emit("error",a.message),Promise.reject(a)}if(this.status==="downloading")return Promise.resolve({status:"downloading"});this.status="downloading",this.emit("download-started",this.updateInfo);const e=h.getPath("temp"),r=`quick-pill-update-v${this.updateInfo.version}.exe`,i=y.join(e,r);return new Promise((a,c)=>{if(d.existsSync(i))try{d.unlinkSync(i)}catch{}const m=d.createWriteStream(i);let u=0,p=this.updateInfo.size||0,f=0,S=Date.now(),w=0;const x=($,_=5)=>{if(_<=0){m.close();const b=new Error("Too many redirects while downloading update binary.");return this.status="error",this.emit("error",b.message),c(b)}const oe=($.startsWith("https")?$e:be).get($,{headers:{"User-Agent":`QuickPill-Updater/${this.currentVersion} (${process.platform} ${process.arch})`}},b=>{if(b.statusCode>=300&&b.statusCode<400&&b.headers.location){const N=new URL(b.headers.location,$).href;return x(N,_-1)}if(b.statusCode!==200){m.close();try{d.unlinkSync(i)}catch{}const N=new Error(`Download failed with status HTTP ${b.statusCode}: ${b.statusMessage}`);return this.status="error",this.emit("error",N.message),c(N)}const H=parseInt(b.headers["content-length"],10);!isNaN(H)&&H>0&&(p=H),b.on("data",N=>{u+=N.length,m.write(N);const L=Date.now();if(L-this.lastProgressEmit>=100||u===p){const we=(L-S)/1e3;we>=.5&&(w=Math.round((u-f)/we),f=u,S=L);const _e={percent:p>0?Math.min(100,Math.round(u/p*1e3)/10):0,transferredBytes:u,totalBytes:p,speedBytesPerSec:w};this.lastProgressEmit=L,this.emit("download-progress",_e)}}),b.on("end",()=>{m.end()}),b.on("error",N=>{m.close();try{d.unlinkSync(i)}catch{}this.status="error",this.emit("error",N.message),c(N)})});this.currentDownloadRequest=oe,oe.on("error",b=>{m.close();try{d.unlinkSync(i)}catch{}this.status="error",this.emit("error",b.message),c(b)})};m.on("finish",()=>{if(this.currentDownloadRequest=null,this.updateInfo.sha256&&this.updateInfo.sha256.trim()!=="")try{const _=Re.createHash("sha256"),ie=d.readFileSync(i);if(_.update(ie),_.digest("hex").toLowerCase()!==this.updateInfo.sha256.trim().toLowerCase()){try{d.unlinkSync(i)}catch{}const b=new Error("Integrity check failed (SHA-256 mismatch). The downloaded file might be corrupted.");return this.status="error",this.emit("error",b.message),c(b)}}catch(_){console.warn("Could not verify SHA-256 checksum:",_)}this.downloadedFilePath=i,this.status="downloaded";const $={version:this.updateInfo.version,filePath:i};this.emit("update-downloaded",$),a($),this.autoInstall&&(l(`[Auto-Updater] Update v${this.updateInfo.version} downloaded successfully. Automatically installing in background in 2 seconds...`),setTimeout(()=>{this.installAndRelaunch()},2e3))}),m.on("error",$=>{try{d.unlinkSync(i)}catch{}this.status="error",this.emit("error",$.message),c($)}),x(this.updateInfo.downloadUrl)})}cancelDownload(){if(this.currentDownloadRequest){try{this.currentDownloadRequest.destroy()}catch{}this.currentDownloadRequest=null}this.status="idle",this.emit("download-cancelled")}installAndRelaunch(){if(!this.downloadedFilePath||!d.existsSync(this.downloadedFilePath)){const n=new Error("No downloaded update file found to install.");return this.emit("error",n.message),!1}const e=this.downloadedFilePath;try{return me(e,["/S"],{detached:!0,stdio:"ignore"}).unref(),setTimeout(()=>{h?(h.isQuitting=!0,h.quit()):process.exit(0)},300),!0}catch(n){return this.emit("error",`Failed to launch installer: ${n.message}`),!1}}}const A=new st;function G(t,e){s&&!s.isDestroyed()&&s.webContents.send("update-event",{event:t,data:e})}A.on("checking",()=>G("checking"));A.on("update-available",t=>G("available",t));A.on("update-not-available",t=>G("not-available",t));A.on("download-started",t=>G("download-started",t));A.on("download-progress",t=>G("download-progress",t));A.on("update-downloaded",t=>G("downloaded",t));A.on("download-cancelled",()=>G("cancelled"));A.on("error",t=>G("error",t));o.handle("check-for-updates",async()=>await A.checkForUpdates());o.handle("start-update-download",async()=>await A.startDownload());o.handle("cancel-update-download",()=>(A.cancelDownload(),!0));o.handle("install-update",()=>A.installAndRelaunch());o.handle("get-app-version",()=>h.getVersion());o.handle("get-auto-download-install",()=>A.autoDownload&&A.autoInstall);o.handle("set-auto-download-install",(t,e)=>{const n=!!e;return A.autoDownload=n,A.autoInstall=n,Ve("autoDownloadInstall",n),n});const V=Ue({autoUpdater:A,openPath:async t=>{try{d.existsSync(t)&&(d.statSync(t).isDirectory()?await O.openPath(t):O.showItemInFolder(t))}catch(e){l("[progress openPath error]",e)}}});V.coordinator.on("update",t=>{s&&!s.isDestroyed()&&s.webContents.send("progress:update",t)});o.handle("progress:get-snapshot",()=>V.coordinator.getSnapshot());o.handle("progress:execute-action",async(t,e,n,r)=>await V.coordinator.executeAction(e,n,r));o.handle("progress:start-file-op",async(t,e)=>await V.fileOpsProvider.startCopy(e));o.handle("progress:start-hash-op",async(t,e)=>await V.fileOpsProvider.startHash(e));o.handle("progress:clear-history",()=>(V.registry.clearHistory(),!0));o.handle("progress:select-file",async()=>{if(!s)return null;const t=await Ee.showOpenDialog(s,{properties:["openFile"]});return t.canceled||!t.filePaths.length?null:t.filePaths[0]});const J=(t=null)=>{const e=t||"ico";try{const n=y.join(h.getAppPath(),`src/assets/icons/icon.${e}`);if(d.existsSync(n))return n}catch{}try{const n=y.join(process.resourcesPath,`icon.${e}`);if(d.existsSync(n))return n;const r=y.join(process.resourcesPath,`assets/icons/icon.${e}`);if(d.existsSync(r))return r}catch{}return y.join(__dirname,`../../src/assets/icons/icon.${e}`)},ve=()=>{const t=F.getPrimaryDisplay(),{x:e,y:n,width:r,height:i}=t.bounds,a=560,c=180,m=Math.round(e+(r-a)/2),u=n;s=new he({width:a,height:c,x:m,y:u,backgroundColor:"#00000000",transparent:!0,alwaysOnTop:!0,resizable:!1,minimizable:!1,maximizable:!1,fullscreenable:!1,frame:!1,thickFrame:!1,hasShadow:!1,skipTaskbar:!0,icon:J(),type:"toolbar",fullscreen:!1,visibleOnFullScreen:!0,acceptFirstMouse:!0,webPreferences:{preload:y.join(__dirname,"preload.js"),devTools:!h.isPackaged,backgroundThrottling:!1},show:!0}),s.setIgnoreMouseEvents(!0,{forward:!0}),s.once("ready-to-show",()=>{s&&(s.show(),v(),s.focus())}),s.webContents.on("console-message",(p,f,S,w,x)=>{f>=2&&l(`[RENDERER CONSOLE ${f===3?"ERROR":"WARN"}] (${x?y.basename(x):"unknown"}:${w}) ${S}`)}),s.webContents.on("render-process-gone",(p,f)=>{if(l(`[RENDERER PROCESS GONE] reason=${f==null?void 0:f.reason}, exitCode=${f==null?void 0:f.exitCode}`),s&&!s.isDestroyed())try{s.setIgnoreMouseEvents(!0,{forward:!0})}catch{}}),s.on("blur",()=>{v()}),s.on("minimize",()=>{s&&!s.isDestroyed()&&(s.restore(),v())}),s.on("restore",()=>{v()}),s.on("show",()=>{v()}),setTimeout(()=>{s&&!s.isVisible()&&(s.show(),v(),s.focus())},5e3),s.on("closed",()=>{s=null});try{s.setVisibleOnAllWorkspaces(!0,{visibleOnFullScreen:!0})}catch{}if(!h.isPackaged)s.loadURL("http://localhost:5173");else if(!h.isPackaged&&process.env.NODE_ENV==="development")s.loadURL("http://localhost:5173");else{const p=[y.join(__dirname,"../renderer/main_window/index.html"),y.join(h.getAppPath(),".vite/renderer/main_window/index.html"),y.join(h.getAppPath(),"dist/index.html"),y.join(__dirname,"index.html"),y.join(h.getAppPath(),"index.html")];let f=!1;for(const S of p)if(d.existsSync(S)){l(`Loading renderer from: ${S}`),s.loadFile(S),f=!0;break}f||(l("No packaged renderer HTML found, falling back to localhost:5173"),s.loadURL("http://localhost:5173"))}};let k=null;function ye(){if(k&&!k.isDestroyed()){k.show(),k.focus();return}if(k=new he({width:680,height:560,title:"Quick Pill Settings",backgroundColor:"#121212",autoHideMenuBar:!0,resizable:!0,minimizable:!0,maximizable:!1,frame:!1,icon:J(),webPreferences:{preload:y.join(__dirname,"preload.js"),devTools:!h.isPackaged,backgroundThrottling:!1}}),!h.isPackaged)k.loadURL("http://localhost:5173#settings");else if(!h.isPackaged&&process.env.NODE_ENV==="development")k.loadURL("http://localhost:5173#settings");else{const t=[y.join(__dirname,"../renderer/main_window/index.html"),y.join(h.getAppPath(),".vite/renderer/main_window/index.html"),y.join(h.getAppPath(),"dist/index.html"),y.join(__dirname,"index.html"),y.join(h.getAppPath(),"index.html")];for(const e of t)if(d.existsSync(e)){k.loadFile(e,{hash:"settings"});break}}k.on("closed",()=>{k=null})}function M(){if(!q||q.isDestroyed())return;const t=h.getLoginItemSettings().openAtLogin,e=De.buildFromTemplate([{label:"Start with Windows",type:"checkbox",checked:t,click:n=>{try{h.setLoginItemSettings({openAtLogin:n.checked,path:h.getPath("exe")})}catch{}M()}},{label:"Mascot Mode",type:"checkbox",checked:R,click:n=>{R=n.checked,Ae(R),s&&!s.isDestroyed()&&s.webContents.send("settings:mascot-mode-changed",R),M()}},{label:"Minimal Notch",type:"checkbox",checked:T,click:n=>{T=n.checked,se(T),s&&!s.isDestroyed()&&s.webContents.send("settings:minimal-notch-changed",T),M()}},{type:"separator"},{label:"Settings...",click:()=>{ye()}},{type:"separator"},{label:"Exit",click:()=>{h.quit()}}]);q.setContextMenu(e)}let Te=!1,W=null,rt=null;function it(){if(process.platform==="win32")try{const t=require("koffi"),e=t.load("user32.dll"),n=t.load("gdi32.dll"),r=t.struct("RECT",{left:"long",top:"long",right:"long",bottom:"long"});W={GetForegroundWindow:e.func("GetForegroundWindow","intptr_t",[]),IsZoomed:e.func("IsZoomed","bool",["intptr_t"]),GetWindowRect:e.func("GetWindowRect","bool",["intptr_t",t.out(t.pointer(r))]),GetClassNameA:e.func("GetClassNameA","int",["intptr_t",t.out(t.pointer("char")),"int"]),GetWindowTextA:e.func("GetWindowTextA","int",["intptr_t",t.out(t.pointer("char")),"int"]),GetDC:e.func("GetDC","intptr_t",["intptr_t"]),ReleaseDC:e.func("ReleaseDC","int",["intptr_t","intptr_t"]),GetKeyState:e.func("GetKeyState","int16_t",["int"])},rt={GetPixel:n.func("GetPixel","uint32_t",["intptr_t","int","int"])}}catch(t){l("[Obstruction] Koffi user32/gdi32 init failed, falling back:",t)}}function ot(){process.platform==="win32"&&(it(),setInterval(()=>{if(!s||s.isDestroyed())return;let t=!1;if(T)t=!0;else if(W)try{const e=W.GetForegroundWindow();if(e&&e!==0){const n=Buffer.alloc(256);W.GetClassNameA(e,n,256);const r=n.toString("utf8").replace(/\0.*$/,"").trim(),i=r==="Progman"||r==="WorkerW"||r==="Shell_TrayWnd"||r==="Shell_SecondaryTrayWnd";let a=!1;try{const c=s.getNativeWindowHandle();c.readBigInt64LE&&c.readBigInt64LE(0)===BigInt(e)&&(a=!0)}catch{}if(!i&&!a){const c={};W.GetWindowRect(e,c);const m=W.IsZoomed(e),u=F.getPrimaryDisplay(),p=u.bounds.width,f=u.bounds.height,S=(c.right||0)-(c.left||0),w=(c.bottom||0)-(c.top||0);if(c.left<=0&&c.top<=0&&c.right>=p&&c.bottom>=f&&!m)t=!0;else if(m||c.top<=8&&S>=p*.9&&w>=f*.85)if(r==="Chrome_WidgetWin_1"||r==="MozillaWindowClass"){const $=Buffer.alloc(512);W.GetWindowTextA(e,$,512),$.toString("utf8").replace(/\0.*$/,"").trim().match(/and\s+([5-9]|\d{2,})\s+more\s+tabs/i)?t=!0:t=!1}else t=!0;else t=!1}}}catch{}t!==Te&&(Te=t,s&&!s.isDestroyed()&&s.webContents.send("desktop:obstruction-status",{isObstructed:t}))},300))}h.whenReady().then(()=>{h.setAppUserModelId("com.neosparkx.quickpill"),xe(),ve(),ut(),pt(),ot(),fe(),P().getCatalog().catch(t=>l("Failed to warm launcher catalog:",t)),h.on("activate",()=>{he.getAllWindows().length===0&&ve()});try{let t=J(),e=ge.createFromPath(t);e.isEmpty()&&(t=J("png"),e=ge.createFromPath(t));const n=e.isEmpty()?t:e.resize({width:16,height:16});q=new Me(n),q.setToolTip("Quick Pill"),M()}catch(t){console.error("Failed to create tray:",t)}F.on("display-metrics-changed",()=>{v()}),F.on("display-added",()=>{v()}),F.on("display-removed",()=>{v()}),ae&&(ae.on("resume",()=>{s&&!s.isDestroyed()&&s.webContents.send("system-resume");try{typeof g<"u"&&(g!=null&&g.registry)&&g.registry.checkSnoozedDue()}catch{}setTimeout(v,500),setTimeout(v,2e3)}),ae.on("unlock-screen",()=>{s&&!s.isDestroyed()&&s.webContents.send("system-resume");try{typeof g<"u"&&(g!=null&&g.registry)&&g.registry.checkSnoozedDue()}catch{}setTimeout(v,500),setTimeout(v,2e3)})),setInterval(()=>{if(E&&s&&!s.isDestroyed()&&s.isVisible())if(!s.isAlwaysOnTop())v();else try{s.moveTop()}catch{}},2500),setTimeout(()=>{A.checkForUpdates().catch(t=>{l("Auto-update check on startup error:",t)})},4e3),setInterval(()=>{A.checkForUpdates().catch(t=>{l("Periodic background update check error:",t)})},2*60*60*1e3)});const Ie=y.join(h.getPath("userData"),"get-media.ps1"),at=`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
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
`,Ce=y.join(h.getPath("userData"),"control-media.ps1"),ct=`param([string]$command = "playpause", [double]$seekSeconds = 0)

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
`;try{d.writeFileSync(Ie,at,"utf8")}catch(t){console.error("Failed to write get-media.ps1 script:",t)}try{d.writeFileSync(Ce,ct,"utf8")}catch(t){console.error("Failed to write control-media.ps1 script:",t)}let le=!1;o.handle("get-system-media",async()=>le?null:(le=!0,new Promise(t=>{const e=n=>{le=!1,t(n)};Y("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-File",Ie],{maxBuffer:10*1024*1024,encoding:"utf8"},(n,r)=>{if(n||!r||r.trim()==="null"||r.trim()==="'null'"){U(`powershell -NoProfile -Command "Get-Process | Where-Object {$_.ProcessName -eq 'Spotify'} | Select-Object MainWindowTitle"`,{encoding:"utf8"},(i,a)=>{var m;if(i||!a)return e(null);const c=(m=a.split(`
`).find(u=>u.includes("-")))==null?void 0:m.trim();if(c){const u=c.split(" - ");let p="Unknown",f=c;u.length>1&&(p=u[0].trim(),f=u.slice(1).join(" - ").trim()),e({name:f||c,artist:p||"Unknown",state:"playing",source:"Spotify",position:0,duration:0})}else e(null)});return}try{const i=JSON.parse(r.trim());if(!i||!i.Title&&!i.Artist)return e(null);e({name:i.Title||"Unknown Title",artist:i.Artist||"Unknown Artist",album:i.Album||"",artwork_url:i.Artwork||null,state:i.Status==="playing"?"playing":"paused",source:i.Source||"System",position:Number(i.Position)||0,duration:Number(i.Duration)||0})}catch{e(null)}})})));o.handle("get-bluetooth-status",async()=>new Promise(t=>{const n=Buffer.from(`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$devs = @(Get-PnpDevice -Class Bluetooth -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'OK' -and $_.Present -eq $true -and $_.InstanceId -match 'BTHENUM' })
$names = @($devs | ForEach-Object { $_.FriendlyName })
@{ connected = ($devs.Count -gt 0); devices = $names } | ConvertTo-Json -Compress
`,"utf16le").toString("base64");U(`powershell -NoProfile -EncodedCommand ${n}`,(r,i)=>{if(r||!i)return t({connected:!1,devices:[]});try{const a=JSON.parse(i.trim());t({connected:!!a.connected,devices:Array.isArray(a.devices)?a.devices:a.devices?[a.devices]:[]})}catch{t({connected:!1,devices:[]})}})}));o.handle("get-camera-status",async()=>new Promise(t=>{Y("reg",["query","HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam","/s"],(e,n)=>{if(e||!n)return t(!1);const r=n.match(/LastUsedTimeStop\s+REG_QWORD\s+0x0\b/i);t(!!r)})}));o.handle("get-microphone-status",async()=>new Promise(t=>{Y("reg",["query","HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone","/s"],(e,n)=>{if(e||!n)return t(!1);const r=n.match(/LastUsedTimeStop\s+REG_QWORD\s+0x0\b/i);t(!!r)})}));h.on("window-all-closed",()=>{q||h.quit()});o.handle("control-system-media",async(t,e,...n)=>{const r=typeof n[0]=="number"?n[0]:0;l(`Executing media control: ${e} ${r>0?`(seek: ${r}s)`:""}`),Y("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-File",Ce,"-command",e,"-seekSeconds",r.toString()],{timeout:4e3},i=>{i&&l("Media control error:",i)})});let K=null;function lt(){const t=pe.cpus();if(!t||t.length===0)return 0;if(!K||K.length!==t.length)return K=t,0;let e=0,n=0;for(let i=0;i<t.length;i++){const a=t[i],c=K[i];let m=a.times.idle-c.times.idle,u=0;for(const p in a.times)u+=a.times[p]-c.times[p];e+=m,n+=u}if(K=t,n===0)return 0;const r=e/n;return Math.max(0,Math.min(100,Math.round((1-r)*100)))}function dt(){const t=pe.totalmem(),e=pe.freemem();return t?Math.max(0,Math.min(100,Math.round((t-e)/t*100))):0}o.handle("get-system-metrics",async()=>({cpu:lt(),ram:dt()}));o.handle("get-clipboard-text",async()=>{try{return X.readText()}catch{return""}});o.handle("write-clipboard-text",async(t,e)=>{try{return e?X.writeText(e):X.clear(),!0}catch{return!1}});o.handle("clear-clipboard",async()=>{try{return X.clear(),!0}catch{return!1}});o.handle("control-system-volume",async(t,e)=>{if(process.platform==="win32"){let n="0xAF";e==="down"&&(n="0xAE"),e==="mute"&&(n="0xAD");const r=`
$type = '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);'
$MediaKey = Add-Type -MemberDefinition $type -Name "WinVolKey" -Namespace "WinAPI" -PassThru
$MediaKey::keybd_event(${n}, 0, 0, [UIntPtr]::Zero)
$MediaKey::keybd_event(${n}, 0, 2, [UIntPtr]::Zero)
`,i=re(r);return U(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${i}`,a=>{a&&l("Volume control error:",a)}),!0}return!1});let de=null;function ut(){process.platform==="win32"&&setInterval(()=>{if(!(!s||s.isDestroyed()))try{if(W&&W.GetKeyState){const t=(W.GetKeyState(144)&1)!==0;de!==null&&t!==de&&s.webContents.send("key-lock-change",{key:"NumLock",state:t}),de=t}}catch{}},150)}let te=null;function pt(){if(process.platform!=="win32")return;let t=!1;setInterval(()=>{!s||s.isDestroyed()||t||(t=!0,U("wmic logicaldisk where drivetype=2 get name,volumename /format:csv",(e,n)=>{var a,c;if(t=!1,e)return;const r=new Map,i=n.trim().split(/\r?\n/).filter(m=>m.trim()&&!m.startsWith("Node"));for(const m of i){const u=m.trim().split(",");if(u.length>=3){const p=(a=u[1])==null?void 0:a.trim(),f=((c=u[2])==null?void 0:c.trim())||"USB Drive";p&&r.set(p,f)}}if(te!==null&&s&&!s.isDestroyed()){for(const[m,u]of r)te.has(m)||s.webContents.send("usb-change",{action:"connected",drive:m,name:u});for(const[m]of te)r.has(m)||s.webContents.send("usb-change",{action:"disconnected",drive:m,name:"USB Drive"})}te=r}))},5e3)}const Ne=y.join(h.getPath("userData"),"get-notifications.ps1"),ht=`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
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
`;try{d.writeFileSync(Ne,ht,"utf8")}catch(t){l("Failed to write get-notifications.ps1:",t)}function ft(){try{const t=y.join(h.getPath("userData"),"notifications-store.json");if(d.existsSync(t))return JSON.parse(d.readFileSync(t,"utf8"))}catch(t){l("Failed to load notifications-store.json:",t)}return null}function mt(t){try{const e=y.join(h.getPath("userData"),"notifications-store.json");d.writeFileSync(e,JSON.stringify(t,null,2),"utf8")}catch(e){l("Failed to save notifications-store.json:",e)}}async function yt(t){return process.platform!=="win32"||!t?!1:new Promise(e=>{const n=`
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
`,r=re(n);U(`powershell -NoProfile -EncodedCommand ${r}`,(i,a)=>{e((a==null?void 0:a.trim())==="true")})})}async function wt(){return process.platform!=="win32"?!1:new Promise(t=>{const n=re(`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
try {
    $listener = [Windows.UI.Notifications.Management.UserNotificationListener, Windows.UI.Notifications, ContentType = WindowsRuntime]::Current
    $listener.ClearNotifications()
    Write-Output "true"
} catch { Write-Output "false" }
`);U(`powershell -NoProfile -EncodedCommand ${n}`,(r,i)=>{t((i==null?void 0:i.trim())==="true")})})}async function We(t,e){if(process.platform!=="win32"||!t&&!e)return!1;const n=(t||"").trim(),r=(e||"").trim();if(l(`focusNotificationApp: appId="${n}", appName="${r}"`),n&&(n.includes("!")||n.toLowerCase().startsWith("shell:appsfolder\\")))try{const a=n.toLowerCase().startsWith("shell:appsfolder\\")?n:`shell:AppsFolder\\${n}`,c=me("explorer.exe",[a],{detached:!0,stdio:"ignore"});return c&&typeof c.unref=="function"&&c.unref(),!0}catch(a){l("UWP explorer.exe launch failed:",a)}try{const a=typeof P=="function"?P():null;if(a){if(r){const c=await a.launchApp(r);if(c&&c.success)return!0}if(n&&n!==r){const c=await a.launchApp(n);if(c&&c.success)return!0}if(typeof a.getRunningWindows=="function"&&typeof a.activateWindow=="function"){const c=await a.getRunningWindows({forceRefresh:!0}),m=[r,n].filter(Boolean).map(p=>p.toLowerCase()),u=c.find(p=>{if(!p)return!1;const f=(p.processName||"").toLowerCase(),S=(p.title||"").toLowerCase();return m.some(w=>f===w||f.includes(w)||w.includes(f)||S.toLowerCase().includes(w))});if(u&&u.hWnd){const p=await a.activateWindow(u.hWnd);if(p&&p.success)return!0}}}}catch(a){l("LauncherEngine resolution in focusNotificationApp failed:",a)}const i=`${r} ${n}`.toLowerCase();try{if(i.includes("whatsapp"))return await O.openExternal("whatsapp://"),!0;if(i.includes("spotify"))return await O.openExternal("spotify://"),!0;if(i.includes("telegram"))return await O.openExternal("tg://"),!0;if(i.includes("discord"))return await O.openExternal("discord://"),!0;if(i.includes("slack"))return await O.openExternal("slack://"),!0}catch(a){l("URI protocol fallback failed:",a)}return new Promise(a=>{const c=new Set;[r,n].forEach(w=>{w&&(c.add(w),w.split(/\s+/).forEach($=>{$.length>2&&c.add($)}),w.split(/[._!\\\/]/).filter($=>$.length>2&&!/^[0-9A-Fa-f]{8,}$/.test($)).forEach($=>c.add($)))});const m=Array.from(c).filter(w=>w&&w.length>=2),u=m.length>0?m.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|"):(r||n).replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),p=n.replace(/'/g,"''"),f=`
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
`,S=re(f);U(`powershell -NoProfile -EncodedCommand ${S}`,(w,x)=>{a((x==null?void 0:x.trim())==="true")})})}const g=Ge({savePersistence:mt,initialPersistedData:ft(),removeNotificationSource:yt,focusApp:We,openExternal:async t=>O.openExternal(t)});g.registry.on("change",t=>{if(s&&!s.isDestroyed()){s.webContents.send("notification:update",t);try{s.webContents.invalidate()}catch{}}});setInterval(()=>{try{g.registry.checkSnoozedDue()}catch{}},1e4);let ue=!1;async function Oe(){return process.platform!=="win32"?[]:ue?[]:(ue=!0,new Promise(t=>{Y("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-File",Ne],{maxBuffer:5*1024*1024,encoding:"utf8",timeout:1e4},(e,n)=>{if(ue=!1,e||!n)return t([]);try{const r=JSON.parse(n.trim()),i=Array.isArray(r)?r:r?[r]:[];g.syncNotifications(i,"windows-notification-listener"),t(i)}catch{t([])}})}))}o.handle("get-notifications",async()=>await Oe());o.handle("dismiss-notification",async(t,e)=>{const n=await g.dismiss(e);return!!(n!=null&&n.success)});o.handle("focus-notification-app",async(t,e,n)=>await We(e,n));o.handle("notification:get-snapshot",()=>g.getSnapshot());o.handle("notification:sync-now",async()=>(await Oe(),g.getSnapshot()));o.handle("notification:execute-action",async(t,e,n,r)=>await g.executeAction(e,n,r));o.handle("notification:snooze",(t,e,n,r)=>g.snooze(e,n,r));o.handle("notification:cancel-snooze",(t,e)=>g.cancelSnooze(e));o.handle("notification:dismiss",async(t,e)=>await g.dismiss(e));o.handle("notification:dismiss-group",(t,e)=>g.dismissGroup(e));o.handle("notification:clear-all",async()=>{try{await wt()}catch{}return g.clearAllActive()});o.handle("notification:undo-dismiss",(t,e)=>g.undoDismiss(e));o.handle("notification:mark-reviewed",(t,e)=>g.markReviewed(e));o.handle("notification:mark-all-reviewed",()=>g.markAllReviewed());o.handle("notification:set-hide-previews",(t,e)=>(g.setHidePreviews(e),!0));o.handle("notification:set-app-excluded",(t,e,n)=>(g.setAppExcluded(e,n),!0));o.handle("notification:clear-history",()=>(g.clearHistory(),!0));o.handle("window:invalidate",()=>{if(s&&!s.isDestroyed())try{s.webContents.invalidate()}catch{}return!0});function gt(){const t=[y.join(process.resourcesPath,"audio-helper.exe"),y.join(process.resourcesPath,"native","bin","audio-helper.exe"),y.join(process.resourcesPath,"native","audio-helper.exe"),y.join(h.getAppPath(),"native","bin","audio-helper.exe"),y.join(__dirname,"..","native","bin","audio-helper.exe"),y.join(__dirname,"native","bin","audio-helper.exe"),y.join(process.cwd(),"native","bin","audio-helper.exe")];for(const e of t)try{if(d.existsSync(e))return e}catch{}return null}class $t{constructor(){this.child=null,this.reqId=0,this.pending=new Map,this.buffer="",this.isStopping=!1,this.restartAttempts=0,this.maxRestartAttempts=5,this.restartTimer=null}start(){if(process.platform!=="win32"||this.child&&!this.child.killed)return;const e=gt();if(!e){l("[AudioMixer] audio-helper.exe not found in search paths.");return}try{this.child=me(e,[],{stdio:["pipe","pipe","pipe"],windowsHide:!0}),this.child.stdout.on("data",n=>{this.buffer+=n.toString("utf8");let r;for(;(r=this.buffer.indexOf(`
`))!==-1;){const i=this.buffer.slice(0,r).trim();this.buffer=this.buffer.slice(r+1),i&&this.handleLine(i)}}),this.child.stderr.on("data",n=>{l(`[AudioMixer stderr] ${n.toString("utf8").trim()}`)}),this.child.on("error",n=>{l("[AudioMixer process error]",n)}),this.child.on("close",n=>{l(`[AudioMixer] Process exited with code ${n}`),this.child=null;for(const[r,i]of this.pending.entries())clearTimeout(i.timer),i.reject(new Error("Audio helper process exited"));if(this.pending.clear(),!this.isStopping&&this.restartAttempts<this.maxRestartAttempts){this.restartAttempts++;const r=Math.min(1e3*Math.pow(2,this.restartAttempts),1e4);this.restartTimer=setTimeout(()=>{l(`[AudioMixer] Restarting audio-helper (attempt ${this.restartAttempts})...`),this.start()},r)}}),l(`[AudioMixer] Successfully spawned audio-helper from ${e}`),this.restartAttempts=0}catch(n){l("[AudioMixer] Failed to spawn audio-helper:",n)}}handleLine(e){try{const n=JSON.parse(e);if(typeof n.id=="number"&&this.pending.has(n.id)){const{resolve:r,reject:i,timer:a}=this.pending.get(n.id);clearTimeout(a),this.pending.delete(n.id),n.success?r(n.data):i(new Error(n.error||"Unknown audio helper error"))}}catch(n){l(`[AudioMixer] Failed to parse stdout line: ${e}`,n)}}send(e,n={},r=5e3){return new Promise((i,a)=>{if((!this.child||!this.child.stdin||this.child.killed)&&(this.start(),!this.child||!this.child.stdin))return a(new Error("Audio helper is not running"));const c=++this.reqId,m={id:c,cmd:e,...n},u=setTimeout(()=>{this.pending.has(c)&&(this.pending.delete(c),a(new Error(`Command '${e}' timed out after ${r}ms`)))},r);this.pending.set(c,{resolve:i,reject:a,timer:u});try{this.child.stdin.write(JSON.stringify(m)+`
`)}catch(p){clearTimeout(u),this.pending.delete(c),a(p)}})}stop(){if(this.isStopping=!0,this.restartTimer&&(clearTimeout(this.restartTimer),this.restartTimer=null),this.child){try{this.child.stdin&&!this.child.stdin.destroyed&&(this.child.stdin.on("error",()=>{}),this.child.stdin.write(JSON.stringify({id:0,cmd:"shutdown"})+`
`))}catch{}setTimeout(()=>{if(this.child){try{this.child.kill()}catch{}this.child=null}},400)}}}const D=new $t;h.whenReady().then(()=>{D.start()});h.on("will-quit",()=>{D.stop();try{Z.unregisterAll()}catch{}if(j)try{j.destroy()}catch{}});h.on("before-quit",()=>{D.stop();try{Z.unregisterAll()}catch{}if(j)try{j.destroy()}catch{}});o.handle("audio-mixer:get-devices",async()=>{if(process.platform!=="win32")return{devices:[],defaultDeviceId:""};try{return await D.send("listDevices")}catch(t){return l("[audio-mixer:get-devices error]",t),{devices:[],defaultDeviceId:"",error:t.message}}});o.handle("audio-mixer:get-sessions",async(t,e)=>{if(process.platform!=="win32")return{sessions:[]};try{return await D.send("listSessions",{deviceId:e})}catch(n){return l("[audio-mixer:get-sessions error]",n),{sessions:[],error:n.message}}});o.handle("audio-mixer:set-volume",async(t,e={})=>{if(process.platform!=="win32")return!1;try{return await D.send("setSessionVolume",e)}catch(n){return l("[audio-mixer:set-volume error]",n),!1}});o.handle("audio-mixer:set-mute",async(t,e={})=>{if(process.platform!=="win32")return!1;try{return await D.send("setSessionMute",e)}catch(n){return l("[audio-mixer:set-mute error]",n),!1}});o.handle("audio-mixer:set-master-volume",async(t,e={})=>{if(process.platform!=="win32")return!1;try{return await D.send("setMasterVolume",e)}catch(n){return l("[audio-mixer:set-master-volume error]",n),!1}});o.handle("audio-mixer:set-master-mute",async(t,e={})=>{if(process.platform!=="win32")return!1;try{return await D.send("setMasterMute",e)}catch(n){return l("[audio-mixer:set-master-mute error]",n),!1}});
