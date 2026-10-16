"use strict";const{app:h,BrowserWindow:ae,screen:M,ipcMain:o,shell:G,dialog:$e,Tray:ge,Menu:be,nativeImage:se,clipboard:q,powerMonitor:J}=require("electron");h.commandLine.appendSwitch("disable-background-timer-throttling");h.commandLine.appendSwitch("disable-backgrounding-occluded-windows");h.commandLine.appendSwitch("disable-renderer-backgrounding");const w=require("node:path"),m=require("fs"),X=require("os"),re=require("https"),ie=require("http"),Se=require("crypto"),{EventEmitter:ve}=require("events"),{createProgressEngine:Te}=require("./services/progress"),{createNotificationEngine:ke,NOTIFICATION_ACTION_TYPES:He}=require("./services/notifications"),{createLauncherEngine:Pe}=require("./services/launcher"),{createNotesEngine:Ae}=require("./services/notes");let D=null,s=null,I=!0;function B(){try{return w.join(h.getPath("userData"),"settings.json")}catch{return w.join(process.cwd(),"settings.json")}}function Ie(){try{const e=B();if(m.existsSync(e)){const t=JSON.parse(m.readFileSync(e,"utf8"));if(typeof t.alwaysOnTop=="boolean")return t.alwaysOnTop}}catch{}return!0}function Ce(e){try{const t=B();let n={};if(m.existsSync(t))try{n=JSON.parse(m.readFileSync(t,"utf8"))}catch{}n.alwaysOnTop=e,m.writeFileSync(t,JSON.stringify(n,null,2),"utf8")}catch{}}function xe(){try{const e=B();if(m.existsSync(e)){const t=JSON.parse(m.readFileSync(e,"utf8"));if(typeof t.autoDownloadInstall=="boolean")return t.autoDownloadInstall}}catch{}return!0}function Oe(e,t){try{const n=B();let r={};if(m.existsSync(n))try{r=JSON.parse(m.readFileSync(n,"utf8"))}catch{}r[e]=t,m.writeFileSync(n,JSON.stringify(r,null,2),"utf8")}catch{}}I=Ie();function g(){if(I&&!(!s||s.isDestroyed())){try{s.setAlwaysOnTop(!0,"screen-saver",1)}catch{try{s.setAlwaysOnTop(!0,"screen-saver")}catch{try{s.setAlwaysOnTop(!0)}catch{}}}try{s.moveTop()}catch{}}}function ce(e){if(I=!!e,Ce(I),s&&!s.isDestroyed()){try{I?g():s.setAlwaysOnTop(!1)}catch{}try{s.webContents.send("always-on-top-changed",I)}catch{}}ue()}function Ne(){try{return w.join(h.getPath("userData"),"quick-pill.log")}catch{return w.join(process.cwd(),"quick-pill.log")}}function a(e,t=null){const r=`[${new Date().toISOString()}] ${e}${t?` | Error: ${t.stack||t}`:""}
`;console.log(r.trim());try{const i=Ne();m.appendFileSync(i,r,"utf8")}catch{}}process.on("uncaughtException",e=>{a("UNCAUGHT EXCEPTION (Main Process)",e)});process.on("unhandledRejection",e=>{a("UNHANDLED REJECTION (Main Process)",e)});const{exec:O,execFile:L,spawn:le}=require("child_process");function ee(e){return Buffer.from(e,"utf16le").toString("base64")}o.handle("log-message",(e,t,n,r)=>{a(`[RENDERER ${String(t).toUpperCase()}] ${n} ${r?JSON.stringify(r):""}`)});o.handle("set-ignore-mouse-events",(e,t,n)=>{if(s&&!s.isDestroyed())try{if(t){const r=n!==void 0?n:!0;s.setIgnoreMouseEvents(!0,{forward:r})}else s.setIgnoreMouseEvents(!1),g();a(`setIgnoreMouseEvents(${t}, forward=${n}) executed`)}catch(r){a("Error in setIgnoreMouseEvents, falling back to forward=true",r);try{s.setIgnoreMouseEvents(!0,{forward:!0})}catch{}}});o.handle("get-always-on-top",()=>I);o.handle("set-always-on-top",(e,t)=>(ce(t),I));o.handle("focus-window",()=>{s&&!s.isDestroyed()&&(g(),s.focus())});o.handle("open-external",async(e,t)=>{await G.openExternal(t)});let E=null;function S(){if(!E){let e="";try{e=h.getPath("userData")}catch{e=process.cwd()}E=Pe({userDataPath:e,shell:G,getFileIcon:(t,n)=>h.getFileIcon(t,n)})}return E}o.handle("launcher:search-apps",async(e,t,n)=>{try{return await S().searchApps(t,n)}catch(r){return a("Error in launcher:search-apps:",r),[]}});o.handle("launcher:get-catalog",async()=>{try{return await S().getCatalog()}catch(e){return a("Error in launcher:get-catalog:",e),[]}});o.handle("launcher:reindex-catalog",async()=>{try{return await S().reindexCatalog()}catch(e){return a("Error in launcher:reindex-catalog:",e),{success:!1,count:0}}});o.handle("launcher:launch-app",async(e,t)=>{try{return await S().launchApp(t)}catch(n){return a("Error in launcher:launch-app:",n),{success:!1,error:n.message}}});o.handle("launcher:get-running-windows",async(e,t)=>{try{return await S().getRunningWindows(t)}catch(n){return a("Error in launcher:get-running-windows:",n),[]}});o.handle("launcher:activate-window",async(e,t)=>{try{const n=await S().activateWindow(t);return n.success&&s&&!s.isDestroyed()&&s.webContents.send("launcher:window-activated",{hWnd:t}),n}catch(n){return a("Error in launcher:activate-window:",n),{success:!1,code:"FAILED",error:n.message}}});o.handle("launcher:get-favorites",async()=>{try{return await S().getFavorites()}catch(e){return a("Error in launcher:get-favorites:",e),[]}});o.handle("launcher:set-favorites",async(e,t)=>{try{return await S().setFavorites(t)}catch(n){return a("Error in launcher:set-favorites:",n),{success:!1}}});o.handle("workspaces:get-workspaces",async()=>{try{return await S().getWorkspaces()}catch(e){return a("Error in workspaces:get-workspaces:",e),[]}});o.handle("workspaces:save-workspace",async(e,t)=>{try{return await S().saveWorkspace(t)}catch(n){return a("Error in workspaces:save-workspace:",n),{success:!1,error:n.message}}});o.handle("workspaces:delete-workspace",async(e,t)=>{try{return await S().deleteWorkspace(t)}catch(n){return a("Error in workspaces:delete-workspace:",n),{success:!1,error:n.message}}});o.handle("workspaces:launch-workspace",async(e,t,n)=>{try{return await S().launchWorkspace(t,n)}catch(r){return a("Error in workspaces:launch-workspace:",r),{success:!1,results:[],error:r.message}}});let H=null;function T(){if(!H){let e="";try{e=h.getPath("userData")}catch{e=process.cwd()}H=Ae({userDataPath:e,clipboard:q})}return H}o.handle("notes:get-notes",async(e,t,n)=>{try{return await T().getNotes(t,n)}catch(r){return a("Error in notes:get-notes:",r),[]}});o.handle("notes:save-note",async(e,t)=>{try{const n=await T().saveNote(t);return s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"save",note:n}),n}catch(n){return a("Error in notes:save-note:",n),{success:!1,error:n.message}}});o.handle("notes:delete-note",async(e,t)=>{try{const n=await T().deleteNote(t);return n.success&&s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"delete",id:t}),n}catch(n){return a("Error in notes:delete-note:",n),{success:!1,error:n.message}}});o.handle("notes:undo-delete",async()=>{try{const e=await T().undoDelete();return e.success&&s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"restore",note:e.note}),e}catch(e){return a("Error in notes:undo-delete:",e),{success:!1,error:e.message}}});o.handle("notes:toggle-pin",async(e,t)=>{try{const n=await T().togglePin(t);return n.success&&s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"togglePin",id:t,isPinned:n.isPinned}),n}catch(n){return a("Error in notes:toggle-pin:",n),{success:!1,error:n.message}}});o.handle("notes:toggle-archive",async(e,t)=>{try{const n=await T().toggleArchive(t);return n.success&&s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"toggleArchive",id:t,isArchived:n.isArchived}),n}catch(n){return a("Error in notes:toggle-archive:",n),{success:!1,error:n.message}}});o.handle("notes:save-draft",async(e,t)=>{try{return await T().saveDraft(t)}catch(n){return a("Error in notes:save-draft:",n),{success:!1,error:n.message}}});o.handle("notes:get-draft",async()=>{try{return await T().getDraft()}catch(e){return a("Error in notes:get-draft:",e),null}});o.handle("notes:clear-draft",async()=>{try{return await T().clearDraft()}catch(e){return a("Error in notes:clear-draft:",e),{success:!1,error:e.message}}});o.handle("notes:get-contextual-capture",async(e,t)=>{try{return await T().getContextualCapture(t)}catch(n){return a("Error in notes:get-contextual-capture:",n),{success:!1,code:"CAPTURE_ERROR",error:n.message}}});o.handle("notes:search-notes",async(e,t,n)=>{try{return await T().searchNotes(t,n)}catch(r){return a("Error in notes:search-notes:",r),[]}});o.handle("notes:get-tags",async()=>{try{return await T().getTags()}catch(e){return a("Error in notes:get-tags:",e),[]}});o.handle("notes:convert-to-task",async(e,t)=>{try{return await T().convertToTask(t)}catch(n){return a("Error in notes:convert-to-task:",n),{success:!1,error:n.message}}});o.handle("launch-app",async(e,t)=>await S().launchApp(t));o.handle("build-app-cache",async()=>await S().reindexCatalog());o.handle("search-apps",async(e,t)=>await S().searchApps(t));o.handle("get-displays",()=>M.getAllDisplays().map(t=>({id:t.id,label:t.label||`Display ${t.id}`,bounds:t.bounds})));o.handle("set-display",(e,t)=>{if(s&&!s.isDestroyed()){const r=M.getAllDisplays().find(l=>l.id.toString()===t.toString())||M.getPrimaryDisplay(),{x:i,y:c,width:d,height:p}=r.bounds;s.setBounds({x:i,y:c,width:d,height:p}),s.show(),g()}});o.handle("update-window-position",(e,t,n)=>{});o.handle("set-auto-launch",(e,t)=>{try{h.setLoginItemSettings({openAtLogin:t,path:h.getPath("exe")}),t||de()}catch(n){console.error("Failed to set login item settings on Windows:",n)}});function de(){if(process.platform==="win32")try{const e=["electron.app.Ripple","electron.app.Electron","electron.app.Quick Pill","Ripple"];for(const t of e)O(`reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${t}" /f`,()=>{})}catch{}}const Me=["https://raw.githubusercontent.com/nabil24024004/Quick-Pill/main/web%20app/public/version.json","https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/version.json","https://raw.githubusercontent.com/nabil24024004/Ripple/main/web%20app/public/version.json"];class Ee extends ve{constructor(){super(),this.manifestUrls=[...Me],this.currentVersion=h?h.getVersion():"5.5.0",this.status="idle",this.updateInfo=null,this.downloadedFilePath=null,this.currentDownloadRequest=null,this.lastProgressEmit=0;const t=xe();this.autoDownload=t,this.autoInstall=t}compareVersions(t,n){const r=(t||"0.0.0").replace(/^v/i,"").trim(),i=(n||"0.0.0").replace(/^v/i,"").trim(),[c,d]=r.split("-"),[p,l]=i.split("-"),u=c.split(".").map(k=>parseInt(k,10)||0),f=p.split(".").map(k=>parseInt(k,10)||0),P=Math.max(u.length,f.length);for(let k=0;k<P;k++){const F=u[k]||0,v=f[k]||0;if(F>v)return 1;if(F<v)return-1}return!d&&l?1:d&&!l?-1:d&&l?d.localeCompare(l):0}getPlatformKey(){return`win32-${process.arch}`}fetchJson(t,n=12e3,r=5){return new Promise((i,c)=>{if(r<=0)return c(new Error("Too many redirects while fetching update manifest."));const p=(t.startsWith("https")?re:ie).get(t,{headers:{"User-Agent":`QuickPill-Updater/${this.currentVersion} (${process.platform} ${process.arch})`,Accept:"application/json, text/plain, */*"},timeout:n},l=>{if(l.statusCode>=300&&l.statusCode<400&&l.headers.location){const f=new URL(l.headers.location,t).href;return this.fetchJson(f,n,r-1).then(i).catch(c)}if(l.statusCode!==200)return l.resume(),c(new Error(`Server returned HTTP ${l.statusCode}: ${l.statusMessage}`));let u="";l.setEncoding("utf8"),l.on("data",f=>{u+=f}),l.on("end",()=>{try{const f=JSON.parse(u);i(f)}catch(f){c(new Error(`Invalid JSON received from update manifest: ${f.message}`))}})});p.on("timeout",()=>{p.destroy(),c(new Error("Connection timed out while checking for updates."))}),p.on("error",l=>{c(l)})})}async checkForUpdates(){var t,n,r;if(this.status==="checking"||this.status==="downloading")return{status:this.status,updateInfo:this.updateInfo};this.status="checking",this.emit("checking");try{let i=null,c=null;for(const l of this.manifestUrls)try{const u=`${l}${l.includes("?")?"&":"?"}_t=${Date.now()}`,f=await this.fetchJson(u);if(f&&f.version){i=f;break}}catch(u){c=u}if(!i||!i.version)throw c||new Error('Update manifest is missing required "version" field.');const d=i.version;if(this.compareVersions(d,this.currentVersion)>0){const l=this.getPlatformKey(),u=((t=i.platforms)==null?void 0:t[l])||((n=i.platforms)==null?void 0:n[`${process.platform}-x64`])||((r=i.platforms)==null?void 0:r["win32-x64"]),f=(u==null?void 0:u.url)||"";return this.updateInfo={version:d,currentVersion:this.currentVersion,name:i.name||`Quick Pill v${d}`,releaseDate:i.releaseDate||"",mandatory:!!i.mandatory,changelog:Array.isArray(i.changelog)?i.changelog:[],downloadUrl:f,sha256:(u==null?void 0:u.sha256)||"",size:(u==null?void 0:u.size)||0,installerType:(u==null?void 0:u.installerType)||"nsis"},this.status="available",this.emit("update-available",this.updateInfo),this.autoDownload&&f&&(a(`[Auto-Updater] New update v${d} detected. Automatically downloading in background...`),setTimeout(()=>{this.startDownload().catch(P=>{a("[Auto-Updater] Automatic background download failed:",P)})},1e3)),{status:"available",updateInfo:this.updateInfo}}else{this.status="not-available";const l={currentVersion:this.currentVersion,latestVersion:d};return this.emit("update-not-available",l),{status:"not-available",updateInfo:l}}}catch(i){this.status="error";const c=i.message||"Unknown error occurred while checking for updates.";return this.emit("error",c),{status:"error",error:c}}}startDownload(){if(!this.updateInfo||!this.updateInfo.downloadUrl){const c=new Error("No update available or download URL is missing.");return this.emit("error",c.message),Promise.reject(c)}if(this.status==="downloading")return Promise.resolve({status:"downloading"});this.status="downloading",this.emit("download-started",this.updateInfo);const t=h.getPath("temp"),r=`quick-pill-update-v${this.updateInfo.version}.exe`,i=w.join(t,r);return new Promise((c,d)=>{if(m.existsSync(i))try{m.unlinkSync(i)}catch{}const p=m.createWriteStream(i);let l=0,u=this.updateInfo.size||0,f=0,P=Date.now(),k=0;const F=(v,x=5)=>{if(x<=0){p.close();const $=new Error("Too many redirects while downloading update binary.");return this.status="error",this.emit("error",$.message),d($)}const V=(v.startsWith("https")?re:ie).get(v,{headers:{"User-Agent":`QuickPill-Updater/${this.currentVersion} (${process.platform} ${process.arch})`}},$=>{if($.statusCode>=300&&$.statusCode<400&&$.headers.location){const A=new URL($.headers.location,v).href;return F(A,x-1)}if($.statusCode!==200){p.close();try{m.unlinkSync(i)}catch{}const A=new Error(`Download failed with status HTTP ${$.statusCode}: ${$.statusMessage}`);return this.status="error",this.emit("error",A.message),d(A)}const U=parseInt($.headers["content-length"],10);!isNaN(U)&&U>0&&(u=U),$.on("data",A=>{l+=A.length,p.write(A);const W=Date.now();if(W-this.lastProgressEmit>=100||l===u){const ne=(W-P)/1e3;ne>=.5&&(k=Math.round((l-f)/ne),f=l,P=W);const we={percent:u>0?Math.min(100,Math.round(l/u*1e3)/10):0,transferredBytes:l,totalBytes:u,speedBytesPerSec:k};this.lastProgressEmit=W,this.emit("download-progress",we)}}),$.on("end",()=>{p.end()}),$.on("error",A=>{p.close();try{m.unlinkSync(i)}catch{}this.status="error",this.emit("error",A.message),d(A)})});this.currentDownloadRequest=V,V.on("error",$=>{p.close();try{m.unlinkSync(i)}catch{}this.status="error",this.emit("error",$.message),d($)})};p.on("finish",()=>{if(this.currentDownloadRequest=null,this.updateInfo.sha256&&this.updateInfo.sha256.trim()!=="")try{const x=Se.createHash("sha256"),te=m.readFileSync(i);if(x.update(te),x.digest("hex").toLowerCase()!==this.updateInfo.sha256.trim().toLowerCase()){try{m.unlinkSync(i)}catch{}const $=new Error("Integrity check failed (SHA-256 mismatch). The downloaded file might be corrupted.");return this.status="error",this.emit("error",$.message),d($)}}catch(x){console.warn("Could not verify SHA-256 checksum:",x)}this.downloadedFilePath=i,this.status="downloaded";const v={version:this.updateInfo.version,filePath:i};this.emit("update-downloaded",v),c(v),this.autoInstall&&(a(`[Auto-Updater] Update v${this.updateInfo.version} downloaded successfully. Automatically installing in background in 2 seconds...`),setTimeout(()=>{this.installAndRelaunch()},2e3))}),p.on("error",v=>{try{m.unlinkSync(i)}catch{}this.status="error",this.emit("error",v.message),d(v)}),F(this.updateInfo.downloadUrl)})}cancelDownload(){if(this.currentDownloadRequest){try{this.currentDownloadRequest.destroy()}catch{}this.currentDownloadRequest=null}this.status="idle",this.emit("download-cancelled")}installAndRelaunch(){if(!this.downloadedFilePath||!m.existsSync(this.downloadedFilePath)){const n=new Error("No downloaded update file found to install.");return this.emit("error",n.message),!1}const t=this.downloadedFilePath;try{return le(t,["/S"],{detached:!0,stdio:"ignore"}).unref(),setTimeout(()=>{h?(h.isQuitting=!0,h.quit()):process.exit(0)},300),!0}catch(n){return this.emit("error",`Failed to launch installer: ${n.message}`),!1}}}const b=new Ee;function N(e,t){s&&!s.isDestroyed()&&s.webContents.send("update-event",{event:e,data:t})}b.on("checking",()=>N("checking"));b.on("update-available",e=>N("available",e));b.on("update-not-available",e=>N("not-available",e));b.on("download-started",e=>N("download-started",e));b.on("download-progress",e=>N("download-progress",e));b.on("update-downloaded",e=>N("downloaded",e));b.on("download-cancelled",()=>N("cancelled"));b.on("error",e=>N("error",e));o.handle("check-for-updates",async()=>await b.checkForUpdates());o.handle("start-update-download",async()=>await b.startDownload());o.handle("cancel-update-download",()=>(b.cancelDownload(),!0));o.handle("install-update",()=>b.installAndRelaunch());o.handle("get-app-version",()=>h.getVersion());o.handle("get-auto-download-install",()=>b.autoDownload&&b.autoInstall);o.handle("set-auto-download-install",(e,t)=>{const n=!!t;return b.autoDownload=n,b.autoInstall=n,Oe("autoDownloadInstall",n),n});const _=Te({autoUpdater:b,openPath:async e=>{try{m.existsSync(e)&&(m.statSync(e).isDirectory()?await G.openPath(e):G.showItemInFolder(e))}catch(t){a("[progress openPath error]",t)}}});_.coordinator.on("update",e=>{s&&!s.isDestroyed()&&s.webContents.send("progress:update",e)});o.handle("progress:get-snapshot",()=>_.coordinator.getSnapshot());o.handle("progress:execute-action",async(e,t,n,r)=>await _.coordinator.executeAction(t,n,r));o.handle("progress:start-file-op",async(e,t)=>await _.fileOpsProvider.startCopy(t));o.handle("progress:start-hash-op",async(e,t)=>await _.fileOpsProvider.startHash(t));o.handle("progress:clear-history",()=>(_.registry.clearHistory(),!0));o.handle("progress:select-file",async()=>{if(!s)return null;const e=await $e.showOpenDialog(s,{properties:["openFile"]});return e.canceled||!e.filePaths.length?null:e.filePaths[0]});const Y=(e=null)=>{const t=e||"ico";try{const n=w.join(h.getAppPath(),`src/assets/icons/icon.${t}`);if(m.existsSync(n))return n}catch{}try{const n=w.join(process.resourcesPath,`icon.${t}`);if(m.existsSync(n))return n;const r=w.join(process.resourcesPath,`assets/icons/icon.${t}`);if(m.existsSync(r))return r}catch{}return w.join(__dirname,`../../src/assets/icons/icon.${t}`)},oe=()=>{const e=M.getPrimaryDisplay(),{x:t,y:n,width:r,height:i}=e.bounds,c=r,d=i,p=t,l=n;s=new ae({width:c,height:d,x:p,y:l,backgroundColor:"#00000000",transparent:!0,alwaysOnTop:!0,resizable:!1,minimizable:!1,maximizable:!1,fullscreenable:!1,frame:!1,thickFrame:!1,hasShadow:!1,skipTaskbar:!0,icon:Y(),type:"toolbar",fullscreen:!1,visibleOnFullScreen:!0,acceptFirstMouse:!0,webPreferences:{preload:w.join(__dirname,"preload.js"),devTools:!h.isPackaged,backgroundThrottling:!1},show:!0}),s.setIgnoreMouseEvents(!0,{forward:!0}),s.once("ready-to-show",()=>{s&&(s.show(),g(),s.focus())}),s.on("blur",()=>{g()}),s.on("minimize",()=>{s&&!s.isDestroyed()&&(s.restore(),g())}),s.on("restore",()=>{g()}),s.on("show",()=>{g()}),setTimeout(()=>{s&&!s.isVisible()&&(s.show(),g(),s.focus())},5e3),s.on("closed",()=>{s=null});try{s.setVisibleOnAllWorkspaces(!0,{visibleOnFullScreen:!0})}catch{}if(!h.isPackaged)s.loadURL("http://localhost:5173");else if(!h.isPackaged&&process.env.NODE_ENV==="development")s.loadURL("http://localhost:5173");else{const u=[w.join(__dirname,"../renderer/main_window/index.html"),w.join(h.getAppPath(),".vite/renderer/main_window/index.html"),w.join(h.getAppPath(),"dist/index.html"),w.join(__dirname,"index.html"),w.join(h.getAppPath(),"index.html")];let f=!1;for(const P of u)if(m.existsSync(P)){a(`Loading renderer from: ${P}`),s.loadFile(P),f=!0;break}f||(a("No packaged renderer HTML found, falling back to localhost:5173"),s.loadURL("http://localhost:5173"))}};function ue(){if(!D||D.isDestroyed())return;const e=be.buildFromTemplate([{label:"Show/Hide Quick Pill",click:()=>{s&&(s.isVisible()?s.hide():(s.show(),g()))}},{label:"Always on Top",type:"checkbox",checked:I,click:t=>{ce(t.checked)}},{type:"separator"},{label:"Quit",click:()=>{h.quit()}}]);D.setContextMenu(e)}h.whenReady().then(()=>{h.setAppUserModelId("com.neosparkx.quickpill"),de(),oe(),Ue(),Re(),S().getCatalog().catch(e=>a("Failed to warm launcher catalog:",e)),h.on("activate",()=>{ae.getAllWindows().length===0&&oe()});try{let e=Y(),t=se.createFromPath(e);t.isEmpty()&&(e=Y("png"),t=se.createFromPath(e));const n=t.isEmpty()?e:t.resize({width:16,height:16});D=new ge(n),D.setToolTip("Quick Pill"),ue()}catch(e){console.error("Failed to create tray:",e)}M.on("display-metrics-changed",()=>{g()}),M.on("display-added",()=>{g()}),M.on("display-removed",()=>{g()}),J&&(J.on("resume",()=>{s&&!s.isDestroyed()&&s.webContents.send("system-resume");try{typeof y<"u"&&(y!=null&&y.registry)&&y.registry.checkSnoozedDue()}catch{}setTimeout(g,500),setTimeout(g,2e3)}),J.on("unlock-screen",()=>{s&&!s.isDestroyed()&&s.webContents.send("system-resume");try{typeof y<"u"&&(y!=null&&y.registry)&&y.registry.checkSnoozedDue()}catch{}setTimeout(g,500),setTimeout(g,2e3)})),setInterval(()=>{if(I&&s&&!s.isDestroyed()&&s.isVisible())if(!s.isAlwaysOnTop())g();else try{s.moveTop()}catch{}},2500),setTimeout(()=>{b.checkForUpdates().catch(e=>{a("Auto-update check on startup error:",e)})},4e3),setInterval(()=>{b.checkForUpdates().catch(e=>{a("Periodic background update check error:",e)})},2*60*60*1e3)});const pe=w.join(h.getPath("userData"),"get-media.ps1"),We=`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
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
`,he=w.join(h.getPath("userData"),"control-media.ps1"),De=`param([string]$command = "playpause", [double]$seekSeconds = 0)

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
`;try{m.writeFileSync(pe,We,"utf8")}catch(e){console.error("Failed to write get-media.ps1 script:",e)}try{m.writeFileSync(he,De,"utf8")}catch(e){console.error("Failed to write control-media.ps1 script:",e)}let K=!1;o.handle("get-system-media",async()=>K?null:(K=!0,new Promise(e=>{const t=n=>{K=!1,e(n)};L("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-File",pe],{maxBuffer:10*1024*1024,encoding:"utf8"},(n,r)=>{if(n||!r||r.trim()==="null"||r.trim()==="'null'"){O(`powershell -NoProfile -Command "Get-Process | Where-Object {$_.ProcessName -eq 'Spotify'} | Select-Object MainWindowTitle"`,{encoding:"utf8"},(i,c)=>{var p;if(i||!c)return t(null);const d=(p=c.split(`
`).find(l=>l.includes("-")))==null?void 0:p.trim();if(d){const l=d.split(" - ");let u="Unknown",f=d;l.length>1&&(u=l[0].trim(),f=l.slice(1).join(" - ").trim()),t({name:f||d,artist:u||"Unknown",state:"playing",source:"Spotify",position:0,duration:0})}else t(null)});return}try{const i=JSON.parse(r.trim());if(!i||!i.Title&&!i.Artist)return t(null);t({name:i.Title||"Unknown Title",artist:i.Artist||"Unknown Artist",album:i.Album||"",artwork_url:i.Artwork||null,state:i.Status==="playing"?"playing":"paused",source:i.Source||"System",position:Number(i.Position)||0,duration:Number(i.Duration)||0})}catch{t(null)}})})));o.handle("get-bluetooth-status",async()=>new Promise(e=>{const n=Buffer.from(`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$devs = @(Get-PnpDevice -Class Bluetooth -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'OK' -and $_.Present -eq $true -and $_.InstanceId -match 'BTHENUM' })
$names = @($devs | ForEach-Object { $_.FriendlyName })
@{ connected = ($devs.Count -gt 0); devices = $names } | ConvertTo-Json -Compress
`,"utf16le").toString("base64");O(`powershell -NoProfile -EncodedCommand ${n}`,(r,i)=>{if(r||!i)return e({connected:!1,devices:[]});try{const c=JSON.parse(i.trim());e({connected:!!c.connected,devices:Array.isArray(c.devices)?c.devices:c.devices?[c.devices]:[]})}catch{e({connected:!1,devices:[]})}})}));o.handle("get-camera-status",async()=>new Promise(e=>{L("reg",["query","HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam","/s"],(t,n)=>{if(t||!n)return e(!1);const r=n.match(/LastUsedTimeStop\s+REG_QWORD\s+0x0\b/i);e(!!r)})}));o.handle("get-microphone-status",async()=>new Promise(e=>{L("reg",["query","HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone","/s"],(t,n)=>{if(t||!n)return e(!1);const r=n.match(/LastUsedTimeStop\s+REG_QWORD\s+0x0\b/i);e(!!r)})}));h.on("window-all-closed",()=>{D||h.quit()});o.handle("control-system-media",async(e,t,...n)=>{const r=typeof n[0]=="number"?n[0]:0;a(`Executing media control: ${t} ${r>0?`(seek: ${r}s)`:""}`),L("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-File",he,"-command",t,"-seekSeconds",r.toString()],{timeout:4e3},i=>{i&&a("Media control error:",i)})});let R=null;function _e(){const e=X.cpus();if(!e||e.length===0)return 0;if(!R||R.length!==e.length)return R=e,0;let t=0,n=0;for(let i=0;i<e.length;i++){const c=e[i],d=R[i];let p=c.times.idle-d.times.idle,l=0;for(const u in c.times)l+=c.times[u]-d.times[u];t+=p,n+=l}if(R=e,n===0)return 0;const r=t/n;return Math.max(0,Math.min(100,Math.round((1-r)*100)))}function Fe(){const e=X.totalmem(),t=X.freemem();return e?Math.max(0,Math.min(100,Math.round((e-t)/e*100))):0}o.handle("get-system-metrics",async()=>({cpu:_e(),ram:Fe()}));o.handle("get-clipboard-text",async()=>{try{return q.readText()}catch{return""}});o.handle("write-clipboard-text",async(e,t)=>{try{return t?q.writeText(t):q.clear(),!0}catch{return!1}});o.handle("clear-clipboard",async()=>{try{return q.clear(),!0}catch{return!1}});o.handle("control-system-volume",async(e,t)=>{if(process.platform==="win32"){let n="0xAF";t==="down"&&(n="0xAE"),t==="mute"&&(n="0xAD");const r=`
$type = '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);'
$MediaKey = Add-Type -MemberDefinition $type -Name "WinVolKey" -Namespace "WinAPI" -PassThru
$MediaKey::keybd_event(${n}, 0, 0, [UIntPtr]::Zero)
$MediaKey::keybd_event(${n}, 0, 2, [UIntPtr]::Zero)
`,i=ee(r);return O(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${i}`,c=>{c&&a("Volume control error:",c)}),!0}return!1});let z=null,Q=null;function Ue(){if(process.platform!=="win32")return;let e=!1;setInterval(()=>{!s||s.isDestroyed()||e||(e=!0,O('powershell -NoProfile -Command "[Console]::CapsLock; [Console]::NumberLock"',(t,n)=>{var d,p;if(e=!1,t||!n)return;const r=n.trim().split(/\r?\n/),i=((d=r[0])==null?void 0:d.trim().toLowerCase())==="true",c=((p=r[1])==null?void 0:p.trim().toLowerCase())==="true";z!==null&&i!==z&&s&&!s.isDestroyed()&&s.webContents.send("key-lock-change",{key:"CapsLock",state:i}),Q!==null&&c!==Q&&s&&!s.isDestroyed()&&s.webContents.send("key-lock-change",{key:"NumLock",state:c}),z=i,Q=c}))},2e3)}let j=null;function Re(){if(process.platform!=="win32")return;let e=!1;setInterval(()=>{!s||s.isDestroyed()||e||(e=!0,O("wmic logicaldisk where drivetype=2 get name,volumename /format:csv",(t,n)=>{var c,d;if(e=!1,t)return;const r=new Map,i=n.trim().split(/\r?\n/).filter(p=>p.trim()&&!p.startsWith("Node"));for(const p of i){const l=p.trim().split(",");if(l.length>=3){const u=(c=l[1])==null?void 0:c.trim(),f=((d=l[2])==null?void 0:d.trim())||"USB Drive";u&&r.set(u,f)}}if(j!==null&&s&&!s.isDestroyed()){for(const[p,l]of r)j.has(p)||s.webContents.send("usb-change",{action:"connected",drive:p,name:l});for(const[p]of j)r.has(p)||s.webContents.send("usb-change",{action:"disconnected",drive:p,name:"USB Drive"})}j=r}))},5e3)}const me=w.join(h.getPath("userData"),"get-notifications.ps1"),Ge=`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
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

function Get-AppIconBase64($appId) {
    try {
        $proc = $null
        if ($appId) {
            # Try to derive process name from AppId (e.g. "com.squirrel.Spotify.Spotify" -> "Spotify")
            $cleanName = $appId.Split('!')[-1].Split('.')[-1].Replace('.exe','')
            $proc = Get-Process | Where-Object { $_.ProcessName -eq $cleanName -or $_.ProcessName -like "*$cleanName*" } | Select-Object -First 1
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
            $icon = Get-AppIconBase64 $appId
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
`;try{m.writeFileSync(me,Ge,"utf8")}catch(e){a("Failed to write get-notifications.ps1:",e)}function qe(){try{const e=w.join(h.getPath("userData"),"notifications-store.json");if(m.existsSync(e))return JSON.parse(m.readFileSync(e,"utf8"))}catch(e){a("Failed to load notifications-store.json:",e)}return null}function Le(e){try{const t=w.join(h.getPath("userData"),"notifications-store.json");m.writeFileSync(t,JSON.stringify(e,null,2),"utf8")}catch(t){a("Failed to save notifications-store.json:",t)}}async function je(e){return process.platform!=="win32"||!e?!1:new Promise(t=>{const n=`
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
    $listener.RemoveNotification(${e})
    Write-Output "true"
} catch { Write-Output "false" }
`,r=ee(n);O(`powershell -NoProfile -EncodedCommand ${r}`,(i,c)=>{t((c==null?void 0:c.trim())==="true")})})}async function fe(e){return process.platform!=="win32"||!e?!1:new Promise(t=>{const n=e.split("!")[0].split("_")[0].replace(/\./g,""),r=`
$type = '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);'
$fw = Add-Type -MemberDefinition $type -Name "FW" -Namespace "WinAPI" -PassThru
$procs = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and ($_.ProcessName -match '${n}' -or $_.MainWindowTitle -match '${n}') } | Select-Object -First 1
if ($procs) { [void]$fw::SetForegroundWindow($procs.MainWindowHandle); Write-Output "true" } else { Write-Output "false" }
`,i=ee(r);O(`powershell -NoProfile -EncodedCommand ${i}`,(c,d)=>{t((d==null?void 0:d.trim())==="true")})})}const y=ke({savePersistence:Le,initialPersistedData:qe(),removeNotificationSource:je,focusApp:fe,openExternal:async e=>G.openExternal(e)});y.registry.on("change",e=>{s&&!s.isDestroyed()&&s.webContents.send("notification:update",e)});setInterval(()=>{try{y.registry.checkSnoozedDue()}catch{}},1e4);let Z=!1;async function ye(){return process.platform!=="win32"?[]:Z?[]:(Z=!0,new Promise(e=>{L("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-File",me],{maxBuffer:5*1024*1024,encoding:"utf8",timeout:1e4},(t,n)=>{if(Z=!1,t||!n)return e([]);try{const r=JSON.parse(n.trim()),i=Array.isArray(r)?r:r?[r]:[];y.syncNotifications(i,"windows-notification-listener"),e(i)}catch{e([])}})}))}o.handle("get-notifications",async()=>await ye());o.handle("dismiss-notification",async(e,t)=>{const n=await y.dismiss(t);return!!(n!=null&&n.success)});o.handle("focus-notification-app",async(e,t)=>await fe(t));o.handle("notification:get-snapshot",()=>y.getSnapshot());o.handle("notification:sync-now",async()=>(await ye(),y.getSnapshot()));o.handle("notification:execute-action",async(e,t,n,r)=>await y.executeAction(t,n,r));o.handle("notification:snooze",(e,t,n,r)=>y.snooze(t,n,r));o.handle("notification:cancel-snooze",(e,t)=>y.cancelSnooze(t));o.handle("notification:dismiss",async(e,t)=>await y.dismiss(t));o.handle("notification:dismiss-group",(e,t)=>y.dismissGroup(t));o.handle("notification:clear-all",()=>y.clearAllActive());o.handle("notification:undo-dismiss",(e,t)=>y.undoDismiss(t));o.handle("notification:mark-reviewed",(e,t)=>y.markReviewed(t));o.handle("notification:mark-all-reviewed",()=>y.markAllReviewed());o.handle("notification:set-hide-previews",(e,t)=>(y.setHidePreviews(t),!0));o.handle("notification:set-app-excluded",(e,t,n)=>(y.setAppExcluded(t,n),!0));o.handle("notification:clear-history",()=>(y.clearHistory(),!0));function Be(){const e=[w.join(process.resourcesPath,"audio-helper.exe"),w.join(process.resourcesPath,"native","bin","audio-helper.exe"),w.join(process.resourcesPath,"native","audio-helper.exe"),w.join(h.getAppPath(),"native","bin","audio-helper.exe"),w.join(__dirname,"..","native","bin","audio-helper.exe"),w.join(__dirname,"native","bin","audio-helper.exe"),w.join(process.cwd(),"native","bin","audio-helper.exe")];for(const t of e)try{if(m.existsSync(t))return t}catch{}return null}class Ve{constructor(){this.child=null,this.reqId=0,this.pending=new Map,this.buffer="",this.isStopping=!1,this.restartAttempts=0,this.maxRestartAttempts=5,this.restartTimer=null}start(){if(process.platform!=="win32"||this.child&&!this.child.killed)return;const t=Be();if(!t){a("[AudioMixer] audio-helper.exe not found in search paths.");return}try{this.child=le(t,[],{stdio:["pipe","pipe","pipe"],windowsHide:!0}),this.child.stdout.on("data",n=>{this.buffer+=n.toString("utf8");let r;for(;(r=this.buffer.indexOf(`
`))!==-1;){const i=this.buffer.slice(0,r).trim();this.buffer=this.buffer.slice(r+1),i&&this.handleLine(i)}}),this.child.stderr.on("data",n=>{a(`[AudioMixer stderr] ${n.toString("utf8").trim()}`)}),this.child.on("error",n=>{a("[AudioMixer process error]",n)}),this.child.on("close",n=>{a(`[AudioMixer] Process exited with code ${n}`),this.child=null;for(const[r,i]of this.pending.entries())clearTimeout(i.timer),i.reject(new Error("Audio helper process exited"));if(this.pending.clear(),!this.isStopping&&this.restartAttempts<this.maxRestartAttempts){this.restartAttempts++;const r=Math.min(1e3*Math.pow(2,this.restartAttempts),1e4);this.restartTimer=setTimeout(()=>{a(`[AudioMixer] Restarting audio-helper (attempt ${this.restartAttempts})...`),this.start()},r)}}),a(`[AudioMixer] Successfully spawned audio-helper from ${t}`),this.restartAttempts=0}catch(n){a("[AudioMixer] Failed to spawn audio-helper:",n)}}handleLine(t){try{const n=JSON.parse(t);if(typeof n.id=="number"&&this.pending.has(n.id)){const{resolve:r,reject:i,timer:c}=this.pending.get(n.id);clearTimeout(c),this.pending.delete(n.id),n.success?r(n.data):i(new Error(n.error||"Unknown audio helper error"))}}catch(n){a(`[AudioMixer] Failed to parse stdout line: ${t}`,n)}}send(t,n={},r=5e3){return new Promise((i,c)=>{if((!this.child||!this.child.stdin||this.child.killed)&&(this.start(),!this.child||!this.child.stdin))return c(new Error("Audio helper is not running"));const d=++this.reqId,p={id:d,cmd:t,...n},l=setTimeout(()=>{this.pending.has(d)&&(this.pending.delete(d),c(new Error(`Command '${t}' timed out after ${r}ms`)))},r);this.pending.set(d,{resolve:i,reject:c,timer:l});try{this.child.stdin.write(JSON.stringify(p)+`
`)}catch(u){clearTimeout(l),this.pending.delete(d),c(u)}})}stop(){if(this.isStopping=!0,this.restartTimer&&(clearTimeout(this.restartTimer),this.restartTimer=null),this.child){try{this.child.stdin.write(JSON.stringify({id:0,cmd:"shutdown"})+`
`)}catch{}setTimeout(()=>{if(this.child){try{this.child.kill()}catch{}this.child=null}},400)}}}const C=new Ve;h.whenReady().then(()=>{C.start()});h.on("will-quit",()=>{if(C.stop(),E)try{E.destroy()}catch{}});h.on("before-quit",()=>{if(C.stop(),E)try{E.destroy()}catch{}});o.handle("audio-mixer:get-devices",async()=>{if(process.platform!=="win32")return{devices:[],defaultDeviceId:""};try{return await C.send("listDevices")}catch(e){return a("[audio-mixer:get-devices error]",e),{devices:[],defaultDeviceId:"",error:e.message}}});o.handle("audio-mixer:get-sessions",async(e,t)=>{if(process.platform!=="win32")return{sessions:[]};try{return await C.send("listSessions",{deviceId:t})}catch(n){return a("[audio-mixer:get-sessions error]",n),{sessions:[],error:n.message}}});o.handle("audio-mixer:set-volume",async(e,t={})=>{if(process.platform!=="win32")return!1;try{return await C.send("setSessionVolume",t)}catch(n){return a("[audio-mixer:set-volume error]",n),!1}});o.handle("audio-mixer:set-mute",async(e,t={})=>{if(process.platform!=="win32")return!1;try{return await C.send("setSessionMute",t)}catch(n){return a("[audio-mixer:set-mute error]",n),!1}});o.handle("audio-mixer:set-master-volume",async(e,t={})=>{if(process.platform!=="win32")return!1;try{return await C.send("setMasterVolume",t)}catch(n){return a("[audio-mixer:set-master-volume error]",n),!1}});o.handle("audio-mixer:set-master-mute",async(e,t={})=>{if(process.platform!=="win32")return!1;try{return await C.send("setMasterMute",t)}catch(n){return a("[audio-mixer:set-master-mute error]",n),!1}});
