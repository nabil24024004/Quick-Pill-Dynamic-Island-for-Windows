param(
    [switch]$BuildRelease,
    [switch]$Sign
)

$ErrorActionPreference = 'Stop'

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$PkgPath = Join-Path $Root 'package.json'
$ConfigPath = Join-Path $Root 'src-tauri\msix\store.config.json'
$TemplatePath = Join-Path $Root 'src-tauri\msix\AppxManifest.xml.template'
$AssetsDir = Join-Path $Root 'src-tauri\msix\Assets'
$IconsDir = Join-Path $Root 'src-tauri\icons'
$ReleaseExe = Join-Path $Root 'src-tauri\target\release\quick-pill.exe'

$MsixOutDir = Join-Path $Root 'src-tauri\target\release\bundle\msix'
$StageDir = Join-Path $MsixOutDir 'staging'
$PriConfigPath = Join-Path $MsixOutDir 'priconfig.xml'

function Find-WinSdkTool {
    param([string]$ToolName)
    $kitsRoot = 'C:\Program Files (x86)\Windows Kits\10\bin'
    if (Test-Path $kitsRoot) {
        $match = Get-ChildItem -Path $kitsRoot -Directory |
            Sort-Object {
                $ver = [Version]'0.0.0.0'
                if ([Version]::TryParse($_.Name, [ref]$ver)) { $ver } else { [Version]'0.0.0.0' }
            } -Descending |
            ForEach-Object { Join-Path $_.FullName "x64\$ToolName" } |
            Where-Object { Test-Path $_ } |
            Select-Object -First 1
        if ($match) { return $match }
    }
    $cmd = Get-Command $ToolName -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    return $null
}

function Resize-IconPng {
    param(
        [string]$SourcePath,
        [string]$DestPath,
        [int]$CanvasW,
        [int]$CanvasH,
        [int]$InnerSize = 0
    )
    Add-Type -AssemblyName System.Drawing
    $src = [System.Drawing.Bitmap]::FromFile($SourcePath)
    try {
        $bmp = New-Object System.Drawing.Bitmap($CanvasW, $CanvasH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        try {
            $g = [System.Drawing.Graphics]::FromImage($bmp)
            try {
                $g.Clear([System.Drawing.Color]::Transparent)
                $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
                $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

                $drawSize = if ($InnerSize -gt 0) { $InnerSize } else { [Math]::Min($CanvasW, $CanvasH) }
                $x = [int](($CanvasW - $drawSize) / 2)
                $y = [int](($CanvasH - $drawSize) / 2)
                $g.DrawImage($src, $x, $y, $drawSize, $drawSize)
            } finally {
                $g.Dispose()
            }
            $bmp.Save($DestPath, [System.Drawing.Imaging.ImageFormat]::Png)
        } finally {
            $bmp.Dispose()
        }
    } finally {
        $src.Dispose()
    }
}

$MakeAppx = Find-WinSdkTool 'makeappx.exe'
$MakePri = Find-WinSdkTool 'makepri.exe'
$SignTool = Find-WinSdkTool 'signtool.exe'

if (-not $MakeAppx -or -not $MakePri) {
    throw "Windows 10/11 SDK MSIX tools (makeappx.exe / makepri.exe) were not found in 'C:\Program Files (x86)\Windows Kits\10\bin'."
}

if ($BuildRelease) {
    Write-Host '[build-msix] Building frontend & release binary...'
    Push-Location $Root
    try {
        npm run build:frontend
        if ($LASTEXITCODE -ne 0) { throw "Frontend build failed ($LASTEXITCODE)" }
        cargo build --release --manifest-path (Join-Path $Root 'src-tauri\Cargo.toml')
        if ($LASTEXITCODE -ne 0) { throw "Cargo release build failed ($LASTEXITCODE)" }
    } finally {
        Pop-Location
    }
}

if (-not (Test-Path $ReleaseExe)) {
    throw "Release binary not found at $ReleaseExe. Run 'npm run build' or pass -BuildRelease."
}

$pkg = Get-Content -Raw -Path $PkgPath | ConvertFrom-Json
$cfg = Get-Content -Raw -Path $ConfigPath | ConvertFrom-Json

$packageName = if ($env:MSIX_PACKAGE_NAME) { $env:MSIX_PACKAGE_NAME } else { $cfg.packageName }
$publisherId = if ($env:MSIX_PUBLISHER_ID) { $env:MSIX_PUBLISHER_ID } else { $cfg.publisherId }
$publisherDisplay = if ($env:MSIX_PUBLISHER_DISPLAY) { $env:MSIX_PUBLISHER_DISPLAY } else { $cfg.publisherDisplayName }

$versionParts = ($pkg.version -split '[^\d]+') | Where-Object { $_ -ne '' }
while ($versionParts.Count -lt 3) { $versionParts += '0' }
$msixVersion = "$($versionParts[0]).$($versionParts[1]).$($versionParts[2]).0"

if ($publisherId -eq 'CN=00000000-0000-0000-0000-000000000000') {
    Write-Warning "[build-msix] store.config.json still uses placeholder publisherId ($publisherId). Before uploading to Microsoft Partner Center, copy Package/Identity/Name and Publisher from Partner Center -> Product Identity."
}

# Ensure MSIX Store visual assets exist in src-tauri/msix/Assets
New-Item -ItemType Directory -Force -Path $AssetsDir | Out-Null
$MasterIcon = Join-Path $IconsDir 'icon.png'
if (-not (Test-Path $MasterIcon)) {
    throw "Master icon missing at $MasterIcon"
}

$requiredAssets = @(
    @{ File = 'StoreLogo.png';                                    W = 50;  H = 50;  Inner = 44 },
    @{ File = 'Square44x44Logo.png';                              W = 44;  H = 44;  Inner = 40 },
    @{ File = 'Square44x44Logo.targetsize-44.png';                W = 44;  H = 44;  Inner = 40 },
    @{ File = 'Square44x44Logo.altform-unplated_targetsize-44.png'; W = 44; H = 44; Inner = 40 },
    @{ File = 'Square44x44Logo.targetsize-256.png';               W = 256; H = 256; Inner = 232 },
    @{ File = 'Square44x44Logo.altform-unplated_targetsize-256.png'; W = 256; H = 256; Inner = 232 },
    @{ File = 'Square71x71Logo.png';                              W = 71;  H = 71;  Inner = 58 },
    @{ File = 'Square150x150Logo.png';                            W = 150; H = 150; Inner = 110 },
    @{ File = 'Wide310x150Logo.png';                              W = 310; H = 150; Inner = 104 },
    @{ File = 'Square310x310Logo.png';                            W = 310; H = 310; Inner = 220 }
)

foreach ($asset in $requiredAssets) {
    $dest = Join-Path $AssetsDir $asset.File
    if (-not (Test-Path $dest)) {
        Resize-IconPng -SourcePath $MasterIcon -DestPath $dest -CanvasW $asset.W -CanvasH $asset.H -InnerSize $asset.Inner
    }
}

# Clean stage dir & copy payload
if (Test-Path $StageDir) {
    Remove-Item -Recurse -Force $StageDir
}
New-Item -ItemType Directory -Force -Path (Join-Path $StageDir 'Assets') | Out-Null

Copy-Item -Path $ReleaseExe -Destination (Join-Path $StageDir $cfg.executable) -Force
Copy-Item -Path (Join-Path $AssetsDir '*.png') -Destination (Join-Path $StageDir 'Assets') -Force

function Escape-Xml([string]$val) {
    return [System.Security.SecurityElement]::Escape($val)
}

$manifestXml = Get-Content -Raw -Path $TemplatePath
$replacements = @{
    '{{PACKAGE_NAME}}'           = Escape-Xml $packageName
    '{{PUBLISHER_ID}}'           = Escape-Xml $publisherId
    '{{MSIX_VERSION}}'           = Escape-Xml $msixVersion
    '{{DISPLAY_NAME}}'           = Escape-Xml $cfg.displayName
    '{{PUBLISHER_DISPLAY_NAME}}' = Escape-Xml $publisherDisplay
    '{{DESCRIPTION}}'            = Escape-Xml $cfg.description
    '{{MIN_OS_VERSION}}'         = Escape-Xml $cfg.minOsVersion
    '{{MAX_VERSION_TESTED}}'     = Escape-Xml $cfg.maxVersionTested
    '{{EXECUTABLE}}'             = Escape-Xml $cfg.executable
}
foreach ($k in $replacements.Keys) {
    $manifestXml = $manifestXml.Replace($k, $replacements[$k])
}

$StageManifest = Join-Path $StageDir 'AppxManifest.xml'
[System.IO.File]::WriteAllText($StageManifest, $manifestXml, [System.Text.UTF8Encoding]::new($false))

# Compile PRI resource index for scaled/unplated icons
& $MakePri createconfig /cf $PriConfigPath /dq 'en-US' /o | Out-Null
if ($LASTEXITCODE -ne 0) { throw "makepri createconfig failed ($LASTEXITCODE)" }

$StagePri = Join-Path $StageDir 'resources.pri'
& $MakePri new /pr $StageDir /cf $PriConfigPath /mn $StageManifest /of $StagePri /o | Out-Null
if ($LASTEXITCODE -ne 0) { throw "makepri new failed ($LASTEXITCODE)" }

$MsixPath = Join-Path $MsixOutDir "QuickPill_$($pkg.version)_x64.msix"
& $MakeAppx pack /o /d $StageDir /p $MsixPath
if ($LASTEXITCODE -ne 0) { throw "makeappx pack failed ($LASTEXITCODE)" }

# Optional signing (for local sideload testing only; Store prefers unsigned or publisher-matched MSIX)
$pfxPath = $env:MSIX_SIGN_PFX
if (-not $pfxPath) { $pfxPath = $env:WINDOWS_PFX_PATH }
$pfxPassword = $env:MSIX_SIGN_PFX_PASSWORD
if (-not $pfxPassword) { $pfxPassword = $env:WINDOWS_PFX_PASSWORD }

if ($Sign -and $pfxPath -and (Test-Path $pfxPath)) {
    if (-not $SignTool) { throw "signtool.exe not found for MSIX signing" }
    Write-Host "[build-msix] Signing MSIX for sideloading..."
    $signArgs = @('sign', '/fd', 'SHA256', '/f', $pfxPath)
    if ($pfxPassword) { $signArgs += @('/p', $pfxPassword) }
    $signArgs += @('/tr', 'http://timestamp.digicert.com', '/td', 'SHA256', $MsixPath)
    & $SignTool @signArgs
    if ($LASTEXITCODE -ne 0) { throw "signtool MSIX failed ($LASTEXITCODE)" }
}

$hash = (Get-FileHash -Path $MsixPath -Algorithm SHA256).Hash.ToLowerInvariant()
$size = (Get-Item $MsixPath).Length

Write-Host ""
Write-Host "[build-msix] Package ready!"
Write-Host "  File:      $MsixPath"
Write-Host "  Version:   $msixVersion"
Write-Host "  Identity:  $packageName"
Write-Host "  Publisher: $publisherId"
Write-Host "  Size:      $size bytes"
Write-Host "  SHA-256:   $hash"
