"use strict";const{app:p,BrowserWindow:pe,screen:M,ipcMain:i,shell:L,dialog:ke,Tray:Pe,Menu:Ce,nativeImage:ce,clipboard:q,powerMonitor:Q,globalShortcut:J}=require("electron");p.commandLine.appendSwitch("disable-background-timer-throttling");p.commandLine.appendSwitch("disable-backgrounding-occluded-windows");p.commandLine.appendSwitch("disable-renderer-backgrounding");const y=require("node:path"),h=require("fs"),se=require("os"),le=require("https"),de=require("http"),Ie=require("crypto"),{EventEmitter:xe}=require("events");function H(e){const t=[y.join(__dirname,e),y.join(__dirname,"../../src",e),y.join(typeof p<"u"&&p.getAppPath?p.getAppPath():process.cwd(),"src",e),y.join(typeof p<"u"&&p.getAppPath?p.getAppPath():process.cwd(),".vite/build",e),y.join(process.cwd(),"src",e)];for(const n of t)try{if(h.existsSync(n)||h.existsSync(n+".js")||h.existsSync(y.join(n,"index.js")))return require(n)}catch{}return require(e)}const{createProgressEngine:Oe}=H("services/progress"),{createNotificationEngine:Ne,NOTIFICATION_ACTION_TYPES:nt}=H("services/notifications"),{createLauncherEngine:Ee}=H("services/launcher"),{createNotesEngine:Me}=H("services/notes");let _=null,s=null,C=!0;function F(){try{return y.join(p.getPath("userData"),"settings.json")}catch{return y.join(process.cwd(),"settings.json")}}function We(){try{const e=F();if(h.existsSync(e)){const t=JSON.parse(h.readFileSync(e,"utf8"));if(typeof t.alwaysOnTop=="boolean")return t.alwaysOnTop}}catch{}return!0}function De(e){try{const t=F();let n={};if(h.existsSync(t))try{n=JSON.parse(h.readFileSync(t,"utf8"))}catch{}n.alwaysOnTop=e,h.writeFileSync(t,JSON.stringify(n,null,2),"utf8")}catch{}}function _e(){try{const e=F();if(h.existsSync(e)){const t=JSON.parse(h.readFileSync(e,"utf8"));if(typeof t.autoDownloadInstall=="boolean")return t.autoDownloadInstall}}catch{}return!0}function Re(e,t){try{const n=F();let r={};if(h.existsSync(n))try{r=JSON.parse(h.readFileSync(n,"utf8"))}catch{}r[e]=t,h.writeFileSync(n,JSON.stringify(r,null,2),"utf8")}catch{}}C=We();function $(){if(C&&!(!s||s.isDestroyed())){try{s.setAlwaysOnTop(!0,"screen-saver",1)}catch{try{s.setAlwaysOnTop(!0,"screen-saver")}catch{try{s.setAlwaysOnTop(!0)}catch{}}}try{s.moveTop()}catch{}}}function he(e){if(C=!!e,De(C),s&&!s.isDestroyed()){try{C?$():s.setAlwaysOnTop(!1)}catch{}try{s.webContents.send("always-on-top-changed",C)}catch{}}ge()}function Fe(){try{return y.join(p.getPath("userData"),"quick-pill.log")}catch{return y.join(process.cwd(),"quick-pill.log")}}function a(e,t=null){const r=`[${new Date().toISOString()}] ${e}${t?` | Error: ${t.stack||t}`:""}
`;console.log(r.trim());try{const o=Fe();h.appendFileSync(o,r,"utf8")}catch{}}process.on("uncaughtException",e=>{a("UNCAUGHT EXCEPTION (Main Process)",e)});process.on("unhandledRejection",e=>{a("UNHANDLED REJECTION (Main Process)",e)});const R={0:"Alt+B",1:"Alt+W",2:"Alt+O",11:"Alt+H",12:"Alt+A",13:"Alt+P",14:"Alt+L",15:"Alt+Q",3:"Alt+M",4:"Alt+C",5:"Alt+N",6:"Alt+G",7:"Alt+V",8:"Alt+T",10:"Alt+R",9:"Alt+S"};let Z=[];function fe(){try{const e=F();if(h.existsSync(e)){const t=JSON.parse(h.readFileSync(e,"utf8"));if(t&&typeof t.tabShortcuts=="object"&&t.tabShortcuts!==null)return{...R,...t.tabShortcuts}}}catch{}return{...R}}function me(e){try{const t=F();let n={};if(h.existsSync(t))try{n=JSON.parse(h.readFileSync(t,"utf8"))}catch{}return n.tabShortcuts=e,h.writeFileSync(t,JSON.stringify(n,null,2),"utf8"),!0}catch(t){return a("Failed to save tabShortcuts preference:",t),!1}}function Ue(e){if(!(!s||s.isDestroyed()))try{s.isVisible()||s.show(),$(),s.focus(),s.webContents.send("open-tab-instant",Number(e))}catch(t){a(`Failed to openTabInstant for tab ${e}:`,t)}}function oe(e){for(const n of Z)try{J.unregister(n)}catch{}Z=[];const t=e||fe();for(const[n,r]of Object.entries(t)){if(!r||typeof r!="string"||!r.trim())continue;const o=r.trim();if(o.toUpperCase().includes("CTRL")||o.toUpperCase().includes("CONTROL")){a(`Refusing to register shortcut with Ctrl: ${o}`);continue}try{J.register(o,()=>{Ue(parseInt(n,10))})?Z.push(o):a(`Global shortcut conflict/in-use for ${o} (tab ${n})`)}catch(c){a(`Error registering global shortcut ${o}:`,c)}}}const{exec:I,execFile:B,spawn:ye}=require("child_process");function K(e){return Buffer.from(e,"utf16le").toString("base64")}i.handle("log-message",(e,t,n,r)=>{a(`[RENDERER ${String(t).toUpperCase()}] ${n} ${r?JSON.stringify(r):""}`)});i.handle("log-renderer-error",(e,t)=>{a(`[RENDERER ERROR] Unhandled Renderer Exception ${JSON.stringify(t)}`)});i.handle("set-ignore-mouse-events",(e,t,n)=>{if(s&&!s.isDestroyed())try{if(t){const r=n!==void 0?n:!0;s.setIgnoreMouseEvents(!0,{forward:r})}else s.setIgnoreMouseEvents(!1),$();a(`setIgnoreMouseEvents(${t}, forward=${n}) executed`)}catch(r){a("Error in setIgnoreMouseEvents, falling back to forward=true",r);try{s.setIgnoreMouseEvents(!0,{forward:!0})}catch{}}});i.handle("get-always-on-top",()=>C);i.handle("set-always-on-top",(e,t)=>(he(t),C));i.handle("focus-window",()=>{s&&!s.isDestroyed()&&($(),s.focus())});i.handle("open-external",async(e,t)=>{await L.openExternal(t)});let W=null;function S(){if(!W){let e="";try{e=p.getPath("userData")}catch{e=process.cwd()}W=Ee({userDataPath:e,shell:L,getFileIcon:(t,n)=>p.getFileIcon(t,n)})}return W}i.handle("launcher:search-apps",async(e,t,n)=>{try{return await S().searchApps(t,n)}catch(r){return a("Error in launcher:search-apps:",r),[]}});i.handle("launcher:get-catalog",async()=>{try{return await S().getCatalog()}catch(e){return a("Error in launcher:get-catalog:",e),[]}});i.handle("launcher:reindex-catalog",async()=>{try{return await S().reindexCatalog()}catch(e){return a("Error in launcher:reindex-catalog:",e),{success:!1,count:0}}});i.handle("launcher:launch-app",async(e,t)=>{try{return await S().launchApp(t)}catch(n){return a("Error in launcher:launch-app:",n),{success:!1,error:n.message}}});i.handle("launcher:get-running-windows",async(e,t)=>{try{return await S().getRunningWindows(t)}catch(n){return a("Error in launcher:get-running-windows:",n),[]}});i.handle("launcher:activate-window",async(e,t)=>{try{const n=await S().activateWindow(t);return n.success&&s&&!s.isDestroyed()&&s.webContents.send("launcher:window-activated",{hWnd:t}),n}catch(n){return a("Error in launcher:activate-window:",n),{success:!1,code:"FAILED",error:n.message}}});i.handle("launcher:get-favorites",async()=>{try{return await S().getFavorites()}catch(e){return a("Error in launcher:get-favorites:",e),[]}});i.handle("launcher:set-favorites",async(e,t)=>{try{return await S().setFavorites(t)}catch(n){return a("Error in launcher:set-favorites:",n),{success:!1}}});i.handle("workspaces:get-workspaces",async()=>{try{return await S().getWorkspaces()}catch(e){return a("Error in workspaces:get-workspaces:",e),[]}});i.handle("workspaces:save-workspace",async(e,t)=>{try{return await S().saveWorkspace(t)}catch(n){return a("Error in workspaces:save-workspace:",n),{success:!1,error:n.message}}});i.handle("workspaces:delete-workspace",async(e,t)=>{try{return await S().deleteWorkspace(t)}catch(n){return a("Error in workspaces:delete-workspace:",n),{success:!1,error:n.message}}});i.handle("workspaces:launch-workspace",async(e,t,n)=>{try{return await S().launchWorkspace(t,n)}catch(r){return a("Error in workspaces:launch-workspace:",r),{success:!1,results:[],error:r.message}}});let X=null;function k(){if(!X){let e="";try{e=p.getPath("userData")}catch{e=process.cwd()}X=Me({userDataPath:e,clipboard:q})}return X}i.handle("notes:get-notes",async(e,t,n)=>{try{return await k().getNotes(t,n)}catch(r){return a("Error in notes:get-notes:",r),[]}});i.handle("notes:save-note",async(e,t)=>{try{const n=await k().saveNote(t);return s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"save",note:n}),n}catch(n){return a("Error in notes:save-note:",n),{success:!1,error:n.message}}});i.handle("notes:delete-note",async(e,t)=>{try{const n=await k().deleteNote(t);return n.success&&s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"delete",id:t}),n}catch(n){return a("Error in notes:delete-note:",n),{success:!1,error:n.message}}});i.handle("notes:undo-delete",async()=>{try{const e=await k().undoDelete();return e.success&&s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"restore",note:e.note}),e}catch(e){return a("Error in notes:undo-delete:",e),{success:!1,error:e.message}}});i.handle("notes:toggle-pin",async(e,t)=>{try{const n=await k().togglePin(t);return n.success&&s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"togglePin",id:t,isPinned:n.isPinned}),n}catch(n){return a("Error in notes:toggle-pin:",n),{success:!1,error:n.message}}});i.handle("notes:toggle-archive",async(e,t)=>{try{const n=await k().toggleArchive(t);return n.success&&s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"toggleArchive",id:t,isArchived:n.isArchived}),n}catch(n){return a("Error in notes:toggle-archive:",n),{success:!1,error:n.message}}});i.handle("notes:save-draft",async(e,t)=>{try{return await k().saveDraft(t)}catch(n){return a("Error in notes:save-draft:",n),{success:!1,error:n.message}}});i.handle("notes:get-draft",async()=>{try{return await k().getDraft()}catch(e){return a("Error in notes:get-draft:",e),null}});i.handle("notes:clear-draft",async()=>{try{return await k().clearDraft()}catch(e){return a("Error in notes:clear-draft:",e),{success:!1,error:e.message}}});i.handle("notes:get-contextual-capture",async(e,t)=>{try{return await k().getContextualCapture(t)}catch(n){return a("Error in notes:get-contextual-capture:",n),{success:!1,code:"CAPTURE_ERROR",error:n.message}}});i.handle("notes:search-notes",async(e,t,n)=>{try{return await k().searchNotes(t,n)}catch(r){return a("Error in notes:search-notes:",r),[]}});i.handle("notes:get-tags",async()=>{try{return await k().getTags()}catch(e){return a("Error in notes:get-tags:",e),[]}});i.handle("notes:convert-to-task",async(e,t)=>{try{return await k().convertToTask(t)}catch(n){return a("Error in notes:convert-to-task:",n),{success:!1,error:n.message}}});i.handle("shortcuts:get-tab-shortcuts",()=>fe());i.handle("shortcuts:set-tab-shortcuts",(e,t)=>{if(!t||typeof t!="object")return{success:!1,error:"Invalid shortcuts object"};const n={};for(const[o,c]of Object.entries(t))if(typeof c=="string"){const d=c.toUpperCase();if(d.includes("CTRL")||d.includes("CONTROL"))return{success:!1,error:"Ctrl cannot be used in tab shortcuts (reserved for Click-Through)"};n[o]=c.trim()}const r={...R,...n};return me(r),oe(r),{success:!0,shortcuts:r}});i.handle("shortcuts:reset-tab-shortcuts",()=>(me(R),oe(R),{success:!0,shortcuts:R}));i.handle("launch-app",async(e,t)=>await S().launchApp(t));i.handle("build-app-cache",async()=>await S().reindexCatalog());i.handle("search-apps",async(e,t)=>await S().searchApps(t));i.handle("get-displays",()=>M.getAllDisplays().map(t=>({id:t.id,label:t.label||`Display ${t.id}`,bounds:t.bounds})));i.handle("set-display",(e,t)=>{if(s&&!s.isDestroyed()){const r=M.getAllDisplays().find(l=>l.id.toString()===t.toString())||M.getPrimaryDisplay(),{x:o,y:c,width:d,height:f}=r.bounds;s.setBounds({x:o,y:c,width:d,height:f}),s.show(),$()}});i.handle("update-window-position",(e,t,n)=>{});i.handle("set-auto-launch",(e,t)=>{try{p.setLoginItemSettings({openAtLogin:t,path:p.getPath("exe")}),t||we()}catch(n){console.error("Failed to set login item settings on Windows:",n)}});function we(){if(process.platform==="win32")try{const e=["electron.app.Ripple","electron.app.Electron","electron.app.Quick Pill","Ripple"];for(const t of e)I(`reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${t}" /f`,()=>{})}catch{}}const Ge=["https://raw.githubusercontent.com/nabil24024004/Quick-Pill/main/web%20app/public/version.json","https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/version.json","https://raw.githubusercontent.com/nabil24024004/Ripple/main/web%20app/public/version.json"];class je extends xe{constructor(){super(),this.manifestUrls=[...Ge],this.currentVersion=p?p.getVersion():"5.5.1",this.status="idle",this.updateInfo=null,this.downloadedFilePath=null,this.currentDownloadRequest=null,this.lastProgressEmit=0;const t=_e();this.autoDownload=t,this.autoInstall=t}compareVersions(t,n){const r=(t||"0.0.0").replace(/^v/i,"").trim(),o=(n||"0.0.0").replace(/^v/i,"").trim(),[c,d]=r.split("-"),[f,l]=o.split("-"),u=c.split(".").map(T=>parseInt(T,10)||0),m=f.split(".").map(T=>parseInt(T,10)||0),v=Math.max(u.length,m.length);for(let T=0;T<v;T++){const O=u[T]||0,A=m[T]||0;if(O>A)return 1;if(O<A)return-1}return!d&&l?1:d&&!l?-1:d&&l?d.localeCompare(l):0}getPlatformKey(){return`win32-${process.arch}`}fetchJson(t,n=12e3,r=5){return new Promise((o,c)=>{if(r<=0)return c(new Error("Too many redirects while fetching update manifest."));const f=(t.startsWith("https")?le:de).get(t,{headers:{"User-Agent":`QuickPill-Updater/${this.currentVersion} (${process.platform} ${process.arch})`,Accept:"application/json, text/plain, */*"},timeout:n},l=>{if(l.statusCode>=300&&l.statusCode<400&&l.headers.location){const m=new URL(l.headers.location,t).href;return this.fetchJson(m,n,r-1).then(o).catch(c)}if(l.statusCode!==200)return l.resume(),c(new Error(`Server returned HTTP ${l.statusCode}: ${l.statusMessage}`));let u="";l.setEncoding("utf8"),l.on("data",m=>{u+=m}),l.on("end",()=>{try{const m=JSON.parse(u);o(m)}catch(m){c(new Error(`Invalid JSON received from update manifest: ${m.message}`))}})});f.on("timeout",()=>{f.destroy(),c(new Error("Connection timed out while checking for updates."))}),f.on("error",l=>{c(l)})})}async checkForUpdates(){var t,n,r;if(this.status==="checking"||this.status==="downloading")return{status:this.status,updateInfo:this.updateInfo};this.status="checking",this.emit("checking");try{let o=null,c=null;for(const l of this.manifestUrls)try{const u=`${l}${l.includes("?")?"&":"?"}_t=${Date.now()}`,m=await this.fetchJson(u);if(m&&m.version){o=m;break}}catch(u){c=u}if(!o||!o.version)throw c||new Error('Update manifest is missing required "version" field.');const d=o.version;if(this.compareVersions(d,this.currentVersion)>0){const l=this.getPlatformKey(),u=((t=o.platforms)==null?void 0:t[l])||((n=o.platforms)==null?void 0:n[`${process.platform}-x64`])||((r=o.platforms)==null?void 0:r["win32-x64"]),m=(u==null?void 0:u.url)||"";return this.updateInfo={version:d,currentVersion:this.currentVersion,name:o.name||`Quick Pill v${d}`,releaseDate:o.releaseDate||"",mandatory:!!o.mandatory,changelog:Array.isArray(o.changelog)?o.changelog:[],downloadUrl:m,sha256:(u==null?void 0:u.sha256)||"",size:(u==null?void 0:u.size)||0,installerType:(u==null?void 0:u.installerType)||"nsis"},this.status="available",this.emit("update-available",this.updateInfo),this.autoDownload&&m&&(a(`[Auto-Updater] New update v${d} detected. Automatically downloading in background...`),setTimeout(()=>{this.startDownload().catch(v=>{a("[Auto-Updater] Automatic background download failed:",v)})},1e3)),{status:"available",updateInfo:this.updateInfo}}else{this.status="not-available";const l={currentVersion:this.currentVersion,latestVersion:d};return this.emit("update-not-available",l),{status:"not-available",updateInfo:l}}}catch(o){this.status="error";const c=o.message||"Unknown error occurred while checking for updates.";return this.emit("error",c),{status:"error",error:c}}}startDownload(){if(!this.updateInfo||!this.updateInfo.downloadUrl){const c=new Error("No update available or download URL is missing.");return this.emit("error",c.message),Promise.reject(c)}if(this.status==="downloading")return Promise.resolve({status:"downloading"});this.status="downloading",this.emit("download-started",this.updateInfo);const t=p.getPath("temp"),r=`quick-pill-update-v${this.updateInfo.version}.exe`,o=y.join(t,r);return new Promise((c,d)=>{if(h.existsSync(o))try{h.unlinkSync(o)}catch{}const f=h.createWriteStream(o);let l=0,u=this.updateInfo.size||0,m=0,v=Date.now(),T=0;const O=(A,N=5)=>{if(N<=0){f.close();const g=new Error("Too many redirects while downloading update binary.");return this.status="error",this.emit("error",g.message),d(g)}const z=(A.startsWith("https")?le:de).get(A,{headers:{"User-Agent":`QuickPill-Updater/${this.currentVersion} (${process.platform} ${process.arch})`}},g=>{if(g.statusCode>=300&&g.statusCode<400&&g.headers.location){const P=new URL(g.headers.location,A).href;return O(P,N-1)}if(g.statusCode!==200){f.close();try{h.unlinkSync(o)}catch{}const P=new Error(`Download failed with status HTTP ${g.statusCode}: ${g.statusMessage}`);return this.status="error",this.emit("error",P.message),d(P)}const G=parseInt(g.headers["content-length"],10);!isNaN(G)&&G>0&&(u=G),g.on("data",P=>{l+=P.length,f.write(P);const D=Date.now();if(D-this.lastProgressEmit>=100||l===u){const ae=(D-v)/1e3;ae>=.5&&(T=Math.round((l-m)/ae),m=l,v=D);const Ae={percent:u>0?Math.min(100,Math.round(l/u*1e3)/10):0,transferredBytes:l,totalBytes:u,speedBytesPerSec:T};this.lastProgressEmit=D,this.emit("download-progress",Ae)}}),g.on("end",()=>{f.end()}),g.on("error",P=>{f.close();try{h.unlinkSync(o)}catch{}this.status="error",this.emit("error",P.message),d(P)})});this.currentDownloadRequest=z,z.on("error",g=>{f.close();try{h.unlinkSync(o)}catch{}this.status="error",this.emit("error",g.message),d(g)})};f.on("finish",()=>{if(this.currentDownloadRequest=null,this.updateInfo.sha256&&this.updateInfo.sha256.trim()!=="")try{const N=Ie.createHash("sha256"),ie=h.readFileSync(o);if(N.update(ie),N.digest("hex").toLowerCase()!==this.updateInfo.sha256.trim().toLowerCase()){try{h.unlinkSync(o)}catch{}const g=new Error("Integrity check failed (SHA-256 mismatch). The downloaded file might be corrupted.");return this.status="error",this.emit("error",g.message),d(g)}}catch(N){console.warn("Could not verify SHA-256 checksum:",N)}this.downloadedFilePath=o,this.status="downloaded";const A={version:this.updateInfo.version,filePath:o};this.emit("update-downloaded",A),c(A),this.autoInstall&&(a(`[Auto-Updater] Update v${this.updateInfo.version} downloaded successfully. Automatically installing in background in 2 seconds...`),setTimeout(()=>{this.installAndRelaunch()},2e3))}),f.on("error",A=>{try{h.unlinkSync(o)}catch{}this.status="error",this.emit("error",A.message),d(A)}),O(this.updateInfo.downloadUrl)})}cancelDownload(){if(this.currentDownloadRequest){try{this.currentDownloadRequest.destroy()}catch{}this.currentDownloadRequest=null}this.status="idle",this.emit("download-cancelled")}installAndRelaunch(){if(!this.downloadedFilePath||!h.existsSync(this.downloadedFilePath)){const n=new Error("No downloaded update file found to install.");return this.emit("error",n.message),!1}const t=this.downloadedFilePath;try{return ye(t,["/S"],{detached:!0,stdio:"ignore"}).unref(),setTimeout(()=>{p?(p.isQuitting=!0,p.quit()):process.exit(0)},300),!0}catch(n){return this.emit("error",`Failed to launch installer: ${n.message}`),!1}}}const b=new je;function E(e,t){s&&!s.isDestroyed()&&s.webContents.send("update-event",{event:e,data:t})}b.on("checking",()=>E("checking"));b.on("update-available",e=>E("available",e));b.on("update-not-available",e=>E("not-available",e));b.on("download-started",e=>E("download-started",e));b.on("download-progress",e=>E("download-progress",e));b.on("update-downloaded",e=>E("downloaded",e));b.on("download-cancelled",()=>E("cancelled"));b.on("error",e=>E("error",e));i.handle("check-for-updates",async()=>await b.checkForUpdates());i.handle("start-update-download",async()=>await b.startDownload());i.handle("cancel-update-download",()=>(b.cancelDownload(),!0));i.handle("install-update",()=>b.installAndRelaunch());i.handle("get-app-version",()=>p.getVersion());i.handle("get-auto-download-install",()=>b.autoDownload&&b.autoInstall);i.handle("set-auto-download-install",(e,t)=>{const n=!!t;return b.autoDownload=n,b.autoInstall=n,Re("autoDownloadInstall",n),n});const U=Oe({autoUpdater:b,openPath:async e=>{try{h.existsSync(e)&&(h.statSync(e).isDirectory()?await L.openPath(e):L.showItemInFolder(e))}catch(t){a("[progress openPath error]",t)}}});U.coordinator.on("update",e=>{s&&!s.isDestroyed()&&s.webContents.send("progress:update",e)});i.handle("progress:get-snapshot",()=>U.coordinator.getSnapshot());i.handle("progress:execute-action",async(e,t,n,r)=>await U.coordinator.executeAction(t,n,r));i.handle("progress:start-file-op",async(e,t)=>await U.fileOpsProvider.startCopy(t));i.handle("progress:start-hash-op",async(e,t)=>await U.fileOpsProvider.startHash(t));i.handle("progress:clear-history",()=>(U.registry.clearHistory(),!0));i.handle("progress:select-file",async()=>{if(!s)return null;const e=await ke.showOpenDialog(s,{properties:["openFile"]});return e.canceled||!e.filePaths.length?null:e.filePaths[0]});const re=(e=null)=>{const t=e||"ico";try{const n=y.join(p.getAppPath(),`src/assets/icons/icon.${t}`);if(h.existsSync(n))return n}catch{}try{const n=y.join(process.resourcesPath,`icon.${t}`);if(h.existsSync(n))return n;const r=y.join(process.resourcesPath,`assets/icons/icon.${t}`);if(h.existsSync(r))return r}catch{}return y.join(__dirname,`../../src/assets/icons/icon.${t}`)},ue=()=>{const e=M.getPrimaryDisplay(),{x:t,y:n,width:r,height:o}=e.bounds,c=r,d=o,f=t,l=n;s=new pe({width:c,height:d,x:f,y:l,backgroundColor:"#00000000",transparent:!0,alwaysOnTop:!0,resizable:!1,minimizable:!1,maximizable:!1,fullscreenable:!1,frame:!1,thickFrame:!1,hasShadow:!1,skipTaskbar:!0,icon:re(),type:"toolbar",fullscreen:!1,visibleOnFullScreen:!0,acceptFirstMouse:!0,webPreferences:{preload:y.join(__dirname,"preload.js"),devTools:!p.isPackaged,backgroundThrottling:!1},show:!0}),s.setIgnoreMouseEvents(!0,{forward:!0}),s.once("ready-to-show",()=>{s&&(s.show(),$(),s.focus())}),s.webContents.on("console-message",(u,m,v,T,O)=>{m>=2&&a(`[RENDERER CONSOLE ${m===3?"ERROR":"WARN"}] (${O?y.basename(O):"unknown"}:${T}) ${v}`)}),s.webContents.on("render-process-gone",(u,m)=>{if(a(`[RENDERER PROCESS GONE] reason=${m==null?void 0:m.reason}, exitCode=${m==null?void 0:m.exitCode}`),s&&!s.isDestroyed())try{s.setIgnoreMouseEvents(!0,{forward:!0})}catch{}}),s.on("blur",()=>{$()}),s.on("minimize",()=>{s&&!s.isDestroyed()&&(s.restore(),$())}),s.on("restore",()=>{$()}),s.on("show",()=>{$()}),setTimeout(()=>{s&&!s.isVisible()&&(s.show(),$(),s.focus())},5e3),s.on("closed",()=>{s=null});try{s.setVisibleOnAllWorkspaces(!0,{visibleOnFullScreen:!0})}catch{}if(!p.isPackaged&&process.env.NODE_ENV==="development")s.loadURL("http://localhost:5173");else{const u=[y.join(__dirname,"../renderer/main_window/index.html"),y.join(p.getAppPath(),".vite/renderer/main_window/index.html"),y.join(p.getAppPath(),"dist/index.html"),y.join(__dirname,"index.html"),y.join(p.getAppPath(),"index.html")];let m=!1;for(const v of u)if(h.existsSync(v)){a(`Loading renderer from: ${v}`),s.loadFile(v),m=!0;break}m||(a("No packaged renderer HTML found, falling back to localhost:5173"),s.loadURL("http://localhost:5173"))}};function ge(){if(!_||_.isDestroyed())return;const e=Ce.buildFromTemplate([{label:"Show/Hide Quick Pill",click:()=>{s&&(s.isVisible()?s.hide():(s.show(),$()))}},{label:"Always on Top",type:"checkbox",checked:C,click:t=>{he(t.checked)}},{type:"separator"},{label:"Quit",click:()=>{p.quit()}}]);_.setContextMenu(e)}p.whenReady().then(()=>{p.setAppUserModelId("com.neosparkx.quickpill"),we(),ue(),Je(),He(),oe(),S().getCatalog().catch(e=>a("Failed to warm launcher catalog:",e)),p.on("activate",()=>{pe.getAllWindows().length===0&&ue()});try{let e=re(),t=ce.createFromPath(e);t.isEmpty()&&(e=re("png"),t=ce.createFromPath(e));const n=t.isEmpty()?e:t.resize({width:16,height:16});_=new Pe(n),_.setToolTip("Quick Pill"),ge()}catch(e){console.error("Failed to create tray:",e)}M.on("display-metrics-changed",()=>{$()}),M.on("display-added",()=>{$()}),M.on("display-removed",()=>{$()}),Q&&(Q.on("resume",()=>{s&&!s.isDestroyed()&&s.webContents.send("system-resume");try{typeof w<"u"&&(w!=null&&w.registry)&&w.registry.checkSnoozedDue()}catch{}setTimeout($,500),setTimeout($,2e3)}),Q.on("unlock-screen",()=>{s&&!s.isDestroyed()&&s.webContents.send("system-resume");try{typeof w<"u"&&(w!=null&&w.registry)&&w.registry.checkSnoozedDue()}catch{}setTimeout($,500),setTimeout($,2e3)})),setInterval(()=>{if(C&&s&&!s.isDestroyed()&&s.isVisible())if(!s.isAlwaysOnTop())$();else try{s.moveTop()}catch{}},2500),setTimeout(()=>{b.checkForUpdates().catch(e=>{a("Auto-update check on startup error:",e)})},4e3),setInterval(()=>{b.checkForUpdates().catch(e=>{a("Periodic background update check error:",e)})},2*60*60*1e3)});const $e=y.join(p.getPath("userData"),"get-media.ps1"),Le=`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
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
`,be=y.join(p.getPath("userData"),"control-media.ps1"),qe=`param([string]$command = "playpause", [double]$seekSeconds = 0)

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
`;try{h.writeFileSync($e,Le,"utf8")}catch(e){console.error("Failed to write get-media.ps1 script:",e)}try{h.writeFileSync(be,qe,"utf8")}catch(e){console.error("Failed to write control-media.ps1 script:",e)}let Y=!1;i.handle("get-system-media",async()=>Y?null:(Y=!0,new Promise(e=>{const t=n=>{Y=!1,e(n)};B("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-File",$e],{maxBuffer:10*1024*1024,encoding:"utf8"},(n,r)=>{if(n||!r||r.trim()==="null"||r.trim()==="'null'"){I(`powershell -NoProfile -Command "Get-Process | Where-Object {$_.ProcessName -eq 'Spotify'} | Select-Object MainWindowTitle"`,{encoding:"utf8"},(o,c)=>{var f;if(o||!c)return t(null);const d=(f=c.split(`
`).find(l=>l.includes("-")))==null?void 0:f.trim();if(d){const l=d.split(" - ");let u="Unknown",m=d;l.length>1&&(u=l[0].trim(),m=l.slice(1).join(" - ").trim()),t({name:m||d,artist:u||"Unknown",state:"playing",source:"Spotify",position:0,duration:0})}else t(null)});return}try{const o=JSON.parse(r.trim());if(!o||!o.Title&&!o.Artist)return t(null);t({name:o.Title||"Unknown Title",artist:o.Artist||"Unknown Artist",album:o.Album||"",artwork_url:o.Artwork||null,state:o.Status==="playing"?"playing":"paused",source:o.Source||"System",position:Number(o.Position)||0,duration:Number(o.Duration)||0})}catch{t(null)}})})));i.handle("get-bluetooth-status",async()=>new Promise(e=>{const n=Buffer.from(`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$devs = @(Get-PnpDevice -Class Bluetooth -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'OK' -and $_.Present -eq $true -and $_.InstanceId -match 'BTHENUM' })
$names = @($devs | ForEach-Object { $_.FriendlyName })
@{ connected = ($devs.Count -gt 0); devices = $names } | ConvertTo-Json -Compress
`,"utf16le").toString("base64");I(`powershell -NoProfile -EncodedCommand ${n}`,(r,o)=>{if(r||!o)return e({connected:!1,devices:[]});try{const c=JSON.parse(o.trim());e({connected:!!c.connected,devices:Array.isArray(c.devices)?c.devices:c.devices?[c.devices]:[]})}catch{e({connected:!1,devices:[]})}})}));i.handle("get-camera-status",async()=>new Promise(e=>{B("reg",["query","HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam","/s"],(t,n)=>{if(t||!n)return e(!1);const r=n.match(/LastUsedTimeStop\s+REG_QWORD\s+0x0\b/i);e(!!r)})}));i.handle("get-microphone-status",async()=>new Promise(e=>{B("reg",["query","HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone","/s"],(t,n)=>{if(t||!n)return e(!1);const r=n.match(/LastUsedTimeStop\s+REG_QWORD\s+0x0\b/i);e(!!r)})}));p.on("window-all-closed",()=>{_||p.quit()});i.handle("control-system-media",async(e,t,...n)=>{const r=typeof n[0]=="number"?n[0]:0;a(`Executing media control: ${t} ${r>0?`(seek: ${r}s)`:""}`),B("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-File",be,"-command",t,"-seekSeconds",r.toString()],{timeout:4e3},o=>{o&&a("Media control error:",o)})});let j=null;function Be(){const e=se.cpus();if(!e||e.length===0)return 0;if(!j||j.length!==e.length)return j=e,0;let t=0,n=0;for(let o=0;o<e.length;o++){const c=e[o],d=j[o];let f=c.times.idle-d.times.idle,l=0;for(const u in c.times)l+=c.times[u]-d.times[u];t+=f,n+=l}if(j=e,n===0)return 0;const r=t/n;return Math.max(0,Math.min(100,Math.round((1-r)*100)))}function Ve(){const e=se.totalmem(),t=se.freemem();return e?Math.max(0,Math.min(100,Math.round((e-t)/e*100))):0}i.handle("get-system-metrics",async()=>({cpu:Be(),ram:Ve()}));i.handle("get-clipboard-text",async()=>{try{return q.readText()}catch{return""}});i.handle("write-clipboard-text",async(e,t)=>{try{return t?q.writeText(t):q.clear(),!0}catch{return!1}});i.handle("clear-clipboard",async()=>{try{return q.clear(),!0}catch{return!1}});i.handle("control-system-volume",async(e,t)=>{if(process.platform==="win32"){let n="0xAF";t==="down"&&(n="0xAE"),t==="mute"&&(n="0xAD");const r=`
$type = '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);'
$MediaKey = Add-Type -MemberDefinition $type -Name "WinVolKey" -Namespace "WinAPI" -PassThru
$MediaKey::keybd_event(${n}, 0, 0, [UIntPtr]::Zero)
$MediaKey::keybd_event(${n}, 0, 2, [UIntPtr]::Zero)
`,o=K(r);return I(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${o}`,c=>{c&&a("Volume control error:",c)}),!0}return!1});let ee=null,te=null;function Je(){if(process.platform!=="win32")return;let e=!1;setInterval(()=>{!s||s.isDestroyed()||e||(e=!0,I('powershell -NoProfile -Command "[Console]::CapsLock; [Console]::NumberLock"',(t,n)=>{var d,f;if(e=!1,t||!n)return;const r=n.trim().split(/\r?\n/),o=((d=r[0])==null?void 0:d.trim().toLowerCase())==="true",c=((f=r[1])==null?void 0:f.trim().toLowerCase())==="true";ee!==null&&o!==ee&&s&&!s.isDestroyed()&&s.webContents.send("key-lock-change",{key:"CapsLock",state:o}),te!==null&&c!==te&&s&&!s.isDestroyed()&&s.webContents.send("key-lock-change",{key:"NumLock",state:c}),ee=o,te=c}))},2e3)}let V=null;function He(){if(process.platform!=="win32")return;let e=!1;setInterval(()=>{!s||s.isDestroyed()||e||(e=!0,I("wmic logicaldisk where drivetype=2 get name,volumename /format:csv",(t,n)=>{var c,d;if(e=!1,t)return;const r=new Map,o=n.trim().split(/\r?\n/).filter(f=>f.trim()&&!f.startsWith("Node"));for(const f of o){const l=f.trim().split(",");if(l.length>=3){const u=(c=l[1])==null?void 0:c.trim(),m=((d=l[2])==null?void 0:d.trim())||"USB Drive";u&&r.set(u,m)}}if(V!==null&&s&&!s.isDestroyed()){for(const[f,l]of r)V.has(f)||s.webContents.send("usb-change",{action:"connected",drive:f,name:l});for(const[f]of V)r.has(f)||s.webContents.send("usb-change",{action:"disconnected",drive:f,name:"USB Drive"})}V=r}))},5e3)}const Se=y.join(p.getPath("userData"),"get-notifications.ps1"),Ke=`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
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
`;try{h.writeFileSync(Se,Ke,"utf8")}catch(e){a("Failed to write get-notifications.ps1:",e)}function ze(){try{const e=y.join(p.getPath("userData"),"notifications-store.json");if(h.existsSync(e))return JSON.parse(h.readFileSync(e,"utf8"))}catch(e){a("Failed to load notifications-store.json:",e)}return null}function Qe(e){try{const t=y.join(p.getPath("userData"),"notifications-store.json");h.writeFileSync(t,JSON.stringify(e,null,2),"utf8")}catch(t){a("Failed to save notifications-store.json:",t)}}async function Ze(e){return process.platform!=="win32"||!e?!1:new Promise(t=>{const n=`
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
`,r=K(n);I(`powershell -NoProfile -EncodedCommand ${r}`,(o,c)=>{t((c==null?void 0:c.trim())==="true")})})}async function Xe(){return process.platform!=="win32"?!1:new Promise(e=>{const n=K(`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
try {
    $listener = [Windows.UI.Notifications.Management.UserNotificationListener, Windows.UI.Notifications, ContentType = WindowsRuntime]::Current
    $listener.ClearNotifications()
    Write-Output "true"
} catch { Write-Output "false" }
`);I(`powershell -NoProfile -EncodedCommand ${n}`,(r,o)=>{e((o==null?void 0:o.trim())==="true")})})}async function ve(e){return process.platform!=="win32"||!e?!1:new Promise(t=>{const n=e.split("!")[0].split("_")[0].replace(/\./g,""),r=`
$type = '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);'
$fw = Add-Type -MemberDefinition $type -Name "FW" -Namespace "WinAPI" -PassThru
$procs = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and ($_.ProcessName -match '${n}' -or $_.MainWindowTitle -match '${n}') } | Select-Object -First 1
if ($procs) { [void]$fw::SetForegroundWindow($procs.MainWindowHandle); Write-Output "true" } else { Write-Output "false" }
`,o=K(r);I(`powershell -NoProfile -EncodedCommand ${o}`,(c,d)=>{t((d==null?void 0:d.trim())==="true")})})}const w=Ne({savePersistence:Qe,initialPersistedData:ze(),removeNotificationSource:Ze,focusApp:ve,openExternal:async e=>L.openExternal(e)});w.registry.on("change",e=>{s&&!s.isDestroyed()&&s.webContents.send("notification:update",e)});setInterval(()=>{try{w.registry.checkSnoozedDue()}catch{}},1e4);let ne=!1;async function Te(){return process.platform!=="win32"?[]:ne?[]:(ne=!0,new Promise(e=>{B("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-File",Se],{maxBuffer:5*1024*1024,encoding:"utf8",timeout:1e4},(t,n)=>{if(ne=!1,t||!n)return e([]);try{const r=JSON.parse(n.trim()),o=Array.isArray(r)?r:r?[r]:[];w.syncNotifications(o,"windows-notification-listener"),e(o)}catch{e([])}})}))}i.handle("get-notifications",async()=>await Te());i.handle("dismiss-notification",async(e,t)=>{const n=await w.dismiss(t);return!!(n!=null&&n.success)});i.handle("focus-notification-app",async(e,t)=>await ve(t));i.handle("notification:get-snapshot",()=>w.getSnapshot());i.handle("notification:sync-now",async()=>(await Te(),w.getSnapshot()));i.handle("notification:execute-action",async(e,t,n,r)=>await w.executeAction(t,n,r));i.handle("notification:snooze",(e,t,n,r)=>w.snooze(t,n,r));i.handle("notification:cancel-snooze",(e,t)=>w.cancelSnooze(t));i.handle("notification:dismiss",async(e,t)=>await w.dismiss(t));i.handle("notification:dismiss-group",(e,t)=>w.dismissGroup(t));i.handle("notification:clear-all",async()=>{try{await Xe()}catch{}return w.clearAllActive()});i.handle("notification:undo-dismiss",(e,t)=>w.undoDismiss(t));i.handle("notification:mark-reviewed",(e,t)=>w.markReviewed(t));i.handle("notification:mark-all-reviewed",()=>w.markAllReviewed());i.handle("notification:set-hide-previews",(e,t)=>(w.setHidePreviews(t),!0));i.handle("notification:set-app-excluded",(e,t,n)=>(w.setAppExcluded(t,n),!0));i.handle("notification:clear-history",()=>(w.clearHistory(),!0));function Ye(){const e=[y.join(process.resourcesPath,"audio-helper.exe"),y.join(process.resourcesPath,"native","bin","audio-helper.exe"),y.join(process.resourcesPath,"native","audio-helper.exe"),y.join(p.getAppPath(),"native","bin","audio-helper.exe"),y.join(__dirname,"..","native","bin","audio-helper.exe"),y.join(__dirname,"native","bin","audio-helper.exe"),y.join(process.cwd(),"native","bin","audio-helper.exe")];for(const t of e)try{if(h.existsSync(t))return t}catch{}return null}class et{constructor(){this.child=null,this.reqId=0,this.pending=new Map,this.buffer="",this.isStopping=!1,this.restartAttempts=0,this.maxRestartAttempts=5,this.restartTimer=null}start(){if(process.platform!=="win32"||this.child&&!this.child.killed)return;const t=Ye();if(!t){a("[AudioMixer] audio-helper.exe not found in search paths.");return}try{this.child=ye(t,[],{stdio:["pipe","pipe","pipe"],windowsHide:!0}),this.child.stdout.on("data",n=>{this.buffer+=n.toString("utf8");let r;for(;(r=this.buffer.indexOf(`
`))!==-1;){const o=this.buffer.slice(0,r).trim();this.buffer=this.buffer.slice(r+1),o&&this.handleLine(o)}}),this.child.stderr.on("data",n=>{a(`[AudioMixer stderr] ${n.toString("utf8").trim()}`)}),this.child.on("error",n=>{a("[AudioMixer process error]",n)}),this.child.on("close",n=>{a(`[AudioMixer] Process exited with code ${n}`),this.child=null;for(const[r,o]of this.pending.entries())clearTimeout(o.timer),o.reject(new Error("Audio helper process exited"));if(this.pending.clear(),!this.isStopping&&this.restartAttempts<this.maxRestartAttempts){this.restartAttempts++;const r=Math.min(1e3*Math.pow(2,this.restartAttempts),1e4);this.restartTimer=setTimeout(()=>{a(`[AudioMixer] Restarting audio-helper (attempt ${this.restartAttempts})...`),this.start()},r)}}),a(`[AudioMixer] Successfully spawned audio-helper from ${t}`),this.restartAttempts=0}catch(n){a("[AudioMixer] Failed to spawn audio-helper:",n)}}handleLine(t){try{const n=JSON.parse(t);if(typeof n.id=="number"&&this.pending.has(n.id)){const{resolve:r,reject:o,timer:c}=this.pending.get(n.id);clearTimeout(c),this.pending.delete(n.id),n.success?r(n.data):o(new Error(n.error||"Unknown audio helper error"))}}catch(n){a(`[AudioMixer] Failed to parse stdout line: ${t}`,n)}}send(t,n={},r=5e3){return new Promise((o,c)=>{if((!this.child||!this.child.stdin||this.child.killed)&&(this.start(),!this.child||!this.child.stdin))return c(new Error("Audio helper is not running"));const d=++this.reqId,f={id:d,cmd:t,...n},l=setTimeout(()=>{this.pending.has(d)&&(this.pending.delete(d),c(new Error(`Command '${t}' timed out after ${r}ms`)))},r);this.pending.set(d,{resolve:o,reject:c,timer:l});try{this.child.stdin.write(JSON.stringify(f)+`
`)}catch(u){clearTimeout(l),this.pending.delete(d),c(u)}})}stop(){if(this.isStopping=!0,this.restartTimer&&(clearTimeout(this.restartTimer),this.restartTimer=null),this.child){try{this.child.stdin.write(JSON.stringify({id:0,cmd:"shutdown"})+`
`)}catch{}setTimeout(()=>{if(this.child){try{this.child.kill()}catch{}this.child=null}},400)}}}const x=new et;p.whenReady().then(()=>{x.start()});p.on("will-quit",()=>{x.stop();try{J.unregisterAll()}catch{}if(W)try{W.destroy()}catch{}});p.on("before-quit",()=>{x.stop();try{J.unregisterAll()}catch{}if(W)try{W.destroy()}catch{}});i.handle("audio-mixer:get-devices",async()=>{if(process.platform!=="win32")return{devices:[],defaultDeviceId:""};try{return await x.send("listDevices")}catch(e){return a("[audio-mixer:get-devices error]",e),{devices:[],defaultDeviceId:"",error:e.message}}});i.handle("audio-mixer:get-sessions",async(e,t)=>{if(process.platform!=="win32")return{sessions:[]};try{return await x.send("listSessions",{deviceId:t})}catch(n){return a("[audio-mixer:get-sessions error]",n),{sessions:[],error:n.message}}});i.handle("audio-mixer:set-volume",async(e,t={})=>{if(process.platform!=="win32")return!1;try{return await x.send("setSessionVolume",t)}catch(n){return a("[audio-mixer:set-volume error]",n),!1}});i.handle("audio-mixer:set-mute",async(e,t={})=>{if(process.platform!=="win32")return!1;try{return await x.send("setSessionMute",t)}catch(n){return a("[audio-mixer:set-mute error]",n),!1}});i.handle("audio-mixer:set-master-volume",async(e,t={})=>{if(process.platform!=="win32")return!1;try{return await x.send("setMasterVolume",t)}catch(n){return a("[audio-mixer:set-master-volume error]",n),!1}});i.handle("audio-mixer:set-master-mute",async(e,t={})=>{if(process.platform!=="win32")return!1;try{return await x.send("setMasterMute",t)}catch(n){return a("[audio-mixer:set-master-mute error]",n),!1}});
