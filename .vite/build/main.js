"use strict";const{app:p,BrowserWindow:L,screen:C,ipcMain:l,shell:F,Tray:H,Menu:V,nativeImage:G,clipboard:A}=require("electron"),u=require("node:path"),m=require("fs"),_=require("os"),{autoUpdater:h}=require("./updater.js");process.platform==="linux"&&(p.commandLine.appendSwitch("enable-transparent-visuals"),p.commandLine.appendSwitch("disable-gpu-compositing"),p.disableHardwareAcceleration());let T=null,a=null;function Q(){try{return u.join(p.getPath("userData"),"quick-pill.log")}catch{return u.join(process.cwd(),"quick-pill.log")}}function y(e,t=null){const s=`[${new Date().toISOString()}] ${e}${t?` | Error: ${t.stack||t}`:""}
`;console.log(s.trim());try{const i=Q();m.appendFileSync(i,s,"utf8")}catch{}}process.on("uncaughtException",e=>{y("UNCAUGHT EXCEPTION (Main Process)",e)});process.on("unhandledRejection",e=>{y("UNHANDLED REJECTION (Main Process)",e)});const{exec:d,execFile:S,spawn:W}=require("child_process");function I(e){return Buffer.from(e,"utf16le").toString("base64")}function Z(){return new Promise(e=>{const n=Buffer.from(`
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
`,"utf16le").toString("base64");d(`powershell -NoProfile -EncodedCommand ${n}`,{maxBuffer:5*1024*1024},(s,i)=>{if(s||!i)return e([]);try{const o=JSON.parse(i.trim());e(Array.isArray(o)?o:o?[o]:[])}catch{e([])}})})}function z(){return new Promise(e=>{const n=Buffer.from(`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$results = [System.Collections.Generic.List[object]]::new()
Get-StartApps -EA SilentlyContinue | ForEach-Object {
  if ($_.AppID -match '.+!.+') {
    $results.Add([PSCustomObject]@{ name = $_.Name; type = 'uwp'; appId = $_.AppID })
  }
}
@($results) | ConvertTo-Json -Compress -Depth 2
`,"utf16le").toString("base64");d(`powershell -NoProfile -EncodedCommand ${n}`,{maxBuffer:2*1024*1024},(s,i)=>{if(s||!i)return e([]);try{const o=JSON.parse(i.trim());e(Array.isArray(o)?o:o?[o]:[])}catch{e([])}})})}async function Y(){const[e,t]=await Promise.all([Z(),z()]),n=new Set,s=[];for(const i of[...e,...t]){if(!i.name||!(i.path||i.appId))continue;const o=i.type==="uwp"?`shell:AppsFolder\\${i.appId}`:i.path,r=o.toLowerCase();n.has(r)||(n.add(r),s.push({name:i.name,launch:o}))}return s.sort((i,o)=>i.name.localeCompare(o.name))}function M(e){const t=[];let n=0;for(;n<e.length;){for(;n<e.length&&/\s/.test(e[n]);)n++;if(n>=e.length)break;let s="";for(;n<e.length&&!/\s/.test(e[n]);)if(e[n]==='"'){for(n++;n<e.length&&e[n]!=='"';)s+=e[n++];n<e.length&&n++}else s+=e[n++];s&&t.push(s)}return t}function X(e){const t=e.replace(/\//g,"\\").replace(/%([^%]+)%/g,(o,r)=>process.env[r]||`%${r}%`),n=t.match(/^"([^"]+)"(.*)/);if(n)return{exe:n[1],args:n[2].trim()?M(n[2].trim()):[]};const s=t.match(/^(.+?\.(?:exe|cmd|bat|com|ps1))(?:\s+(.*))?$/i);if(s)return{exe:s[1],args:s[2]?M(s[2]):[]};const i=t.search(/\s/);return i===-1?{exe:t,args:[]}:{exe:t.slice(0,i),args:M(t.slice(i+1).trim())}}function ee(e){const t=e.trim();if(t.startsWith("shell:")){const n=t.replace(/'/g,"''");d(`powershell -NoProfile -WindowStyle Hidden -Command "Start-Process '${n}'"`);return}if(/[\\\/]/.test(t)){const{exe:n,args:s}=X(t);if(s.length===0){if(n.toLowerCase().endsWith(".url")){try{const c=m.readFileSync(n,"utf8").match(/^URL=(.+)$/im);c&&F.openExternal(c[1].trim())}catch{}return}F.openPath(n).then(r=>{r&&d(`start "" "${n}"`)});return}const i=/[\\/]/.test(n)&&!/\.[^\\.]+$/.test(n)?n+".exe":n;if(/\.(cmd|bat)$/i.test(i)){const r=W("cmd.exe",["/c",i,...s],{shell:!1,detached:!0,stdio:"ignore"});r.on("error",()=>{}),r.unref();return}if(/\.ps1$/i.test(i)){const r=W("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-File",i,...s],{shell:!1,detached:!0,stdio:"ignore"});r.on("error",()=>{}),r.unref();return}const o=W(i,s,{shell:!1,detached:!0,stdio:"ignore"});o.on("error",()=>{}),o.unref();return}if(t.includes(" ")){const n=t.replace(/'/g,"''");d(`powershell -NoProfile -WindowStyle Hidden -Command "Start-Process '${n}'"`)}else d(`start "" ${t}`)}l.handle("log-message",(e,t,n,s)=>{y(`[RENDERER ${String(t).toUpperCase()}] ${n} ${s?JSON.stringify(s):""}`)});l.handle("set-ignore-mouse-events",(e,t,n)=>{if(a&&!a.isDestroyed())try{if(process.platform!=="linux"){const s=n!==void 0?n:t;a.setIgnoreMouseEvents(t,{forward:s}),y(`setIgnoreMouseEvents(${t}, forward=${s}) executed`)}else a.setIgnoreMouseEvents(t),y(`setIgnoreMouseEvents(${t}) executed (linux)`)}catch(s){y("Error in setIgnoreMouseEvents, falling back to forward=true",s);try{a.setIgnoreMouseEvents(!0,{forward:!0})}catch{}}});l.handle("focus-window",()=>{a&&a.focus()});l.handle("open-external",async(e,t)=>{await F.openExternal(t)});l.handle("launch-app",async(e,t)=>{const n=process.platform;n==="darwin"?d(`open -a "${t}"`):n==="win32"?ee(t):d(t)});l.handle("build-app-cache",async()=>{if(process.platform!=="win32")return;const e=u.join(p.getPath("userData"),"app-cache.json");try{const t=await Y();m.writeFileSync(e,JSON.stringify(t))}catch{}});l.handle("search-apps",async(e,t)=>{if(process.platform!=="win32"||!t)return[];const n=u.join(p.getPath("userData"),"app-cache.json");try{if(!m.existsSync(n))return[];const s=JSON.parse(m.readFileSync(n,"utf8")),i=t.toLowerCase();return s.filter(o=>o.name&&o.name.toLowerCase().includes(i)).slice(0,8)}catch{return[]}});l.handle("get-displays",()=>C.getAllDisplays().map(t=>({id:t.id,label:t.label||`Display ${t.id}`,bounds:t.bounds})));l.handle("set-display",(e,t)=>{if(a){const s=C.getAllDisplays().find(f=>f.id.toString()===t.toString())||C.getPrimaryDisplay(),{x:i,y:o,width:r,height:c}=s.bounds;process.platform,a.setBounds({x:i,y:o,width:r,height:c}),a.show()}});l.handle("update-window-position",(e,t,n)=>{});l.handle("set-auto-launch",(e,t)=>{if(process.platform==="linux"){const n=u.join(p.getPath("home"),".config","autostart"),s=u.join(n,"quick-pill.desktop");try{if(t){m.existsSync(n)||m.mkdirSync(n,{recursive:!0});const i=`[Desktop Entry]
Type=Application
Version=1.0
Name=Quick Pill
Comment=Quick Pill Desktop Assistant
Exec="${p.getPath("exe")}"
Icon=${N()}
Terminal=false
`;m.writeFileSync(s,i)}else m.existsSync(s)&&m.unlinkSync(s)}catch(i){console.error("Failed to set auto-launch on Linux:",i)}}else if(process.platform==="win32")try{p.setLoginItemSettings({openAtLogin:t,path:p.getPath("exe")})}catch(n){console.error("Failed to set login item settings on Windows:",n)}});function w(e,t){a&&!a.isDestroyed()&&a.webContents.send("update-event",{event:e,data:t})}h.on("checking",()=>w("checking"));h.on("update-available",e=>w("available",e));h.on("update-not-available",e=>w("not-available",e));h.on("download-started",e=>w("download-started",e));h.on("download-progress",e=>w("download-progress",e));h.on("update-downloaded",e=>w("downloaded",e));h.on("download-cancelled",()=>w("cancelled"));h.on("error",e=>w("error",e));l.handle("check-for-updates",async()=>await h.checkForUpdates());l.handle("start-update-download",async()=>await h.startDownload());l.handle("cancel-update-download",()=>(h.cancelDownload(),!0));l.handle("install-update",()=>h.installAndRelaunch());l.handle("get-app-version",()=>p.getVersion());const N=(e=null)=>{const t=e||(process.platform==="win32"?"ico":process.platform==="darwin"?"icns":"png");try{const n=u.join(p.getAppPath(),`src/assets/icons/icon.${t}`);if(m.existsSync(n))return n}catch{}try{const n=u.join(process.resourcesPath,`icon.${t}`);if(m.existsSync(n))return n;const s=u.join(process.resourcesPath,`assets/icons/icon.${t}`);if(m.existsSync(s))return s}catch{}return u.join(__dirname,`../../src/assets/icons/icon.${t}`)},j=()=>{const e=C.getPrimaryDisplay(),{x:t,y:n,width:s,height:i}=e.bounds,o=process.platform==="linux",r=process.platform==="win32",c=process.platform==="darwin",f=s,$=i,g=t,P=n,J=r?"toolbar":"panel";a=new L({width:f,height:$,x:g,y:P,backgroundColor:"#00000000",transparent:!0,alwaysOnTop:!0,resizable:!1,frame:!1,...r?{thickFrame:!1}:{},hasShadow:!1,skipTaskbar:!0,icon:N(),...c?{hiddenInMissionControl:!0}:{},type:J,fullscreen:!1,visibleOnFullScreen:!0,acceptFirstMouse:!0,webPreferences:{preload:u.join(__dirname,"preload.js"),devTools:!p.isPackaged},show:!0}),o?a.setIgnoreMouseEvents(!0):a.setIgnoreMouseEvents(!0,{forward:!0});const K=o?500:0;a.once("ready-to-show",()=>{setTimeout(()=>{a&&(a.show(),o?a.setAlwaysOnTop(!0,"screen-saver"):a.setAlwaysOnTop(!0,"pop-up-menu"),a.focus())},K)}),setTimeout(()=>{a&&!a.isVisible()&&(a.show(),a.focus())},5e3),a.on("closed",()=>{a=null});try{a.setVisibleOnAllWorkspaces(!0,{visibleOnFullScreen:!0})}catch{}if(!p.isPackaged&&process.env.NODE_ENV==="development")a.loadURL("http://localhost:5173");else{const R=[u.join(__dirname,"../renderer/main_window/index.html"),u.join(p.getAppPath(),".vite/renderer/main_window/index.html"),u.join(p.getAppPath(),"dist/index.html"),u.join(__dirname,"index.html"),u.join(p.getAppPath(),"index.html")];let U=!1;for(const x of R)if(m.existsSync(x)){y(`Loading renderer from: ${x}`),a.loadFile(x),U=!0;break}U||(y("No packaged renderer HTML found, falling back to localhost:5173"),a.loadURL("http://localhost:5173"))}};p.whenReady().then(()=>{process.platform==="win32"&&p.setAppUserModelId("com.neosparkx.quickpill"),process.platform==="darwin"&&p.dock.hide(),j(),ie(),oe(),p.on("activate",()=>{L.getAllWindows().length===0&&j()});try{let e=N(),t=G.createFromPath(e);t.isEmpty()&&(e=N("png"),t=G.createFromPath(e));const n=t.isEmpty()?e:t.resize({width:16,height:16});T=new H(n);const s=V.buildFromTemplate([{label:"Show/Hide Quick Pill",click:()=>{a&&(a.isVisible()?a.hide():a.show())}},{type:"separator"},{label:"Quit",click:()=>{p.quit()}}]);T.setToolTip("Quick Pill"),T.setContextMenu(s)}catch(e){console.error("Failed to create tray:",e)}setTimeout(()=>{h.checkForUpdates().catch(e=>{y("Auto-update check on startup error:",e)})},4e3)});const B=u.join(p.getPath("userData"),"get-media.ps1"),te=`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
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
`;try{m.writeFileSync(B,te,"utf8")}catch(e){console.error("Failed to write get-media.ps1 script:",e)}let O=!1;l.handle("get-system-media",async()=>O?null:(O=!0,new Promise(e=>{const t=s=>{O=!1,e(s)},n=process.platform;n==="darwin"?S("osascript",["-e",`
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
      `],(i,o)=>{if(i||!o||o.trim()==="null")return t(null);const r=o.trim().split("||");r.length>=6?t({name:r[0],artist:r[1],album:r[2],artwork_url:r[3]||null,state:r[4]==="playing"?"playing":"paused",source:r[5]}):t(null)}):n==="win32"?S("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-File",B],{maxBuffer:10*1024*1024,encoding:"utf8"},(s,i)=>{if(s||!i||i.trim()==="null"||i.trim()==="'null'"){d(`powershell -NoProfile -Command "Get-Process | Where-Object {$_.ProcessName -eq 'Spotify'} | Select-Object MainWindowTitle"`,{encoding:"utf8"},(o,r)=>{var f;if(o||!r)return t(null);const c=(f=r.split(`
`).find($=>$.includes("-")))==null?void 0:f.trim();if(c){const $=c.split(" - ");let g="Unknown",P=c;$.length>1&&(g=$[0].trim(),P=$.slice(1).join(" - ").trim()),t({name:P||c,artist:g||"Unknown",state:"playing",source:"Spotify",position:0,duration:0})}else t(null)});return}try{const o=JSON.parse(i.trim());if(!o||!o.Title&&!o.Artist)return t(null);t({name:o.Title||"Unknown Title",artist:o.Artist||"Unknown Artist",album:o.Album||"",artwork_url:o.Artwork||null,state:o.Status==="playing"?"playing":"paused",source:o.Source||"System",position:Number(o.Position)||0,duration:Number(o.Duration)||0})}catch{t(null)}}):n==="linux"?d('playerctl metadata --format "{{title}}||{{artist}}||{{album}}||{{status}}"',(s,i)=>{if(s||!i)return t(null);const o=i.trim().split("||");t({name:o[0],artist:o[1],album:o[2],state:o[3].toLowerCase(),source:"System"})}):t(null)})));l.handle("get-bluetooth-status",async()=>new Promise(e=>{const t=process.platform;if(t==="darwin")d("system_profiler SPBluetoothDataType -json",(n,s)=>{if(n)return e(!1);try{const o=JSON.parse(s).SPBluetoothDataType[0],r=o.device_connected&&o.device_connected.length>0;e(r)}catch{e(!1)}});else if(t==="win32"){const s=Buffer.from(`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$devs = @(Get-PnpDevice -Class Bluetooth -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'OK' -and $_.Present -eq $true -and $_.InstanceId -match 'BTHENUM' })
$names = @($devs | ForEach-Object { $_.FriendlyName })
@{ connected = ($devs.Count -gt 0); devices = $names } | ConvertTo-Json -Compress
`,"utf16le").toString("base64");d(`powershell -NoProfile -EncodedCommand ${s}`,(i,o)=>{if(i||!o)return e({connected:!1,devices:[]});try{const r=JSON.parse(o.trim());e({connected:!!r.connected,devices:Array.isArray(r.devices)?r.devices:r.devices?[r.devices]:[]})}catch{e({connected:!1,devices:[]})}})}else t==="linux"?d("bluetoothctl devices Connected",(n,s)=>{if(n)return e(!1);e(s.trim().length>0)}):e(!1)}));l.handle("get-camera-status",async()=>new Promise(e=>{const t=process.platform;t==="darwin"?d('ioreg -l | grep -E "FrontCameraActive|FrontCameraStreaming"',(n,s)=>{e(s?s.includes("= Yes"):!1)}):t==="win32"?S("reg",["query","HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam","/s"],(n,s)=>{if(n||!s)return e(!1);const i=s.match(/LastUsedTimeStop\s+REG_QWORD\s+0x0\b/i);e(!!i)}):t==="linux"?d("fuser /dev/video* 2>/dev/null",(n,s)=>{e(s.trim().length>0)}):e(!1)}));l.handle("get-microphone-status",async()=>new Promise(e=>{const t=process.platform;t==="darwin"?d('ioreg -l | grep -E "IOAudioStreamActive|IOAudioEngine|IOAudioStream" | grep -i "Yes"',(n,s)=>{e(s?s.trim().length>0:!1)}):t==="win32"?S("reg",["query","HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone","/s"],(n,s)=>{if(n||!s)return e(!1);const i=s.match(/LastUsedTimeStop\s+REG_QWORD\s+0x0\b/i);e(!!i)}):t==="linux"?d("pactl list source-outputs | grep -q 'Source #'",n=>{e(!n)}):e(!1)}));p.on("window-all-closed",()=>{T||p.quit()});l.handle("control-system-media",async(e,t)=>{const n=process.platform;if(n==="darwin"){const s=`
        tell application "System Events"
            set spotifyRunning to (name of every process) contains "Spotify"
            set musicRunning to (name of every process) contains "Music"
        end tell
        if spotifyRunning then
            tell application "Spotify" to ${t} track
        else if musicRunning then
            tell application "Music" to ${t} track
        end if
        `;S("osascript",["-e",s])}else if(n==="win32"){if(!["playpause","next","previous"].includes(t))return;let s="0xCD";t==="next"&&(s="0xB0"),t==="previous"&&(s="0xB1"),y(`Executing media control: ${t} (${s})`);const i=`
$type = '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);'
$MediaKey = Add-Type -MemberDefinition $type -Name "WinMediaKey" -Namespace "WinAPI" -PassThru
$MediaKey::keybd_event(${s}, 0, 0, [UIntPtr]::Zero)
$MediaKey::keybd_event(${s}, 0, 2, [UIntPtr]::Zero)
`,o=I(i);d(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${o}`,r=>{r&&y("Media control error:",r)})}else if(n==="linux"){let s=t;t==="playpause"&&(s="play-pause"),d(`playerctl ${s}`)}});let b=null;function ne(){const e=_.cpus();if(!e||e.length===0)return 0;if(!b||b.length!==e.length)return b=e,0;let t=0,n=0;for(let i=0;i<e.length;i++){const o=e[i],r=b[i];let c=o.times.idle-r.times.idle,f=0;for(const $ in o.times)f+=o.times[$]-r.times[$];t+=c,n+=f}if(b=e,n===0)return 0;const s=t/n;return Math.max(0,Math.min(100,Math.round((1-s)*100)))}function se(){const e=_.totalmem(),t=_.freemem();return e?Math.max(0,Math.min(100,Math.round((e-t)/e*100))):0}l.handle("get-system-metrics",async()=>({cpu:ne(),ram:se()}));l.handle("get-clipboard-text",async()=>{try{return A.readText()}catch{return""}});l.handle("write-clipboard-text",async(e,t)=>{try{return t?A.writeText(t):A.clear(),!0}catch{return!1}});l.handle("clear-clipboard",async()=>{try{return A.clear(),!0}catch{return!1}});l.handle("control-system-volume",async(e,t)=>{if(process.platform==="win32"){let n="0xAF";t==="down"&&(n="0xAE"),t==="mute"&&(n="0xAD");const s=`
$type = '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);'
$MediaKey = Add-Type -MemberDefinition $type -Name "WinVolKey" -Namespace "WinAPI" -PassThru
$MediaKey::keybd_event(${n}, 0, 0, [UIntPtr]::Zero)
$MediaKey::keybd_event(${n}, 0, 2, [UIntPtr]::Zero)
`,i=I(s);return d(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${i}`,o=>{o&&y("Volume control error:",o)}),!0}return!1});let v=null,E=null;function ie(){if(process.platform!=="win32")return;let e=!1;setInterval(()=>{!a||a.isDestroyed()||e||(e=!0,d('powershell -NoProfile -Command "[Console]::CapsLock; [Console]::NumberLock"',(t,n)=>{var r,c;if(e=!1,t||!n)return;const s=n.trim().split(/\r?\n/),i=((r=s[0])==null?void 0:r.trim().toLowerCase())==="true",o=((c=s[1])==null?void 0:c.trim().toLowerCase())==="true";v!==null&&i!==v&&a&&!a.isDestroyed()&&a.webContents.send("key-lock-change",{key:"CapsLock",state:i}),E!==null&&o!==E&&a&&!a.isDestroyed()&&a.webContents.send("key-lock-change",{key:"NumLock",state:o}),v=i,E=o}))},2e3)}let k=null;function oe(){if(process.platform!=="win32")return;let e=!1;setInterval(()=>{!a||a.isDestroyed()||e||(e=!0,d("wmic logicaldisk where drivetype=2 get name,volumename /format:csv",(t,n)=>{var o,r;if(e=!1,t)return;const s=new Map,i=n.trim().split(/\r?\n/).filter(c=>c.trim()&&!c.startsWith("Node"));for(const c of i){const f=c.trim().split(",");if(f.length>=3){const $=(o=f[1])==null?void 0:o.trim(),g=((r=f[2])==null?void 0:r.trim())||"USB Drive";$&&s.set($,g)}}if(k!==null&&a&&!a.isDestroyed()){for(const[c,f]of s)k.has(c)||a.webContents.send("usb-change",{action:"connected",drive:c,name:f});for(const[c]of k)s.has(c)||a.webContents.send("usb-change",{action:"disconnected",drive:c,name:"USB Drive"})}k=s}))},5e3)}const q=u.join(p.getPath("userData"),"get-notifications.ps1"),re=`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
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
`;try{m.writeFileSync(q,re,"utf8")}catch(e){y("Failed to write get-notifications.ps1:",e)}let D=!1;l.handle("get-notifications",async()=>process.platform!=="win32"?[]:D?[]:(D=!0,new Promise(e=>{S("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-File",q],{maxBuffer:5*1024*1024,encoding:"utf8",timeout:1e4},(t,n)=>{if(D=!1,t||!n)return e([]);try{const s=JSON.parse(n.trim());e(Array.isArray(s)?s:s?[s]:[])}catch{e([])}})})));l.handle("dismiss-notification",async(e,t)=>process.platform!=="win32"?!1:new Promise(n=>{const s=`
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
`,i=I(s);d(`powershell -NoProfile -EncodedCommand ${i}`,(o,r)=>{n((r==null?void 0:r.trim())==="true")})}));l.handle("focus-notification-app",async(e,t)=>process.platform!=="win32"||!t?!1:new Promise(n=>{const s=t.split("!")[0].split("_")[0].replace(/\./g,""),i=`
$type = '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);'
$fw = Add-Type -MemberDefinition $type -Name "FW" -Namespace "WinAPI" -PassThru
$procs = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and ($_.ProcessName -match '${s}' -or $_.MainWindowTitle -match '${s}') } | Select-Object -First 1
if ($procs) { [void]$fw::SetForegroundWindow($procs.MainWindowHandle); Write-Output "true" } else { Write-Output "false" }
`,o=I(i);d(`powershell -NoProfile -EncodedCommand ${o}`,(r,c)=>{n((c==null?void 0:c.trim())==="true")})}));
