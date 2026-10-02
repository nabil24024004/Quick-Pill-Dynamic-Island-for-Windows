"use strict";const{app:m,BrowserWindow:X,screen:E,ipcMain:p,shell:q,Tray:oe,Menu:ie,nativeImage:H,clipboard:F}=require("electron"),f=require("node:path"),h=require("fs"),j=require("os"),Q=require("https"),z=require("http"),re=require("crypto"),{EventEmitter:ae}=require("events");let O=null,c=null;function ce(){try{return f.join(m.getPath("userData"),"quick-pill.log")}catch{return f.join(process.cwd(),"quick-pill.log")}}function S(e,t=null){const o=`[${new Date().toISOString()}] ${e}${t?` | Error: ${t.stack||t}`:""}
`;console.log(o.trim());try{const s=ce();h.appendFileSync(s,o,"utf8")}catch{}}process.on("uncaughtException",e=>{S("UNCAUGHT EXCEPTION (Main Process)",e)});process.on("unhandledRejection",e=>{S("UNHANDLED REJECTION (Main Process)",e)});const{exec:y,execFile:M,spawn:x}=require("child_process");function V(e){return Buffer.from(e,"utf16le").toString("base64")}function le(){return new Promise(e=>{const n=Buffer.from(`
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
`,"utf16le").toString("base64");y(`powershell -NoProfile -EncodedCommand ${n}`,{maxBuffer:5*1024*1024},(o,s)=>{if(o||!s)return e([]);try{const i=JSON.parse(s.trim());e(Array.isArray(i)?i:i?[i]:[])}catch{e([])}})})}function de(){return new Promise(e=>{const n=Buffer.from(`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$results = [System.Collections.Generic.List[object]]::new()
Get-StartApps -EA SilentlyContinue | ForEach-Object {
  if ($_.AppID -match '.+!.+') {
    $results.Add([PSCustomObject]@{ name = $_.Name; type = 'uwp'; appId = $_.AppID })
  }
}
@($results) | ConvertTo-Json -Compress -Depth 2
`,"utf16le").toString("base64");y(`powershell -NoProfile -EncodedCommand ${n}`,{maxBuffer:2*1024*1024},(o,s)=>{if(o||!s)return e([]);try{const i=JSON.parse(s.trim());e(Array.isArray(i)?i:i?[i]:[])}catch{e([])}})})}async function pe(){const[e,t]=await Promise.all([le(),de()]),n=new Set,o=[];for(const s of[...e,...t]){if(!s.name||!(s.path||s.appId))continue;const i=s.type==="uwp"?`shell:AppsFolder\\${s.appId}`:s.path,r=i.toLowerCase();n.has(r)||(n.add(r),o.push({name:s.name,launch:i}))}return o.sort((s,i)=>s.name.localeCompare(i.name))}function D(e){const t=[];let n=0;for(;n<e.length;){for(;n<e.length&&/\s/.test(e[n]);)n++;if(n>=e.length)break;let o="";for(;n<e.length&&!/\s/.test(e[n]);)if(e[n]==='"'){for(n++;n<e.length&&e[n]!=='"';)o+=e[n++];n<e.length&&n++}else o+=e[n++];o&&t.push(o)}return t}function ue(e){const t=e.replace(/\//g,"\\").replace(/%([^%]+)%/g,(i,r)=>process.env[r]||`%${r}%`),n=t.match(/^"([^"]+)"(.*)/);if(n)return{exe:n[1],args:n[2].trim()?D(n[2].trim()):[]};const o=t.match(/^(.+?\.(?:exe|cmd|bat|com|ps1))(?:\s+(.*))?$/i);if(o)return{exe:o[1],args:o[2]?D(o[2]):[]};const s=t.search(/\s/);return s===-1?{exe:t,args:[]}:{exe:t.slice(0,s),args:D(t.slice(s+1).trim())}}function me(e){const t=e.trim();if(t.startsWith("shell:")){const n=t.replace(/'/g,"''");y(`powershell -NoProfile -WindowStyle Hidden -Command "Start-Process '${n}'"`);return}if(/[\\\/]/.test(t)){const{exe:n,args:o}=ue(t);if(o.length===0){if(n.toLowerCase().endsWith(".url")){try{const l=h.readFileSync(n,"utf8").match(/^URL=(.+)$/im);l&&q.openExternal(l[1].trim())}catch{}return}q.openPath(n).then(r=>{r&&y(`start "" "${n}"`)});return}const s=/[\\/]/.test(n)&&!/\.[^\\.]+$/.test(n)?n+".exe":n;if(/\.(cmd|bat)$/i.test(s)){const r=x("cmd.exe",["/c",s,...o],{shell:!1,detached:!0,stdio:"ignore"});r.on("error",()=>{}),r.unref();return}if(/\.ps1$/i.test(s)){const r=x("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-File",s,...o],{shell:!1,detached:!0,stdio:"ignore"});r.on("error",()=>{}),r.unref();return}const i=x(s,o,{shell:!1,detached:!0,stdio:"ignore"});i.on("error",()=>{}),i.unref();return}if(t.includes(" ")){const n=t.replace(/'/g,"''");y(`powershell -NoProfile -WindowStyle Hidden -Command "Start-Process '${n}'"`)}else y(`start "" ${t}`)}p.handle("log-message",(e,t,n,o)=>{S(`[RENDERER ${String(t).toUpperCase()}] ${n} ${o?JSON.stringify(o):""}`)});p.handle("set-ignore-mouse-events",(e,t,n)=>{if(c&&!c.isDestroyed())try{if(t){const o=n!==void 0?n:!0;c.setIgnoreMouseEvents(!0,{forward:o})}else c.setIgnoreMouseEvents(!1);S(`setIgnoreMouseEvents(${t}, forward=${n}) executed`)}catch(o){S("Error in setIgnoreMouseEvents, falling back to forward=true",o);try{c.setIgnoreMouseEvents(!0,{forward:!0})}catch{}}});p.handle("focus-window",()=>{c&&c.focus()});p.handle("open-external",async(e,t)=>{await q.openExternal(t)});p.handle("launch-app",async(e,t)=>{me(t)});p.handle("build-app-cache",async()=>{const e=f.join(m.getPath("userData"),"app-cache.json");try{const t=await pe();h.writeFileSync(e,JSON.stringify(t))}catch{}});p.handle("search-apps",async(e,t)=>{if(!t)return[];const n=f.join(m.getPath("userData"),"app-cache.json");try{if(!h.existsSync(n))return[];const o=JSON.parse(h.readFileSync(n,"utf8")),s=t.toLowerCase();return o.filter(i=>i.name&&i.name.toLowerCase().includes(s)).slice(0,8)}catch{return[]}});p.handle("get-displays",()=>E.getAllDisplays().map(t=>({id:t.id,label:t.label||`Display ${t.id}`,bounds:t.bounds})));p.handle("set-display",(e,t)=>{if(c){const o=E.getAllDisplays().find(a=>a.id.toString()===t.toString())||E.getPrimaryDisplay(),{x:s,y:i,width:r,height:l}=o.bounds;c.setBounds({x:s,y:i,width:r,height:l}),c.show()}});p.handle("update-window-position",(e,t,n)=>{});p.handle("set-auto-launch",(e,t)=>{try{m.setLoginItemSettings({openAtLogin:t,path:m.getPath("exe")}),t||Y()}catch(n){console.error("Failed to set login item settings on Windows:",n)}});function Y(){if(process.platform==="win32")try{const e=["electron.app.Ripple","electron.app.Electron","electron.app.Quick Pill","Ripple"];for(const t of e)y(`reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${t}" /f`,()=>{})}catch{}}const he=["https://raw.githubusercontent.com/nabil24024004/Quick-Pill/main/web%20app/public/version.json","https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/version.json","https://raw.githubusercontent.com/nabil24024004/Ripple/main/web%20app/public/version.json"];class $e extends ae{constructor(){super(),this.manifestUrls=[...he],this.currentVersion=m?m.getVersion():"5.3.0",this.status="idle",this.updateInfo=null,this.downloadedFilePath=null,this.currentDownloadRequest=null,this.lastProgressEmit=0}compareVersions(t,n){const o=(t||"0.0.0").replace(/^v/i,"").trim(),s=(n||"0.0.0").replace(/^v/i,"").trim(),[i,r]=o.split("-"),[l,a]=s.split("-"),d=i.split(".").map(b=>parseInt(b,10)||0),u=l.split(".").map(b=>parseInt(b,10)||0),T=Math.max(d.length,u.length);for(let b=0;b<T;b++){const I=d[b]||0,w=u[b]||0;if(I>w)return 1;if(I<w)return-1}return!r&&a?1:r&&!a?-1:r&&a?r.localeCompare(a):0}getPlatformKey(){return`win32-${process.arch}`}fetchJson(t,n=12e3,o=5){return new Promise((s,i)=>{if(o<=0)return i(new Error("Too many redirects while fetching update manifest."));const l=(t.startsWith("https")?Q:z).get(t,{headers:{"User-Agent":`QuickPill-Updater/${this.currentVersion} (${process.platform} ${process.arch})`,Accept:"application/json, text/plain, */*"},timeout:n},a=>{if(a.statusCode>=300&&a.statusCode<400&&a.headers.location){const u=new URL(a.headers.location,t).href;return this.fetchJson(u,n,o-1).then(s).catch(i)}if(a.statusCode!==200)return a.resume(),i(new Error(`Server returned HTTP ${a.statusCode}: ${a.statusMessage}`));let d="";a.setEncoding("utf8"),a.on("data",u=>{d+=u}),a.on("end",()=>{try{const u=JSON.parse(d);s(u)}catch(u){i(new Error(`Invalid JSON received from update manifest: ${u.message}`))}})});l.on("timeout",()=>{l.destroy(),i(new Error("Connection timed out while checking for updates."))}),l.on("error",a=>{i(a)})})}async checkForUpdates(){var t,n,o;if(this.status==="checking"||this.status==="downloading")return{status:this.status,updateInfo:this.updateInfo};this.status="checking",this.emit("checking");try{let s=null,i=null;for(const a of this.manifestUrls)try{const d=`${a}${a.includes("?")?"&":"?"}_t=${Date.now()}`,u=await this.fetchJson(d);if(u&&u.version){s=u;break}}catch(d){i=d}if(!s||!s.version)throw i||new Error('Update manifest is missing required "version" field.');const r=s.version;if(this.compareVersions(r,this.currentVersion)>0){const a=this.getPlatformKey(),d=((t=s.platforms)==null?void 0:t[a])||((n=s.platforms)==null?void 0:n[`${process.platform}-x64`])||((o=s.platforms)==null?void 0:o["win32-x64"]),u=(d==null?void 0:d.url)||"";return this.updateInfo={version:r,currentVersion:this.currentVersion,name:s.name||`Quick Pill v${r}`,releaseDate:s.releaseDate||"",mandatory:!!s.mandatory,changelog:Array.isArray(s.changelog)?s.changelog:[],downloadUrl:u,sha256:(d==null?void 0:d.sha256)||"",size:(d==null?void 0:d.size)||0,installerType:(d==null?void 0:d.installerType)||"nsis"},this.status="available",this.emit("update-available",this.updateInfo),{status:"available",updateInfo:this.updateInfo}}else{this.status="not-available";const a={currentVersion:this.currentVersion,latestVersion:r};return this.emit("update-not-available",a),{status:"not-available",updateInfo:a}}}catch(s){this.status="error";const i=s.message||"Unknown error occurred while checking for updates.";return this.emit("error",i),{status:"error",error:i}}}startDownload(){if(!this.updateInfo||!this.updateInfo.downloadUrl){const i=new Error("No update available or download URL is missing.");return this.emit("error",i.message),Promise.reject(i)}if(this.status==="downloading")return Promise.resolve({status:"downloading"});this.status="downloading",this.emit("download-started",this.updateInfo);const t=m.getPath("temp"),o=`quick-pill-update-v${this.updateInfo.version}.exe`,s=f.join(t,o);return new Promise((i,r)=>{if(h.existsSync(s))try{h.unlinkSync(s)}catch{}const l=h.createWriteStream(s);let a=0,d=this.updateInfo.size||0,u=0,T=Date.now(),b=0;const I=(w,k=5)=>{if(k<=0){l.close();const $=new Error("Too many redirects while downloading update binary.");return this.status="error",this.emit("error",$.message),r($)}const U=(w.startsWith("https")?Q:z).get(w,{headers:{"User-Agent":`QuickPill-Updater/${this.currentVersion} (${process.platform} ${process.arch})`}},$=>{if($.statusCode>=300&&$.statusCode<400&&$.headers.location){const P=new URL($.headers.location,w).href;return I(P,k-1)}if($.statusCode!==200){l.close();try{h.unlinkSync(s)}catch{}const P=new Error(`Download failed with status HTTP ${$.statusCode}: ${$.statusMessage}`);return this.status="error",this.emit("error",P.message),r(P)}const v=parseInt($.headers["content-length"],10);!isNaN(v)&&v>0&&(d=v),$.on("data",P=>{a+=P.length,l.write(P);const A=Date.now();if(A-this.lastProgressEmit>=100||a===d){const K=(A-T)/1e3;K>=.5&&(b=Math.round((a-u)/K),u=a,T=A);const se={percent:d>0?Math.min(100,Math.round(a/d*1e3)/10):0,transferredBytes:a,totalBytes:d,speedBytesPerSec:b};this.lastProgressEmit=A,this.emit("download-progress",se)}}),$.on("end",()=>{l.end()}),$.on("error",P=>{l.close();try{h.unlinkSync(s)}catch{}this.status="error",this.emit("error",P.message),r(P)})});this.currentDownloadRequest=U,U.on("error",$=>{l.close();try{h.unlinkSync(s)}catch{}this.status="error",this.emit("error",$.message),r($)})};l.on("finish",()=>{if(this.currentDownloadRequest=null,this.updateInfo.sha256&&this.updateInfo.sha256.trim()!=="")try{const k=re.createHash("sha256"),J=h.readFileSync(s);if(k.update(J),k.digest("hex").toLowerCase()!==this.updateInfo.sha256.trim().toLowerCase()){try{h.unlinkSync(s)}catch{}const $=new Error("Integrity check failed (SHA-256 mismatch). The downloaded file might be corrupted.");return this.status="error",this.emit("error",$.message),r($)}}catch(k){console.warn("Could not verify SHA-256 checksum:",k)}this.downloadedFilePath=s,this.status="downloaded";const w={version:this.updateInfo.version,filePath:s};this.emit("update-downloaded",w),i(w)}),l.on("error",w=>{try{h.unlinkSync(s)}catch{}this.status="error",this.emit("error",w.message),r(w)}),I(this.updateInfo.downloadUrl)})}cancelDownload(){if(this.currentDownloadRequest){try{this.currentDownloadRequest.destroy()}catch{}this.currentDownloadRequest=null}this.status="idle",this.emit("download-cancelled")}installAndRelaunch(){if(!this.downloadedFilePath||!h.existsSync(this.downloadedFilePath)){const n=new Error("No downloaded update file found to install.");return this.emit("error",n.message),!1}const t=this.downloadedFilePath;try{return x(t,["/S"],{detached:!0,stdio:"ignore"}).unref(),setTimeout(()=>{m?(m.isQuitting=!0,m.quit()):process.exit(0)},300),!0}catch(n){return this.emit("error",`Failed to launch installer: ${n.message}`),!1}}}const g=new $e;function C(e,t){c&&!c.isDestroyed()&&c.webContents.send("update-event",{event:e,data:t})}g.on("checking",()=>C("checking"));g.on("update-available",e=>C("available",e));g.on("update-not-available",e=>C("not-available",e));g.on("download-started",e=>C("download-started",e));g.on("download-progress",e=>C("download-progress",e));g.on("update-downloaded",e=>C("downloaded",e));g.on("download-cancelled",()=>C("cancelled"));g.on("error",e=>C("error",e));p.handle("check-for-updates",async()=>await g.checkForUpdates());p.handle("start-update-download",async()=>await g.startDownload());p.handle("cancel-update-download",()=>(g.cancelDownload(),!0));p.handle("install-update",()=>g.installAndRelaunch());p.handle("get-app-version",()=>m.getVersion());const B=(e=null)=>{const t=e||"ico";try{const n=f.join(m.getAppPath(),`src/assets/icons/icon.${t}`);if(h.existsSync(n))return n}catch{}try{const n=f.join(process.resourcesPath,`icon.${t}`);if(h.existsSync(n))return n;const o=f.join(process.resourcesPath,`assets/icons/icon.${t}`);if(h.existsSync(o))return o}catch{}return f.join(__dirname,`../../src/assets/icons/icon.${t}`)},Z=()=>{const e=E.getPrimaryDisplay(),{x:t,y:n,width:o,height:s}=e.bounds,i=o,r=s,l=t,a=n;c=new X({width:i,height:r,x:l,y:a,backgroundColor:"#00000000",transparent:!0,alwaysOnTop:!0,resizable:!1,frame:!1,thickFrame:!1,hasShadow:!1,skipTaskbar:!0,icon:B(),type:"toolbar",fullscreen:!1,visibleOnFullScreen:!0,acceptFirstMouse:!0,webPreferences:{preload:f.join(__dirname,"preload.js"),devTools:!m.isPackaged},show:!0}),c.setIgnoreMouseEvents(!0,{forward:!0}),c.once("ready-to-show",()=>{c&&(c.show(),c.setAlwaysOnTop(!0,"pop-up-menu"),c.focus())}),setTimeout(()=>{c&&!c.isVisible()&&(c.show(),c.focus())},5e3),c.on("closed",()=>{c=null});try{c.setVisibleOnAllWorkspaces(!0,{visibleOnFullScreen:!0})}catch{}if(!m.isPackaged&&process.env.NODE_ENV==="development")c.loadURL("http://localhost:5173");else{const d=[f.join(__dirname,"../renderer/main_window/index.html"),f.join(m.getAppPath(),".vite/renderer/main_window/index.html"),f.join(m.getAppPath(),"dist/index.html"),f.join(__dirname,"index.html"),f.join(m.getAppPath(),"index.html")];let u=!1;for(const T of d)if(h.existsSync(T)){S(`Loading renderer from: ${T}`),c.loadFile(T),u=!0;break}u||(S("No packaged renderer HTML found, falling back to localhost:5173"),c.loadURL("http://localhost:5173"))}};m.whenReady().then(()=>{m.setAppUserModelId("com.neosparkx.quickpill"),Y(),Z(),Se(),be(),m.on("activate",()=>{X.getAllWindows().length===0&&Z()});try{let e=B(),t=H.createFromPath(e);t.isEmpty()&&(e=B("png"),t=H.createFromPath(e));const n=t.isEmpty()?e:t.resize({width:16,height:16});O=new oe(n);const o=ie.buildFromTemplate([{label:"Show/Hide Quick Pill",click:()=>{c&&(c.isVisible()?c.hide():c.show())}},{type:"separator"},{label:"Quit",click:()=>{m.quit()}}]);O.setToolTip("Quick Pill"),O.setContextMenu(o)}catch(e){console.error("Failed to create tray:",e)}setTimeout(()=>{g.checkForUpdates().catch(e=>{S("Auto-update check on startup error:",e)})},4e3)});const ee=f.join(m.getPath("userData"),"get-media.ps1"),fe=`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
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
`,te=f.join(m.getPath("userData"),"control-media.ps1"),ye=`param([string]$command = "playpause", [double]$seekSeconds = 0)

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
`;try{h.writeFileSync(ee,fe,"utf8")}catch(e){console.error("Failed to write get-media.ps1 script:",e)}try{h.writeFileSync(te,ye,"utf8")}catch(e){console.error("Failed to write control-media.ps1 script:",e)}let G=!1;p.handle("get-system-media",async()=>G?null:(G=!0,new Promise(e=>{const t=n=>{G=!1,e(n)};M("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-File",ee],{maxBuffer:10*1024*1024,encoding:"utf8"},(n,o)=>{if(n||!o||o.trim()==="null"||o.trim()==="'null'"){y(`powershell -NoProfile -Command "Get-Process | Where-Object {$_.ProcessName -eq 'Spotify'} | Select-Object MainWindowTitle"`,{encoding:"utf8"},(s,i)=>{var l;if(s||!i)return t(null);const r=(l=i.split(`
`).find(a=>a.includes("-")))==null?void 0:l.trim();if(r){const a=r.split(" - ");let d="Unknown",u=r;a.length>1&&(d=a[0].trim(),u=a.slice(1).join(" - ").trim()),t({name:u||r,artist:d||"Unknown",state:"playing",source:"Spotify",position:0,duration:0})}else t(null)});return}try{const s=JSON.parse(o.trim());if(!s||!s.Title&&!s.Artist)return t(null);t({name:s.Title||"Unknown Title",artist:s.Artist||"Unknown Artist",album:s.Album||"",artwork_url:s.Artwork||null,state:s.Status==="playing"?"playing":"paused",source:s.Source||"System",position:Number(s.Position)||0,duration:Number(s.Duration)||0})}catch{t(null)}})})));p.handle("get-bluetooth-status",async()=>new Promise(e=>{const n=Buffer.from(`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$devs = @(Get-PnpDevice -Class Bluetooth -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'OK' -and $_.Present -eq $true -and $_.InstanceId -match 'BTHENUM' })
$names = @($devs | ForEach-Object { $_.FriendlyName })
@{ connected = ($devs.Count -gt 0); devices = $names } | ConvertTo-Json -Compress
`,"utf16le").toString("base64");y(`powershell -NoProfile -EncodedCommand ${n}`,(o,s)=>{if(o||!s)return e({connected:!1,devices:[]});try{const i=JSON.parse(s.trim());e({connected:!!i.connected,devices:Array.isArray(i.devices)?i.devices:i.devices?[i.devices]:[]})}catch{e({connected:!1,devices:[]})}})}));p.handle("get-camera-status",async()=>new Promise(e=>{M("reg",["query","HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam","/s"],(t,n)=>{if(t||!n)return e(!1);const o=n.match(/LastUsedTimeStop\s+REG_QWORD\s+0x0\b/i);e(!!o)})}));p.handle("get-microphone-status",async()=>new Promise(e=>{M("reg",["query","HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone","/s"],(t,n)=>{if(t||!n)return e(!1);const o=n.match(/LastUsedTimeStop\s+REG_QWORD\s+0x0\b/i);e(!!o)})}));m.on("window-all-closed",()=>{O||m.quit()});p.handle("control-system-media",async(e,t,...n)=>{const o=typeof n[0]=="number"?n[0]:0;S(`Executing media control: ${t} ${o>0?`(seek: ${o}s)`:""}`),M("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-File",te,"-command",t,"-seekSeconds",o.toString()],{timeout:4e3},s=>{s&&S("Media control error:",s)})});let W=null;function we(){const e=j.cpus();if(!e||e.length===0)return 0;if(!W||W.length!==e.length)return W=e,0;let t=0,n=0;for(let s=0;s<e.length;s++){const i=e[s],r=W[s];let l=i.times.idle-r.times.idle,a=0;for(const d in i.times)a+=i.times[d]-r.times[d];t+=l,n+=a}if(W=e,n===0)return 0;const o=t/n;return Math.max(0,Math.min(100,Math.round((1-o)*100)))}function ge(){const e=j.totalmem(),t=j.freemem();return e?Math.max(0,Math.min(100,Math.round((e-t)/e*100))):0}p.handle("get-system-metrics",async()=>({cpu:we(),ram:ge()}));p.handle("get-clipboard-text",async()=>{try{return F.readText()}catch{return""}});p.handle("write-clipboard-text",async(e,t)=>{try{return t?F.writeText(t):F.clear(),!0}catch{return!1}});p.handle("clear-clipboard",async()=>{try{return F.clear(),!0}catch{return!1}});p.handle("control-system-volume",async(e,t)=>{if(process.platform==="win32"){let n="0xAF";t==="down"&&(n="0xAE"),t==="mute"&&(n="0xAD");const o=`
$type = '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);'
$MediaKey = Add-Type -MemberDefinition $type -Name "WinVolKey" -Namespace "WinAPI" -PassThru
$MediaKey::keybd_event(${n}, 0, 0, [UIntPtr]::Zero)
$MediaKey::keybd_event(${n}, 0, 2, [UIntPtr]::Zero)
`,s=V(o);return y(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${s}`,i=>{i&&S("Volume control error:",i)}),!0}return!1});let R=null,_=null;function Se(){if(process.platform!=="win32")return;let e=!1;setInterval(()=>{!c||c.isDestroyed()||e||(e=!0,y('powershell -NoProfile -Command "[Console]::CapsLock; [Console]::NumberLock"',(t,n)=>{var r,l;if(e=!1,t||!n)return;const o=n.trim().split(/\r?\n/),s=((r=o[0])==null?void 0:r.trim().toLowerCase())==="true",i=((l=o[1])==null?void 0:l.trim().toLowerCase())==="true";R!==null&&s!==R&&c&&!c.isDestroyed()&&c.webContents.send("key-lock-change",{key:"CapsLock",state:s}),_!==null&&i!==_&&c&&!c.isDestroyed()&&c.webContents.send("key-lock-change",{key:"NumLock",state:i}),R=s,_=i}))},2e3)}let N=null;function be(){if(process.platform!=="win32")return;let e=!1;setInterval(()=>{!c||c.isDestroyed()||e||(e=!0,y("wmic logicaldisk where drivetype=2 get name,volumename /format:csv",(t,n)=>{var i,r;if(e=!1,t)return;const o=new Map,s=n.trim().split(/\r?\n/).filter(l=>l.trim()&&!l.startsWith("Node"));for(const l of s){const a=l.trim().split(",");if(a.length>=3){const d=(i=a[1])==null?void 0:i.trim(),u=((r=a[2])==null?void 0:r.trim())||"USB Drive";d&&o.set(d,u)}}if(N!==null&&c&&!c.isDestroyed()){for(const[l,a]of o)N.has(l)||c.webContents.send("usb-change",{action:"connected",drive:l,name:a});for(const[l]of N)o.has(l)||c.webContents.send("usb-change",{action:"disconnected",drive:l,name:"USB Drive"})}N=o}))},5e3)}const ne=f.join(m.getPath("userData"),"get-notifications.ps1"),Pe=`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
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
`;try{h.writeFileSync(ne,Pe,"utf8")}catch(e){S("Failed to write get-notifications.ps1:",e)}let L=!1;p.handle("get-notifications",async()=>process.platform!=="win32"?[]:L?[]:(L=!0,new Promise(e=>{M("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-File",ne],{maxBuffer:5*1024*1024,encoding:"utf8",timeout:1e4},(t,n)=>{if(L=!1,t||!n)return e([]);try{const o=JSON.parse(n.trim());e(Array.isArray(o)?o:o?[o]:[])}catch{e([])}})})));p.handle("dismiss-notification",async(e,t)=>process.platform!=="win32"?!1:new Promise(n=>{const o=`
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
`,s=V(o);y(`powershell -NoProfile -EncodedCommand ${s}`,(i,r)=>{n((r==null?void 0:r.trim())==="true")})}));p.handle("focus-notification-app",async(e,t)=>process.platform!=="win32"||!t?!1:new Promise(n=>{const o=t.split("!")[0].split("_")[0].replace(/\./g,""),s=`
$type = '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);'
$fw = Add-Type -MemberDefinition $type -Name "FW" -Namespace "WinAPI" -PassThru
$procs = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and ($_.ProcessName -match '${o}' -or $_.MainWindowTitle -match '${o}') } | Select-Object -First 1
if ($procs) { [void]$fw::SetForegroundWindow($procs.MainWindowHandle); Write-Output "true" } else { Write-Output "false" }
`,i=V(s);y(`powershell -NoProfile -EncodedCommand ${i}`,(r,l)=>{n((l==null?void 0:l.trim())==="true")})}));
