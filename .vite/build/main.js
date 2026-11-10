"use strict";const{app:p,BrowserWindow:we,screen:E,ipcMain:o,shell:X,dialog:lt,Tray:Ne,Menu:Me,nativeImage:ce,clipboard:B,powerMonitor:ee,globalShortcut:z}=require("electron");p.commandLine.appendSwitch("disable-background-timer-throttling");p.commandLine.appendSwitch("disable-backgrounding-occluded-windows");p.commandLine.appendSwitch("disable-renderer-backgrounding");const y=require("node:path"),f=require("fs"),le=require("os"),me=require("https"),ye=require("http"),Oe=require("crypto"),{EventEmitter:We}=require("events");function H(n){const e=[y.join(__dirname,n),y.join(__dirname,"../../src",n),y.join(typeof p<"u"&&p.getAppPath?p.getAppPath():process.cwd(),"src",n),y.join(typeof p<"u"&&p.getAppPath?p.getAppPath():process.cwd(),".vite/build",n),y.join(process.cwd(),"src",n)];for(const t of e)try{if(f.existsSync(t)||f.existsSync(t+".js")||f.existsSync(y.join(t,"index.js")))return require(t)}catch{}return require(n)}const{createNotificationEngine:De,NOTIFICATION_ACTION_TYPES:dt}=H("services/notifications"),{createLauncherEngine:_e}=H("services/launcher"),{createNotesEngine:Re}=H("services/notes"),{createShelfEngine:Fe}=H("services/shelf"),{fetchPrayerTimes:Ue,calculateOfflinePrayerTimes:ut}=H("services/prayer");let U=null,s=null,I=!0;function L(){try{return y.join(p.getPath("userData"),"settings.json")}catch{return y.join(process.cwd(),"settings.json")}}function Ge(){try{const n=L();if(f.existsSync(n)){const e=JSON.parse(f.readFileSync(n,"utf8"));if(typeof e.alwaysOnTop=="boolean")return e.alwaysOnTop}}catch{}return!0}function Le(n){try{const e=L();let t={};if(f.existsSync(e))try{t=JSON.parse(f.readFileSync(e,"utf8"))}catch{}t.alwaysOnTop=n,f.writeFileSync(e,JSON.stringify(t,null,2),"utf8")}catch{}}function je(){try{const n=L();if(f.existsSync(n)){const e=JSON.parse(f.readFileSync(n,"utf8"));if(typeof e.autoDownloadInstall=="boolean")return e.autoDownloadInstall}}catch{}return!0}function qe(n,e){try{const t=L();let r={};if(f.existsSync(t))try{r=JSON.parse(f.readFileSync(t,"utf8"))}catch{}r[n]=e,f.writeFileSync(t,JSON.stringify(r,null,2),"utf8")}catch{}}I=Ge();function w(){if(I&&!(!s||s.isDestroyed())){try{s.setAlwaysOnTop(!0,"screen-saver",1)}catch{try{s.setAlwaysOnTop(!0,"screen-saver")}catch{try{s.setAlwaysOnTop(!0)}catch{}}}try{s.moveTop()}catch{}}}function $e(n){if(I=!!n,Le(I),s&&!s.isDestroyed()){try{I?w():s.setAlwaysOnTop(!1)}catch{}try{s.webContents.send("always-on-top-changed",I)}catch{}}ke()}function Be(){try{return y.join(p.getPath("userData"),"quick-pill.log")}catch{return y.join(process.cwd(),"quick-pill.log")}}function c(n,e=null){const r=`[${new Date().toISOString()}] ${n}${e?` | Error: ${e.stack||e}`:""}
`;console.log(r.trim());try{const i=Be();f.appendFileSync(i,r,"utf8")}catch{}}process.on("uncaughtException",n=>{c("UNCAUGHT EXCEPTION (Main Process)",n)});process.on("unhandledRejection",n=>{c("UNHANDLED REJECTION (Main Process)",n)});const G={0:"Alt+B",1:"Alt+W",2:"Alt+O",12:"Alt+A",14:"Alt+L",15:"Alt+Q",3:"Alt+M",4:"Alt+C",5:"Alt+N",6:"Alt+G",7:"Alt+V",8:"Alt+T",10:"Alt+R",16:"Alt+F",17:"Alt+P",9:"Alt+S"};let te=[];function be(){try{const n=L();if(f.existsSync(n)){const e=JSON.parse(f.readFileSync(n,"utf8"));if(e&&typeof e.tabShortcuts=="object"&&e.tabShortcuts!==null)return{...G,...e.tabShortcuts}}}catch{}return{...G}}function Se(n){try{const e=L();let t={};if(f.existsSync(e))try{t=JSON.parse(f.readFileSync(e,"utf8"))}catch{}return t.tabShortcuts=n,f.writeFileSync(e,JSON.stringify(t,null,2),"utf8"),!0}catch(e){return c("Failed to save tabShortcuts preference:",e),!1}}function Ve(n){if(!(!s||s.isDestroyed()))try{s.isVisible()||s.show(),w(),s.focus(),s.webContents.send("open-tab-instant",Number(n))}catch(e){c(`Failed to openTabInstant for tab ${n}:`,e)}}function ue(n){for(const t of te)try{z.unregister(t)}catch{}te=[];const e=n||be();for(const[t,r]of Object.entries(e)){if(!r||typeof r!="string"||!r.trim())continue;const i=r.trim();if(i.toUpperCase().includes("CTRL")||i.toUpperCase().includes("CONTROL")){c(`Refusing to register shortcut with Ctrl: ${i}`);continue}try{z.register(i,()=>{Ve(parseInt(t,10))})?te.push(i):c(`Global shortcut conflict/in-use for ${i} (tab ${t})`)}catch(a){c(`Error registering global shortcut ${i}:`,a)}}}const{exec:N,execFile:J,spawn:pe}=require("child_process");function Y(n){return Buffer.from(n,"utf16le").toString("base64")}o.handle("log-message",(n,e,t,r)=>{c(`[RENDERER ${String(e).toUpperCase()}] ${t} ${r?JSON.stringify(r):""}`)});o.handle("log-renderer-error",(n,e)=>{c(`[RENDERER ERROR] Unhandled Renderer Exception ${JSON.stringify(e)}`)});let C=!0,ve=!1,x=null,Q=!1;o.on("update-island-bounds",(n,e)=>{e&&typeof e.left=="number"&&typeof e.right=="number"&&(x=e)});o.handle("set-ignore-mouse-events",(n,e,t,r)=>{if(s&&!s.isDestroyed())try{if(!e&&Q)return;if(C=!!e,ve=!!(e&&r),e){const i=t!==void 0?t:!0;s.setIgnoreMouseEvents(!0,{forward:i})}else s.setIgnoreMouseEvents(!1),w();c(`setIgnoreMouseEvents(${e}, forward=${t}) executed`)}catch(i){c("Error in setIgnoreMouseEvents, falling back to forward=true",i);try{C=!0,s.setIgnoreMouseEvents(!0,{forward:!0})}catch{}}});o.handle("get-always-on-top",()=>I);o.handle("set-always-on-top",(n,e)=>($e(e),I));o.handle("focus-window",()=>{s&&!s.isDestroyed()&&(w(),s.focus())});o.handle("open-external",async(n,e)=>{await X.openExternal(e)});let _=null;function S(){if(!_){let n="";try{n=p.getPath("userData")}catch{n=process.cwd()}_=_e({userDataPath:n,shell:X,getFileIcon:(e,t)=>p.getFileIcon(e,t)})}return _}o.handle("launcher:search-apps",async(n,e,t)=>{try{return await S().searchApps(e,t)}catch(r){return c("Error in launcher:search-apps:",r),[]}});o.handle("launcher:get-catalog",async()=>{try{return await S().getCatalog()}catch(n){return c("Error in launcher:get-catalog:",n),[]}});o.handle("launcher:reindex-catalog",async()=>{try{return await S().reindexCatalog()}catch(n){return c("Error in launcher:reindex-catalog:",n),{success:!1,count:0}}});o.handle("launcher:launch-app",async(n,e)=>{try{return await S().launchApp(e)}catch(t){return c("Error in launcher:launch-app:",t),{success:!1,error:t.message}}});o.handle("launcher:get-running-windows",async(n,e)=>{try{return await S().getRunningWindows(e)}catch(t){return c("Error in launcher:get-running-windows:",t),[]}});o.handle("launcher:activate-window",async(n,e)=>{try{const t=await S().activateWindow(e);return t.success&&s&&!s.isDestroyed()&&s.webContents.send("launcher:window-activated",{hWnd:e}),t}catch(t){return c("Error in launcher:activate-window:",t),{success:!1,code:"FAILED",error:t.message}}});o.handle("launcher:get-favorites",async()=>{try{return await S().getFavorites()}catch(n){return c("Error in launcher:get-favorites:",n),[]}});o.handle("launcher:set-favorites",async(n,e)=>{try{return await S().setFavorites(e)}catch(t){return c("Error in launcher:set-favorites:",t),{success:!1}}});o.handle("workspaces:get-workspaces",async()=>{try{return await S().getWorkspaces()}catch(n){return c("Error in workspaces:get-workspaces:",n),[]}});o.handle("workspaces:save-workspace",async(n,e)=>{try{return await S().saveWorkspace(e)}catch(t){return c("Error in workspaces:save-workspace:",t),{success:!1,error:t.message}}});o.handle("workspaces:delete-workspace",async(n,e)=>{try{return await S().deleteWorkspace(e)}catch(t){return c("Error in workspaces:delete-workspace:",t),{success:!1,error:t.message}}});o.handle("workspaces:launch-workspace",async(n,e,t)=>{try{return await S().launchWorkspace(e,t)}catch(r){return c("Error in workspaces:launch-workspace:",r),{success:!1,results:[],error:r.message}}});let ne=null;function A(){if(!ne){let n="";try{n=p.getPath("userData")}catch{n=process.cwd()}ne=Re({userDataPath:n,clipboard:B})}return ne}o.handle("notes:get-notes",async(n,e,t)=>{try{return await A().getNotes(e,t)}catch(r){return c("Error in notes:get-notes:",r),[]}});o.handle("notes:save-note",async(n,e)=>{try{const t=await A().saveNote(e);return s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"save",note:t}),t}catch(t){return c("Error in notes:save-note:",t),{success:!1,error:t.message}}});o.handle("notes:delete-note",async(n,e)=>{try{const t=await A().deleteNote(e);return t.success&&s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"delete",id:e}),t}catch(t){return c("Error in notes:delete-note:",t),{success:!1,error:t.message}}});o.handle("notes:undo-delete",async()=>{try{const n=await A().undoDelete();return n.success&&s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"restore",note:n.note}),n}catch(n){return c("Error in notes:undo-delete:",n),{success:!1,error:n.message}}});o.handle("notes:toggle-pin",async(n,e)=>{try{const t=await A().togglePin(e);return t.success&&s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"togglePin",id:e,isPinned:t.isPinned}),t}catch(t){return c("Error in notes:toggle-pin:",t),{success:!1,error:t.message}}});o.handle("notes:toggle-archive",async(n,e)=>{try{const t=await A().toggleArchive(e);return t.success&&s&&!s.isDestroyed()&&s.webContents.send("notes:updated",{action:"toggleArchive",id:e,isArchived:t.isArchived}),t}catch(t){return c("Error in notes:toggle-archive:",t),{success:!1,error:t.message}}});o.handle("notes:save-draft",async(n,e)=>{try{return await A().saveDraft(e)}catch(t){return c("Error in notes:save-draft:",t),{success:!1,error:t.message}}});o.handle("notes:get-draft",async()=>{try{return await A().getDraft()}catch(n){return c("Error in notes:get-draft:",n),null}});o.handle("notes:clear-draft",async()=>{try{return await A().clearDraft()}catch(n){return c("Error in notes:clear-draft:",n),{success:!1,error:n.message}}});o.handle("notes:get-contextual-capture",async(n,e)=>{try{return await A().getContextualCapture(e)}catch(t){return c("Error in notes:get-contextual-capture:",t),{success:!1,code:"CAPTURE_ERROR",error:t.message}}});o.handle("notes:search-notes",async(n,e,t)=>{try{return await A().searchNotes(e,t)}catch(r){return c("Error in notes:search-notes:",r),[]}});o.handle("notes:get-tags",async()=>{try{return await A().getTags()}catch(n){return c("Error in notes:get-tags:",n),[]}});o.handle("notes:convert-to-task",async(n,e)=>{try{return await A().convertToTask(e)}catch(t){return c("Error in notes:convert-to-task:",t),{success:!1,error:t.message}}});let se=null;function R(){return se||(se=Fe({app:p,shell:X,nativeImage:ce})),se}o.handle("shelf:get-items",async()=>{try{return R().getItems()}catch(n){return c("Error in shelf:get-items:",n),[]}});o.handle("shelf:add-files",async(n,e)=>{try{const t=await R().addFiles(e);return s&&!s.isDestroyed()&&s.webContents.send("shelf:update",t),t}catch(t){return c("Error in shelf:add-files:",t),[]}});o.handle("shelf:remove-item",async(n,e)=>{try{const t=R().removeItem(e);return s&&!s.isDestroyed()&&s.webContents.send("shelf:update",t),t}catch(t){return c("Error in shelf:remove-item:",t),[]}});o.handle("shelf:clear",async()=>{try{const n=R().clearShelf();return s&&!s.isDestroyed()&&s.webContents.send("shelf:update",n),n}catch(n){return c("Error in shelf:clear:",n),[]}});o.handle("shelf:open-file",async(n,e)=>{try{return await R().openFile(e)}catch(t){return c("Error in shelf:open-file:",t),!1}});o.handle("shelf:show-in-folder",async(n,e)=>{try{return R().showInFolder(e)}catch(t){return c("Error in shelf:show-in-folder:",t),!1}});class He{constructor(){this.child=null,this.isStopping=!1}start(){if(process.platform==="win32"&&!(this.child&&!this.child.killed))try{const e=y.join(p.getPath("userData"),"drag-passthrough.ps1");f.writeFileSync(e,`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$code = 'using System; using System.Runtime.InteropServices; public static class WinDragHelper { [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr hWnd, int nIndex); [DllImport("user32.dll")] public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong); [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vKey); public static void SetClickThrough(long hwndVal, bool transparent) { IntPtr hWnd = new IntPtr(hwndVal); int exStyle = GetWindowLong(hWnd, -20); if (transparent) { SetWindowLong(hWnd, -20, exStyle | 0x00000020 | 0x00080000); } else { SetWindowLong(hWnd, -20, exStyle & ~0x00000020); } } }'
Add-Type -TypeDefinition $code
while ($null -ne ($line = [Console]::In.ReadLine())) {
  $parts = $line.Trim().Split(' ')
  if ($parts.Length -ge 2) {
    $cmd = $parts[0]
    $hwnd = [long]$parts[1]
    if ($cmd -eq "ENABLE") {
      $delay = if ($parts.Length -ge 3) { [int]$parts[2] } else { 75 }
      Start-Sleep -Milliseconds $delay
      if ([WinDragHelper]::GetAsyncKeyState(1) -lt 0) {
        [WinDragHelper]::SetClickThrough($hwnd, $true)
      }
    } elseif ($cmd -eq "RESTORE") {
      [WinDragHelper]::SetClickThrough($hwnd, $false)
    }
  }
}
`,"utf8"),this.child=pe("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-File",e],{stdio:["pipe","ignore","ignore"],windowsHide:!0}),this.child.on("close",()=>{this.child=null,this.isStopping||setTimeout(()=>this.start(),1500)}),this.child.on("error",()=>{this.child=null})}catch(e){c("Failed to start WinDragPassThroughHelper:",e)}}getMainWindowHwnd(){if(!s||s.isDestroyed())return 0;try{const e=s.getNativeWindowHandle();return!e||e.length<4?0:e.length>=8?Number(e.readBigUInt64LE(0)):e.readUInt32LE(0)}catch{return 0}}scheduleClickThrough(e=75){var r,i;const t=this.getMainWindowHwnd();if(t){(!this.child||!this.child.stdin||this.child.killed)&&this.start();try{(i=(r=this.child)==null?void 0:r.stdin)==null||i.write(`ENABLE ${t} ${e}
`)}catch{}}}restore(){var t,r;const e=this.getMainWindowHwnd();if(e)try{(r=(t=this.child)==null?void 0:t.stdin)==null||r.write(`RESTORE ${e}
`)}catch{}}stop(){if(this.isStopping=!0,this.child){try{this.child.kill()}catch{}this.child=null}}}const V=new He;o.on("shelf:start-drag",(n,e,t)=>{if(t&&typeof t.left=="number"&&typeof t.right=="number"&&(x=t),Q=!0,s&&!s.isDestroyed())try{C=!1,s.setIgnoreMouseEvents(!1);const r=s.getBounds(),i=x&&typeof x.left=="number"?x:{left:Math.round(r.width/2-285),top:0,right:Math.round(r.width/2+285),bottom:190},a={x:Math.max(0,Math.floor(i.left-20)),y:Math.max(0,Math.floor(i.top-10)),width:Math.max(200,Math.ceil(i.right-i.left+40)),height:Math.max(60,Math.ceil(i.bottom-i.top+30))};s.setShape([a]),V.scheduleClickThrough(75)}catch(r){c("Warning preparing window for shelf:start-drag:",r)}try{c(`[Shelf] startDrag initiated for: ${e}`);const r=R().startDrag(e,n.sender);c(`[Shelf] startDrag completed (started=${r}) for: ${e}`)}catch(r){c("Error in shelf:start-drag:",r)}finally{if(Q=!1,s&&!s.isDestroyed()){try{s.setShape([])}catch{}try{const r=E.getCursorScreenPoint(),i=s.getBounds(),a=r.x-i.x,d=r.y-i.y,u=x||{left:Math.round(i.width/2-285),top:0,right:Math.round(i.width/2+285),bottom:190};a>=u.left-12&&a<=u.right+12&&d>=u.top-10&&d<=u.bottom+14?(V.restore(),C=!1,s.setIgnoreMouseEvents(!1)):(C=!0,s.setIgnoreMouseEvents(!0,{forward:!0}))}catch{try{C=!0,s.setIgnoreMouseEvents(!0,{forward:!0})}catch{}}try{s.webContents.send("shelf:drag-ended")}catch{}}}});o.handle("prayer:get-timings",async(n,e,t)=>{try{return await Ue(e,t)}catch(r){return c("Error in prayer:get-timings:",r),null}});o.handle("shortcuts:get-tab-shortcuts",()=>be());o.handle("shortcuts:set-tab-shortcuts",(n,e)=>{if(!e||typeof e!="object")return{success:!1,error:"Invalid shortcuts object"};const t={};for(const[i,a]of Object.entries(e))if(typeof a=="string"){const d=a.toUpperCase();if(d.includes("CTRL")||d.includes("CONTROL"))return{success:!1,error:"Ctrl cannot be used in tab shortcuts (reserved for Click-Through)"};t[i]=a.trim()}const r={...G,...t};return Se(r),ue(r),{success:!0,shortcuts:r}});o.handle("shortcuts:reset-tab-shortcuts",()=>(Se(G),ue(G),{success:!0,shortcuts:G}));o.handle("launch-app",async(n,e)=>await S().launchApp(e));o.handle("build-app-cache",async()=>await S().reindexCatalog());o.handle("search-apps",async(n,e)=>await S().searchApps(e));o.handle("get-displays",()=>E.getAllDisplays().map(e=>({id:e.id,label:e.label||`Display ${e.id}`,bounds:e.bounds})));o.handle("set-display",(n,e)=>{if(s&&!s.isDestroyed()){const r=E.getAllDisplays().find(l=>l.id.toString()===e.toString())||E.getPrimaryDisplay(),{x:i,y:a,width:d,height:u}=r.bounds;s.setBounds({x:i,y:a,width:d,height:u}),s.show(),w()}});o.handle("update-window-position",(n,e,t)=>{});o.handle("set-auto-launch",(n,e)=>{try{p.setLoginItemSettings({openAtLogin:e,path:p.getPath("exe")}),e||Te()}catch(t){console.error("Failed to set login item settings on Windows:",t)}});function Te(){if(process.platform==="win32")try{const n=["electron.app.Ripple","electron.app.Electron","electron.app.Quick Pill","Ripple"];for(const e of n)N(`reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${e}" /f`,()=>{})}catch{}}const Je=["https://raw.githubusercontent.com/nabil24024004/Quick-Pill/main/web%20app/public/version.json","https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/version.json","https://raw.githubusercontent.com/nabil24024004/Ripple/main/web%20app/public/version.json"];class Ke extends We{constructor(){super(),this.manifestUrls=[...Je],this.currentVersion=p?p.getVersion():"5.6.0",this.status="idle",this.updateInfo=null,this.downloadedFilePath=null,this.currentDownloadRequest=null,this.lastProgressEmit=0;const e=je();this.autoDownload=e,this.autoInstall=e}compareVersions(e,t){const r=(e||"0.0.0").replace(/^v/i,"").trim(),i=(t||"0.0.0").replace(/^v/i,"").trim(),[a,d]=r.split("-"),[u,l]=i.split("-"),h=a.split(".").map(T=>parseInt(T,10)||0),m=u.split(".").map(T=>parseInt(T,10)||0),v=Math.max(h.length,m.length);for(let T=0;T<v;T++){const O=h[T]||0,k=m[T]||0;if(O>k)return 1;if(O<k)return-1}return!d&&l?1:d&&!l?-1:d&&l?d.localeCompare(l):0}getPlatformKey(){return`win32-${process.arch}`}fetchJson(e,t=12e3,r=5){return new Promise((i,a)=>{if(r<=0)return a(new Error("Too many redirects while fetching update manifest."));const u=(e.startsWith("https")?me:ye).get(e,{headers:{"User-Agent":`QuickPill-Updater/${this.currentVersion} (${process.platform} ${process.arch})`,Accept:"application/json, text/plain, */*"},timeout:t},l=>{if(l.statusCode>=300&&l.statusCode<400&&l.headers.location){const m=new URL(l.headers.location,e).href;return this.fetchJson(m,t,r-1).then(i).catch(a)}if(l.statusCode!==200)return l.resume(),a(new Error(`Server returned HTTP ${l.statusCode}: ${l.statusMessage}`));let h="";l.setEncoding("utf8"),l.on("data",m=>{h+=m}),l.on("end",()=>{try{const m=JSON.parse(h);i(m)}catch(m){a(new Error(`Invalid JSON received from update manifest: ${m.message}`))}})});u.on("timeout",()=>{u.destroy(),a(new Error("Connection timed out while checking for updates."))}),u.on("error",l=>{a(l)})})}async checkForUpdates(){var e,t,r;if(this.status==="checking"||this.status==="downloading")return{status:this.status,updateInfo:this.updateInfo};this.status="checking",this.emit("checking");try{let i=null,a=null;for(const l of this.manifestUrls)try{const h=`${l}${l.includes("?")?"&":"?"}_t=${Date.now()}`,m=await this.fetchJson(h);if(m&&m.version){i=m;break}}catch(h){a=h}if(!i||!i.version)throw a||new Error('Update manifest is missing required "version" field.');const d=i.version;if(this.compareVersions(d,this.currentVersion)>0){const l=this.getPlatformKey(),h=((e=i.platforms)==null?void 0:e[l])||((t=i.platforms)==null?void 0:t[`${process.platform}-x64`])||((r=i.platforms)==null?void 0:r["win32-x64"]),m=(h==null?void 0:h.url)||"";return this.updateInfo={version:d,currentVersion:this.currentVersion,name:i.name||`Quick Pill v${d}`,releaseDate:i.releaseDate||"",mandatory:!!i.mandatory,changelog:Array.isArray(i.changelog)?i.changelog:[],downloadUrl:m,sha256:(h==null?void 0:h.sha256)||"",size:(h==null?void 0:h.size)||0,installerType:(h==null?void 0:h.installerType)||"nsis"},this.status="available",this.emit("update-available",this.updateInfo),this.autoDownload&&m&&(c(`[Auto-Updater] New update v${d} detected. Automatically downloading in background...`),setTimeout(()=>{this.startDownload().catch(v=>{c("[Auto-Updater] Automatic background download failed:",v)})},1e3)),{status:"available",updateInfo:this.updateInfo}}else{this.status="not-available";const l={currentVersion:this.currentVersion,latestVersion:d};return this.emit("update-not-available",l),{status:"not-available",updateInfo:l}}}catch(i){this.status="error";const a=i.message||"Unknown error occurred while checking for updates.";return this.emit("error",a),{status:"error",error:a}}}startDownload(){if(!this.updateInfo||!this.updateInfo.downloadUrl){const a=new Error("No update available or download URL is missing.");return this.emit("error",a.message),Promise.reject(a)}if(this.status==="downloading")return Promise.resolve({status:"downloading"});this.status="downloading",this.emit("download-started",this.updateInfo);const e=p.getPath("temp"),r=`quick-pill-update-v${this.updateInfo.version}.exe`,i=y.join(e,r);return new Promise((a,d)=>{if(f.existsSync(i))try{f.unlinkSync(i)}catch{}const u=f.createWriteStream(i);let l=0,h=this.updateInfo.size||0,m=0,v=Date.now(),T=0;const O=(k,W=5)=>{if(W<=0){u.close();const $=new Error("Too many redirects while downloading update binary.");return this.status="error",this.emit("error",$.message),d($)}const Z=(k.startsWith("https")?me:ye).get(k,{headers:{"User-Agent":`QuickPill-Updater/${this.currentVersion} (${process.platform} ${process.arch})`}},$=>{if($.statusCode>=300&&$.statusCode<400&&$.headers.location){const P=new URL($.headers.location,k).href;return O(P,W-1)}if($.statusCode!==200){u.close();try{f.unlinkSync(i)}catch{}const P=new Error(`Download failed with status HTTP ${$.statusCode}: ${$.statusMessage}`);return this.status="error",this.emit("error",P.message),d(P)}const j=parseInt($.headers["content-length"],10);!isNaN(j)&&j>0&&(h=j),$.on("data",P=>{l+=P.length,u.write(P);const F=Date.now();if(F-this.lastProgressEmit>=100||l===h){const fe=(F-v)/1e3;fe>=.5&&(T=Math.round((l-m)/fe),m=l,v=F);const Ee={percent:h>0?Math.min(100,Math.round(l/h*1e3)/10):0,transferredBytes:l,totalBytes:h,speedBytesPerSec:T};this.lastProgressEmit=F,this.emit("download-progress",Ee)}}),$.on("end",()=>{u.end()}),$.on("error",P=>{u.close();try{f.unlinkSync(i)}catch{}this.status="error",this.emit("error",P.message),d(P)})});this.currentDownloadRequest=Z,Z.on("error",$=>{u.close();try{f.unlinkSync(i)}catch{}this.status="error",this.emit("error",$.message),d($)})};u.on("finish",()=>{if(this.currentDownloadRequest=null,this.updateInfo.sha256&&this.updateInfo.sha256.trim()!=="")try{const W=Oe.createHash("sha256"),he=f.readFileSync(i);if(W.update(he),W.digest("hex").toLowerCase()!==this.updateInfo.sha256.trim().toLowerCase()){try{f.unlinkSync(i)}catch{}const $=new Error("Integrity check failed (SHA-256 mismatch). The downloaded file might be corrupted.");return this.status="error",this.emit("error",$.message),d($)}}catch(W){console.warn("Could not verify SHA-256 checksum:",W)}this.downloadedFilePath=i,this.status="downloaded";const k={version:this.updateInfo.version,filePath:i};this.emit("update-downloaded",k),a(k),this.autoInstall&&(c(`[Auto-Updater] Update v${this.updateInfo.version} downloaded successfully. Automatically installing in background in 2 seconds...`),setTimeout(()=>{this.installAndRelaunch()},2e3))}),u.on("error",k=>{try{f.unlinkSync(i)}catch{}this.status="error",this.emit("error",k.message),d(k)}),O(this.updateInfo.downloadUrl)})}cancelDownload(){if(this.currentDownloadRequest){try{this.currentDownloadRequest.destroy()}catch{}this.currentDownloadRequest=null}this.status="idle",this.emit("download-cancelled")}installAndRelaunch(){if(!this.downloadedFilePath||!f.existsSync(this.downloadedFilePath)){const t=new Error("No downloaded update file found to install.");return this.emit("error",t.message),!1}const e=this.downloadedFilePath;try{return pe(e,["/S"],{detached:!0,stdio:"ignore"}).unref(),setTimeout(()=>{p?(p.isQuitting=!0,p.quit()):process.exit(0)},300),!0}catch(t){return this.emit("error",`Failed to launch installer: ${t.message}`),!1}}}const b=new Ke;function D(n,e){s&&!s.isDestroyed()&&s.webContents.send("update-event",{event:n,data:e})}b.on("checking",()=>D("checking"));b.on("update-available",n=>D("available",n));b.on("update-not-available",n=>D("not-available",n));b.on("download-started",n=>D("download-started",n));b.on("download-progress",n=>D("download-progress",n));b.on("update-downloaded",n=>D("downloaded",n));b.on("download-cancelled",()=>D("cancelled"));b.on("error",n=>D("error",n));o.handle("check-for-updates",async()=>await b.checkForUpdates());o.handle("start-update-download",async()=>await b.startDownload());o.handle("cancel-update-download",()=>(b.cancelDownload(),!0));o.handle("install-update",()=>b.installAndRelaunch());o.handle("get-app-version",()=>p.getVersion());o.handle("get-auto-download-install",()=>b.autoDownload&&b.autoInstall);o.handle("set-auto-download-install",(n,e)=>{const t=!!e;return b.autoDownload=t,b.autoInstall=t,qe("autoDownloadInstall",t),t});const de=(n=null)=>{const e=n||"ico";try{const t=y.join(p.getAppPath(),`src/assets/icons/icon.${e}`);if(f.existsSync(t))return t}catch{}try{const t=y.join(process.resourcesPath,`icon.${e}`);if(f.existsSync(t))return t;const r=y.join(process.resourcesPath,`assets/icons/icon.${e}`);if(f.existsSync(r))return r}catch{}return y.join(__dirname,`../../src/assets/icons/icon.${e}`)},ge=()=>{const n=E.getPrimaryDisplay(),{x:e,y:t,width:r,height:i}=n.bounds,a=r,d=i,u=e,l=t;s=new we({width:a,height:d,x:u,y:l,backgroundColor:"#00000000",transparent:!0,alwaysOnTop:!0,resizable:!1,minimizable:!1,maximizable:!1,fullscreenable:!1,frame:!1,thickFrame:!1,hasShadow:!1,skipTaskbar:!0,icon:de(),type:"toolbar",fullscreen:!1,visibleOnFullScreen:!0,acceptFirstMouse:!0,webPreferences:{preload:y.join(__dirname,"preload.js"),devTools:!p.isPackaged,backgroundThrottling:!1},show:!0}),s.setIgnoreMouseEvents(!0,{forward:!0}),s.once("ready-to-show",()=>{s&&(s.show(),w(),s.focus())}),s.webContents.on("console-message",(h,m,v,T,O)=>{m>=2&&c(`[RENDERER CONSOLE ${m===3?"ERROR":"WARN"}] (${O?y.basename(O):"unknown"}:${T}) ${v}`)}),s.webContents.on("render-process-gone",(h,m)=>{if(c(`[RENDERER PROCESS GONE] reason=${m==null?void 0:m.reason}, exitCode=${m==null?void 0:m.exitCode}`),s&&!s.isDestroyed())try{s.setIgnoreMouseEvents(!0,{forward:!0})}catch{}}),s.on("blur",()=>{w()}),s.on("minimize",()=>{s&&!s.isDestroyed()&&(s.restore(),w())}),s.on("restore",()=>{w()}),s.on("show",()=>{w()}),setTimeout(()=>{s&&!s.isVisible()&&(s.show(),w(),s.focus())},5e3),s.on("closed",()=>{s=null});try{s.setVisibleOnAllWorkspaces(!0,{visibleOnFullScreen:!0})}catch{}if(!p.isPackaged&&process.env.NODE_ENV==="development")s.loadURL("http://localhost:5173");else{const h=[y.join(__dirname,"../renderer/main_window/index.html"),y.join(p.getAppPath(),".vite/renderer/main_window/index.html"),y.join(p.getAppPath(),"dist/index.html"),y.join(__dirname,"index.html"),y.join(p.getAppPath(),"index.html")];let m=!1;for(const v of h)if(f.existsSync(v)){c(`Loading renderer from: ${v}`),s.loadFile(v),m=!0;break}m||(c("No packaged renderer HTML found, falling back to localhost:5173"),s.loadURL("http://localhost:5173"))}};function ke(){if(!U||U.isDestroyed())return;const n=Me.buildFromTemplate([{label:"Show/Hide Quick Pill",click:()=>{s&&(s.isVisible()?s.hide():(s.show(),w()))}},{label:"Always on Top",type:"checkbox",checked:I,click:e=>{$e(e.checked)}},{type:"separator"},{label:"Quit",click:()=>{p.quit()}}]);U.setContextMenu(n)}p.whenReady().then(()=>{p.setAppUserModelId("com.neosparkx.quickpill"),Te(),ge(),Ze(),et(),ue(),S().getCatalog().catch(e=>c("Failed to warm launcher catalog:",e)),p.on("activate",()=>{we.getAllWindows().length===0&&ge()});try{let e=de(),t=ce.createFromPath(e);t.isEmpty()&&(e=de("png"),t=ce.createFromPath(e));const r=t.isEmpty()?e:t.resize({width:16,height:16});U=new Ne(r),U.setToolTip("Quick Pill"),ke()}catch(e){console.error("Failed to create tray:",e)}E.on("display-metrics-changed",()=>{w()}),E.on("display-added",()=>{w()}),E.on("display-removed",()=>{w()}),ee&&(ee.on("resume",()=>{s&&!s.isDestroyed()&&s.webContents.send("system-resume");try{typeof g<"u"&&(g!=null&&g.registry)&&g.registry.checkSnoozedDue()}catch{}setTimeout(w,500),setTimeout(w,2e3)}),ee.on("unlock-screen",()=>{s&&!s.isDestroyed()&&s.webContents.send("system-resume");try{typeof g<"u"&&(g!=null&&g.registry)&&g.registry.checkSnoozedDue()}catch{}setTimeout(w,500),setTimeout(w,2e3)})),setInterval(()=>{if(I&&s&&!s.isDestroyed()&&s.isVisible())if(!s.isAlwaysOnTop())w();else try{s.moveTop()}catch{}},2500);let n=!1;setInterval(()=>{if(!(!s||s.isDestroyed()||!s.isVisible())&&!(ve||Q))try{const e=E.getCursorScreenPoint(),t=s.getBounds(),r=e.x-t.x,i=e.y-t.y,a=x&&typeof x.left=="number"?x:{left:Math.round(t.width/2-140),top:0,right:Math.round(t.width/2+140),bottom:50};r>=a.left-12&&r<=a.right+12&&i>=a.top-10&&i<=a.bottom+14?(n=!1,C&&(C=!1,s.setIgnoreMouseEvents(!1),w(),s.webContents.send("island:cursor-entered",{x:r,y:i}))):C||(r<a.left-35||r>a.right+35||i<a.top-25||i>a.bottom+35)&&(C=!0,s.setIgnoreMouseEvents(!0,{forward:!0}),n||(n=!0,s.webContents.send("island:cursor-outside",{x:r,y:i})))}catch{}},90),setTimeout(()=>{b.checkForUpdates().catch(e=>{c("Auto-update check on startup error:",e)})},4e3),setInterval(()=>{b.checkForUpdates().catch(e=>{c("Periodic background update check error:",e)})},2*60*60*1e3)});const Ae=y.join(p.getPath("userData"),"get-media.ps1"),ze=`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
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
`,Pe=y.join(p.getPath("userData"),"control-media.ps1"),Qe=`param([string]$command = "playpause", [double]$seekSeconds = 0)

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
`;try{f.writeFileSync(Ae,ze,"utf8")}catch(n){console.error("Failed to write get-media.ps1 script:",n)}try{f.writeFileSync(Pe,Qe,"utf8")}catch(n){console.error("Failed to write control-media.ps1 script:",n)}let re=!1;o.handle("get-system-media",async()=>re?null:(re=!0,new Promise(n=>{const e=t=>{re=!1,n(t)};J("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-File",Ae],{maxBuffer:10*1024*1024,encoding:"utf8"},(t,r)=>{if(t||!r||r.trim()==="null"||r.trim()==="'null'"){N(`powershell -NoProfile -Command "Get-Process | Where-Object {$_.ProcessName -eq 'Spotify'} | Select-Object MainWindowTitle"`,{encoding:"utf8"},(i,a)=>{var u;if(i||!a)return e(null);const d=(u=a.split(`
`).find(l=>l.includes("-")))==null?void 0:u.trim();if(d){const l=d.split(" - ");let h="Unknown",m=d;l.length>1&&(h=l[0].trim(),m=l.slice(1).join(" - ").trim()),e({name:m||d,artist:h||"Unknown",state:"playing",source:"Spotify",position:0,duration:0})}else e(null)});return}try{const i=JSON.parse(r.trim());if(!i||!i.Title&&!i.Artist)return e(null);e({name:i.Title||"Unknown Title",artist:i.Artist||"Unknown Artist",album:i.Album||"",artwork_url:i.Artwork||null,state:i.Status==="playing"?"playing":"paused",source:i.Source||"System",position:Number(i.Position)||0,duration:Number(i.Duration)||0})}catch{e(null)}})})));o.handle("get-bluetooth-status",async()=>new Promise(n=>{const t=Buffer.from(`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$devs = @(Get-PnpDevice -Class Bluetooth -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'OK' -and $_.Present -eq $true -and $_.InstanceId -match 'BTHENUM' })
$names = @($devs | ForEach-Object { $_.FriendlyName })
@{ connected = ($devs.Count -gt 0); devices = $names } | ConvertTo-Json -Compress
`,"utf16le").toString("base64");N(`powershell -NoProfile -EncodedCommand ${t}`,(r,i)=>{if(r||!i)return n({connected:!1,devices:[]});try{const a=JSON.parse(i.trim());n({connected:!!a.connected,devices:Array.isArray(a.devices)?a.devices:a.devices?[a.devices]:[]})}catch{n({connected:!1,devices:[]})}})}));o.handle("get-camera-status",async()=>new Promise(n=>{J("reg",["query","HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam","/s"],(e,t)=>{if(e||!t)return n(!1);const r=t.match(/LastUsedTimeStop\s+REG_QWORD\s+0x0\b/i);n(!!r)})}));o.handle("get-microphone-status",async()=>new Promise(n=>{J("reg",["query","HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone","/s"],(e,t)=>{if(e||!t)return n(!1);const r=t.match(/LastUsedTimeStop\s+REG_QWORD\s+0x0\b/i);n(!!r)})}));p.on("window-all-closed",()=>{U||p.quit()});o.handle("control-system-media",async(n,e,...t)=>{const r=typeof t[0]=="number"?t[0]:0;c(`Executing media control: ${e} ${r>0?`(seek: ${r}s)`:""}`),J("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-File",Pe,"-command",e,"-seekSeconds",r.toString()],{timeout:4e3},i=>{i&&c("Media control error:",i)})});let q=null;function Xe(){const n=le.cpus();if(!n||n.length===0)return 0;if(!q||q.length!==n.length)return q=n,0;let e=0,t=0;for(let i=0;i<n.length;i++){const a=n[i],d=q[i];let u=a.times.idle-d.times.idle,l=0;for(const h in a.times)l+=a.times[h]-d.times[h];e+=u,t+=l}if(q=n,t===0)return 0;const r=e/t;return Math.max(0,Math.min(100,Math.round((1-r)*100)))}function Ye(){const n=le.totalmem(),e=le.freemem();return n?Math.max(0,Math.min(100,Math.round((n-e)/n*100))):0}o.handle("get-system-metrics",async()=>({cpu:Xe(),ram:Ye()}));o.handle("get-clipboard-text",async()=>{try{return B.readText()}catch{return""}});o.handle("write-clipboard-text",async(n,e)=>{try{return e?B.writeText(e):B.clear(),!0}catch{return!1}});o.handle("clear-clipboard",async()=>{try{return B.clear(),!0}catch{return!1}});o.handle("control-system-volume",async(n,e)=>{if(process.platform==="win32"){let t="0xAF";e==="down"&&(t="0xAE"),e==="mute"&&(t="0xAD");const r=`
$type = '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);'
$MediaKey = Add-Type -MemberDefinition $type -Name "WinVolKey" -Namespace "WinAPI" -PassThru
$MediaKey::keybd_event(${t}, 0, 0, [UIntPtr]::Zero)
$MediaKey::keybd_event(${t}, 0, 2, [UIntPtr]::Zero)
`,i=Y(r);return N(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${i}`,a=>{a&&c("Volume control error:",a)}),!0}return!1});let ie=null,oe=null;function Ze(){if(process.platform!=="win32")return;let n=!1;setInterval(()=>{!s||s.isDestroyed()||n||(n=!0,N('powershell -NoProfile -Command "[Console]::CapsLock; [Console]::NumberLock"',(e,t)=>{var d,u;if(n=!1,e||!t)return;const r=t.trim().split(/\r?\n/),i=((d=r[0])==null?void 0:d.trim().toLowerCase())==="true",a=((u=r[1])==null?void 0:u.trim().toLowerCase())==="true";ie!==null&&i!==ie&&s&&!s.isDestroyed()&&s.webContents.send("key-lock-change",{key:"CapsLock",state:i}),oe!==null&&a!==oe&&s&&!s.isDestroyed()&&s.webContents.send("key-lock-change",{key:"NumLock",state:a}),ie=i,oe=a}))},2e3)}let K=null;function et(){if(process.platform!=="win32")return;let n=!1;setInterval(()=>{!s||s.isDestroyed()||n||(n=!0,N("wmic logicaldisk where drivetype=2 get name,volumename /format:csv",(e,t)=>{var a,d;if(n=!1,e)return;const r=new Map,i=t.trim().split(/\r?\n/).filter(u=>u.trim()&&!u.startsWith("Node"));for(const u of i){const l=u.trim().split(",");if(l.length>=3){const h=(a=l[1])==null?void 0:a.trim(),m=((d=l[2])==null?void 0:d.trim())||"USB Drive";h&&r.set(h,m)}}if(K!==null&&s&&!s.isDestroyed()){for(const[u,l]of r)K.has(u)||s.webContents.send("usb-change",{action:"connected",drive:u,name:l});for(const[u]of K)r.has(u)||s.webContents.send("usb-change",{action:"disconnected",drive:u,name:"USB Drive"})}K=r}))},5e3)}const Ie=y.join(p.getPath("userData"),"get-notifications.ps1"),tt=`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
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
`;try{f.writeFileSync(Ie,tt,"utf8")}catch(n){c("Failed to write get-notifications.ps1:",n)}function nt(){try{const n=y.join(p.getPath("userData"),"notifications-store.json");if(f.existsSync(n))return JSON.parse(f.readFileSync(n,"utf8"))}catch(n){c("Failed to load notifications-store.json:",n)}return null}function st(n){try{const e=y.join(p.getPath("userData"),"notifications-store.json");f.writeFileSync(e,JSON.stringify(n,null,2),"utf8")}catch(e){c("Failed to save notifications-store.json:",e)}}async function rt(n){return process.platform!=="win32"||!n?!1:new Promise(e=>{const t=`
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
    $listener.RemoveNotification(${n})
    Write-Output "true"
} catch { Write-Output "false" }
`,r=Y(t);N(`powershell -NoProfile -EncodedCommand ${r}`,(i,a)=>{e((a==null?void 0:a.trim())==="true")})})}async function it(){return process.platform!=="win32"?!1:new Promise(n=>{const t=Y(`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
try {
    $listener = [Windows.UI.Notifications.Management.UserNotificationListener, Windows.UI.Notifications, ContentType = WindowsRuntime]::Current
    $listener.ClearNotifications()
    Write-Output "true"
} catch { Write-Output "false" }
`);N(`powershell -NoProfile -EncodedCommand ${t}`,(r,i)=>{n((i==null?void 0:i.trim())==="true")})})}async function Ce(n){return process.platform!=="win32"||!n?!1:new Promise(e=>{const t=n.split("!")[0].split("_")[0].replace(/\./g,""),r=`
$type = '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);'
$fw = Add-Type -MemberDefinition $type -Name "FW" -Namespace "WinAPI" -PassThru
$procs = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and ($_.ProcessName -match '${t}' -or $_.MainWindowTitle -match '${t}') } | Select-Object -First 1
if ($procs) { [void]$fw::SetForegroundWindow($procs.MainWindowHandle); Write-Output "true" } else { Write-Output "false" }
`,i=Y(r);N(`powershell -NoProfile -EncodedCommand ${i}`,(a,d)=>{e((d==null?void 0:d.trim())==="true")})})}const g=De({savePersistence:st,initialPersistedData:nt(),removeNotificationSource:rt,focusApp:Ce,openExternal:async n=>X.openExternal(n)});g.registry.on("change",n=>{s&&!s.isDestroyed()&&s.webContents.send("notification:update",n)});setInterval(()=>{try{g.registry.checkSnoozedDue()}catch{}},1e4);let ae=!1;async function xe(){return process.platform!=="win32"?[]:ae?[]:(ae=!0,new Promise(n=>{J("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-File",Ie],{maxBuffer:5*1024*1024,encoding:"utf8",timeout:1e4},(e,t)=>{if(ae=!1,e||!t)return n([]);try{const r=JSON.parse(t.trim()),i=Array.isArray(r)?r:r?[r]:[];g.syncNotifications(i,"windows-notification-listener"),n(i)}catch{n([])}})}))}o.handle("get-notifications",async()=>await xe());o.handle("dismiss-notification",async(n,e)=>{const t=await g.dismiss(e);return!!(t!=null&&t.success)});o.handle("focus-notification-app",async(n,e)=>await Ce(e));o.handle("notification:get-snapshot",()=>g.getSnapshot());o.handle("notification:sync-now",async()=>(await xe(),g.getSnapshot()));o.handle("notification:execute-action",async(n,e,t,r)=>await g.executeAction(e,t,r));o.handle("notification:snooze",(n,e,t,r)=>g.snooze(e,t,r));o.handle("notification:cancel-snooze",(n,e)=>g.cancelSnooze(e));o.handle("notification:dismiss",async(n,e)=>await g.dismiss(e));o.handle("notification:dismiss-group",(n,e)=>g.dismissGroup(e));o.handle("notification:clear-all",async()=>{try{await it()}catch{}return g.clearAllActive()});o.handle("notification:undo-dismiss",(n,e)=>g.undoDismiss(e));o.handle("notification:mark-reviewed",(n,e)=>g.markReviewed(e));o.handle("notification:mark-all-reviewed",()=>g.markAllReviewed());o.handle("notification:set-hide-previews",(n,e)=>(g.setHidePreviews(e),!0));o.handle("notification:set-app-excluded",(n,e,t)=>(g.setAppExcluded(e,t),!0));o.handle("notification:clear-history",()=>(g.clearHistory(),!0));function ot(){const n=[y.join(process.resourcesPath,"audio-helper.exe"),y.join(process.resourcesPath,"native","bin","audio-helper.exe"),y.join(process.resourcesPath,"native","audio-helper.exe"),y.join(p.getAppPath(),"native","bin","audio-helper.exe"),y.join(__dirname,"..","native","bin","audio-helper.exe"),y.join(__dirname,"native","bin","audio-helper.exe"),y.join(process.cwd(),"native","bin","audio-helper.exe")];for(const e of n)try{if(f.existsSync(e))return e}catch{}return null}class at{constructor(){this.child=null,this.reqId=0,this.pending=new Map,this.buffer="",this.isStopping=!1,this.restartAttempts=0,this.maxRestartAttempts=5,this.restartTimer=null}start(){if(process.platform!=="win32"||this.child&&!this.child.killed)return;const e=ot();if(!e){c("[AudioMixer] audio-helper.exe not found in search paths.");return}try{this.child=pe(e,[],{stdio:["pipe","pipe","pipe"],windowsHide:!0}),this.child.stdout.on("data",t=>{this.buffer+=t.toString("utf8");let r;for(;(r=this.buffer.indexOf(`
`))!==-1;){const i=this.buffer.slice(0,r).trim();this.buffer=this.buffer.slice(r+1),i&&this.handleLine(i)}}),this.child.stderr.on("data",t=>{c(`[AudioMixer stderr] ${t.toString("utf8").trim()}`)}),this.child.on("error",t=>{c("[AudioMixer process error]",t)}),this.child.on("close",t=>{c(`[AudioMixer] Process exited with code ${t}`),this.child=null;for(const[r,i]of this.pending.entries())clearTimeout(i.timer),i.reject(new Error("Audio helper process exited"));if(this.pending.clear(),!this.isStopping&&this.restartAttempts<this.maxRestartAttempts){this.restartAttempts++;const r=Math.min(1e3*Math.pow(2,this.restartAttempts),1e4);this.restartTimer=setTimeout(()=>{c(`[AudioMixer] Restarting audio-helper (attempt ${this.restartAttempts})...`),this.start()},r)}}),c(`[AudioMixer] Successfully spawned audio-helper from ${e}`),this.restartAttempts=0}catch(t){c("[AudioMixer] Failed to spawn audio-helper:",t)}}handleLine(e){try{const t=JSON.parse(e);if(typeof t.id=="number"&&this.pending.has(t.id)){const{resolve:r,reject:i,timer:a}=this.pending.get(t.id);clearTimeout(a),this.pending.delete(t.id),t.success?r(t.data):i(new Error(t.error||"Unknown audio helper error"))}}catch(t){c(`[AudioMixer] Failed to parse stdout line: ${e}`,t)}}send(e,t={},r=5e3){return new Promise((i,a)=>{if((!this.child||!this.child.stdin||this.child.killed)&&(this.start(),!this.child||!this.child.stdin))return a(new Error("Audio helper is not running"));const d=++this.reqId,u={id:d,cmd:e,...t},l=setTimeout(()=>{this.pending.has(d)&&(this.pending.delete(d),a(new Error(`Command '${e}' timed out after ${r}ms`)))},r);this.pending.set(d,{resolve:i,reject:a,timer:l});try{this.child.stdin.write(JSON.stringify(u)+`
`)}catch(h){clearTimeout(l),this.pending.delete(d),a(h)}})}stop(){if(this.isStopping=!0,this.restartTimer&&(clearTimeout(this.restartTimer),this.restartTimer=null),this.child){try{this.child.stdin.write(JSON.stringify({id:0,cmd:"shutdown"})+`
`)}catch{}setTimeout(()=>{if(this.child){try{this.child.kill()}catch{}this.child=null}},400)}}}const M=new at;p.whenReady().then(()=>{M.start(),V.start()});p.on("will-quit",()=>{M.stop(),V.stop();try{z.unregisterAll()}catch{}if(_)try{_.destroy()}catch{}});p.on("before-quit",()=>{M.stop(),V.stop();try{z.unregisterAll()}catch{}if(_)try{_.destroy()}catch{}});o.handle("audio-mixer:get-devices",async()=>{if(process.platform!=="win32")return{devices:[],defaultDeviceId:""};try{return await M.send("listDevices")}catch(n){return c("[audio-mixer:get-devices error]",n),{devices:[],defaultDeviceId:"",error:n.message}}});o.handle("audio-mixer:get-sessions",async(n,e)=>{if(process.platform!=="win32")return{sessions:[]};try{return await M.send("listSessions",{deviceId:e})}catch(t){return c("[audio-mixer:get-sessions error]",t),{sessions:[],error:t.message}}});o.handle("audio-mixer:set-volume",async(n,e={})=>{if(process.platform!=="win32")return!1;try{return await M.send("setSessionVolume",e)}catch(t){return c("[audio-mixer:set-volume error]",t),!1}});o.handle("audio-mixer:set-mute",async(n,e={})=>{if(process.platform!=="win32")return!1;try{return await M.send("setSessionMute",e)}catch(t){return c("[audio-mixer:set-mute error]",t),!1}});o.handle("audio-mixer:set-master-volume",async(n,e={})=>{if(process.platform!=="win32")return!1;try{return await M.send("setMasterVolume",e)}catch(t){return c("[audio-mixer:set-master-volume error]",t),!1}});o.handle("audio-mixer:set-master-mute",async(n,e={})=>{if(process.platform!=="win32")return!1;try{return await M.send("setMasterMute",e)}catch(t){return c("[audio-mixer:set-master-mute error]",t),!1}});
