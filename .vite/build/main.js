"use strict";const{app:l,BrowserWindow:U,screen:T,ipcMain:u,shell:E,Tray:J,Menu:K,nativeImage:R,clipboard:k}=require("electron"),d=require("node:path"),m=require("fs"),D=require("os");process.platform==="linux"&&(l.commandLine.appendSwitch("enable-transparent-visuals"),l.commandLine.appendSwitch("disable-gpu-compositing"),l.disableHardwareAcceleration());let P=null,a=null;function H(){try{return d.join(l.getPath("userData"),"quick-pill.log")}catch{return d.join(process.cwd(),"quick-pill.log")}}function y(n,e=null){const s=`[${new Date().toISOString()}] ${n}${e?` | Error: ${e.stack||e}`:""}
`;console.log(s.trim());try{const i=H();m.appendFileSync(i,s,"utf8")}catch{}}process.on("uncaughtException",n=>{y("UNCAUGHT EXCEPTION (Main Process)",n)});process.on("unhandledRejection",n=>{y("UNHANDLED REJECTION (Main Process)",n)});const{exec:p,execFile:g,spawn:I}=require("child_process");function A(n){return Buffer.from(n,"utf16le").toString("base64")}function V(){return new Promise(n=>{const t=Buffer.from(`
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
`,"utf16le").toString("base64");p(`powershell -NoProfile -EncodedCommand ${t}`,{maxBuffer:5*1024*1024},(s,i)=>{if(s||!i)return n([]);try{const o=JSON.parse(i.trim());n(Array.isArray(o)?o:o?[o]:[])}catch{n([])}})})}function Q(){return new Promise(n=>{const t=Buffer.from(`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$results = [System.Collections.Generic.List[object]]::new()
Get-StartApps -EA SilentlyContinue | ForEach-Object {
  if ($_.AppID -match '.+!.+') {
    $results.Add([PSCustomObject]@{ name = $_.Name; type = 'uwp'; appId = $_.AppID })
  }
}
@($results) | ConvertTo-Json -Compress -Depth 2
`,"utf16le").toString("base64");p(`powershell -NoProfile -EncodedCommand ${t}`,{maxBuffer:2*1024*1024},(s,i)=>{if(s||!i)return n([]);try{const o=JSON.parse(i.trim());n(Array.isArray(o)?o:o?[o]:[])}catch{n([])}})})}async function Z(){const[n,e]=await Promise.all([V(),Q()]),t=new Set,s=[];for(const i of[...n,...e]){if(!i.name||!(i.path||i.appId))continue;const o=i.type==="uwp"?`shell:AppsFolder\\${i.appId}`:i.path,r=o.toLowerCase();t.has(r)||(t.add(r),s.push({name:i.name,launch:o}))}return s.sort((i,o)=>i.name.localeCompare(o.name))}function x(n){const e=[];let t=0;for(;t<n.length;){for(;t<n.length&&/\s/.test(n[t]);)t++;if(t>=n.length)break;let s="";for(;t<n.length&&!/\s/.test(n[t]);)if(n[t]==='"'){for(t++;t<n.length&&n[t]!=='"';)s+=n[t++];t<n.length&&t++}else s+=n[t++];s&&e.push(s)}return e}function z(n){const e=n.replace(/\//g,"\\").replace(/%([^%]+)%/g,(o,r)=>process.env[r]||`%${r}%`),t=e.match(/^"([^"]+)"(.*)/);if(t)return{exe:t[1],args:t[2].trim()?x(t[2].trim()):[]};const s=e.match(/^(.+?\.(?:exe|cmd|bat|com|ps1))(?:\s+(.*))?$/i);if(s)return{exe:s[1],args:s[2]?x(s[2]):[]};const i=e.search(/\s/);return i===-1?{exe:e,args:[]}:{exe:e.slice(0,i),args:x(e.slice(i+1).trim())}}function Y(n){const e=n.trim();if(e.startsWith("shell:")){const t=e.replace(/'/g,"''");p(`powershell -NoProfile -WindowStyle Hidden -Command "Start-Process '${t}'"`);return}if(/[\\\/]/.test(e)){const{exe:t,args:s}=z(e);if(s.length===0){if(t.toLowerCase().endsWith(".url")){try{const c=m.readFileSync(t,"utf8").match(/^URL=(.+)$/im);c&&E.openExternal(c[1].trim())}catch{}return}E.openPath(t).then(r=>{r&&p(`start "" "${t}"`)});return}const i=/[\\/]/.test(t)&&!/\.[^\\.]+$/.test(t)?t+".exe":t;if(/\.(cmd|bat)$/i.test(i)){const r=I("cmd.exe",["/c",i,...s],{shell:!1,detached:!0,stdio:"ignore"});r.on("error",()=>{}),r.unref();return}if(/\.ps1$/i.test(i)){const r=I("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-File",i,...s],{shell:!1,detached:!0,stdio:"ignore"});r.on("error",()=>{}),r.unref();return}const o=I(i,s,{shell:!1,detached:!0,stdio:"ignore"});o.on("error",()=>{}),o.unref();return}if(e.includes(" ")){const t=e.replace(/'/g,"''");p(`powershell -NoProfile -WindowStyle Hidden -Command "Start-Process '${t}'"`)}else p(`start "" ${e}`)}u.handle("log-message",(n,e,t,s)=>{y(`[RENDERER ${String(e).toUpperCase()}] ${t} ${s?JSON.stringify(s):""}`)});u.handle("set-ignore-mouse-events",(n,e,t)=>{if(a&&!a.isDestroyed())try{if(process.platform!=="linux"){const s=t!==void 0?t:e;a.setIgnoreMouseEvents(e,{forward:s}),y(`setIgnoreMouseEvents(${e}, forward=${s}) executed`)}else a.setIgnoreMouseEvents(e),y(`setIgnoreMouseEvents(${e}) executed (linux)`)}catch(s){y("Error in setIgnoreMouseEvents, falling back to forward=true",s);try{a.setIgnoreMouseEvents(!0,{forward:!0})}catch{}}});u.handle("focus-window",()=>{a&&a.focus()});u.handle("open-external",async(n,e)=>{await E.openExternal(e)});u.handle("launch-app",async(n,e)=>{const t=process.platform;t==="darwin"?p(`open -a "${e}"`):t==="win32"?Y(e):p(e)});u.handle("build-app-cache",async()=>{if(process.platform!=="win32")return;const n=d.join(l.getPath("userData"),"app-cache.json");try{const e=await Z();m.writeFileSync(n,JSON.stringify(e))}catch{}});u.handle("search-apps",async(n,e)=>{if(process.platform!=="win32"||!e)return[];const t=d.join(l.getPath("userData"),"app-cache.json");try{if(!m.existsSync(t))return[];const s=JSON.parse(m.readFileSync(t,"utf8")),i=e.toLowerCase();return s.filter(o=>o.name&&o.name.toLowerCase().includes(i)).slice(0,8)}catch{return[]}});u.handle("get-displays",()=>T.getAllDisplays().map(e=>({id:e.id,label:e.label||`Display ${e.id}`,bounds:e.bounds})));u.handle("set-display",(n,e)=>{if(a){const s=T.getAllDisplays().find(f=>f.id.toString()===e.toString())||T.getPrimaryDisplay(),{x:i,y:o,width:r,height:c}=s.bounds;process.platform,a.setBounds({x:i,y:o,width:r,height:c}),a.show()}});u.handle("update-window-position",(n,e,t)=>{});u.handle("set-auto-launch",(n,e)=>{if(process.platform==="linux"){const t=d.join(l.getPath("home"),".config","autostart"),s=d.join(t,"quick-pill.desktop");try{if(e){m.existsSync(t)||m.mkdirSync(t,{recursive:!0});const i=`[Desktop Entry]
Type=Application
Version=1.0
Name=Quick Pill
Comment=Quick Pill Desktop Assistant
Exec="${l.getPath("exe")}"
Icon=${C()}
Terminal=false
`;m.writeFileSync(s,i)}else m.existsSync(s)&&m.unlinkSync(s)}catch(i){console.error("Failed to set auto-launch on Linux:",i)}}else if(process.platform==="win32")try{l.setLoginItemSettings({openAtLogin:e,path:l.getPath("exe")})}catch(t){console.error("Failed to set login item settings on Windows:",t)}});const C=(n=null)=>{const e=n||(process.platform==="win32"?"ico":process.platform==="darwin"?"icns":"png");try{const t=d.join(l.getAppPath(),`src/assets/icons/icon.${e}`);if(m.existsSync(t))return t}catch{}try{const t=d.join(process.resourcesPath,`icon.${e}`);if(m.existsSync(t))return t;const s=d.join(process.resourcesPath,`assets/icons/icon.${e}`);if(m.existsSync(s))return s}catch{}return d.join(__dirname,`../../src/assets/icons/icon.${e}`)},G=()=>{const n=T.getPrimaryDisplay(),{x:e,y:t,width:s,height:i}=n.bounds,o=process.platform==="linux",r=process.platform==="win32",c=process.platform==="darwin",f=s,$=i,h=e,S=t,B=r?"toolbar":"panel";a=new U({width:f,height:$,x:h,y:S,backgroundColor:"#00000000",transparent:!0,alwaysOnTop:!0,resizable:!1,frame:!1,...r?{thickFrame:!1}:{},hasShadow:!1,skipTaskbar:!0,icon:C(),...c?{hiddenInMissionControl:!0}:{},type:B,fullscreen:!1,visibleOnFullScreen:!0,acceptFirstMouse:!0,webPreferences:{preload:d.join(__dirname,"preload.js"),devTools:!l.isPackaged},show:!0}),o?a.setIgnoreMouseEvents(!0):a.setIgnoreMouseEvents(!0,{forward:!0});const q=o?500:0;a.once("ready-to-show",()=>{setTimeout(()=>{a&&(a.show(),o?a.setAlwaysOnTop(!0,"screen-saver"):a.setAlwaysOnTop(!0,"pop-up-menu"),a.focus())},q)}),setTimeout(()=>{a&&!a.isVisible()&&(a.show(),a.focus())},5e3),a.on("closed",()=>{a=null});try{a.setVisibleOnAllWorkspaces(!0,{visibleOnFullScreen:!0})}catch{}if(!l.isPackaged)a.loadURL("http://localhost:5173");else if(!l.isPackaged&&process.env.NODE_ENV==="development")a.loadURL("http://localhost:5173");else{const F=[d.join(__dirname,"../renderer/main_window/index.html"),d.join(l.getAppPath(),".vite/renderer/main_window/index.html"),d.join(l.getAppPath(),"dist/index.html"),d.join(__dirname,"index.html"),d.join(l.getAppPath(),"index.html")];let _=!1;for(const N of F)if(m.existsSync(N)){y(`Loading renderer from: ${N}`),a.loadFile(N),_=!0;break}_||(y("No packaged renderer HTML found, falling back to localhost:5173"),a.loadURL("http://localhost:5173"))}};l.whenReady().then(()=>{process.platform==="win32"&&l.setAppUserModelId("com.neosparkx.quickpill"),process.platform==="darwin"&&l.dock.hide(),G(),ne(),se(),l.on("activate",()=>{U.getAllWindows().length===0&&G()});try{let n=C(),e=R.createFromPath(n);e.isEmpty()&&(n=C("png"),e=R.createFromPath(n));const t=e.isEmpty()?n:e.resize({width:16,height:16});P=new J(t);const s=K.buildFromTemplate([{label:"Show/Hide Quick Pill",click:()=>{a&&(a.isVisible()?a.hide():a.show())}},{type:"separator"},{label:"Quit",click:()=>{l.quit()}}]);P.setToolTip("Quick Pill"),P.setContextMenu(s)}catch(n){console.error("Failed to create tray:",n)}});const j=d.join(l.getPath("userData"),"get-media.ps1"),X=`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
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
`;try{m.writeFileSync(j,X,"utf8")}catch(n){console.error("Failed to write get-media.ps1 script:",n)}let W=!1;u.handle("get-system-media",async()=>W?null:(W=!0,new Promise(n=>{const e=s=>{W=!1,n(s)},t=process.platform;t==="darwin"?g("osascript",["-e",`
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
      `],(i,o)=>{if(i||!o||o.trim()==="null")return e(null);const r=o.trim().split("||");r.length>=6?e({name:r[0],artist:r[1],album:r[2],artwork_url:r[3]||null,state:r[4]==="playing"?"playing":"paused",source:r[5]}):e(null)}):t==="win32"?g("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-File",j],{maxBuffer:10*1024*1024,encoding:"utf8"},(s,i)=>{if(s||!i||i.trim()==="null"||i.trim()==="'null'"){p(`powershell -NoProfile -Command "Get-Process | Where-Object {$_.ProcessName -eq 'Spotify'} | Select-Object MainWindowTitle"`,{encoding:"utf8"},(o,r)=>{var f;if(o||!r)return e(null);const c=(f=r.split(`
`).find($=>$.includes("-")))==null?void 0:f.trim();if(c){const $=c.split(" - ");let h="Unknown",S=c;$.length>1&&(h=$[0].trim(),S=$.slice(1).join(" - ").trim()),e({name:S||c,artist:h||"Unknown",state:"playing",source:"Spotify",position:0,duration:0})}else e(null)});return}try{const o=JSON.parse(i.trim());if(!o||!o.Title&&!o.Artist)return e(null);e({name:o.Title||"Unknown Title",artist:o.Artist||"Unknown Artist",album:o.Album||"",artwork_url:o.Artwork||null,state:o.Status==="playing"?"playing":"paused",source:o.Source||"System",position:Number(o.Position)||0,duration:Number(o.Duration)||0})}catch{e(null)}}):t==="linux"?p('playerctl metadata --format "{{title}}||{{artist}}||{{album}}||{{status}}"',(s,i)=>{if(s||!i)return e(null);const o=i.trim().split("||");e({name:o[0],artist:o[1],album:o[2],state:o[3].toLowerCase(),source:"System"})}):e(null)})));u.handle("get-bluetooth-status",async()=>new Promise(n=>{const e=process.platform;if(e==="darwin")p("system_profiler SPBluetoothDataType -json",(t,s)=>{if(t)return n(!1);try{const o=JSON.parse(s).SPBluetoothDataType[0],r=o.device_connected&&o.device_connected.length>0;n(r)}catch{n(!1)}});else if(e==="win32"){const s=Buffer.from(`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$devs = @(Get-PnpDevice -Class Bluetooth -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'OK' -and $_.Present -eq $true -and $_.InstanceId -match 'BTHENUM' })
$names = @($devs | ForEach-Object { $_.FriendlyName })
@{ connected = ($devs.Count -gt 0); devices = $names } | ConvertTo-Json -Compress
`,"utf16le").toString("base64");p(`powershell -NoProfile -EncodedCommand ${s}`,(i,o)=>{if(i||!o)return n({connected:!1,devices:[]});try{const r=JSON.parse(o.trim());n({connected:!!r.connected,devices:Array.isArray(r.devices)?r.devices:r.devices?[r.devices]:[]})}catch{n({connected:!1,devices:[]})}})}else e==="linux"?p("bluetoothctl devices Connected",(t,s)=>{if(t)return n(!1);n(s.trim().length>0)}):n(!1)}));u.handle("get-camera-status",async()=>new Promise(n=>{const e=process.platform;e==="darwin"?p('ioreg -l | grep -E "FrontCameraActive|FrontCameraStreaming"',(t,s)=>{n(s?s.includes("= Yes"):!1)}):e==="win32"?g("reg",["query","HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam","/s"],(t,s)=>{if(t||!s)return n(!1);const i=s.match(/LastUsedTimeStop\s+REG_QWORD\s+0x0\b/i);n(!!i)}):e==="linux"?p("fuser /dev/video* 2>/dev/null",(t,s)=>{n(s.trim().length>0)}):n(!1)}));u.handle("get-microphone-status",async()=>new Promise(n=>{const e=process.platform;e==="darwin"?p('ioreg -l | grep -E "IOAudioStreamActive|IOAudioEngine|IOAudioStream" | grep -i "Yes"',(t,s)=>{n(s?s.trim().length>0:!1)}):e==="win32"?g("reg",["query","HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone","/s"],(t,s)=>{if(t||!s)return n(!1);const i=s.match(/LastUsedTimeStop\s+REG_QWORD\s+0x0\b/i);n(!!i)}):e==="linux"?p("pactl list source-outputs | grep -q 'Source #'",t=>{n(!t)}):n(!1)}));l.on("window-all-closed",()=>{P||l.quit()});u.handle("control-system-media",async(n,e)=>{const t=process.platform;if(t==="darwin"){const s=`
        tell application "System Events"
            set spotifyRunning to (name of every process) contains "Spotify"
            set musicRunning to (name of every process) contains "Music"
        end tell
        if spotifyRunning then
            tell application "Spotify" to ${e} track
        else if musicRunning then
            tell application "Music" to ${e} track
        end if
        `;g("osascript",["-e",s])}else if(t==="win32"){if(!["playpause","next","previous"].includes(e))return;let s="0xCD";e==="next"&&(s="0xB0"),e==="previous"&&(s="0xB1"),y(`Executing media control: ${e} (${s})`);const i=`
$type = '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);'
$MediaKey = Add-Type -MemberDefinition $type -Name "WinMediaKey" -Namespace "WinAPI" -PassThru
$MediaKey::keybd_event(${s}, 0, 0, [UIntPtr]::Zero)
$MediaKey::keybd_event(${s}, 0, 2, [UIntPtr]::Zero)
`,o=A(i);p(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${o}`,r=>{r&&y("Media control error:",r)})}else if(t==="linux"){let s=e;e==="playpause"&&(s="play-pause"),p(`playerctl ${s}`)}});let w=null;function ee(){const n=D.cpus();if(!n||n.length===0)return 0;if(!w||w.length!==n.length)return w=n,0;let e=0,t=0;for(let i=0;i<n.length;i++){const o=n[i],r=w[i];let c=o.times.idle-r.times.idle,f=0;for(const $ in o.times)f+=o.times[$]-r.times[$];e+=c,t+=f}if(w=n,t===0)return 0;const s=e/t;return Math.max(0,Math.min(100,Math.round((1-s)*100)))}function te(){const n=D.totalmem(),e=D.freemem();return n?Math.max(0,Math.min(100,Math.round((n-e)/n*100))):0}u.handle("get-system-metrics",async()=>({cpu:ee(),ram:te()}));u.handle("get-clipboard-text",async()=>{try{return k.readText()}catch{return""}});u.handle("write-clipboard-text",async(n,e)=>{try{return e?k.writeText(e):k.clear(),!0}catch{return!1}});u.handle("clear-clipboard",async()=>{try{return k.clear(),!0}catch{return!1}});u.handle("control-system-volume",async(n,e)=>{if(process.platform==="win32"){let t="0xAF";e==="down"&&(t="0xAE"),e==="mute"&&(t="0xAD");const s=`
$type = '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);'
$MediaKey = Add-Type -MemberDefinition $type -Name "WinVolKey" -Namespace "WinAPI" -PassThru
$MediaKey::keybd_event(${t}, 0, 0, [UIntPtr]::Zero)
$MediaKey::keybd_event(${t}, 0, 2, [UIntPtr]::Zero)
`,i=A(s);return p(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${i}`,o=>{o&&y("Volume control error:",o)}),!0}return!1});let M=null,O=null;function ne(){if(process.platform!=="win32")return;let n=!1;setInterval(()=>{!a||a.isDestroyed()||n||(n=!0,p('powershell -NoProfile -Command "[Console]::CapsLock; [Console]::NumberLock"',(e,t)=>{var r,c;if(n=!1,e||!t)return;const s=t.trim().split(/\r?\n/),i=((r=s[0])==null?void 0:r.trim().toLowerCase())==="true",o=((c=s[1])==null?void 0:c.trim().toLowerCase())==="true";M!==null&&i!==M&&a&&!a.isDestroyed()&&a.webContents.send("key-lock-change",{key:"CapsLock",state:i}),O!==null&&o!==O&&a&&!a.isDestroyed()&&a.webContents.send("key-lock-change",{key:"NumLock",state:o}),M=i,O=o}))},2e3)}let b=null;function se(){if(process.platform!=="win32")return;let n=!1;setInterval(()=>{!a||a.isDestroyed()||n||(n=!0,p("wmic logicaldisk where drivetype=2 get name,volumename /format:csv",(e,t)=>{var o,r;if(n=!1,e)return;const s=new Map,i=t.trim().split(/\r?\n/).filter(c=>c.trim()&&!c.startsWith("Node"));for(const c of i){const f=c.trim().split(",");if(f.length>=3){const $=(o=f[1])==null?void 0:o.trim(),h=((r=f[2])==null?void 0:r.trim())||"USB Drive";$&&s.set($,h)}}if(b!==null&&a&&!a.isDestroyed()){for(const[c,f]of s)b.has(c)||a.webContents.send("usb-change",{action:"connected",drive:c,name:f});for(const[c]of b)s.has(c)||a.webContents.send("usb-change",{action:"disconnected",drive:c,name:"USB Drive"})}b=s}))},5e3)}const L=d.join(l.getPath("userData"),"get-notifications.ps1"),ie=`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
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
`;try{m.writeFileSync(L,ie,"utf8")}catch(n){y("Failed to write get-notifications.ps1:",n)}let v=!1;u.handle("get-notifications",async()=>process.platform!=="win32"?[]:v?[]:(v=!0,new Promise(n=>{g("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-File",L],{maxBuffer:5*1024*1024,encoding:"utf8",timeout:1e4},(e,t)=>{if(v=!1,e||!t)return n([]);try{const s=JSON.parse(t.trim());n(Array.isArray(s)?s:s?[s]:[])}catch{n([])}})})));u.handle("dismiss-notification",async(n,e)=>process.platform!=="win32"?!1:new Promise(t=>{const s=`
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
`,i=A(s);p(`powershell -NoProfile -EncodedCommand ${i}`,(o,r)=>{t((r==null?void 0:r.trim())==="true")})}));u.handle("focus-notification-app",async(n,e)=>process.platform!=="win32"||!e?!1:new Promise(t=>{const s=e.split("!")[0].split("_")[0].replace(/\./g,""),i=`
$type = '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);'
$fw = Add-Type -MemberDefinition $type -Name "FW" -Namespace "WinAPI" -PassThru
$procs = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and ($_.ProcessName -match '${s}' -or $_.MainWindowTitle -match '${s}') } | Select-Object -First 1
if ($procs) { [void]$fw::SetForegroundWindow($procs.MainWindowHandle); Write-Output "true" } else { Write-Output "false" }
`,o=A(i);p(`powershell -NoProfile -EncodedCommand ${o}`,(r,c)=>{t((c==null?void 0:c.trim())==="true")})}));
