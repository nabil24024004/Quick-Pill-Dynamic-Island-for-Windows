param(
    [switch]$SkipTests,
    [switch]$SignMsix,
    [switch]$CleanOld,
    [switch]$StopRunning
)

$ErrorActionPreference = 'Stop'

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$PkgPath = Join-Path $Root 'package.json'
$pkg = Get-Content -Raw -Path $PkgPath | ConvertFrom-Json
$Version = $pkg.version

$ReleaseExe = Join-Path $Root 'src-tauri\target\release\quick-pill.exe'
$ReleaseArtifactsDir = Join-Path $Root 'release-artifacts'
$NsisBundleDir = Join-Path $Root 'src-tauri\target\release\bundle\nsis'
$MsixBundleDir = Join-Path $Root 'src-tauri\target\release\bundle\msix'

$lockingProcs = Get-Process -Name 'quick-pill' -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -and ($_.Path -ieq $ReleaseExe)
}
if ($lockingProcs) {
    if ($StopRunning) {
        Write-Host "[build-windows] Stopping running build binary ($ReleaseExe)..."
        $lockingProcs | Stop-Process -Force
        Start-Sleep -Milliseconds 500
    } else {
        throw "Build output is locked by running process: $ReleaseExe (PID: $($lockingProcs.Id -join ', ')). Close it or pass -StopRunning."
    }
}

Write-Host "[build-windows] Building Quick Pill v$Version for Windows x64 (NSIS + MSIX)..."

Push-Location $Root
try {
    if (-not $SkipTests) {
        Write-Host '[build-windows] Running Rust unit tests...'
        npm test
        if ($LASTEXITCODE -ne 0) { throw "Rust unit tests failed ($LASTEXITCODE)" }
    }

    if ($CleanOld) {
        Get-ChildItem -Path $NsisBundleDir -Filter '*.exe' -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
        Get-ChildItem -Path $MsixBundleDir -Filter '*.msix' -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
    }

    Write-Host '[build-windows] Building Vite frontend, Rust binary & NSIS setup installer...'
    npx tauri build --bundles nsis
    if ($LASTEXITCODE -ne 0) { throw "Tauri NSIS build failed ($LASTEXITCODE)" }

    $setupExe = Get-ChildItem -Path $NsisBundleDir -Filter '*.exe' -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like "*$Version*" -and $_.Name.ToLowerInvariant().Contains('setup') } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $setupExe) {
        throw "NSIS setup executable for v$Version not found in $NsisBundleDir"
    }

    New-Item -ItemType Directory -Force -Path $ReleaseArtifactsDir | Out-Null

    if ($CleanOld) {
        Get-ChildItem -Path $ReleaseArtifactsDir -File -ErrorAction SilentlyContinue |
            Where-Object {
                ($_.Name -like 'QuickPill-Windows-v*' -or $_.Name -like 'QuickPill_*.msix*') -and
                -not $_.Name.Contains($Version)
            } |
            Remove-Item -Force -ErrorAction SilentlyContinue
    }

    $canonicalExeName = "QuickPill-Windows-v$Version-Setup.exe"
    $destExe = Join-Path $ReleaseArtifactsDir $canonicalExeName
    Copy-Item -LiteralPath $setupExe.FullName -Destination $destExe -Force

    $exeHash = (Get-FileHash -LiteralPath $destExe -Algorithm SHA256).Hash.ToLowerInvariant()
    [System.IO.File]::WriteAllText("$destExe.sha256", "$exeHash  $canonicalExeName`n", [System.Text.UTF8Encoding]::new($false))

    Write-Host '[build-windows] Packaging Microsoft Store MSIX...'
    if ($SignMsix) {
        & (Join-Path $PSScriptRoot 'build-msix.ps1') -Sign
    } else {
        & (Join-Path $PSScriptRoot 'build-msix.ps1')
    }
    if ($LASTEXITCODE -ne 0) { throw "MSIX packaging failed ($LASTEXITCODE)" }

    $msixPkg = Get-ChildItem -Path $MsixBundleDir -Filter "QuickPill_${Version}_*.msix" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $msixPkg) {
        throw "MSIX package for v$Version not found in $MsixBundleDir"
    }

    $destMsix = Join-Path $ReleaseArtifactsDir $msixPkg.Name
    Copy-Item -LiteralPath $msixPkg.FullName -Destination $destMsix -Force
    $msixHash = (Get-FileHash -LiteralPath $destMsix -Algorithm SHA256).Hash.ToLowerInvariant()
    [System.IO.File]::WriteAllText("$destMsix.sha256", "$msixHash  $($msixPkg.Name)`n", [System.Text.UTF8Encoding]::new($false))

    Write-Host '[build-windows] Generating web app/public/version.json...'
    node (Join-Path $PSScriptRoot 'generate-manifest.js') --win-exe $destExe
    if ($LASTEXITCODE -ne 0) { throw "Manifest generation failed ($LASTEXITCODE)" }

    Copy-Item -LiteralPath (Join-Path $Root 'web app\public\version.json') -Destination (Join-Path $ReleaseArtifactsDir 'version.json') -Force

    Write-Host ''
    Write-Host "[build-windows] v$Version Windows packages ready in ${ReleaseArtifactsDir}:"
    Write-Host "  NSIS Setup: $destExe ($($setupExe.Length) bytes, sha256: $exeHash)"
    Write-Host "  Store MSIX: $destMsix ($($msixPkg.Length) bytes, sha256: $msixHash)"
} finally {
    Pop-Location
}
