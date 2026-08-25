"use strict";const{app:d,BrowserWindow:Y,screen:D,ipcMain:u,shell:W,Tray:ne,Menu:se,nativeImage:K,clipboard:F}=require("electron"),y=require("node:path"),f=require("fs"),J=require("os"),Q=require("https"),z=require("http"),ie=require("crypto"),{EventEmitter:oe}=require("events");process.platform==="linux"&&(d.commandLine.appendSwitch("enable-transparent-visuals"),d.commandLine.appendSwitch("disable-gpu-compositing"),d.disableHardwareAcceleration());let E=null,a=null;function re(){try{return y.join(d.getPath("userData"),"quick-pill.log")}catch{return y.join(process.cwd(),"quick-pill.log")}}function S(t,e=null){const s=`[${new Date().toISOString()}] ${t}${e?` | Error: ${e.stack||e}`:""}
`;console.log(s.trim());try{const i=re();f.appendFileSync(i,s,"utf8")}catch{}}process.on("uncaughtException",t=>{S("UNCAUGHT EXCEPTION (Main Process)",t)});process.on("unhandledRejection",t=>{S("UNHANDLED REJECTION (Main Process)",t)});const{exec:h,execFile:v,spawn:U}=require("child_process");function _(t){return Buffer.from(t,"utf16le").toString("base64")}function ae(){return new Promise(t=>{const n=Buffer.from(`
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
`,"utf16le").toString("base64");h(`powershell -NoProfile -EncodedCommand ${n}`,{maxBuffer:5*1024*1024},(s,i)=>{if(s||!i)return t([]);try{const o=JSON.parse(i.trim());t(Array.isArray(o)?o:o?[o]:[])}catch{t([])}})})}function ce(){return new Promise(t=>{const n=Buffer.from(`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$results = [System.Collections.Generic.List[object]]::new()
Get-StartApps -EA SilentlyContinue | ForEach-Object {
  if ($_.AppID -match '.+!.+') {
    $results.Add([PSCustomObject]@{ name = $_.Name; type = 'uwp'; appId = $_.AppID })
  }
}
@($results) | ConvertTo-Json -Compress -Depth 2
`,"utf16le").toString("base64");h(`powershell -NoProfile -EncodedCommand ${n}`,{maxBuffer:2*1024*1024},(s,i)=>{if(s||!i)return t([]);try{const o=JSON.parse(i.trim());t(Array.isArray(o)?o:o?[o]:[])}catch{t([])}})})}async function le(){const[t,e]=await Promise.all([ae(),ce()]),n=new Set,s=[];for(const i of[...t,...e]){if(!i.name||!(i.path||i.appId))continue;const o=i.type==="uwp"?`shell:AppsFolder\\${i.appId}`:i.path,r=o.toLowerCase();n.has(r)||(n.add(r),s.push({name:i.name,launch:o}))}return s.sort((i,o)=>i.name.localeCompare(o.name))}function L(t){const e=[];let n=0;for(;n<t.length;){for(;n<t.length&&/\s/.test(t[n]);)n++;if(n>=t.length)break;let s="";for(;n<t.length&&!/\s/.test(t[n]);)if(t[n]==='"'){for(n++;n<t.length&&t[n]!=='"';)s+=t[n++];n<t.length&&n++}else s+=t[n++];s&&e.push(s)}return e}function pe(t){const e=t.replace(/\//g,"\\").replace(/%([^%]+)%/g,(o,r)=>process.env[r]||`%${r}%`),n=e.match(/^"([^"]+)"(.*)/);if(n)return{exe:n[1],args:n[2].trim()?L(n[2].trim()):[]};const s=e.match(/^(.+?\.(?:exe|cmd|bat|com|ps1))(?:\s+(.*))?$/i);if(s)return{exe:s[1],args:s[2]?L(s[2]):[]};const i=e.search(/\s/);return i===-1?{exe:e,args:[]}:{exe:e.slice(0,i),args:L(e.slice(i+1).trim())}}function de(t){const e=t.trim();if(e.startsWith("shell:")){const n=e.replace(/'/g,"''");h(`powershell -NoProfile -WindowStyle Hidden -Command "Start-Process '${n}'"`);return}if(/[\\\/]/.test(e)){const{exe:n,args:s}=pe(e);if(s.length===0){if(n.toLowerCase().endsWith(".url")){try{const l=f.readFileSync(n,"utf8").match(/^URL=(.+)$/im);l&&W.openExternal(l[1].trim())}catch{}return}W.openPath(n).then(r=>{r&&h(`start "" "${n}"`)});return}const i=/[\\/]/.test(n)&&!/\.[^\\.]+$/.test(n)?n+".exe":n;if(/\.(cmd|bat)$/i.test(i)){const r=U("cmd.exe",["/c",i,...s],{shell:!1,detached:!0,stdio:"ignore"});r.on("error",()=>{}),r.unref();return}if(/\.ps1$/i.test(i)){const r=U("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-File",i,...s],{shell:!1,detached:!0,stdio:"ignore"});r.on("error",()=>{}),r.unref();return}const o=U(i,s,{shell:!1,detached:!0,stdio:"ignore"});o.on("error",()=>{}),o.unref();return}if(e.includes(" ")){const n=e.replace(/'/g,"''");h(`powershell -NoProfile -WindowStyle Hidden -Command "Start-Process '${n}'"`)}else h(`start "" ${e}`)}u.handle("log-message",(t,e,n,s)=>{S(`[RENDERER ${String(e).toUpperCase()}] ${n} ${s?JSON.stringify(s):""}`)});u.handle("set-ignore-mouse-events",(t,e,n)=>{if(a&&!a.isDestroyed())try{if(process.platform!=="linux"){const s=n!==void 0?n:e;a.setIgnoreMouseEvents(e,{forward:s}),S(`setIgnoreMouseEvents(${e}, forward=${s}) executed`)}else a.setIgnoreMouseEvents(e),S(`setIgnoreMouseEvents(${e}) executed (linux)`)}catch(s){S("Error in setIgnoreMouseEvents, falling back to forward=true",s);try{a.setIgnoreMouseEvents(!0,{forward:!0})}catch{}}});u.handle("focus-window",()=>{a&&a.focus()});u.handle("open-external",async(t,e)=>{await W.openExternal(e)});u.handle("launch-app",async(t,e)=>{const n=process.platform;n==="darwin"?h(`open -a "${e}"`):n==="win32"?de(e):h(e)});u.handle("build-app-cache",async()=>{if(process.platform!=="win32")return;const t=y.join(d.getPath("userData"),"app-cache.json");try{const e=await le();f.writeFileSync(t,JSON.stringify(e))}catch{}});u.handle("search-apps",async(t,e)=>{if(process.platform!=="win32"||!e)return[];const n=y.join(d.getPath("userData"),"app-cache.json");try{if(!f.existsSync(n))return[];const s=JSON.parse(f.readFileSync(n,"utf8")),i=e.toLowerCase();return s.filter(o=>o.name&&o.name.toLowerCase().includes(i)).slice(0,8)}catch{return[]}});u.handle("get-displays",()=>D.getAllDisplays().map(e=>({id:e.id,label:e.label||`Display ${e.id}`,bounds:e.bounds})));u.handle("set-display",(t,e)=>{if(a){const s=D.getAllDisplays().find(c=>c.id.toString()===e.toString())||D.getPrimaryDisplay(),{x:i,y:o,width:r,height:l}=s.bounds;process.platform,a.setBounds({x:i,y:o,width:r,height:l}),a.show()}});u.handle("update-window-position",(t,e,n)=>{});u.handle("set-auto-launch",(t,e)=>{if(process.platform==="linux"){const n=y.join(d.getPath("home"),".config","autostart"),s=y.join(n,"quick-pill.desktop");try{if(e){f.existsSync(n)||f.mkdirSync(n,{recursive:!0});const i=`[Desktop Entry]
Type=Application
Version=1.0
Name=Quick Pill
Comment=Quick Pill Desktop Assistant
Exec="${d.getPath("exe")}"
Icon=${R()}
Terminal=false
`;f.writeFileSync(s,i)}else f.existsSync(s)&&f.unlinkSync(s)}catch(i){console.error("Failed to set auto-launch on Linux:",i)}}else if(process.platform==="win32")try{d.setLoginItemSettings({openAtLogin:e,path:d.getPath("exe")})}catch(n){console.error("Failed to set login item settings on Windows:",n)}});const ue=["https://raw.githubusercontent.com/nabil24024004/Quick-Pill/main/web%20app/public/version.json","https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/version.json","https://raw.githubusercontent.com/nabil24024004/Ripple/main/web%20app/public/version.json"];class me extends oe{constructor(){super(),this.manifestUrls=[...ue],this.currentVersion=d?d.getVersion():"5.1.0",this.status="idle",this.updateInfo=null,this.downloadedFilePath=null,this.currentDownloadRequest=null,this.lastProgressEmit=0}compareVersions(e,n){const s=(e||"0.0.0").replace(/^v/i,"").trim(),i=(n||"0.0.0").replace(/^v/i,"").trim(),[o,r]=s.split("-"),[l,c]=i.split("-"),p=o.split(".").map(g=>parseInt(g,10)||0),m=l.split(".").map(g=>parseInt(g,10)||0),T=Math.max(p.length,m.length);for(let g=0;g<T;g++){const I=p[g]||0,w=m[g]||0;if(I>w)return 1;if(I<w)return-1}return!r&&c?1:r&&!c?-1:r&&c?r.localeCompare(c):0}getPlatformKey(){const e=process.platform,n=process.arch;return`${e}-${n}`}fetchJson(e,n=12e3,s=5){return new Promise((i,o)=>{if(s<=0)return o(new Error("Too many redirects while fetching update manifest."));const l=(e.startsWith("https")?Q:z).get(e,{headers:{"User-Agent":`QuickPill-Updater/${this.currentVersion} (${process.platform} ${process.arch})`,Accept:"application/json, text/plain, */*"},timeout:n},c=>{if(c.statusCode>=300&&c.statusCode<400&&c.headers.location){const m=new URL(c.headers.location,e).href;return this.fetchJson(m,n,s-1).then(i).catch(o)}if(c.statusCode!==200)return c.resume(),o(new Error(`Server returned HTTP ${c.statusCode}: ${c.statusMessage}`));let p="";c.setEncoding("utf8"),c.on("data",m=>{p+=m}),c.on("end",()=>{try{const m=JSON.parse(p);i(m)}catch(m){o(new Error(`Invalid JSON received from update manifest: ${m.message}`))}})});l.on("timeout",()=>{l.destroy(),o(new Error("Connection timed out while checking for updates."))}),l.on("error",c=>{o(c)})})}async checkForUpdates(){var e,n,s;if(this.status==="checking"||this.status==="downloading")return{status:this.status,updateInfo:this.updateInfo};this.status="checking",this.emit("checking");try{let i=null,o=null;for(const c of this.manifestUrls)try{const p=`${c}${c.includes("?")?"&":"?"}_t=${Date.now()}`,m=await this.fetchJson(p);if(m&&m.version){i=m;break}}catch(p){o=p}if(!i||!i.version)throw o||new Error('Update manifest is missing required "version" field.');const r=i.version;if(this.compareVersions(r,this.currentVersion)>0){const c=this.getPlatformKey(),p=((e=i.platforms)==null?void 0:e[c])||((n=i.platforms)==null?void 0:n[`${process.platform}-x64`])||((s=i.platforms)==null?void 0:s["win32-x64"]),m=(p==null?void 0:p.url)||"";return this.updateInfo={version:r,currentVersion:this.currentVersion,name:i.name||`Quick Pill v${r}`,releaseDate:i.releaseDate||"",mandatory:!!i.mandatory,changelog:Array.isArray(i.changelog)?i.changelog:[],downloadUrl:m,sha256:(p==null?void 0:p.sha256)||"",size:(p==null?void 0:p.size)||0,installerType:(p==null?void 0:p.installerType)||"nsis"},this.status="available",this.emit("update-available",this.updateInfo),{status:"available",updateInfo:this.updateInfo}}else{this.status="not-available";const c={currentVersion:this.currentVersion,latestVersion:r};return this.emit("update-not-available",c),{status:"not-available",updateInfo:c}}}catch(i){this.status="error";const o=i.message||"Unknown error occurred while checking for updates.";return this.emit("error",o),{status:"error",error:o}}}startDownload(){if(!this.updateInfo||!this.updateInfo.downloadUrl){const o=new Error("No update available or download URL is missing.");return this.emit("error",o.message),Promise.reject(o)}if(this.status==="downloading")return Promise.resolve({status:"downloading"});this.status="downloading",this.emit("download-started",this.updateInfo);const e=d.getPath("temp"),n=process.platform==="win32"?".exe":process.platform==="darwin"?".dmg":".deb",s=`quick-pill-update-v${this.updateInfo.version}${n}`,i=y.join(e,s);return new Promise((o,r)=>{if(f.existsSync(i))try{f.unlinkSync(i)}catch{}const l=f.createWriteStream(i);let c=0,p=this.updateInfo.size||0,m=0,T=Date.now(),g=0;const I=(w,P=5)=>{if(P<=0){l.close();const $=new Error("Too many redirects while downloading update binary.");return this.status="error",this.emit("error",$.message),r($)}const G=(w.startsWith("https")?Q:z).get(w,{headers:{"User-Agent":`QuickPill-Updater/${this.currentVersion} (${process.platform} ${process.arch})`}},$=>{if($.statusCode>=300&&$.statusCode<400&&$.headers.location){const k=new URL($.headers.location,w).href;return I(k,P-1)}if($.statusCode!==200){l.close();try{f.unlinkSync(i)}catch{}const k=new Error(`Download failed with status HTTP ${$.statusCode}: ${$.statusMessage}`);return this.status="error",this.emit("error",k.message),r(k)}const x=parseInt($.headers["content-length"],10);!isNaN(x)&&x>0&&(p=x),$.on("data",k=>{c+=k.length,l.write(k);const N=Date.now();if(N-this.lastProgressEmit>=100||c===p){const H=(N-T)/1e3;H>=.5&&(g=Math.round((c-m)/H),m=c,T=N);const te={percent:p>0?Math.min(100,Math.round(c/p*1e3)/10):0,transferredBytes:c,totalBytes:p,speedBytesPerSec:g};this.lastProgressEmit=N,this.emit("download-progress",te)}}),$.on("end",()=>{l.end()}),$.on("error",k=>{l.close();try{f.unlinkSync(i)}catch{}this.status="error",this.emit("error",k.message),r(k)})});this.currentDownloadRequest=G,G.on("error",$=>{l.close();try{f.unlinkSync(i)}catch{}this.status="error",this.emit("error",$.message),r($)})};l.on("finish",()=>{if(this.currentDownloadRequest=null,this.updateInfo.sha256&&this.updateInfo.sha256.trim()!=="")try{const P=ie.createHash("sha256"),A=f.readFileSync(i);if(P.update(A),P.digest("hex").toLowerCase()!==this.updateInfo.sha256.trim().toLowerCase()){try{f.unlinkSync(i)}catch{}const $=new Error("Integrity check failed (SHA-256 mismatch). The downloaded file might be corrupted.");return this.status="error",this.emit("error",$.message),r($)}}catch(P){console.warn("Could not verify SHA-256 checksum:",P)}this.downloadedFilePath=i,this.status="downloaded";const w={version:this.updateInfo.version,filePath:i};this.emit("update-downloaded",w),o(w)}),l.on("error",w=>{try{f.unlinkSync(i)}catch{}this.status="error",this.emit("error",w.message),r(w)}),I(this.updateInfo.downloadUrl)})}cancelDownload(){if(this.currentDownloadRequest){try{this.currentDownloadRequest.destroy()}catch{}this.currentDownloadRequest=null}this.status="idle",this.emit("download-cancelled")}installAndRelaunch(){if(!this.downloadedFilePath||!f.existsSync(this.downloadedFilePath)){const s=new Error("No downloaded update file found to install.");return this.emit("error",s.message),!1}const e=this.downloadedFilePath,n=process.platform;try{return n==="win32"?(U(e,["/S"],{detached:!0,stdio:"ignore"}).unref(),setTimeout(()=>{d?(d.isQuitting=!0,d.quit()):process.exit(0)},300),!0):n==="darwin"?(W.openPath(e),setTimeout(()=>{d&&d.quit()},500),!0):(W.openPath(e),setTimeout(()=>{d&&d.quit()},500),!0)}catch(s){return this.emit("error",`Failed to launch installer: ${s.message}`),!1}}}const b=new me;function C(t,e){a&&!a.isDestroyed()&&a.webContents.send("update-event",{event:t,data:e})}b.on("checking",()=>C("checking"));b.on("update-available",t=>C("available",t));b.on("update-not-available",t=>C("not-available",t));b.on("download-started",t=>C("download-started",t));b.on("download-progress",t=>C("download-progress",t));b.on("update-downloaded",t=>C("downloaded",t));b.on("download-cancelled",()=>C("cancelled"));b.on("error",t=>C("error",t));u.handle("check-for-updates",async()=>await b.checkForUpdates());u.handle("start-update-download",async()=>await b.startDownload());u.handle("cancel-update-download",()=>(b.cancelDownload(),!0));u.handle("install-update",()=>b.installAndRelaunch());u.handle("get-app-version",()=>d.getVersion());const R=(t=null)=>{const e=t||(process.platform==="win32"?"ico":process.platform==="darwin"?"icns":"png");try{const n=y.join(d.getAppPath(),`src/assets/icons/icon.${e}`);if(f.existsSync(n))return n}catch{}try{const n=y.join(process.resourcesPath,`icon.${e}`);if(f.existsSync(n))return n;const s=y.join(process.resourcesPath,`assets/icons/icon.${e}`);if(f.existsSync(s))return s}catch{}return y.join(__dirname,`../../src/assets/icons/icon.${e}`)},Z=()=>{const t=D.getPrimaryDisplay(),{x:e,y:n,width:s,height:i}=t.bounds,o=process.platform==="linux",r=process.platform==="win32",l=process.platform==="darwin",c=s,p=i,m=e,T=n,g=r?"toolbar":"panel";a=new Y({width:c,height:p,x:m,y:T,backgroundColor:"#00000000",transparent:!0,alwaysOnTop:!0,resizable:!1,frame:!1,...r?{thickFrame:!1}:{},hasShadow:!1,skipTaskbar:!0,icon:R(),...l?{hiddenInMissionControl:!0}:{},type:g,fullscreen:!1,visibleOnFullScreen:!0,acceptFirstMouse:!0,webPreferences:{preload:y.join(__dirname,"preload.js"),devTools:!d.isPackaged},show:!0}),o?a.setIgnoreMouseEvents(!0):a.setIgnoreMouseEvents(!0,{forward:!0});const I=o?500:0;a.once("ready-to-show",()=>{setTimeout(()=>{a&&(a.show(),o?a.setAlwaysOnTop(!0,"screen-saver"):a.setAlwaysOnTop(!0,"pop-up-menu"),a.focus())},I)}),setTimeout(()=>{a&&!a.isVisible()&&(a.show(),a.focus())},5e3),a.on("closed",()=>{a=null});try{a.setVisibleOnAllWorkspaces(!0,{visibleOnFullScreen:!0})}catch{}if(!d.isPackaged&&process.env.NODE_ENV==="development")a.loadURL("http://localhost:5173");else{const w=[y.join(__dirname,"../renderer/main_window/index.html"),y.join(d.getAppPath(),".vite/renderer/main_window/index.html"),y.join(d.getAppPath(),"dist/index.html"),y.join(__dirname,"index.html"),y.join(d.getAppPath(),"index.html")];let P=!1;for(const A of w)if(f.existsSync(A)){S(`Loading renderer from: ${A}`),a.loadFile(A),P=!0;break}P||(S("No packaged renderer HTML found, falling back to localhost:5173"),a.loadURL("http://localhost:5173"))}};d.whenReady().then(()=>{process.platform==="win32"&&d.setAppUserModelId("com.neosparkx.quickpill"),process.platform==="darwin"&&d.dock.hide(),Z(),ye(),we(),d.on("activate",()=>{Y.getAllWindows().length===0&&Z()});try{let t=R(),e=K.createFromPath(t);e.isEmpty()&&(t=R("png"),e=K.createFromPath(t));const n=e.isEmpty()?t:e.resize({width:16,height:16});E=new ne(n);const s=se.buildFromTemplate([{label:"Show/Hide Quick Pill",click:()=>{a&&(a.isVisible()?a.hide():a.show())}},{type:"separator"},{label:"Quit",click:()=>{d.quit()}}]);E.setToolTip("Quick Pill"),E.setContextMenu(s)}catch(t){console.error("Failed to create tray:",t)}setTimeout(()=>{b.checkForUpdates().catch(t=>{S("Auto-update check on startup error:",t)})},4e3)});const X=y.join(d.getPath("userData"),"get-media.ps1"),fe=`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
Add-Type -AssemblyName System.Drawing

$asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { 
    $_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name.StartsWith('IAsyncOperation') 
}[0]

function Await-Operation($asyncOp, $type) {
    if (-not $asyncOp) { return $null }
    try {
        $task = $asTaskGeneric.MakeGenericMethod($type).Invoke($null, @($asyncOp))
        $task.Wait()
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
`;try{f.writeFileSync(X,fe,"utf8")}catch(t){console.error("Failed to write get-media.ps1 script:",t)}let q=!1;u.handle("get-system-media",async()=>q?null:(q=!0,new Promise(t=>{const e=s=>{q=!1,t(s)},n=process.platform;n==="darwin"?v("osascript",["-e",`
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
      `],(i,o)=>{if(i||!o||o.trim()==="null")return e(null);const r=o.trim().split("||");r.length>=6?e({name:r[0],artist:r[1],album:r[2],artwork_url:r[3]||null,state:r[4]==="playing"?"playing":"paused",source:r[5]}):e(null)}):n==="win32"?v("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-File",X],{maxBuffer:10*1024*1024,encoding:"utf8"},(s,i)=>{if(s||!i||i.trim()==="null"||i.trim()==="'null'"){h(`powershell -NoProfile -Command "Get-Process | Where-Object {$_.ProcessName -eq 'Spotify'} | Select-Object MainWindowTitle"`,{encoding:"utf8"},(o,r)=>{var c;if(o||!r)return e(null);const l=(c=r.split(`
`).find(p=>p.includes("-")))==null?void 0:c.trim();if(l){const p=l.split(" - ");let m="Unknown",T=l;p.length>1&&(m=p[0].trim(),T=p.slice(1).join(" - ").trim()),e({name:T||l,artist:m||"Unknown",state:"playing",source:"Spotify",position:0,duration:0})}else e(null)});return}try{const o=JSON.parse(i.trim());if(!o||!o.Title&&!o.Artist)return e(null);e({name:o.Title||"Unknown Title",artist:o.Artist||"Unknown Artist",album:o.Album||"",artwork_url:o.Artwork||null,state:o.Status==="playing"?"playing":"paused",source:o.Source||"System",position:Number(o.Position)||0,duration:Number(o.Duration)||0})}catch{e(null)}}):n==="linux"?h('playerctl metadata --format "{{title}}||{{artist}}||{{album}}||{{status}}"',(s,i)=>{if(s||!i)return e(null);const o=i.trim().split("||");e({name:o[0],artist:o[1],album:o[2],state:o[3].toLowerCase(),source:"System"})}):e(null)})));u.handle("get-bluetooth-status",async()=>new Promise(t=>{const e=process.platform;if(e==="darwin")h("system_profiler SPBluetoothDataType -json",(n,s)=>{if(n)return t(!1);try{const o=JSON.parse(s).SPBluetoothDataType[0],r=o.device_connected&&o.device_connected.length>0;t(r)}catch{t(!1)}});else if(e==="win32"){const s=Buffer.from(`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$devs = @(Get-PnpDevice -Class Bluetooth -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'OK' -and $_.Present -eq $true -and $_.InstanceId -match 'BTHENUM' })
$names = @($devs | ForEach-Object { $_.FriendlyName })
@{ connected = ($devs.Count -gt 0); devices = $names } | ConvertTo-Json -Compress
`,"utf16le").toString("base64");h(`powershell -NoProfile -EncodedCommand ${s}`,(i,o)=>{if(i||!o)return t({connected:!1,devices:[]});try{const r=JSON.parse(o.trim());t({connected:!!r.connected,devices:Array.isArray(r.devices)?r.devices:r.devices?[r.devices]:[]})}catch{t({connected:!1,devices:[]})}})}else e==="linux"?h("bluetoothctl devices Connected",(n,s)=>{if(n)return t(!1);t(s.trim().length>0)}):t(!1)}));u.handle("get-camera-status",async()=>new Promise(t=>{const e=process.platform;e==="darwin"?h('ioreg -l | grep -E "FrontCameraActive|FrontCameraStreaming"',(n,s)=>{t(s?s.includes("= Yes"):!1)}):e==="win32"?v("reg",["query","HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam","/s"],(n,s)=>{if(n||!s)return t(!1);const i=s.match(/LastUsedTimeStop\s+REG_QWORD\s+0x0\b/i);t(!!i)}):e==="linux"?h("fuser /dev/video* 2>/dev/null",(n,s)=>{t(s.trim().length>0)}):t(!1)}));u.handle("get-microphone-status",async()=>new Promise(t=>{const e=process.platform;e==="darwin"?h('ioreg -l | grep -E "IOAudioStreamActive|IOAudioEngine|IOAudioStream" | grep -i "Yes"',(n,s)=>{t(s?s.trim().length>0:!1)}):e==="win32"?v("reg",["query","HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone","/s"],(n,s)=>{if(n||!s)return t(!1);const i=s.match(/LastUsedTimeStop\s+REG_QWORD\s+0x0\b/i);t(!!i)}):e==="linux"?h("pactl list source-outputs | grep -q 'Source #'",n=>{t(!n)}):t(!1)}));d.on("window-all-closed",()=>{E||d.quit()});u.handle("control-system-media",async(t,e)=>{const n=process.platform;if(n==="darwin"){const s=`
        tell application "System Events"
            set spotifyRunning to (name of every process) contains "Spotify"
            set musicRunning to (name of every process) contains "Music"
        end tell
        if spotifyRunning then
            tell application "Spotify" to ${e} track
        else if musicRunning then
            tell application "Music" to ${e} track
        end if
        `;v("osascript",["-e",s])}else if(n==="win32"){if(!["playpause","next","previous"].includes(e))return;let s="0xCD";e==="next"&&(s="0xB0"),e==="previous"&&(s="0xB1"),S(`Executing media control: ${e} (${s})`);const i=`
$type = '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);'
$MediaKey = Add-Type -MemberDefinition $type -Name "WinMediaKey" -Namespace "WinAPI" -PassThru
$MediaKey::keybd_event(${s}, 0, 0, [UIntPtr]::Zero)
$MediaKey::keybd_event(${s}, 0, 2, [UIntPtr]::Zero)
`,o=_(i);h(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${o}`,r=>{r&&S("Media control error:",r)})}else if(n==="linux"){let s=e;e==="playpause"&&(s="play-pause"),h(`playerctl ${s}`)}});let M=null;function he(){const t=J.cpus();if(!t||t.length===0)return 0;if(!M||M.length!==t.length)return M=t,0;let e=0,n=0;for(let i=0;i<t.length;i++){const o=t[i],r=M[i];let l=o.times.idle-r.times.idle,c=0;for(const p in o.times)c+=o.times[p]-r.times[p];e+=l,n+=c}if(M=t,n===0)return 0;const s=e/n;return Math.max(0,Math.min(100,Math.round((1-s)*100)))}function $e(){const t=J.totalmem(),e=J.freemem();return t?Math.max(0,Math.min(100,Math.round((t-e)/t*100))):0}u.handle("get-system-metrics",async()=>({cpu:he(),ram:$e()}));u.handle("get-clipboard-text",async()=>{try{return F.readText()}catch{return""}});u.handle("write-clipboard-text",async(t,e)=>{try{return e?F.writeText(e):F.clear(),!0}catch{return!1}});u.handle("clear-clipboard",async()=>{try{return F.clear(),!0}catch{return!1}});u.handle("control-system-volume",async(t,e)=>{if(process.platform==="win32"){let n="0xAF";e==="down"&&(n="0xAE"),e==="mute"&&(n="0xAD");const s=`
$type = '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);'
$MediaKey = Add-Type -MemberDefinition $type -Name "WinVolKey" -Namespace "WinAPI" -PassThru
$MediaKey::keybd_event(${n}, 0, 0, [UIntPtr]::Zero)
$MediaKey::keybd_event(${n}, 0, 2, [UIntPtr]::Zero)
`,i=_(s);return h(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${i}`,o=>{o&&S("Volume control error:",o)}),!0}return!1});let j=null,B=null;function ye(){if(process.platform!=="win32")return;let t=!1;setInterval(()=>{!a||a.isDestroyed()||t||(t=!0,h('powershell -NoProfile -Command "[Console]::CapsLock; [Console]::NumberLock"',(e,n)=>{var r,l;if(t=!1,e||!n)return;const s=n.trim().split(/\r?\n/),i=((r=s[0])==null?void 0:r.trim().toLowerCase())==="true",o=((l=s[1])==null?void 0:l.trim().toLowerCase())==="true";j!==null&&i!==j&&a&&!a.isDestroyed()&&a.webContents.send("key-lock-change",{key:"CapsLock",state:i}),B!==null&&o!==B&&a&&!a.isDestroyed()&&a.webContents.send("key-lock-change",{key:"NumLock",state:o}),j=i,B=o}))},2e3)}let O=null;function we(){if(process.platform!=="win32")return;let t=!1;setInterval(()=>{!a||a.isDestroyed()||t||(t=!0,h("wmic logicaldisk where drivetype=2 get name,volumename /format:csv",(e,n)=>{var o,r;if(t=!1,e)return;const s=new Map,i=n.trim().split(/\r?\n/).filter(l=>l.trim()&&!l.startsWith("Node"));for(const l of i){const c=l.trim().split(",");if(c.length>=3){const p=(o=c[1])==null?void 0:o.trim(),m=((r=c[2])==null?void 0:r.trim())||"USB Drive";p&&s.set(p,m)}}if(O!==null&&a&&!a.isDestroyed()){for(const[l,c]of s)O.has(l)||a.webContents.send("usb-change",{action:"connected",drive:l,name:c});for(const[l]of O)s.has(l)||a.webContents.send("usb-change",{action:"disconnected",drive:l,name:"USB Drive"})}O=s}))},5e3)}const ee=y.join(d.getPath("userData"),"get-notifications.ps1"),ge=`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
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
`;try{f.writeFileSync(ee,ge,"utf8")}catch(t){S("Failed to write get-notifications.ps1:",t)}let V=!1;u.handle("get-notifications",async()=>process.platform!=="win32"?[]:V?[]:(V=!0,new Promise(t=>{v("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-File",ee],{maxBuffer:5*1024*1024,encoding:"utf8",timeout:1e4},(e,n)=>{if(V=!1,e||!n)return t([]);try{const s=JSON.parse(n.trim());t(Array.isArray(s)?s:s?[s]:[])}catch{t([])}})})));u.handle("dismiss-notification",async(t,e)=>process.platform!=="win32"?!1:new Promise(n=>{const s=`
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
`,i=_(s);h(`powershell -NoProfile -EncodedCommand ${i}`,(o,r)=>{n((r==null?void 0:r.trim())==="true")})}));u.handle("focus-notification-app",async(t,e)=>process.platform!=="win32"||!e?!1:new Promise(n=>{const s=e.split("!")[0].split("_")[0].replace(/\./g,""),i=`
$type = '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);'
$fw = Add-Type -MemberDefinition $type -Name "FW" -Namespace "WinAPI" -PassThru
$procs = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and ($_.ProcessName -match '${s}' -or $_.MainWindowTitle -match '${s}') } | Select-Object -First 1
if ($procs) { [void]$fw::SetForegroundWindow($procs.MainWindowHandle); Write-Output "true" } else { Write-Output "false" }
`,o=_(i);h(`powershell -NoProfile -EncodedCommand ${o}`,(r,l)=>{n((l==null?void 0:l.trim())==="true")})}));
