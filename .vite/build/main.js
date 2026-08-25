"use strict";const{app:d,BrowserWindow:Y,screen:D,ipcMain:u,shell:O,Tray:se,Menu:oe,nativeImage:K,clipboard:U}=require("electron"),y=require("node:path"),m=require("fs"),V=require("os"),Q=require("https"),z=require("http"),ie=require("crypto"),{EventEmitter:re}=require("events");process.platform==="linux"&&(d.commandLine.appendSwitch("enable-transparent-visuals"),d.commandLine.appendSwitch("disable-gpu-compositing"),d.disableHardwareAcceleration());let E=null,a=null;function ae(){try{return y.join(d.getPath("userData"),"quick-pill.log")}catch{return y.join(process.cwd(),"quick-pill.log")}}function S(t,e=null){const s=`[${new Date().toISOString()}] ${t}${e?` | Error: ${e.stack||e}`:""}
`;console.log(s.trim());try{const o=ae();m.appendFileSync(o,s,"utf8")}catch{}}process.on("uncaughtException",t=>{S("UNCAUGHT EXCEPTION (Main Process)",t)});process.on("unhandledRejection",t=>{S("UNHANDLED REJECTION (Main Process)",t)});const{exec:h,execFile:I,spawn:F}=require("child_process");function J(t){return Buffer.from(t,"utf16le").toString("base64")}function ce(){return new Promise(t=>{const n=Buffer.from(`
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
`,"utf16le").toString("base64");h(`powershell -NoProfile -EncodedCommand ${n}`,{maxBuffer:5*1024*1024},(s,o)=>{if(s||!o)return t([]);try{const i=JSON.parse(o.trim());t(Array.isArray(i)?i:i?[i]:[])}catch{t([])}})})}function le(){return new Promise(t=>{const n=Buffer.from(`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$results = [System.Collections.Generic.List[object]]::new()
Get-StartApps -EA SilentlyContinue | ForEach-Object {
  if ($_.AppID -match '.+!.+') {
    $results.Add([PSCustomObject]@{ name = $_.Name; type = 'uwp'; appId = $_.AppID })
  }
}
@($results) | ConvertTo-Json -Compress -Depth 2
`,"utf16le").toString("base64");h(`powershell -NoProfile -EncodedCommand ${n}`,{maxBuffer:2*1024*1024},(s,o)=>{if(s||!o)return t([]);try{const i=JSON.parse(o.trim());t(Array.isArray(i)?i:i?[i]:[])}catch{t([])}})})}async function pe(){const[t,e]=await Promise.all([ce(),le()]),n=new Set,s=[];for(const o of[...t,...e]){if(!o.name||!(o.path||o.appId))continue;const i=o.type==="uwp"?`shell:AppsFolder\\${o.appId}`:o.path,r=i.toLowerCase();n.has(r)||(n.add(r),s.push({name:o.name,launch:i}))}return s.sort((o,i)=>o.name.localeCompare(i.name))}function G(t){const e=[];let n=0;for(;n<t.length;){for(;n<t.length&&/\s/.test(t[n]);)n++;if(n>=t.length)break;let s="";for(;n<t.length&&!/\s/.test(t[n]);)if(t[n]==='"'){for(n++;n<t.length&&t[n]!=='"';)s+=t[n++];n<t.length&&n++}else s+=t[n++];s&&e.push(s)}return e}function de(t){const e=t.replace(/\//g,"\\").replace(/%([^%]+)%/g,(i,r)=>process.env[r]||`%${r}%`),n=e.match(/^"([^"]+)"(.*)/);if(n)return{exe:n[1],args:n[2].trim()?G(n[2].trim()):[]};const s=e.match(/^(.+?\.(?:exe|cmd|bat|com|ps1))(?:\s+(.*))?$/i);if(s)return{exe:s[1],args:s[2]?G(s[2]):[]};const o=e.search(/\s/);return o===-1?{exe:e,args:[]}:{exe:e.slice(0,o),args:G(e.slice(o+1).trim())}}function ue(t){const e=t.trim();if(e.startsWith("shell:")){const n=e.replace(/'/g,"''");h(`powershell -NoProfile -WindowStyle Hidden -Command "Start-Process '${n}'"`);return}if(/[\\\/]/.test(e)){const{exe:n,args:s}=de(e);if(s.length===0){if(n.toLowerCase().endsWith(".url")){try{const l=m.readFileSync(n,"utf8").match(/^URL=(.+)$/im);l&&O.openExternal(l[1].trim())}catch{}return}O.openPath(n).then(r=>{r&&h(`start "" "${n}"`)});return}const o=/[\\/]/.test(n)&&!/\.[^\\.]+$/.test(n)?n+".exe":n;if(/\.(cmd|bat)$/i.test(o)){const r=F("cmd.exe",["/c",o,...s],{shell:!1,detached:!0,stdio:"ignore"});r.on("error",()=>{}),r.unref();return}if(/\.ps1$/i.test(o)){const r=F("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-File",o,...s],{shell:!1,detached:!0,stdio:"ignore"});r.on("error",()=>{}),r.unref();return}const i=F(o,s,{shell:!1,detached:!0,stdio:"ignore"});i.on("error",()=>{}),i.unref();return}if(e.includes(" ")){const n=e.replace(/'/g,"''");h(`powershell -NoProfile -WindowStyle Hidden -Command "Start-Process '${n}'"`)}else h(`start "" ${e}`)}u.handle("log-message",(t,e,n,s)=>{S(`[RENDERER ${String(e).toUpperCase()}] ${n} ${s?JSON.stringify(s):""}`)});u.handle("set-ignore-mouse-events",(t,e,n)=>{if(a&&!a.isDestroyed())try{if(process.platform!=="linux"){const s=n!==void 0?n:e;a.setIgnoreMouseEvents(e,{forward:s}),S(`setIgnoreMouseEvents(${e}, forward=${s}) executed`)}else a.setIgnoreMouseEvents(e),S(`setIgnoreMouseEvents(${e}) executed (linux)`)}catch(s){S("Error in setIgnoreMouseEvents, falling back to forward=true",s);try{a.setIgnoreMouseEvents(!0,{forward:!0})}catch{}}});u.handle("focus-window",()=>{a&&a.focus()});u.handle("open-external",async(t,e)=>{await O.openExternal(e)});u.handle("launch-app",async(t,e)=>{const n=process.platform;n==="darwin"?h(`open -a "${e}"`):n==="win32"?ue(e):h(e)});u.handle("build-app-cache",async()=>{if(process.platform!=="win32")return;const t=y.join(d.getPath("userData"),"app-cache.json");try{const e=await pe();m.writeFileSync(t,JSON.stringify(e))}catch{}});u.handle("search-apps",async(t,e)=>{if(process.platform!=="win32"||!e)return[];const n=y.join(d.getPath("userData"),"app-cache.json");try{if(!m.existsSync(n))return[];const s=JSON.parse(m.readFileSync(n,"utf8")),o=e.toLowerCase();return s.filter(i=>i.name&&i.name.toLowerCase().includes(o)).slice(0,8)}catch{return[]}});u.handle("get-displays",()=>D.getAllDisplays().map(e=>({id:e.id,label:e.label||`Display ${e.id}`,bounds:e.bounds})));u.handle("set-display",(t,e)=>{if(a){const s=D.getAllDisplays().find(c=>c.id.toString()===e.toString())||D.getPrimaryDisplay(),{x:o,y:i,width:r,height:l}=s.bounds;process.platform,a.setBounds({x:o,y:i,width:r,height:l}),a.show()}});u.handle("update-window-position",(t,e,n)=>{});u.handle("set-auto-launch",(t,e)=>{if(process.platform==="linux"){const n=y.join(d.getPath("home"),".config","autostart"),s=y.join(n,"quick-pill.desktop");try{if(e){m.existsSync(n)||m.mkdirSync(n,{recursive:!0});const o=`[Desktop Entry]
Type=Application
Version=1.0
Name=Quick Pill
Comment=Quick Pill Desktop Assistant
Exec="${d.getPath("exe")}"
Icon=${R()}
Terminal=false
`;m.writeFileSync(s,o)}else m.existsSync(s)&&m.unlinkSync(s)}catch(o){console.error("Failed to set auto-launch on Linux:",o)}}else if(process.platform==="win32")try{d.setLoginItemSettings({openAtLogin:e,path:d.getPath("exe")})}catch(n){console.error("Failed to set login item settings on Windows:",n)}});const me=["https://raw.githubusercontent.com/nabil24024004/Quick-Pill/main/web%20app/public/version.json","https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/version.json","https://raw.githubusercontent.com/nabil24024004/Ripple/main/web%20app/public/version.json"];class fe extends re{constructor(){super(),this.manifestUrls=[...me],this.currentVersion=d?d.getVersion():"5.1.0",this.status="idle",this.updateInfo=null,this.downloadedFilePath=null,this.currentDownloadRequest=null,this.lastProgressEmit=0}compareVersions(e,n){const s=(e||"0.0.0").replace(/^v/i,"").trim(),o=(n||"0.0.0").replace(/^v/i,"").trim(),[i,r]=s.split("-"),[l,c]=o.split("-"),p=i.split(".").map(g=>parseInt(g,10)||0),f=l.split(".").map(g=>parseInt(g,10)||0),P=Math.max(p.length,f.length);for(let g=0;g<P;g++){const A=p[g]||0,w=f[g]||0;if(A>w)return 1;if(A<w)return-1}return!r&&c?1:r&&!c?-1:r&&c?r.localeCompare(c):0}getPlatformKey(){const e=process.platform,n=process.arch;return`${e}-${n}`}fetchJson(e,n=12e3,s=5){return new Promise((o,i)=>{if(s<=0)return i(new Error("Too many redirects while fetching update manifest."));const l=(e.startsWith("https")?Q:z).get(e,{headers:{"User-Agent":`QuickPill-Updater/${this.currentVersion} (${process.platform} ${process.arch})`,Accept:"application/json, text/plain, */*"},timeout:n},c=>{if(c.statusCode>=300&&c.statusCode<400&&c.headers.location){const f=new URL(c.headers.location,e).href;return this.fetchJson(f,n,s-1).then(o).catch(i)}if(c.statusCode!==200)return c.resume(),i(new Error(`Server returned HTTP ${c.statusCode}: ${c.statusMessage}`));let p="";c.setEncoding("utf8"),c.on("data",f=>{p+=f}),c.on("end",()=>{try{const f=JSON.parse(p);o(f)}catch(f){i(new Error(`Invalid JSON received from update manifest: ${f.message}`))}})});l.on("timeout",()=>{l.destroy(),i(new Error("Connection timed out while checking for updates."))}),l.on("error",c=>{i(c)})})}async checkForUpdates(){var e,n,s;if(this.status==="checking"||this.status==="downloading")return{status:this.status,updateInfo:this.updateInfo};this.status="checking",this.emit("checking");try{let o=null,i=null;for(const c of this.manifestUrls)try{const p=`${c}${c.includes("?")?"&":"?"}_t=${Date.now()}`,f=await this.fetchJson(p);if(f&&f.version){o=f;break}}catch(p){i=p}if(!o||!o.version)throw i||new Error('Update manifest is missing required "version" field.');const r=o.version;if(this.compareVersions(r,this.currentVersion)>0){const c=this.getPlatformKey(),p=((e=o.platforms)==null?void 0:e[c])||((n=o.platforms)==null?void 0:n[`${process.platform}-x64`])||((s=o.platforms)==null?void 0:s["win32-x64"]),f=(p==null?void 0:p.url)||"";return this.updateInfo={version:r,currentVersion:this.currentVersion,name:o.name||`Quick Pill v${r}`,releaseDate:o.releaseDate||"",mandatory:!!o.mandatory,changelog:Array.isArray(o.changelog)?o.changelog:[],downloadUrl:f,sha256:(p==null?void 0:p.sha256)||"",size:(p==null?void 0:p.size)||0,installerType:(p==null?void 0:p.installerType)||"nsis"},this.status="available",this.emit("update-available",this.updateInfo),{status:"available",updateInfo:this.updateInfo}}else{this.status="not-available";const c={currentVersion:this.currentVersion,latestVersion:r};return this.emit("update-not-available",c),{status:"not-available",updateInfo:c}}}catch(o){this.status="error";const i=o.message||"Unknown error occurred while checking for updates.";return this.emit("error",i),{status:"error",error:i}}}startDownload(){if(!this.updateInfo||!this.updateInfo.downloadUrl){const i=new Error("No update available or download URL is missing.");return this.emit("error",i.message),Promise.reject(i)}if(this.status==="downloading")return Promise.resolve({status:"downloading"});this.status="downloading",this.emit("download-started",this.updateInfo);const e=d.getPath("temp"),n=process.platform==="win32"?".exe":process.platform==="darwin"?".dmg":".deb",s=`quick-pill-update-v${this.updateInfo.version}${n}`,o=y.join(e,s);return new Promise((i,r)=>{if(m.existsSync(o))try{m.unlinkSync(o)}catch{}const l=m.createWriteStream(o);let c=0,p=this.updateInfo.size||0,f=0,P=Date.now(),g=0;const A=(w,k=5)=>{if(k<=0){l.close();const $=new Error("Too many redirects while downloading update binary.");return this.status="error",this.emit("error",$.message),r($)}const _=(w.startsWith("https")?Q:z).get(w,{headers:{"User-Agent":`QuickPill-Updater/${this.currentVersion} (${process.platform} ${process.arch})`}},$=>{if($.statusCode>=300&&$.statusCode<400&&$.headers.location){const T=new URL($.headers.location,w).href;return A(T,k-1)}if($.statusCode!==200){l.close();try{m.unlinkSync(o)}catch{}const T=new Error(`Download failed with status HTTP ${$.statusCode}: ${$.statusMessage}`);return this.status="error",this.emit("error",T.message),r(T)}const M=parseInt($.headers["content-length"],10);!isNaN(M)&&M>0&&(p=M),$.on("data",T=>{c+=T.length,l.write(T);const N=Date.now();if(N-this.lastProgressEmit>=100||c===p){const H=(N-P)/1e3;H>=.5&&(g=Math.round((c-f)/H),f=c,P=N);const ne={percent:p>0?Math.min(100,Math.round(c/p*1e3)/10):0,transferredBytes:c,totalBytes:p,speedBytesPerSec:g};this.lastProgressEmit=N,this.emit("download-progress",ne)}}),$.on("end",()=>{l.end()}),$.on("error",T=>{l.close();try{m.unlinkSync(o)}catch{}this.status="error",this.emit("error",T.message),r(T)})});this.currentDownloadRequest=_,_.on("error",$=>{l.close();try{m.unlinkSync(o)}catch{}this.status="error",this.emit("error",$.message),r($)})};l.on("finish",()=>{if(this.currentDownloadRequest=null,this.updateInfo.sha256&&this.updateInfo.sha256.trim()!=="")try{const k=ie.createHash("sha256"),v=m.readFileSync(o);if(k.update(v),k.digest("hex").toLowerCase()!==this.updateInfo.sha256.trim().toLowerCase()){try{m.unlinkSync(o)}catch{}const $=new Error("Integrity check failed (SHA-256 mismatch). The downloaded file might be corrupted.");return this.status="error",this.emit("error",$.message),r($)}}catch(k){console.warn("Could not verify SHA-256 checksum:",k)}this.downloadedFilePath=o,this.status="downloaded";const w={version:this.updateInfo.version,filePath:o};this.emit("update-downloaded",w),i(w)}),l.on("error",w=>{try{m.unlinkSync(o)}catch{}this.status="error",this.emit("error",w.message),r(w)}),A(this.updateInfo.downloadUrl)})}cancelDownload(){if(this.currentDownloadRequest){try{this.currentDownloadRequest.destroy()}catch{}this.currentDownloadRequest=null}this.status="idle",this.emit("download-cancelled")}installAndRelaunch(){if(!this.downloadedFilePath||!m.existsSync(this.downloadedFilePath)){const s=new Error("No downloaded update file found to install.");return this.emit("error",s.message),!1}const e=this.downloadedFilePath,n=process.platform;try{return n==="win32"?(F(e,["/S"],{detached:!0,stdio:"ignore"}).unref(),setTimeout(()=>{d?(d.isQuitting=!0,d.quit()):process.exit(0)},300),!0):n==="darwin"?(O.openPath(e),setTimeout(()=>{d&&d.quit()},500),!0):(O.openPath(e),setTimeout(()=>{d&&d.quit()},500),!0)}catch(s){return this.emit("error",`Failed to launch installer: ${s.message}`),!1}}}const b=new fe;function C(t,e){a&&!a.isDestroyed()&&a.webContents.send("update-event",{event:t,data:e})}b.on("checking",()=>C("checking"));b.on("update-available",t=>C("available",t));b.on("update-not-available",t=>C("not-available",t));b.on("download-started",t=>C("download-started",t));b.on("download-progress",t=>C("download-progress",t));b.on("update-downloaded",t=>C("downloaded",t));b.on("download-cancelled",()=>C("cancelled"));b.on("error",t=>C("error",t));u.handle("check-for-updates",async()=>await b.checkForUpdates());u.handle("start-update-download",async()=>await b.startDownload());u.handle("cancel-update-download",()=>(b.cancelDownload(),!0));u.handle("install-update",()=>b.installAndRelaunch());u.handle("get-app-version",()=>d.getVersion());const R=(t=null)=>{const e=t||(process.platform==="win32"?"ico":process.platform==="darwin"?"icns":"png");try{const n=y.join(d.getAppPath(),`src/assets/icons/icon.${e}`);if(m.existsSync(n))return n}catch{}try{const n=y.join(process.resourcesPath,`icon.${e}`);if(m.existsSync(n))return n;const s=y.join(process.resourcesPath,`assets/icons/icon.${e}`);if(m.existsSync(s))return s}catch{}return y.join(__dirname,`../../src/assets/icons/icon.${e}`)},Z=()=>{const t=D.getPrimaryDisplay(),{x:e,y:n,width:s,height:o}=t.bounds,i=process.platform==="linux",r=process.platform==="win32",l=process.platform==="darwin",c=s,p=o,f=e,P=n,g=r?"toolbar":"panel";a=new Y({width:c,height:p,x:f,y:P,backgroundColor:"#00000000",transparent:!0,alwaysOnTop:!0,resizable:!1,frame:!1,...r?{thickFrame:!1}:{},hasShadow:!1,skipTaskbar:!0,icon:R(),...l?{hiddenInMissionControl:!0}:{},type:g,fullscreen:!1,visibleOnFullScreen:!0,acceptFirstMouse:!0,webPreferences:{preload:y.join(__dirname,"preload.js"),devTools:!d.isPackaged},show:!0}),i?a.setIgnoreMouseEvents(!0):a.setIgnoreMouseEvents(!0,{forward:!0});const A=i?500:0;a.once("ready-to-show",()=>{setTimeout(()=>{a&&(a.show(),i?a.setAlwaysOnTop(!0,"screen-saver"):a.setAlwaysOnTop(!0,"pop-up-menu"),a.focus())},A)}),setTimeout(()=>{a&&!a.isVisible()&&(a.show(),a.focus())},5e3),a.on("closed",()=>{a=null});try{a.setVisibleOnAllWorkspaces(!0,{visibleOnFullScreen:!0})}catch{}if(!d.isPackaged&&process.env.NODE_ENV==="development")a.loadURL("http://localhost:5173");else{const w=[y.join(__dirname,"../renderer/main_window/index.html"),y.join(d.getAppPath(),".vite/renderer/main_window/index.html"),y.join(d.getAppPath(),"dist/index.html"),y.join(__dirname,"index.html"),y.join(d.getAppPath(),"index.html")];let k=!1;for(const v of w)if(m.existsSync(v)){S(`Loading renderer from: ${v}`),a.loadFile(v),k=!0;break}k||(S("No packaged renderer HTML found, falling back to localhost:5173"),a.loadURL("http://localhost:5173"))}};d.whenReady().then(()=>{process.platform==="win32"&&d.setAppUserModelId("com.neosparkx.quickpill"),process.platform==="darwin"&&d.dock.hide(),Z(),ge(),Se(),d.on("activate",()=>{Y.getAllWindows().length===0&&Z()});try{let t=R(),e=K.createFromPath(t);e.isEmpty()&&(t=R("png"),e=K.createFromPath(t));const n=e.isEmpty()?t:e.resize({width:16,height:16});E=new se(n);const s=oe.buildFromTemplate([{label:"Show/Hide Quick Pill",click:()=>{a&&(a.isVisible()?a.hide():a.show())}},{type:"separator"},{label:"Quit",click:()=>{d.quit()}}]);E.setToolTip("Quick Pill"),E.setContextMenu(s)}catch(t){console.error("Failed to create tray:",t)}setTimeout(()=>{b.checkForUpdates().catch(t=>{S("Auto-update check on startup error:",t)})},4e3)});const X=y.join(d.getPath("userData"),"get-media.ps1"),he=`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
Add-Type -AssemblyName System.Drawing

$asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { 
    $_.Name -eq 'AsTask' -and 
    $_.IsGenericMethodDefinition -and 
    $_.ReturnType.Name -eq 'Task\`1' -and 
    $_.GetParameters().Count -eq 1
}[0]

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
`,ee=y.join(d.getPath("userData"),"control-media.ps1"),$e=`param([string]$command = "playpause", [double]$seekSeconds = 0)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime

$asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { 
    $_.Name -eq 'AsTask' -and 
    $_.IsGenericMethodDefinition -and 
    $_.ReturnType.Name -eq 'Task\`1' -and 
    $_.GetParameters().Count -eq 1
}[0]

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
`;try{m.writeFileSync(X,he,"utf8")}catch(t){console.error("Failed to write get-media.ps1 script:",t)}try{m.writeFileSync(ee,$e,"utf8")}catch(t){console.error("Failed to write control-media.ps1 script:",t)}let L=!1;u.handle("get-system-media",async()=>L?null:(L=!0,new Promise(t=>{const e=s=>{L=!1,t(s)},n=process.platform;n==="darwin"?I("osascript",["-e",`
        tell application "System Events"
            set spotifyRunning to (name of every process) contains "Spotify"
            set musicRunning to (name of every process) contains "Music"
        end tell
        if spotifyRunning then
            tell application "Spotify"
                if player state is playing then
                    set trackName to name of current track
                    set artistName to artist of current track
                    set albumName to album of current track
                    set artworkUrl to artwork url of current track
                    set playerState to player state as string
                    return trackName & "||" & artistName & "||" & albumName & "||" & artworkUrl & "||" & playerState & "||Spotify"
                end if
            end tell
        else if musicRunning then
            tell application "Music"
                if player state is playing then
                    set trackName to name of current track
                    set artistName to artist of current track
                    set albumName to album of current track
                    set playerState to player state as string
                    return trackName & "||" & artistName & "||" & albumName & "||||" & playerState & "||Music"
                end if
            end tell
        end if
        return "null"
      `],(o,i)=>{if(o||!i||i.trim()==="null")return e(null);const r=i.trim().split("||");r.length>=6?e({name:r[0],artist:r[1],album:r[2],artwork_url:r[3]||null,state:r[4]==="playing"?"playing":"paused",source:r[5]}):e(null)}):n==="win32"?I("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-File",X],{maxBuffer:10*1024*1024,encoding:"utf8"},(s,o)=>{if(s||!o||o.trim()==="null"||o.trim()==="'null'"){h(`powershell -NoProfile -Command "Get-Process | Where-Object {$_.ProcessName -eq 'Spotify'} | Select-Object MainWindowTitle"`,{encoding:"utf8"},(i,r)=>{var c;if(i||!r)return e(null);const l=(c=r.split(`
`).find(p=>p.includes("-")))==null?void 0:c.trim();if(l){const p=l.split(" - ");let f="Unknown",P=l;p.length>1&&(f=p[0].trim(),P=p.slice(1).join(" - ").trim()),e({name:P||l,artist:f||"Unknown",state:"playing",source:"Spotify",position:0,duration:0})}else e(null)});return}try{const i=JSON.parse(o.trim());if(!i||!i.Title&&!i.Artist)return e(null);e({name:i.Title||"Unknown Title",artist:i.Artist||"Unknown Artist",album:i.Album||"",artwork_url:i.Artwork||null,state:i.Status==="playing"?"playing":"paused",source:i.Source||"System",position:Number(i.Position)||0,duration:Number(i.Duration)||0})}catch{e(null)}}):n==="linux"?h('playerctl metadata --format "{{title}}||{{artist}}||{{album}}||{{status}}"',(s,o)=>{if(s||!o)return e(null);const i=o.trim().split("||");e({name:i[0],artist:i[1],album:i[2],state:i[3].toLowerCase(),source:"System"})}):e(null)})));u.handle("get-bluetooth-status",async()=>new Promise(t=>{const e=process.platform;if(e==="darwin")h("system_profiler SPBluetoothDataType -json",(n,s)=>{if(n)return t(!1);try{const i=JSON.parse(s).SPBluetoothDataType[0],r=i.device_connected&&i.device_connected.length>0;t(r)}catch{t(!1)}});else if(e==="win32"){const s=Buffer.from(`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$devs = @(Get-PnpDevice -Class Bluetooth -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'OK' -and $_.Present -eq $true -and $_.InstanceId -match 'BTHENUM' })
$names = @($devs | ForEach-Object { $_.FriendlyName })
@{ connected = ($devs.Count -gt 0); devices = $names } | ConvertTo-Json -Compress
`,"utf16le").toString("base64");h(`powershell -NoProfile -EncodedCommand ${s}`,(o,i)=>{if(o||!i)return t({connected:!1,devices:[]});try{const r=JSON.parse(i.trim());t({connected:!!r.connected,devices:Array.isArray(r.devices)?r.devices:r.devices?[r.devices]:[]})}catch{t({connected:!1,devices:[]})}})}else e==="linux"?h("bluetoothctl devices Connected",(n,s)=>{if(n)return t(!1);t(s.trim().length>0)}):t(!1)}));u.handle("get-camera-status",async()=>new Promise(t=>{const e=process.platform;e==="darwin"?h('ioreg -l | grep -E "FrontCameraActive|FrontCameraStreaming"',(n,s)=>{t(s?s.includes("= Yes"):!1)}):e==="win32"?I("reg",["query","HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam","/s"],(n,s)=>{if(n||!s)return t(!1);const o=s.match(/LastUsedTimeStop\s+REG_QWORD\s+0x0\b/i);t(!!o)}):e==="linux"?h("fuser /dev/video* 2>/dev/null",(n,s)=>{t(s.trim().length>0)}):t(!1)}));u.handle("get-microphone-status",async()=>new Promise(t=>{const e=process.platform;e==="darwin"?h('ioreg -l | grep -E "IOAudioStreamActive|IOAudioEngine|IOAudioStream" | grep -i "Yes"',(n,s)=>{t(s?s.trim().length>0:!1)}):e==="win32"?I("reg",["query","HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone","/s"],(n,s)=>{if(n||!s)return t(!1);const o=s.match(/LastUsedTimeStop\s+REG_QWORD\s+0x0\b/i);t(!!o)}):e==="linux"?h("pactl list source-outputs | grep -q 'Source #'",n=>{t(!n)}):t(!1)}));d.on("window-all-closed",()=>{E||d.quit()});u.handle("control-system-media",async(t,e,...n)=>{const s=process.platform;if(s==="darwin"){const o=`
        tell application "System Events"
            set spotifyRunning to (name of every process) contains "Spotify"
            set musicRunning to (name of every process) contains "Music"
        end tell
        if spotifyRunning then
            tell application "Spotify" to ${e} track
        else if musicRunning then
            tell application "Music" to ${e} track
        end if
        `;I("osascript",["-e",o])}else if(s==="win32"){const o=typeof n[0]=="number"?n[0]:0;S(`Executing media control: ${e} ${o>0?`(seek: ${o}s)`:""}`),I("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-File",ee,"-command",e,"-seekSeconds",o.toString()],{timeout:4e3},i=>{i&&S("Media control error:",i)})}else if(s==="linux"){let o=e;e==="playpause"&&(o="play-pause"),e==="seek"&&typeof n[0]=="number"?h(`playerctl position ${n[0]}`):h(`playerctl ${o}`)}});let x=null;function ye(){const t=V.cpus();if(!t||t.length===0)return 0;if(!x||x.length!==t.length)return x=t,0;let e=0,n=0;for(let o=0;o<t.length;o++){const i=t[o],r=x[o];let l=i.times.idle-r.times.idle,c=0;for(const p in i.times)c+=i.times[p]-r.times[p];e+=l,n+=c}if(x=t,n===0)return 0;const s=e/n;return Math.max(0,Math.min(100,Math.round((1-s)*100)))}function we(){const t=V.totalmem(),e=V.freemem();return t?Math.max(0,Math.min(100,Math.round((t-e)/t*100))):0}u.handle("get-system-metrics",async()=>({cpu:ye(),ram:we()}));u.handle("get-clipboard-text",async()=>{try{return U.readText()}catch{return""}});u.handle("write-clipboard-text",async(t,e)=>{try{return e?U.writeText(e):U.clear(),!0}catch{return!1}});u.handle("clear-clipboard",async()=>{try{return U.clear(),!0}catch{return!1}});u.handle("control-system-volume",async(t,e)=>{if(process.platform==="win32"){let n="0xAF";e==="down"&&(n="0xAE"),e==="mute"&&(n="0xAD");const s=`
$type = '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);'
$MediaKey = Add-Type -MemberDefinition $type -Name "WinVolKey" -Namespace "WinAPI" -PassThru
$MediaKey::keybd_event(${n}, 0, 0, [UIntPtr]::Zero)
$MediaKey::keybd_event(${n}, 0, 2, [UIntPtr]::Zero)
`,o=J(s);return h(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${o}`,i=>{i&&S("Volume control error:",i)}),!0}return!1});let q=null,j=null;function ge(){if(process.platform!=="win32")return;let t=!1;setInterval(()=>{!a||a.isDestroyed()||t||(t=!0,h('powershell -NoProfile -Command "[Console]::CapsLock; [Console]::NumberLock"',(e,n)=>{var r,l;if(t=!1,e||!n)return;const s=n.trim().split(/\r?\n/),o=((r=s[0])==null?void 0:r.trim().toLowerCase())==="true",i=((l=s[1])==null?void 0:l.trim().toLowerCase())==="true";q!==null&&o!==q&&a&&!a.isDestroyed()&&a.webContents.send("key-lock-change",{key:"CapsLock",state:o}),j!==null&&i!==j&&a&&!a.isDestroyed()&&a.webContents.send("key-lock-change",{key:"NumLock",state:i}),q=o,j=i}))},2e3)}let W=null;function Se(){if(process.platform!=="win32")return;let t=!1;setInterval(()=>{!a||a.isDestroyed()||t||(t=!0,h("wmic logicaldisk where drivetype=2 get name,volumename /format:csv",(e,n)=>{var i,r;if(t=!1,e)return;const s=new Map,o=n.trim().split(/\r?\n/).filter(l=>l.trim()&&!l.startsWith("Node"));for(const l of o){const c=l.trim().split(",");if(c.length>=3){const p=(i=c[1])==null?void 0:i.trim(),f=((r=c[2])==null?void 0:r.trim())||"USB Drive";p&&s.set(p,f)}}if(W!==null&&a&&!a.isDestroyed()){for(const[l,c]of s)W.has(l)||a.webContents.send("usb-change",{action:"connected",drive:l,name:c});for(const[l]of W)s.has(l)||a.webContents.send("usb-change",{action:"disconnected",drive:l,name:"USB Drive"})}W=s}))},5e3)}const te=y.join(d.getPath("userData"),"get-notifications.ps1"),be=`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
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
`;try{m.writeFileSync(te,be,"utf8")}catch(t){S("Failed to write get-notifications.ps1:",t)}let B=!1;u.handle("get-notifications",async()=>process.platform!=="win32"?[]:B?[]:(B=!0,new Promise(t=>{I("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-File",te],{maxBuffer:5*1024*1024,encoding:"utf8",timeout:1e4},(e,n)=>{if(B=!1,e||!n)return t([]);try{const s=JSON.parse(n.trim());t(Array.isArray(s)?s:s?[s]:[])}catch{t([])}})})));u.handle("dismiss-notification",async(t,e)=>process.platform!=="win32"?!1:new Promise(n=>{const s=`
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
`,o=J(s);h(`powershell -NoProfile -EncodedCommand ${o}`,(i,r)=>{n((r==null?void 0:r.trim())==="true")})}));u.handle("focus-notification-app",async(t,e)=>process.platform!=="win32"||!e?!1:new Promise(n=>{const s=e.split("!")[0].split("_")[0].replace(/\./g,""),o=`
$type = '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);'
$fw = Add-Type -MemberDefinition $type -Name "FW" -Namespace "WinAPI" -PassThru
$procs = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and ($_.ProcessName -match '${s}' -or $_.MainWindowTitle -match '${s}') } | Select-Object -First 1
if ($procs) { [void]$fw::SetForegroundWindow($procs.MainWindowHandle); Write-Output "true" } else { Write-Output "false" }
`,i=J(o);h(`powershell -NoProfile -EncodedCommand ${i}`,(r,l)=>{n((l==null?void 0:l.trim())==="true")})}));
