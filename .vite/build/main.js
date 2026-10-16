"use strict";const{app:u,BrowserWindow:ce,screen:M,ipcMain:o,shell:G,dialog:ge,Tray:Se,Menu:be,nativeImage:re,clipboard:j,powerMonitor:H}=require("electron");u.commandLine.appendSwitch("disable-background-timer-throttling");u.commandLine.appendSwitch("disable-backgrounding-occluded-windows");u.commandLine.appendSwitch("disable-renderer-backgrounding");const f=require("node:path"),m=require("fs"),Y=require("os"),ie=require("https"),oe=require("http"),ve=require("crypto"),{EventEmitter:Te}=require("events");function B(e){const t=[f.join(__dirname,e),f.join(__dirname,"../../src",e),f.join(typeof u<"u"&&u.getAppPath?u.getAppPath():process.cwd(),"src",e),f.join(typeof u<"u"&&u.getAppPath?u.getAppPath():process.cwd(),".vite/build",e),f.join(process.cwd(),"src",e)];for(const n of t)try{if(m.existsSync(n)||m.existsSync(n+".js")||m.existsSync(f.join(n,"index.js")))return require(n)}catch{}return require(e)}const{createProgressEngine:ke}=B("services/progress"),{createNotificationEngine:Pe,NOTIFICATION_ACTION_TYPES:Ke}=B("services/notifications"),{createLauncherEngine:Ae}=B("services/launcher"),{createNotesEngine:Ie}=B("services/notes");let D=null,s=null,I=!0;function V(){try{return f.join(u.getPath("userData"),"settings.json")}catch{return f.join(process.cwd(),"settings.json")}}function xe(){try{const e=V();if(m.existsSync(e)){const t=JSON.parse(m.readFileSync(e,"utf8"));if(typeof t.alwaysOnTop=="boolean")return t.alwaysOnTop}}catch{}return!0}function Ce(e){try{const t=V();let n={};if(m.existsSync(t))try{n=JSON.parse(m.readFileSync(t,"utf8"))}catch{}n.alwaysOnTop=e,m.writeFileSync(t,JSON.stringify(n,null,2),"utf8")}catch{}}function Oe(){try{const e=V();if(m.existsSync(e)){const t=JSON.parse(m.readFileSync(e,"utf8"));if(typeof t.autoDownloadInstall=="boolean")return t.autoDownloadInstall}}catch{}return!0}function Ne(e,t){try{const n=V();let r={};if(m.existsSync(n))try{r=JSON.parse(m.readFileSync(n,"utf8"))}catch{}r[e]=t,m.writeFileSync(n,JSON.stringify(r,null,2),"utf8")}catch{}}I=xe();function g(){if(I&&!(!s||s.isDestroyed())){try{s.setAlwaysOnTop(!0,"screen-saver",1)}catch{try{s.setAlwaysOnTop(!0,"screen-saver")}catch{try{s.setAlwaysOnTop(!0)}catch{}}}try{s.moveTop()}catch{}}}function le(e){if(I=!!e,Ce(I),s&&!s.isDestroyed()){try{I?g():s.setAlwaysOnTop(!1)}catch{}try{s.webContents.send("always-on-top-changed",I)}catch{}}pe()}function Me(){try{return f.join(u.getPath("userData"),"quick-pill.log")}catch{return f.join(process.cwd(),"quick-pill.log")}}function a(e,t=null){const r=`[${new Date().toISOString()}] ${e}${t?` | Error: ${t.stack||t}`:""}
`;console.log(r.trim());try{const i=Me();m.appendFileSync(i,r,"utf8")}catch{}}process.on("uncaughtException",e=>{a("UNCAUGHT EXCEPTION (Main Process)",e)});process.on("unhandledRejection",e=>{a("UNHANDLED REJECTION (Main Process)",e)});const{exec:O,execFile:q,spawn:de}=require("child_process");function te(e){return Buffer.from(e,"utf16le").toString("base64")}o.handle("log-message",(e,t,n,r)=>{a(`[RENDERER ${String(t).toUpperCase()}] ${n} ${r?JSON.stringify(r):""}`)});o.handle("set-ignore-mouse-events",(e,t,n)=>{if(s&&!s.isDestroyed())try{if(t){const r=n!==void 0?n:!0;s.setIgnoreMouseEvents(!0,{forward:r})}else s.setIgnoreMouseEvents(!1),g();a(`setIgnoreMouseEvents(${t}, forward=${n}) executed`)}catch(r){a("Error in setIgnoreMouseEvents, falling back to forward=true",r);try{s.setIgnoreMouseEvents(!0,{forward:!0})}catch{}}});o.handle("get-always-on-top",()=>I);o.handle("set-always-on-top",(e,t)=>(le(t),I));o.handle("focus-window",()=>{s&&!s.isDestroyed()&&(g(),s.focus())});o.handle("open-external",async(e,t)=>{await G.openExternal(t)});let E=null;function b(){if(!E){let e="";try{e=u.getPath("userData")}catch{e=process.cwd()}E=Ae({userDataPath:e,shell:G,getFileIcon:(t,n)=>u.getFileIcon(t,n)})}return E}o.handle("launcher:search-apps",async(e,t,n)=>{try{return await b().searchApps(t,n)}catch(r){return a("Error in launcher:search-apps:",r),[]}});o.handle("launcher:get-catalog",async()=>{try{return await b().getCatalog()}catch(e){return a("Error in launcher:get-catalog:",e),[]}});o.handle("launcher:reindex-catalog",async()=>{try{return await b().reindexCatalog()}catch(e){return a("Error in launcher:reindex-catalog:",e),{success:!1,count:0}}});o.handle("launcher:launch-app",async(e,t)=>{try{return await b().launchApp(t)}catch(n){return a("Error in launcher:launch-app:",n),{success:!1,error:n.message}}});o.handle("launcher:get-running-windows",async(e,t)=>{try{return await b().getRunningWindows(t)}catch(n){return a("Error in launcher:get-running-windows:",n),[]}});o.handle("launcher:activate-window",async(e,t)=>{try{const n=await b().activateWindow(t);return n.success&&s&&!s.isDestroyed()&&s.webContents.send("launcher:window-activated",{hWnd:t}),n}catch(n){return a("Error in launcher:activate-window:",n),{success:!1,code:"FAILED",error:n.message}}});o.handle("launcher:get-favorites",async()=>{try{return await b().getFavorites()}catch(e){return a("Error in launcher:get-favorites:",e),[]}});o.handle("launcher:set-favorites",async(e,t)=>{try{return await b().setFavorites(t)}catch(n){return a("Error in launcher:set-favorites:",n),{success:!1}}});o.handle("workspaces:get-workspaces",async()=>{try{return await b().getWorkspaces()}catch(e){return a("Error in workspaces:get-workspaces:",e),[]}});o.handle("workspaces:save-workspace",async(e,t)=>{try{return await b().saveWorkspace(t)}catch(n){return a("Error in workspaces:save-workspace:",n),{success:!1,error:n.message}}});o.handle("workspaces:delete-workspace",async(e,t)=>{try{return await b().deleteWorkspace(t)}catch(n){return a("Error in workspaces:delete-workspace:",n),{success:!1,error:n.message}}});o.handle("workspaces:launch-workspace",async(e,t,n)=>{try{return await b().launchWorkspace(t,n)}catch(r){return a("Error in workspaces:launch-workspace:",r),{success:!1,results:[],error:r.message}}});let K=null;function T(){if(!K){let e="";try{e=u.getPath("userData")}catch{e=process.cwd()}K=Ie({userDataPath:e,clipboard:j})}return K}o.handle("notes:get-notes",async(e,t,n)=>{try{return await T().getNotes(t,n)}catch(r){return a("Error in notes:get-notes:",r),[]}});o.handle("notes:save-note",async(e,t)=>{try{const n=await T().saveNote(t);return s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"save",note:n}),n}catch(n){return a("Error in notes:save-note:",n),{success:!1,error:n.message}}});o.handle("notes:delete-note",async(e,t)=>{try{const n=await T().deleteNote(t);return n.success&&s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"delete",id:t}),n}catch(n){return a("Error in notes:delete-note:",n),{success:!1,error:n.message}}});o.handle("notes:undo-delete",async()=>{try{const e=await T().undoDelete();return e.success&&s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"restore",note:e.note}),e}catch(e){return a("Error in notes:undo-delete:",e),{success:!1,error:e.message}}});o.handle("notes:toggle-pin",async(e,t)=>{try{const n=await T().togglePin(t);return n.success&&s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"togglePin",id:t,isPinned:n.isPinned}),n}catch(n){return a("Error in notes:toggle-pin:",n),{success:!1,error:n.message}}});o.handle("notes:toggle-archive",async(e,t)=>{try{const n=await T().toggleArchive(t);return n.success&&s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"toggleArchive",id:t,isArchived:n.isArchived}),n}catch(n){return a("Error in notes:toggle-archive:",n),{success:!1,error:n.message}}});o.handle("notes:save-draft",async(e,t)=>{try{return await T().saveDraft(t)}catch(n){return a("Error in notes:save-draft:",n),{success:!1,error:n.message}}});o.handle("notes:get-draft",async()=>{try{return await T().getDraft()}catch(e){return a("Error in notes:get-draft:",e),null}});o.handle("notes:clear-draft",async()=>{try{return await T().clearDraft()}catch(e){return a("Error in notes:clear-draft:",e),{success:!1,error:e.message}}});o.handle("notes:get-contextual-capture",async(e,t)=>{try{return await T().getContextualCapture(t)}catch(n){return a("Error in notes:get-contextual-capture:",n),{success:!1,code:"CAPTURE_ERROR",error:n.message}}});o.handle("notes:search-notes",async(e,t,n)=>{try{return await T().searchNotes(t,n)}catch(r){return a("Error in notes:search-notes:",r),[]}});o.handle("notes:get-tags",async()=>{try{return await T().getTags()}catch(e){return a("Error in notes:get-tags:",e),[]}});o.handle("notes:convert-to-task",async(e,t)=>{try{return await T().convertToTask(t)}catch(n){return a("Error in notes:convert-to-task:",n),{success:!1,error:n.message}}});o.handle("launch-app",async(e,t)=>await b().launchApp(t));o.handle("build-app-cache",async()=>await b().reindexCatalog());o.handle("search-apps",async(e,t)=>await b().searchApps(t));o.handle("get-displays",()=>M.getAllDisplays().map(t=>({id:t.id,label:t.label||`Display ${t.id}`,bounds:t.bounds})));o.handle("set-display",(e,t)=>{if(s&&!s.isDestroyed()){const r=M.getAllDisplays().find(l=>l.id.toString()===t.toString())||M.getPrimaryDisplay(),{x:i,y:c,width:d,height:h}=r.bounds;s.setBounds({x:i,y:c,width:d,height:h}),s.show(),g()}});o.handle("update-window-position",(e,t,n)=>{});o.handle("set-auto-launch",(e,t)=>{try{u.setLoginItemSettings({openAtLogin:t,path:u.getPath("exe")}),t||ue()}catch(n){console.error("Failed to set login item settings on Windows:",n)}});function ue(){if(process.platform==="win32")try{const e=["electron.app.Ripple","electron.app.Electron","electron.app.Quick Pill","Ripple"];for(const t of e)O(`reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${t}" /f`,()=>{})}catch{}}const Ee=["https://raw.githubusercontent.com/nabil24024004/Quick-Pill/main/web%20app/public/version.json","https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/version.json","https://raw.githubusercontent.com/nabil24024004/Ripple/main/web%20app/public/version.json"];class We extends Te{constructor(){super(),this.manifestUrls=[...Ee],this.currentVersion=u?u.getVersion():"5.5.0",this.status="idle",this.updateInfo=null,this.downloadedFilePath=null,this.currentDownloadRequest=null,this.lastProgressEmit=0;const t=Oe();this.autoDownload=t,this.autoInstall=t}compareVersions(t,n){const r=(t||"0.0.0").replace(/^v/i,"").trim(),i=(n||"0.0.0").replace(/^v/i,"").trim(),[c,d]=r.split("-"),[h,l]=i.split("-"),p=c.split(".").map(k=>parseInt(k,10)||0),y=h.split(".").map(k=>parseInt(k,10)||0),P=Math.max(p.length,y.length);for(let k=0;k<P;k++){const F=p[k]||0,v=y[k]||0;if(F>v)return 1;if(F<v)return-1}return!d&&l?1:d&&!l?-1:d&&l?d.localeCompare(l):0}getPlatformKey(){return`win32-${process.arch}`}fetchJson(t,n=12e3,r=5){return new Promise((i,c)=>{if(r<=0)return c(new Error("Too many redirects while fetching update manifest."));const h=(t.startsWith("https")?ie:oe).get(t,{headers:{"User-Agent":`QuickPill-Updater/${this.currentVersion} (${process.platform} ${process.arch})`,Accept:"application/json, text/plain, */*"},timeout:n},l=>{if(l.statusCode>=300&&l.statusCode<400&&l.headers.location){const y=new URL(l.headers.location,t).href;return this.fetchJson(y,n,r-1).then(i).catch(c)}if(l.statusCode!==200)return l.resume(),c(new Error(`Server returned HTTP ${l.statusCode}: ${l.statusMessage}`));let p="";l.setEncoding("utf8"),l.on("data",y=>{p+=y}),l.on("end",()=>{try{const y=JSON.parse(p);i(y)}catch(y){c(new Error(`Invalid JSON received from update manifest: ${y.message}`))}})});h.on("timeout",()=>{h.destroy(),c(new Error("Connection timed out while checking for updates."))}),h.on("error",l=>{c(l)})})}async checkForUpdates(){var t,n,r;if(this.status==="checking"||this.status==="downloading")return{status:this.status,updateInfo:this.updateInfo};this.status="checking",this.emit("checking");try{let i=null,c=null;for(const l of this.manifestUrls)try{const p=`${l}${l.includes("?")?"&":"?"}_t=${Date.now()}`,y=await this.fetchJson(p);if(y&&y.version){i=y;break}}catch(p){c=p}if(!i||!i.version)throw c||new Error('Update manifest is missing required "version" field.');const d=i.version;if(this.compareVersions(d,this.currentVersion)>0){const l=this.getPlatformKey(),p=((t=i.platforms)==null?void 0:t[l])||((n=i.platforms)==null?void 0:n[`${process.platform}-x64`])||((r=i.platforms)==null?void 0:r["win32-x64"]),y=(p==null?void 0:p.url)||"";return this.updateInfo={version:d,currentVersion:this.currentVersion,name:i.name||`Quick Pill v${d}`,releaseDate:i.releaseDate||"",mandatory:!!i.mandatory,changelog:Array.isArray(i.changelog)?i.changelog:[],downloadUrl:y,sha256:(p==null?void 0:p.sha256)||"",size:(p==null?void 0:p.size)||0,installerType:(p==null?void 0:p.installerType)||"nsis"},this.status="available",this.emit("update-available",this.updateInfo),this.autoDownload&&y&&(a(`[Auto-Updater] New update v${d} detected. Automatically downloading in background...`),setTimeout(()=>{this.startDownload().catch(P=>{a("[Auto-Updater] Automatic background download failed:",P)})},1e3)),{status:"available",updateInfo:this.updateInfo}}else{this.status="not-available";const l={currentVersion:this.currentVersion,latestVersion:d};return this.emit("update-not-available",l),{status:"not-available",updateInfo:l}}}catch(i){this.status="error";const c=i.message||"Unknown error occurred while checking for updates.";return this.emit("error",c),{status:"error",error:c}}}startDownload(){if(!this.updateInfo||!this.updateInfo.downloadUrl){const c=new Error("No update available or download URL is missing.");return this.emit("error",c.message),Promise.reject(c)}if(this.status==="downloading")return Promise.resolve({status:"downloading"});this.status="downloading",this.emit("download-started",this.updateInfo);const t=u.getPath("temp"),r=`quick-pill-update-v${this.updateInfo.version}.exe`,i=f.join(t,r);return new Promise((c,d)=>{if(m.existsSync(i))try{m.unlinkSync(i)}catch{}const h=m.createWriteStream(i);let l=0,p=this.updateInfo.size||0,y=0,P=Date.now(),k=0;const F=(v,C=5)=>{if(C<=0){h.close();const $=new Error("Too many redirects while downloading update binary.");return this.status="error",this.emit("error",$.message),d($)}const J=(v.startsWith("https")?ie:oe).get(v,{headers:{"User-Agent":`QuickPill-Updater/${this.currentVersion} (${process.platform} ${process.arch})`}},$=>{if($.statusCode>=300&&$.statusCode<400&&$.headers.location){const A=new URL($.headers.location,v).href;return F(A,C-1)}if($.statusCode!==200){h.close();try{m.unlinkSync(i)}catch{}const A=new Error(`Download failed with status HTTP ${$.statusCode}: ${$.statusMessage}`);return this.status="error",this.emit("error",A.message),d(A)}const U=parseInt($.headers["content-length"],10);!isNaN(U)&&U>0&&(p=U),$.on("data",A=>{l+=A.length,h.write(A);const W=Date.now();if(W-this.lastProgressEmit>=100||l===p){const se=(W-P)/1e3;se>=.5&&(k=Math.round((l-y)/se),y=l,P=W);const $e={percent:p>0?Math.min(100,Math.round(l/p*1e3)/10):0,transferredBytes:l,totalBytes:p,speedBytesPerSec:k};this.lastProgressEmit=W,this.emit("download-progress",$e)}}),$.on("end",()=>{h.end()}),$.on("error",A=>{h.close();try{m.unlinkSync(i)}catch{}this.status="error",this.emit("error",A.message),d(A)})});this.currentDownloadRequest=J,J.on("error",$=>{h.close();try{m.unlinkSync(i)}catch{}this.status="error",this.emit("error",$.message),d($)})};h.on("finish",()=>{if(this.currentDownloadRequest=null,this.updateInfo.sha256&&this.updateInfo.sha256.trim()!=="")try{const C=ve.createHash("sha256"),ne=m.readFileSync(i);if(C.update(ne),C.digest("hex").toLowerCase()!==this.updateInfo.sha256.trim().toLowerCase()){try{m.unlinkSync(i)}catch{}const $=new Error("Integrity check failed (SHA-256 mismatch). The downloaded file might be corrupted.");return this.status="error",this.emit("error",$.message),d($)}}catch(C){console.warn("Could not verify SHA-256 checksum:",C)}this.downloadedFilePath=i,this.status="downloaded";const v={version:this.updateInfo.version,filePath:i};this.emit("update-downloaded",v),c(v),this.autoInstall&&(a(`[Auto-Updater] Update v${this.updateInfo.version} downloaded successfully. Automatically installing in background in 2 seconds...`),setTimeout(()=>{this.installAndRelaunch()},2e3))}),h.on("error",v=>{try{m.unlinkSync(i)}catch{}this.status="error",this.emit("error",v.message),d(v)}),F(this.updateInfo.downloadUrl)})}cancelDownload(){if(this.currentDownloadRequest){try{this.currentDownloadRequest.destroy()}catch{}this.currentDownloadRequest=null}this.status="idle",this.emit("download-cancelled")}installAndRelaunch(){if(!this.downloadedFilePath||!m.existsSync(this.downloadedFilePath)){const n=new Error("No downloaded update file found to install.");return this.emit("error",n.message),!1}const t=this.downloadedFilePath;try{return de(t,["/S"],{detached:!0,stdio:"ignore"}).unref(),setTimeout(()=>{u?(u.isQuitting=!0,u.quit()):process.exit(0)},300),!0}catch(n){return this.emit("error",`Failed to launch installer: ${n.message}`),!1}}}const S=new We;function N(e,t){s&&!s.isDestroyed()&&s.webContents.send("update-event",{event:e,data:t})}S.on("checking",()=>N("checking"));S.on("update-available",e=>N("available",e));S.on("update-not-available",e=>N("not-available",e));S.on("download-started",e=>N("download-started",e));S.on("download-progress",e=>N("download-progress",e));S.on("update-downloaded",e=>N("downloaded",e));S.on("download-cancelled",()=>N("cancelled"));S.on("error",e=>N("error",e));o.handle("check-for-updates",async()=>await S.checkForUpdates());o.handle("start-update-download",async()=>await S.startDownload());o.handle("cancel-update-download",()=>(S.cancelDownload(),!0));o.handle("install-update",()=>S.installAndRelaunch());o.handle("get-app-version",()=>u.getVersion());o.handle("get-auto-download-install",()=>S.autoDownload&&S.autoInstall);o.handle("set-auto-download-install",(e,t)=>{const n=!!t;return S.autoDownload=n,S.autoInstall=n,Ne("autoDownloadInstall",n),n});const _=ke({autoUpdater:S,openPath:async e=>{try{m.existsSync(e)&&(m.statSync(e).isDirectory()?await G.openPath(e):G.showItemInFolder(e))}catch(t){a("[progress openPath error]",t)}}});_.coordinator.on("update",e=>{s&&!s.isDestroyed()&&s.webContents.send("progress:update",e)});o.handle("progress:get-snapshot",()=>_.coordinator.getSnapshot());o.handle("progress:execute-action",async(e,t,n,r)=>await _.coordinator.executeAction(t,n,r));o.handle("progress:start-file-op",async(e,t)=>await _.fileOpsProvider.startCopy(t));o.handle("progress:start-hash-op",async(e,t)=>await _.fileOpsProvider.startHash(t));o.handle("progress:clear-history",()=>(_.registry.clearHistory(),!0));o.handle("progress:select-file",async()=>{if(!s)return null;const e=await ge.showOpenDialog(s,{properties:["openFile"]});return e.canceled||!e.filePaths.length?null:e.filePaths[0]});const ee=(e=null)=>{const t=e||"ico";try{const n=f.join(u.getAppPath(),`src/assets/icons/icon.${t}`);if(m.existsSync(n))return n}catch{}try{const n=f.join(process.resourcesPath,`icon.${t}`);if(m.existsSync(n))return n;const r=f.join(process.resourcesPath,`assets/icons/icon.${t}`);if(m.existsSync(r))return r}catch{}return f.join(__dirname,`../../src/assets/icons/icon.${t}`)},ae=()=>{const e=M.getPrimaryDisplay(),{x:t,y:n,width:r,height:i}=e.bounds,c=r,d=i,h=t,l=n;s=new ce({width:c,height:d,x:h,y:l,backgroundColor:"#00000000",transparent:!0,alwaysOnTop:!0,resizable:!1,minimizable:!1,maximizable:!1,fullscreenable:!1,frame:!1,thickFrame:!1,hasShadow:!1,skipTaskbar:!0,icon:ee(),type:"toolbar",fullscreen:!1,visibleOnFullScreen:!0,acceptFirstMouse:!0,webPreferences:{preload:f.join(__dirname,"preload.js"),devTools:!u.isPackaged,backgroundThrottling:!1},show:!0}),s.setIgnoreMouseEvents(!0,{forward:!0}),s.once("ready-to-show",()=>{s&&(s.show(),g(),s.focus())}),s.on("blur",()=>{g()}),s.on("minimize",()=>{s&&!s.isDestroyed()&&(s.restore(),g())}),s.on("restore",()=>{g()}),s.on("show",()=>{g()}),setTimeout(()=>{s&&!s.isVisible()&&(s.show(),g(),s.focus())},5e3),s.on("closed",()=>{s=null});try{s.setVisibleOnAllWorkspaces(!0,{visibleOnFullScreen:!0})}catch{}if(!u.isPackaged&&process.env.NODE_ENV==="development")s.loadURL("http://localhost:5173");else{const p=[f.join(__dirname,"../renderer/main_window/index.html"),f.join(u.getAppPath(),".vite/renderer/main_window/index.html"),f.join(u.getAppPath(),"dist/index.html"),f.join(__dirname,"index.html"),f.join(u.getAppPath(),"index.html")];let y=!1;for(const P of p)if(m.existsSync(P)){a(`Loading renderer from: ${P}`),s.loadFile(P),y=!0;break}y||(a("No packaged renderer HTML found, falling back to localhost:5173"),s.loadURL("http://localhost:5173"))}};function pe(){if(!D||D.isDestroyed())return;const e=be.buildFromTemplate([{label:"Show/Hide Quick Pill",click:()=>{s&&(s.isVisible()?s.hide():(s.show(),g()))}},{label:"Always on Top",type:"checkbox",checked:I,click:t=>{le(t.checked)}},{type:"separator"},{label:"Quit",click:()=>{u.quit()}}]);D.setContextMenu(e)}u.whenReady().then(()=>{u.setAppUserModelId("com.neosparkx.quickpill"),ue(),ae(),Re(),Ge(),b().getCatalog().catch(e=>a("Failed to warm launcher catalog:",e)),u.on("activate",()=>{ce.getAllWindows().length===0&&ae()});try{let e=ee(),t=re.createFromPath(e);t.isEmpty()&&(e=ee("png"),t=re.createFromPath(e));const n=t.isEmpty()?e:t.resize({width:16,height:16});D=new Se(n),D.setToolTip("Quick Pill"),pe()}catch(e){console.error("Failed to create tray:",e)}M.on("display-metrics-changed",()=>{g()}),M.on("display-added",()=>{g()}),M.on("display-removed",()=>{g()}),H&&(H.on("resume",()=>{s&&!s.isDestroyed()&&s.webContents.send("system-resume");try{typeof w<"u"&&(w!=null&&w.registry)&&w.registry.checkSnoozedDue()}catch{}setTimeout(g,500),setTimeout(g,2e3)}),H.on("unlock-screen",()=>{s&&!s.isDestroyed()&&s.webContents.send("system-resume");try{typeof w<"u"&&(w!=null&&w.registry)&&w.registry.checkSnoozedDue()}catch{}setTimeout(g,500),setTimeout(g,2e3)})),setInterval(()=>{if(I&&s&&!s.isDestroyed()&&s.isVisible())if(!s.isAlwaysOnTop())g();else try{s.moveTop()}catch{}},2500),setTimeout(()=>{S.checkForUpdates().catch(e=>{a("Auto-update check on startup error:",e)})},4e3),setInterval(()=>{S.checkForUpdates().catch(e=>{a("Periodic background update check error:",e)})},2*60*60*1e3)});const he=f.join(u.getPath("userData"),"get-media.ps1"),De=`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
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
`,me=f.join(u.getPath("userData"),"control-media.ps1"),_e=`param([string]$command = "playpause", [double]$seekSeconds = 0)

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
`;try{m.writeFileSync(he,De,"utf8")}catch(e){console.error("Failed to write get-media.ps1 script:",e)}try{m.writeFileSync(me,_e,"utf8")}catch(e){console.error("Failed to write control-media.ps1 script:",e)}let z=!1;o.handle("get-system-media",async()=>z?null:(z=!0,new Promise(e=>{const t=n=>{z=!1,e(n)};q("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-File",he],{maxBuffer:10*1024*1024,encoding:"utf8"},(n,r)=>{if(n||!r||r.trim()==="null"||r.trim()==="'null'"){O(`powershell -NoProfile -Command "Get-Process | Where-Object {$_.ProcessName -eq 'Spotify'} | Select-Object MainWindowTitle"`,{encoding:"utf8"},(i,c)=>{var h;if(i||!c)return t(null);const d=(h=c.split(`
`).find(l=>l.includes("-")))==null?void 0:h.trim();if(d){const l=d.split(" - ");let p="Unknown",y=d;l.length>1&&(p=l[0].trim(),y=l.slice(1).join(" - ").trim()),t({name:y||d,artist:p||"Unknown",state:"playing",source:"Spotify",position:0,duration:0})}else t(null)});return}try{const i=JSON.parse(r.trim());if(!i||!i.Title&&!i.Artist)return t(null);t({name:i.Title||"Unknown Title",artist:i.Artist||"Unknown Artist",album:i.Album||"",artwork_url:i.Artwork||null,state:i.Status==="playing"?"playing":"paused",source:i.Source||"System",position:Number(i.Position)||0,duration:Number(i.Duration)||0})}catch{t(null)}})})));o.handle("get-bluetooth-status",async()=>new Promise(e=>{const n=Buffer.from(`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$devs = @(Get-PnpDevice -Class Bluetooth -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'OK' -and $_.Present -eq $true -and $_.InstanceId -match 'BTHENUM' })
$names = @($devs | ForEach-Object { $_.FriendlyName })
@{ connected = ($devs.Count -gt 0); devices = $names } | ConvertTo-Json -Compress
`,"utf16le").toString("base64");O(`powershell -NoProfile -EncodedCommand ${n}`,(r,i)=>{if(r||!i)return e({connected:!1,devices:[]});try{const c=JSON.parse(i.trim());e({connected:!!c.connected,devices:Array.isArray(c.devices)?c.devices:c.devices?[c.devices]:[]})}catch{e({connected:!1,devices:[]})}})}));o.handle("get-camera-status",async()=>new Promise(e=>{q("reg",["query","HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam","/s"],(t,n)=>{if(t||!n)return e(!1);const r=n.match(/LastUsedTimeStop\s+REG_QWORD\s+0x0\b/i);e(!!r)})}));o.handle("get-microphone-status",async()=>new Promise(e=>{q("reg",["query","HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone","/s"],(t,n)=>{if(t||!n)return e(!1);const r=n.match(/LastUsedTimeStop\s+REG_QWORD\s+0x0\b/i);e(!!r)})}));u.on("window-all-closed",()=>{D||u.quit()});o.handle("control-system-media",async(e,t,...n)=>{const r=typeof n[0]=="number"?n[0]:0;a(`Executing media control: ${t} ${r>0?`(seek: ${r}s)`:""}`),q("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-File",me,"-command",t,"-seekSeconds",r.toString()],{timeout:4e3},i=>{i&&a("Media control error:",i)})});let R=null;function Fe(){const e=Y.cpus();if(!e||e.length===0)return 0;if(!R||R.length!==e.length)return R=e,0;let t=0,n=0;for(let i=0;i<e.length;i++){const c=e[i],d=R[i];let h=c.times.idle-d.times.idle,l=0;for(const p in c.times)l+=c.times[p]-d.times[p];t+=h,n+=l}if(R=e,n===0)return 0;const r=t/n;return Math.max(0,Math.min(100,Math.round((1-r)*100)))}function Ue(){const e=Y.totalmem(),t=Y.freemem();return e?Math.max(0,Math.min(100,Math.round((e-t)/e*100))):0}o.handle("get-system-metrics",async()=>({cpu:Fe(),ram:Ue()}));o.handle("get-clipboard-text",async()=>{try{return j.readText()}catch{return""}});o.handle("write-clipboard-text",async(e,t)=>{try{return t?j.writeText(t):j.clear(),!0}catch{return!1}});o.handle("clear-clipboard",async()=>{try{return j.clear(),!0}catch{return!1}});o.handle("control-system-volume",async(e,t)=>{if(process.platform==="win32"){let n="0xAF";t==="down"&&(n="0xAE"),t==="mute"&&(n="0xAD");const r=`
$type = '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);'
$MediaKey = Add-Type -MemberDefinition $type -Name "WinVolKey" -Namespace "WinAPI" -PassThru
$MediaKey::keybd_event(${n}, 0, 0, [UIntPtr]::Zero)
$MediaKey::keybd_event(${n}, 0, 2, [UIntPtr]::Zero)
`,i=te(r);return O(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${i}`,c=>{c&&a("Volume control error:",c)}),!0}return!1});let Q=null,Z=null;function Re(){if(process.platform!=="win32")return;let e=!1;setInterval(()=>{!s||s.isDestroyed()||e||(e=!0,O('powershell -NoProfile -Command "[Console]::CapsLock; [Console]::NumberLock"',(t,n)=>{var d,h;if(e=!1,t||!n)return;const r=n.trim().split(/\r?\n/),i=((d=r[0])==null?void 0:d.trim().toLowerCase())==="true",c=((h=r[1])==null?void 0:h.trim().toLowerCase())==="true";Q!==null&&i!==Q&&s&&!s.isDestroyed()&&s.webContents.send("key-lock-change",{key:"CapsLock",state:i}),Z!==null&&c!==Z&&s&&!s.isDestroyed()&&s.webContents.send("key-lock-change",{key:"NumLock",state:c}),Q=i,Z=c}))},2e3)}let L=null;function Ge(){if(process.platform!=="win32")return;let e=!1;setInterval(()=>{!s||s.isDestroyed()||e||(e=!0,O("wmic logicaldisk where drivetype=2 get name,volumename /format:csv",(t,n)=>{var c,d;if(e=!1,t)return;const r=new Map,i=n.trim().split(/\r?\n/).filter(h=>h.trim()&&!h.startsWith("Node"));for(const h of i){const l=h.trim().split(",");if(l.length>=3){const p=(c=l[1])==null?void 0:c.trim(),y=((d=l[2])==null?void 0:d.trim())||"USB Drive";p&&r.set(p,y)}}if(L!==null&&s&&!s.isDestroyed()){for(const[h,l]of r)L.has(h)||s.webContents.send("usb-change",{action:"connected",drive:h,name:l});for(const[h]of L)r.has(h)||s.webContents.send("usb-change",{action:"disconnected",drive:h,name:"USB Drive"})}L=r}))},5e3)}const fe=f.join(u.getPath("userData"),"get-notifications.ps1"),je=`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
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
`;try{m.writeFileSync(fe,je,"utf8")}catch(e){a("Failed to write get-notifications.ps1:",e)}function qe(){try{const e=f.join(u.getPath("userData"),"notifications-store.json");if(m.existsSync(e))return JSON.parse(m.readFileSync(e,"utf8"))}catch(e){a("Failed to load notifications-store.json:",e)}return null}function Le(e){try{const t=f.join(u.getPath("userData"),"notifications-store.json");m.writeFileSync(t,JSON.stringify(e,null,2),"utf8")}catch(t){a("Failed to save notifications-store.json:",t)}}async function Be(e){return process.platform!=="win32"||!e?!1:new Promise(t=>{const n=`
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
`,r=te(n);O(`powershell -NoProfile -EncodedCommand ${r}`,(i,c)=>{t((c==null?void 0:c.trim())==="true")})})}async function ye(e){return process.platform!=="win32"||!e?!1:new Promise(t=>{const n=e.split("!")[0].split("_")[0].replace(/\./g,""),r=`
$type = '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);'
$fw = Add-Type -MemberDefinition $type -Name "FW" -Namespace "WinAPI" -PassThru
$procs = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and ($_.ProcessName -match '${n}' -or $_.MainWindowTitle -match '${n}') } | Select-Object -First 1
if ($procs) { [void]$fw::SetForegroundWindow($procs.MainWindowHandle); Write-Output "true" } else { Write-Output "false" }
`,i=te(r);O(`powershell -NoProfile -EncodedCommand ${i}`,(c,d)=>{t((d==null?void 0:d.trim())==="true")})})}const w=Pe({savePersistence:Le,initialPersistedData:qe(),removeNotificationSource:Be,focusApp:ye,openExternal:async e=>G.openExternal(e)});w.registry.on("change",e=>{s&&!s.isDestroyed()&&s.webContents.send("notification:update",e)});setInterval(()=>{try{w.registry.checkSnoozedDue()}catch{}},1e4);let X=!1;async function we(){return process.platform!=="win32"?[]:X?[]:(X=!0,new Promise(e=>{q("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-File",fe],{maxBuffer:5*1024*1024,encoding:"utf8",timeout:1e4},(t,n)=>{if(X=!1,t||!n)return e([]);try{const r=JSON.parse(n.trim()),i=Array.isArray(r)?r:r?[r]:[];w.syncNotifications(i,"windows-notification-listener"),e(i)}catch{e([])}})}))}o.handle("get-notifications",async()=>await we());o.handle("dismiss-notification",async(e,t)=>{const n=await w.dismiss(t);return!!(n!=null&&n.success)});o.handle("focus-notification-app",async(e,t)=>await ye(t));o.handle("notification:get-snapshot",()=>w.getSnapshot());o.handle("notification:sync-now",async()=>(await we(),w.getSnapshot()));o.handle("notification:execute-action",async(e,t,n,r)=>await w.executeAction(t,n,r));o.handle("notification:snooze",(e,t,n,r)=>w.snooze(t,n,r));o.handle("notification:cancel-snooze",(e,t)=>w.cancelSnooze(t));o.handle("notification:dismiss",async(e,t)=>await w.dismiss(t));o.handle("notification:dismiss-group",(e,t)=>w.dismissGroup(t));o.handle("notification:clear-all",()=>w.clearAllActive());o.handle("notification:undo-dismiss",(e,t)=>w.undoDismiss(t));o.handle("notification:mark-reviewed",(e,t)=>w.markReviewed(t));o.handle("notification:mark-all-reviewed",()=>w.markAllReviewed());o.handle("notification:set-hide-previews",(e,t)=>(w.setHidePreviews(t),!0));o.handle("notification:set-app-excluded",(e,t,n)=>(w.setAppExcluded(t,n),!0));o.handle("notification:clear-history",()=>(w.clearHistory(),!0));function Ve(){const e=[f.join(process.resourcesPath,"audio-helper.exe"),f.join(process.resourcesPath,"native","bin","audio-helper.exe"),f.join(process.resourcesPath,"native","audio-helper.exe"),f.join(u.getAppPath(),"native","bin","audio-helper.exe"),f.join(__dirname,"..","native","bin","audio-helper.exe"),f.join(__dirname,"native","bin","audio-helper.exe"),f.join(process.cwd(),"native","bin","audio-helper.exe")];for(const t of e)try{if(m.existsSync(t))return t}catch{}return null}class Je{constructor(){this.child=null,this.reqId=0,this.pending=new Map,this.buffer="",this.isStopping=!1,this.restartAttempts=0,this.maxRestartAttempts=5,this.restartTimer=null}start(){if(process.platform!=="win32"||this.child&&!this.child.killed)return;const t=Ve();if(!t){a("[AudioMixer] audio-helper.exe not found in search paths.");return}try{this.child=de(t,[],{stdio:["pipe","pipe","pipe"],windowsHide:!0}),this.child.stdout.on("data",n=>{this.buffer+=n.toString("utf8");let r;for(;(r=this.buffer.indexOf(`
`))!==-1;){const i=this.buffer.slice(0,r).trim();this.buffer=this.buffer.slice(r+1),i&&this.handleLine(i)}}),this.child.stderr.on("data",n=>{a(`[AudioMixer stderr] ${n.toString("utf8").trim()}`)}),this.child.on("error",n=>{a("[AudioMixer process error]",n)}),this.child.on("close",n=>{a(`[AudioMixer] Process exited with code ${n}`),this.child=null;for(const[r,i]of this.pending.entries())clearTimeout(i.timer),i.reject(new Error("Audio helper process exited"));if(this.pending.clear(),!this.isStopping&&this.restartAttempts<this.maxRestartAttempts){this.restartAttempts++;const r=Math.min(1e3*Math.pow(2,this.restartAttempts),1e4);this.restartTimer=setTimeout(()=>{a(`[AudioMixer] Restarting audio-helper (attempt ${this.restartAttempts})...`),this.start()},r)}}),a(`[AudioMixer] Successfully spawned audio-helper from ${t}`),this.restartAttempts=0}catch(n){a("[AudioMixer] Failed to spawn audio-helper:",n)}}handleLine(t){try{const n=JSON.parse(t);if(typeof n.id=="number"&&this.pending.has(n.id)){const{resolve:r,reject:i,timer:c}=this.pending.get(n.id);clearTimeout(c),this.pending.delete(n.id),n.success?r(n.data):i(new Error(n.error||"Unknown audio helper error"))}}catch(n){a(`[AudioMixer] Failed to parse stdout line: ${t}`,n)}}send(t,n={},r=5e3){return new Promise((i,c)=>{if((!this.child||!this.child.stdin||this.child.killed)&&(this.start(),!this.child||!this.child.stdin))return c(new Error("Audio helper is not running"));const d=++this.reqId,h={id:d,cmd:t,...n},l=setTimeout(()=>{this.pending.has(d)&&(this.pending.delete(d),c(new Error(`Command '${t}' timed out after ${r}ms`)))},r);this.pending.set(d,{resolve:i,reject:c,timer:l});try{this.child.stdin.write(JSON.stringify(h)+`
`)}catch(p){clearTimeout(l),this.pending.delete(d),c(p)}})}stop(){if(this.isStopping=!0,this.restartTimer&&(clearTimeout(this.restartTimer),this.restartTimer=null),this.child){try{this.child.stdin.write(JSON.stringify({id:0,cmd:"shutdown"})+`
`)}catch{}setTimeout(()=>{if(this.child){try{this.child.kill()}catch{}this.child=null}},400)}}}const x=new Je;u.whenReady().then(()=>{x.start()});u.on("will-quit",()=>{if(x.stop(),E)try{E.destroy()}catch{}});u.on("before-quit",()=>{if(x.stop(),E)try{E.destroy()}catch{}});o.handle("audio-mixer:get-devices",async()=>{if(process.platform!=="win32")return{devices:[],defaultDeviceId:""};try{return await x.send("listDevices")}catch(e){return a("[audio-mixer:get-devices error]",e),{devices:[],defaultDeviceId:"",error:e.message}}});o.handle("audio-mixer:get-sessions",async(e,t)=>{if(process.platform!=="win32")return{sessions:[]};try{return await x.send("listSessions",{deviceId:t})}catch(n){return a("[audio-mixer:get-sessions error]",n),{sessions:[],error:n.message}}});o.handle("audio-mixer:set-volume",async(e,t={})=>{if(process.platform!=="win32")return!1;try{return await x.send("setSessionVolume",t)}catch(n){return a("[audio-mixer:set-volume error]",n),!1}});o.handle("audio-mixer:set-mute",async(e,t={})=>{if(process.platform!=="win32")return!1;try{return await x.send("setSessionMute",t)}catch(n){return a("[audio-mixer:set-mute error]",n),!1}});o.handle("audio-mixer:set-master-volume",async(e,t={})=>{if(process.platform!=="win32")return!1;try{return await x.send("setMasterVolume",t)}catch(n){return a("[audio-mixer:set-master-volume error]",n),!1}});o.handle("audio-mixer:set-master-mute",async(e,t={})=>{if(process.platform!=="win32")return!1;try{return await x.send("setMasterMute",t)}catch(n){return a("[audio-mixer:set-master-mute error]",n),!1}});
