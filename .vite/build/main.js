"use strict";const{app:m,BrowserWindow:ne,screen:v,ipcMain:u,shell:J,Tray:de,Menu:ue,nativeImage:X,clipboard:U,powerMonitor:R}=require("electron");m.commandLine.appendSwitch("disable-background-timer-throttling");m.commandLine.appendSwitch("disable-backgrounding-occluded-windows");m.commandLine.appendSwitch("disable-renderer-backgrounding");const y=require("node:path"),p=require("fs"),K=require("os"),Y=require("https"),ee=require("http"),pe=require("crypto"),{EventEmitter:me}=require("events");let N=null,i=null,A=!0;function _(){try{return y.join(m.getPath("userData"),"settings.json")}catch{return y.join(process.cwd(),"settings.json")}}function he(){try{const e=_();if(p.existsSync(e)){const t=JSON.parse(p.readFileSync(e,"utf8"));if(typeof t.alwaysOnTop=="boolean")return t.alwaysOnTop}}catch{}return!0}function fe(e){try{const t=_();let n={};if(p.existsSync(t))try{n=JSON.parse(p.readFileSync(t,"utf8"))}catch{}n.alwaysOnTop=e,p.writeFileSync(t,JSON.stringify(n,null,2),"utf8")}catch{}}function ye(){try{const e=_();if(p.existsSync(e)){const t=JSON.parse(p.readFileSync(e,"utf8"));if(typeof t.autoDownloadInstall=="boolean")return t.autoDownloadInstall}}catch{}return!0}function $e(e,t){try{const n=_();let o={};if(p.existsSync(n))try{o=JSON.parse(p.readFileSync(n,"utf8"))}catch{}o[e]=t,p.writeFileSync(n,JSON.stringify(o,null,2),"utf8")}catch{}}A=he();function $(){if(A&&!(!i||i.isDestroyed())){try{i.setAlwaysOnTop(!0,"screen-saver",1)}catch{try{i.setAlwaysOnTop(!0,"screen-saver")}catch{try{i.setAlwaysOnTop(!0)}catch{}}}try{i.moveTop()}catch{}}}function se(e){if(A=!!e,fe(A),i&&!i.isDestroyed()){try{A?$():i.setAlwaysOnTop(!1)}catch{}try{i.webContents.send("always-on-top-changed",A)}catch{}}ie()}function we(){try{return y.join(m.getPath("userData"),"quick-pill.log")}catch{return y.join(process.cwd(),"quick-pill.log")}}function g(e,t=null){const o=`[${new Date().toISOString()}] ${e}${t?` | Error: ${t.stack||t}`:""}
`;console.log(o.trim());try{const s=we();p.appendFileSync(s,o,"utf8")}catch{}}process.on("uncaughtException",e=>{g("UNCAUGHT EXCEPTION (Main Process)",e)});process.on("unhandledRejection",e=>{g("UNHANDLED REJECTION (Main Process)",e)});const{exec:S,execFile:E,spawn:F}=require("child_process");function Q(e){return Buffer.from(e,"utf16le").toString("base64")}function ge(){return new Promise(e=>{const n=Buffer.from(`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$shell   = New-Object -ComObject WScript.Shell
$dirs    = @("$env:ProgramData\\Microsoft\\Windows\\Start Menu\\Programs","$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs")
$results = [System.Collections.Generic.List[object]]::new()
foreach ($dir in $dirs) {
  if (-not (Test-Path $dir)) { continue }
  Get-ChildItem $dir -Recurse -Filter '*.lnk' -EA SilentlyContinue | ForEach-Object {
    try {
      $target = $shell.CreateShortcut($_.FullName).TargetPath
      if ($target -and $target.EndsWith('.exe') -and
          $target -notlike '*\\\\explorer.exe' -and
          $target -notmatch 'WindowsApps' -and
          (Test-Path $target -EA SilentlyContinue)) {
        $results.Add([PSCustomObject]@{ name = $_.BaseName; type = 'win32'; path = $target })
      }
    } catch {}
  }
}
@($results) | ConvertTo-Json -Compress -Depth 2
`,"utf16le").toString("base64");S(`powershell -NoProfile -EncodedCommand ${n}`,{maxBuffer:5*1024*1024},(o,s)=>{if(o||!s)return e([]);try{const a=JSON.parse(s.trim());e(Array.isArray(a)?a:a?[a]:[])}catch{e([])}})})}function Se(){return new Promise(e=>{const n=Buffer.from(`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$results = [System.Collections.Generic.List[object]]::new()
Get-StartApps -EA SilentlyContinue | ForEach-Object {
  if ($_.AppID -match '.+!.+') {
    $results.Add([PSCustomObject]@{ name = $_.Name; type = 'uwp'; appId = $_.AppID })
  }
}
@($results) | ConvertTo-Json -Compress -Depth 2
`,"utf16le").toString("base64");S(`powershell -NoProfile -EncodedCommand ${n}`,{maxBuffer:2*1024*1024},(o,s)=>{if(o||!s)return e([]);try{const a=JSON.parse(s.trim());e(Array.isArray(a)?a:a?[a]:[])}catch{e([])}})})}async function be(){const[e,t]=await Promise.all([ge(),Se()]),n=new Set,o=[];for(const s of[...e,...t]){if(!s.name||!(s.path||s.appId))continue;const a=s.type==="uwp"?`shell:AppsFolder\\${s.appId}`:s.path,r=a.toLowerCase();n.has(r)||(n.add(r),o.push({name:s.name,launch:a}))}return o.sort((s,a)=>s.name.localeCompare(a.name))}function L(e){const t=[];let n=0;for(;n<e.length;){for(;n<e.length&&/\s/.test(e[n]);)n++;if(n>=e.length)break;let o="";for(;n<e.length&&!/\s/.test(e[n]);)if(e[n]==='"'){for(n++;n<e.length&&e[n]!=='"';)o+=e[n++];n<e.length&&n++}else o+=e[n++];o&&t.push(o)}return t}function Te(e){const t=e.replace(/\//g,"\\").replace(/%([^%]+)%/g,(a,r)=>process.env[r]||`%${r}%`),n=t.match(/^"([^"]+)"(.*)/);if(n)return{exe:n[1],args:n[2].trim()?L(n[2].trim()):[]};const o=t.match(/^(.+?\.(?:exe|cmd|bat|com|ps1))(?:\s+(.*))?$/i);if(o)return{exe:o[1],args:o[2]?L(o[2]):[]};const s=t.search(/\s/);return s===-1?{exe:t,args:[]}:{exe:t.slice(0,s),args:L(t.slice(s+1).trim())}}function Pe(e){const t=e.trim();if(t.startsWith("shell:")){const n=t.replace(/'/g,"''");S(`powershell -NoProfile -WindowStyle Hidden -Command "Start-Process '${n}'"`);return}if(/[\\\/]/.test(t)){const{exe:n,args:o}=Te(t);if(o.length===0){if(n.toLowerCase().endsWith(".url")){try{const l=p.readFileSync(n,"utf8").match(/^URL=(.+)$/im);l&&J.openExternal(l[1].trim())}catch{}return}J.openPath(n).then(r=>{r&&S(`start "" "${n}"`)});return}const s=/[\\/]/.test(n)&&!/\.[^\\.]+$/.test(n)?n+".exe":n;if(/\.(cmd|bat)$/i.test(s)){const r=F("cmd.exe",["/c",s,...o],{shell:!1,detached:!0,stdio:"ignore"});r.on("error",()=>{}),r.unref();return}if(/\.ps1$/i.test(s)){const r=F("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-File",s,...o],{shell:!1,detached:!0,stdio:"ignore"});r.on("error",()=>{}),r.unref();return}const a=F(s,o,{shell:!1,detached:!0,stdio:"ignore"});a.on("error",()=>{}),a.unref();return}if(t.includes(" ")){const n=t.replace(/'/g,"''");S(`powershell -NoProfile -WindowStyle Hidden -Command "Start-Process '${n}'"`)}else S(`start "" ${t}`)}u.handle("log-message",(e,t,n,o)=>{g(`[RENDERER ${String(t).toUpperCase()}] ${n} ${o?JSON.stringify(o):""}`)});u.handle("set-ignore-mouse-events",(e,t,n)=>{if(i&&!i.isDestroyed())try{if(t){const o=n!==void 0?n:!0;i.setIgnoreMouseEvents(!0,{forward:o})}else i.setIgnoreMouseEvents(!1),$();g(`setIgnoreMouseEvents(${t}, forward=${n}) executed`)}catch(o){g("Error in setIgnoreMouseEvents, falling back to forward=true",o);try{i.setIgnoreMouseEvents(!0,{forward:!0})}catch{}}});u.handle("get-always-on-top",()=>A);u.handle("set-always-on-top",(e,t)=>(se(t),A));u.handle("focus-window",()=>{i&&!i.isDestroyed()&&($(),i.focus())});u.handle("open-external",async(e,t)=>{await J.openExternal(t)});u.handle("launch-app",async(e,t)=>{Pe(t)});u.handle("build-app-cache",async()=>{const e=y.join(m.getPath("userData"),"app-cache.json");try{const t=await be();p.writeFileSync(e,JSON.stringify(t))}catch{}});u.handle("search-apps",async(e,t)=>{if(!t)return[];const n=y.join(m.getPath("userData"),"app-cache.json");try{if(!p.existsSync(n))return[];const o=JSON.parse(p.readFileSync(n,"utf8")),s=t.toLowerCase();return o.filter(a=>a.name&&a.name.toLowerCase().includes(s)).slice(0,8)}catch{return[]}});u.handle("get-displays",()=>v.getAllDisplays().map(t=>({id:t.id,label:t.label||`Display ${t.id}`,bounds:t.bounds})));u.handle("set-display",(e,t)=>{if(i&&!i.isDestroyed()){const o=v.getAllDisplays().find(c=>c.id.toString()===t.toString())||v.getPrimaryDisplay(),{x:s,y:a,width:r,height:l}=o.bounds;i.setBounds({x:s,y:a,width:r,height:l}),i.show(),$()}});u.handle("update-window-position",(e,t,n)=>{});u.handle("set-auto-launch",(e,t)=>{try{m.setLoginItemSettings({openAtLogin:t,path:m.getPath("exe")}),t||oe()}catch(n){console.error("Failed to set login item settings on Windows:",n)}});function oe(){if(process.platform==="win32")try{const e=["electron.app.Ripple","electron.app.Electron","electron.app.Quick Pill","Ripple"];for(const t of e)S(`reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${t}" /f`,()=>{})}catch{}}const ke=["https://raw.githubusercontent.com/nabil24024004/Quick-Pill/main/web%20app/public/version.json","https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/version.json","https://raw.githubusercontent.com/nabil24024004/Ripple/main/web%20app/public/version.json"];class Ae extends me{constructor(){super(),this.manifestUrls=[...ke],this.currentVersion=m?m.getVersion():"5.4.0",this.status="idle",this.updateInfo=null,this.downloadedFilePath=null,this.currentDownloadRequest=null,this.lastProgressEmit=0;const t=ye();this.autoDownload=t,this.autoInstall=t}compareVersions(t,n){const o=(t||"0.0.0").replace(/^v/i,"").trim(),s=(n||"0.0.0").replace(/^v/i,"").trim(),[a,r]=o.split("-"),[l,c]=s.split("-"),d=a.split(".").map(T=>parseInt(T,10)||0),h=l.split(".").map(T=>parseInt(T,10)||0),P=Math.max(d.length,h.length);for(let T=0;T<P;T++){const M=d[T]||0,b=h[T]||0;if(M>b)return 1;if(M<b)return-1}return!r&&c?1:r&&!c?-1:r&&c?r.localeCompare(c):0}getPlatformKey(){return`win32-${process.arch}`}fetchJson(t,n=12e3,o=5){return new Promise((s,a)=>{if(o<=0)return a(new Error("Too many redirects while fetching update manifest."));const l=(t.startsWith("https")?Y:ee).get(t,{headers:{"User-Agent":`QuickPill-Updater/${this.currentVersion} (${process.platform} ${process.arch})`,Accept:"application/json, text/plain, */*"},timeout:n},c=>{if(c.statusCode>=300&&c.statusCode<400&&c.headers.location){const h=new URL(c.headers.location,t).href;return this.fetchJson(h,n,o-1).then(s).catch(a)}if(c.statusCode!==200)return c.resume(),a(new Error(`Server returned HTTP ${c.statusCode}: ${c.statusMessage}`));let d="";c.setEncoding("utf8"),c.on("data",h=>{d+=h}),c.on("end",()=>{try{const h=JSON.parse(d);s(h)}catch(h){a(new Error(`Invalid JSON received from update manifest: ${h.message}`))}})});l.on("timeout",()=>{l.destroy(),a(new Error("Connection timed out while checking for updates."))}),l.on("error",c=>{a(c)})})}async checkForUpdates(){var t,n,o;if(this.status==="checking"||this.status==="downloading")return{status:this.status,updateInfo:this.updateInfo};this.status="checking",this.emit("checking");try{let s=null,a=null;for(const c of this.manifestUrls)try{const d=`${c}${c.includes("?")?"&":"?"}_t=${Date.now()}`,h=await this.fetchJson(d);if(h&&h.version){s=h;break}}catch(d){a=d}if(!s||!s.version)throw a||new Error('Update manifest is missing required "version" field.');const r=s.version;if(this.compareVersions(r,this.currentVersion)>0){const c=this.getPlatformKey(),d=((t=s.platforms)==null?void 0:t[c])||((n=s.platforms)==null?void 0:n[`${process.platform}-x64`])||((o=s.platforms)==null?void 0:o["win32-x64"]),h=(d==null?void 0:d.url)||"";return this.updateInfo={version:r,currentVersion:this.currentVersion,name:s.name||`Quick Pill v${r}`,releaseDate:s.releaseDate||"",mandatory:!!s.mandatory,changelog:Array.isArray(s.changelog)?s.changelog:[],downloadUrl:h,sha256:(d==null?void 0:d.sha256)||"",size:(d==null?void 0:d.size)||0,installerType:(d==null?void 0:d.installerType)||"nsis"},this.status="available",this.emit("update-available",this.updateInfo),this.autoDownload&&h&&(g(`[Auto-Updater] New update v${r} detected. Automatically downloading in background...`),setTimeout(()=>{this.startDownload().catch(P=>{g("[Auto-Updater] Automatic background download failed:",P)})},1e3)),{status:"available",updateInfo:this.updateInfo}}else{this.status="not-available";const c={currentVersion:this.currentVersion,latestVersion:r};return this.emit("update-not-available",c),{status:"not-available",updateInfo:c}}}catch(s){this.status="error";const a=s.message||"Unknown error occurred while checking for updates.";return this.emit("error",a),{status:"error",error:a}}}startDownload(){if(!this.updateInfo||!this.updateInfo.downloadUrl){const a=new Error("No update available or download URL is missing.");return this.emit("error",a.message),Promise.reject(a)}if(this.status==="downloading")return Promise.resolve({status:"downloading"});this.status="downloading",this.emit("download-started",this.updateInfo);const t=m.getPath("temp"),o=`quick-pill-update-v${this.updateInfo.version}.exe`,s=y.join(t,o);return new Promise((a,r)=>{if(p.existsSync(s))try{p.unlinkSync(s)}catch{}const l=p.createWriteStream(s);let c=0,d=this.updateInfo.size||0,h=0,P=Date.now(),T=0;const M=(b,C=5)=>{if(C<=0){l.close();const f=new Error("Too many redirects while downloading update binary.");return this.status="error",this.emit("error",f.message),r(f)}const G=(b.startsWith("https")?Y:ee).get(b,{headers:{"User-Agent":`QuickPill-Updater/${this.currentVersion} (${process.platform} ${process.arch})`}},f=>{if(f.statusCode>=300&&f.statusCode<400&&f.headers.location){const k=new URL(f.headers.location,b).href;return M(k,C-1)}if(f.statusCode!==200){l.close();try{p.unlinkSync(s)}catch{}const k=new Error(`Download failed with status HTTP ${f.statusCode}: ${f.statusMessage}`);return this.status="error",this.emit("error",k.message),r(k)}const W=parseInt(f.headers["content-length"],10);!isNaN(W)&&W>0&&(d=W),f.on("data",k=>{c+=k.length,l.write(k);const O=Date.now();if(O-this.lastProgressEmit>=100||c===d){const Z=(O-P)/1e3;Z>=.5&&(T=Math.round((c-h)/Z),h=c,P=O);const le={percent:d>0?Math.min(100,Math.round(c/d*1e3)/10):0,transferredBytes:c,totalBytes:d,speedBytesPerSec:T};this.lastProgressEmit=O,this.emit("download-progress",le)}}),f.on("end",()=>{l.end()}),f.on("error",k=>{l.close();try{p.unlinkSync(s)}catch{}this.status="error",this.emit("error",k.message),r(k)})});this.currentDownloadRequest=G,G.on("error",f=>{l.close();try{p.unlinkSync(s)}catch{}this.status="error",this.emit("error",f.message),r(f)})};l.on("finish",()=>{if(this.currentDownloadRequest=null,this.updateInfo.sha256&&this.updateInfo.sha256.trim()!=="")try{const C=pe.createHash("sha256"),z=p.readFileSync(s);if(C.update(z),C.digest("hex").toLowerCase()!==this.updateInfo.sha256.trim().toLowerCase()){try{p.unlinkSync(s)}catch{}const f=new Error("Integrity check failed (SHA-256 mismatch). The downloaded file might be corrupted.");return this.status="error",this.emit("error",f.message),r(f)}}catch(C){console.warn("Could not verify SHA-256 checksum:",C)}this.downloadedFilePath=s,this.status="downloaded";const b={version:this.updateInfo.version,filePath:s};this.emit("update-downloaded",b),a(b),this.autoInstall&&(g(`[Auto-Updater] Update v${this.updateInfo.version} downloaded successfully. Automatically installing in background in 2 seconds...`),setTimeout(()=>{this.installAndRelaunch()},2e3))}),l.on("error",b=>{try{p.unlinkSync(s)}catch{}this.status="error",this.emit("error",b.message),r(b)}),M(this.updateInfo.downloadUrl)})}cancelDownload(){if(this.currentDownloadRequest){try{this.currentDownloadRequest.destroy()}catch{}this.currentDownloadRequest=null}this.status="idle",this.emit("download-cancelled")}installAndRelaunch(){if(!this.downloadedFilePath||!p.existsSync(this.downloadedFilePath)){const n=new Error("No downloaded update file found to install.");return this.emit("error",n.message),!1}const t=this.downloadedFilePath;try{return F(t,["/S"],{detached:!0,stdio:"ignore"}).unref(),setTimeout(()=>{m?(m.isQuitting=!0,m.quit()):process.exit(0)},300),!0}catch(n){return this.emit("error",`Failed to launch installer: ${n.message}`),!1}}}const w=new Ae;function I(e,t){i&&!i.isDestroyed()&&i.webContents.send("update-event",{event:e,data:t})}w.on("checking",()=>I("checking"));w.on("update-available",e=>I("available",e));w.on("update-not-available",e=>I("not-available",e));w.on("download-started",e=>I("download-started",e));w.on("download-progress",e=>I("download-progress",e));w.on("update-downloaded",e=>I("downloaded",e));w.on("download-cancelled",()=>I("cancelled"));w.on("error",e=>I("error",e));u.handle("check-for-updates",async()=>await w.checkForUpdates());u.handle("start-update-download",async()=>await w.startDownload());u.handle("cancel-update-download",()=>(w.cancelDownload(),!0));u.handle("install-update",()=>w.installAndRelaunch());u.handle("get-app-version",()=>m.getVersion());u.handle("get-auto-download-install",()=>w.autoDownload&&w.autoInstall);u.handle("set-auto-download-install",(e,t)=>{const n=!!t;return w.autoDownload=n,w.autoInstall=n,$e("autoDownloadInstall",n),n});const H=(e=null)=>{const t=e||"ico";try{const n=y.join(m.getAppPath(),`src/assets/icons/icon.${t}`);if(p.existsSync(n))return n}catch{}try{const n=y.join(process.resourcesPath,`icon.${t}`);if(p.existsSync(n))return n;const o=y.join(process.resourcesPath,`assets/icons/icon.${t}`);if(p.existsSync(o))return o}catch{}return y.join(__dirname,`../../src/assets/icons/icon.${t}`)},te=()=>{const e=v.getPrimaryDisplay(),{x:t,y:n,width:o,height:s}=e.bounds,a=o,r=s,l=t,c=n;i=new ne({width:a,height:r,x:l,y:c,backgroundColor:"#00000000",transparent:!0,alwaysOnTop:!0,resizable:!1,minimizable:!1,maximizable:!1,fullscreenable:!1,frame:!1,thickFrame:!1,hasShadow:!1,skipTaskbar:!0,icon:H(),type:"toolbar",fullscreen:!1,visibleOnFullScreen:!0,acceptFirstMouse:!0,webPreferences:{preload:y.join(__dirname,"preload.js"),devTools:!m.isPackaged,backgroundThrottling:!1},show:!0}),i.setIgnoreMouseEvents(!0,{forward:!0}),i.once("ready-to-show",()=>{i&&(i.show(),$(),i.focus())}),i.on("blur",()=>{$()}),i.on("minimize",()=>{i&&!i.isDestroyed()&&(i.restore(),$())}),i.on("restore",()=>{$()}),i.on("show",()=>{$()}),setTimeout(()=>{i&&!i.isVisible()&&(i.show(),$(),i.focus())},5e3),i.on("closed",()=>{i=null});try{i.setVisibleOnAllWorkspaces(!0,{visibleOnFullScreen:!0})}catch{}if(!m.isPackaged&&process.env.NODE_ENV==="development")i.loadURL("http://localhost:5173");else{const d=[y.join(__dirname,"../renderer/main_window/index.html"),y.join(m.getAppPath(),".vite/renderer/main_window/index.html"),y.join(m.getAppPath(),"dist/index.html"),y.join(__dirname,"index.html"),y.join(m.getAppPath(),"index.html")];let h=!1;for(const P of d)if(p.existsSync(P)){g(`Loading renderer from: ${P}`),i.loadFile(P),h=!0;break}h||(g("No packaged renderer HTML found, falling back to localhost:5173"),i.loadURL("http://localhost:5173"))}};function ie(){if(!N||N.isDestroyed())return;const e=ue.buildFromTemplate([{label:"Show/Hide Quick Pill",click:()=>{i&&(i.isVisible()?i.hide():(i.show(),$()))}},{label:"Always on Top",type:"checkbox",checked:A,click:t=>{se(t.checked)}},{type:"separator"},{label:"Quit",click:()=>{m.quit()}}]);N.setContextMenu(e)}m.whenReady().then(()=>{m.setAppUserModelId("com.neosparkx.quickpill"),oe(),te(),Ne(),Me(),m.on("activate",()=>{ne.getAllWindows().length===0&&te()});try{let e=H(),t=X.createFromPath(e);t.isEmpty()&&(e=H("png"),t=X.createFromPath(e));const n=t.isEmpty()?e:t.resize({width:16,height:16});N=new de(n),N.setToolTip("Quick Pill"),ie()}catch(e){console.error("Failed to create tray:",e)}v.on("display-metrics-changed",()=>{$()}),v.on("display-added",()=>{$()}),v.on("display-removed",()=>{$()}),R&&(R.on("resume",()=>{i&&!i.isDestroyed()&&i.webContents.send("system-resume"),setTimeout($,500),setTimeout($,2e3)}),R.on("unlock-screen",()=>{i&&!i.isDestroyed()&&i.webContents.send("system-resume"),setTimeout($,500),setTimeout($,2e3)})),setInterval(()=>{if(A&&i&&!i.isDestroyed()&&i.isVisible())if(!i.isAlwaysOnTop())$();else try{i.moveTop()}catch{}},2500),setTimeout(()=>{w.checkForUpdates().catch(e=>{g("Auto-update check on startup error:",e)})},4e3),setInterval(()=>{w.checkForUpdates().catch(e=>{g("Periodic background update check error:",e)})},2*60*60*1e3)});const ae=y.join(m.getPath("userData"),"get-media.ps1"),Ce=`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
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
`,re=y.join(m.getPath("userData"),"control-media.ps1"),Ie=`param([string]$command = "playpause", [double]$seekSeconds = 0)

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
`;try{p.writeFileSync(ae,Ce,"utf8")}catch(e){console.error("Failed to write get-media.ps1 script:",e)}try{p.writeFileSync(re,Ie,"utf8")}catch(e){console.error("Failed to write control-media.ps1 script:",e)}let j=!1;u.handle("get-system-media",async()=>j?null:(j=!0,new Promise(e=>{const t=n=>{j=!1,e(n)};E("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-File",ae],{maxBuffer:10*1024*1024,encoding:"utf8"},(n,o)=>{if(n||!o||o.trim()==="null"||o.trim()==="'null'"){S(`powershell -NoProfile -Command "Get-Process | Where-Object {$_.ProcessName -eq 'Spotify'} | Select-Object MainWindowTitle"`,{encoding:"utf8"},(s,a)=>{var l;if(s||!a)return t(null);const r=(l=a.split(`
`).find(c=>c.includes("-")))==null?void 0:l.trim();if(r){const c=r.split(" - ");let d="Unknown",h=r;c.length>1&&(d=c[0].trim(),h=c.slice(1).join(" - ").trim()),t({name:h||r,artist:d||"Unknown",state:"playing",source:"Spotify",position:0,duration:0})}else t(null)});return}try{const s=JSON.parse(o.trim());if(!s||!s.Title&&!s.Artist)return t(null);t({name:s.Title||"Unknown Title",artist:s.Artist||"Unknown Artist",album:s.Album||"",artwork_url:s.Artwork||null,state:s.Status==="playing"?"playing":"paused",source:s.Source||"System",position:Number(s.Position)||0,duration:Number(s.Duration)||0})}catch{t(null)}})})));u.handle("get-bluetooth-status",async()=>new Promise(e=>{const n=Buffer.from(`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$devs = @(Get-PnpDevice -Class Bluetooth -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'OK' -and $_.Present -eq $true -and $_.InstanceId -match 'BTHENUM' })
$names = @($devs | ForEach-Object { $_.FriendlyName })
@{ connected = ($devs.Count -gt 0); devices = $names } | ConvertTo-Json -Compress
`,"utf16le").toString("base64");S(`powershell -NoProfile -EncodedCommand ${n}`,(o,s)=>{if(o||!s)return e({connected:!1,devices:[]});try{const a=JSON.parse(s.trim());e({connected:!!a.connected,devices:Array.isArray(a.devices)?a.devices:a.devices?[a.devices]:[]})}catch{e({connected:!1,devices:[]})}})}));u.handle("get-camera-status",async()=>new Promise(e=>{E("reg",["query","HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam","/s"],(t,n)=>{if(t||!n)return e(!1);const o=n.match(/LastUsedTimeStop\s+REG_QWORD\s+0x0\b/i);e(!!o)})}));u.handle("get-microphone-status",async()=>new Promise(e=>{E("reg",["query","HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone","/s"],(t,n)=>{if(t||!n)return e(!1);const o=n.match(/LastUsedTimeStop\s+REG_QWORD\s+0x0\b/i);e(!!o)})}));m.on("window-all-closed",()=>{N||m.quit()});u.handle("control-system-media",async(e,t,...n)=>{const o=typeof n[0]=="number"?n[0]:0;g(`Executing media control: ${t} ${o>0?`(seek: ${o}s)`:""}`),E("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-File",re,"-command",t,"-seekSeconds",o.toString()],{timeout:4e3},s=>{s&&g("Media control error:",s)})});let x=null;function ve(){const e=K.cpus();if(!e||e.length===0)return 0;if(!x||x.length!==e.length)return x=e,0;let t=0,n=0;for(let s=0;s<e.length;s++){const a=e[s],r=x[s];let l=a.times.idle-r.times.idle,c=0;for(const d in a.times)c+=a.times[d]-r.times[d];t+=l,n+=c}if(x=e,n===0)return 0;const o=t/n;return Math.max(0,Math.min(100,Math.round((1-o)*100)))}function Oe(){const e=K.totalmem(),t=K.freemem();return e?Math.max(0,Math.min(100,Math.round((e-t)/e*100))):0}u.handle("get-system-metrics",async()=>({cpu:ve(),ram:Oe()}));u.handle("get-clipboard-text",async()=>{try{return U.readText()}catch{return""}});u.handle("write-clipboard-text",async(e,t)=>{try{return t?U.writeText(t):U.clear(),!0}catch{return!1}});u.handle("clear-clipboard",async()=>{try{return U.clear(),!0}catch{return!1}});u.handle("control-system-volume",async(e,t)=>{if(process.platform==="win32"){let n="0xAF";t==="down"&&(n="0xAE"),t==="mute"&&(n="0xAD");const o=`
$type = '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);'
$MediaKey = Add-Type -MemberDefinition $type -Name "WinVolKey" -Namespace "WinAPI" -PassThru
$MediaKey::keybd_event(${n}, 0, 0, [UIntPtr]::Zero)
$MediaKey::keybd_event(${n}, 0, 2, [UIntPtr]::Zero)
`,s=Q(o);return S(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${s}`,a=>{a&&g("Volume control error:",a)}),!0}return!1});let q=null,B=null;function Ne(){if(process.platform!=="win32")return;let e=!1;setInterval(()=>{!i||i.isDestroyed()||e||(e=!0,S('powershell -NoProfile -Command "[Console]::CapsLock; [Console]::NumberLock"',(t,n)=>{var r,l;if(e=!1,t||!n)return;const o=n.trim().split(/\r?\n/),s=((r=o[0])==null?void 0:r.trim().toLowerCase())==="true",a=((l=o[1])==null?void 0:l.trim().toLowerCase())==="true";q!==null&&s!==q&&i&&!i.isDestroyed()&&i.webContents.send("key-lock-change",{key:"CapsLock",state:s}),B!==null&&a!==B&&i&&!i.isDestroyed()&&i.webContents.send("key-lock-change",{key:"NumLock",state:a}),q=s,B=a}))},2e3)}let D=null;function Me(){if(process.platform!=="win32")return;let e=!1;setInterval(()=>{!i||i.isDestroyed()||e||(e=!0,S("wmic logicaldisk where drivetype=2 get name,volumename /format:csv",(t,n)=>{var a,r;if(e=!1,t)return;const o=new Map,s=n.trim().split(/\r?\n/).filter(l=>l.trim()&&!l.startsWith("Node"));for(const l of s){const c=l.trim().split(",");if(c.length>=3){const d=(a=c[1])==null?void 0:a.trim(),h=((r=c[2])==null?void 0:r.trim())||"USB Drive";d&&o.set(d,h)}}if(D!==null&&i&&!i.isDestroyed()){for(const[l,c]of o)D.has(l)||i.webContents.send("usb-change",{action:"connected",drive:l,name:c});for(const[l]of D)o.has(l)||i.webContents.send("usb-change",{action:"disconnected",drive:l,name:"USB Drive"})}D=o}))},5e3)}const ce=y.join(m.getPath("userData"),"get-notifications.ps1"),We=`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
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
`;try{p.writeFileSync(ce,We,"utf8")}catch(e){g("Failed to write get-notifications.ps1:",e)}let V=!1;u.handle("get-notifications",async()=>process.platform!=="win32"?[]:V?[]:(V=!0,new Promise(e=>{E("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-File",ce],{maxBuffer:5*1024*1024,encoding:"utf8",timeout:1e4},(t,n)=>{if(V=!1,t||!n)return e([]);try{const o=JSON.parse(n.trim());e(Array.isArray(o)?o:o?[o]:[])}catch{e([])}})})));u.handle("dismiss-notification",async(e,t)=>process.platform!=="win32"?!1:new Promise(n=>{const o=`
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
`,s=Q(o);S(`powershell -NoProfile -EncodedCommand ${s}`,(a,r)=>{n((r==null?void 0:r.trim())==="true")})}));u.handle("focus-notification-app",async(e,t)=>process.platform!=="win32"||!t?!1:new Promise(n=>{const o=t.split("!")[0].split("_")[0].replace(/\./g,""),s=`
$type = '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);'
$fw = Add-Type -MemberDefinition $type -Name "FW" -Namespace "WinAPI" -PassThru
$procs = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and ($_.ProcessName -match '${o}' -or $_.MainWindowTitle -match '${o}') } | Select-Object -First 1
if ($procs) { [void]$fw::SetForegroundWindow($procs.MainWindowHandle); Write-Output "true" } else { Write-Output "false" }
`,a=Q(s);S(`powershell -NoProfile -EncodedCommand ${a}`,(r,l)=>{n((l==null?void 0:l.trim())==="true")})}));
