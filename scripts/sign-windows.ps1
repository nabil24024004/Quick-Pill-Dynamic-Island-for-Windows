param(
  [Parameter(Mandatory = $true)]
  [string]$TargetPath
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $TargetPath)) {
  Write-Error "[sign-windows] Target binary not found: $TargetPath"
  exit 1
}

function Find-SignTool {
  if ($env:SIGNTOOL_PATH -and (Test-Path -LiteralPath $env:SIGNTOOL_PATH)) {
    return $env:SIGNTOOL_PATH
  }
  $cmd = Get-Command signtool.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  $kitsRoot = "${env:ProgramFiles(x86)}\Windows Kits\10\bin"
  if (Test-Path -LiteralPath $kitsRoot) {
    $candidate = Get-ChildItem -Path $kitsRoot -Directory -ErrorAction SilentlyContinue |
      Sort-Object Name -Descending |
      ForEach-Object { Join-Path $_.FullName "x64\signtool.exe" } |
      Where-Object { Test-Path -LiteralPath $_ } |
      Select-Object -First 1
    if ($candidate) { return $candidate }
  }
  return $null
}

$timestampUrl = if ($env:WINDOWS_SIGN_TIMESTAMP_URL) { $env:WINDOWS_SIGN_TIMESTAMP_URL } else { 'http://timestamp.digicert.com' }
$description = 'Quick Pill'
$tempFiles = @()

try {
  # Mode 1: Azure Trusted Signing / Microsoft Artifact Signing
  if ($env:AZURE_SIGNING_ENDPOINT -and $env:AZURE_SIGNING_DLIB_PATH -and $env:AZURE_SIGNING_METADATA_PATH) {
    $signTool = Find-SignTool
    if (-not $signTool) {
      throw "signtool.exe not found; install Windows 10/11 SDK."
    }
    $acsTimestamp = if ($env:WINDOWS_SIGN_TIMESTAMP_URL) { $env:WINDOWS_SIGN_TIMESTAMP_URL } else { 'http://timestamp.acs.microsoft.com' }
    Write-Host "[sign-windows] Signing with Azure Trusted Signing: $TargetPath"
    & $signTool sign /v /fd SHA256 /tr $acsTimestamp /td SHA256 /dlib $env:AZURE_SIGNING_DLIB_PATH /dmdf $env:AZURE_SIGNING_METADATA_PATH /d $description $TargetPath
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    exit 0
  }

  # Mode 2: PFX file path or Base64 CI secret
  $pfxPath = $env:WINDOWS_SIGN_PFX_PATH
  if (-not $pfxPath -and $env:WINDOWS_SIGN_PFX_B64) {
    $pfxPath = Join-Path ([System.IO.Path]::GetTempPath()) ("quickpill-sign-" + [Guid]::NewGuid().ToString("N") + ".pfx")
    [System.IO.File]::WriteAllBytes($pfxPath, [Convert]::FromBase64String($env:WINDOWS_SIGN_PFX_B64))
    $tempFiles += $pfxPath
  }

  if ($pfxPath) {
    if (-not (Test-Path -LiteralPath $pfxPath)) {
      throw "WINDOWS_SIGN_PFX_PATH does not exist: $pfxPath"
    }
    $signTool = Find-SignTool
    if (-not $signTool) {
      throw "signtool.exe not found; install Windows 10/11 SDK."
    }
    Write-Host "[sign-windows] Signing with PFX certificate: $TargetPath"
    $argsList = @('sign', '/fd', 'SHA256', '/tr', $timestampUrl, '/td', 'SHA256', '/f', $pfxPath, '/d', $description)
    if ($env:WINDOWS_SIGN_PASSWORD) {
      $argsList += @('/p', $env:WINDOWS_SIGN_PASSWORD)
    }
    $argsList += $TargetPath
    & $signTool @argsList
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    exit 0
  }

  # Mode 3: Certificate installed in Windows cert store by SHA-1 thumbprint
  if ($env:WINDOWS_SIGN_THUMBPRINT) {
    $signTool = Find-SignTool
    if (-not $signTool) {
      throw "signtool.exe not found; install Windows 10/11 SDK."
    }
    Write-Host "[sign-windows] Signing with cert store thumbprint: $TargetPath"
    & $signTool sign /fd SHA256 /tr $timestampUrl /td SHA256 /sha1 $env:WINDOWS_SIGN_THUMBPRINT /d $description $TargetPath
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    exit 0
  }

  # Unsigned local development or unconfigured CI
  if ($env:WINDOWS_SIGN_REQUIRED -eq '1') {
    Write-Error "[sign-windows] WINDOWS_SIGN_REQUIRED=1 but no signing credentials (AZURE_SIGNING_*, WINDOWS_SIGN_PFX_*, or WINDOWS_SIGN_THUMBPRINT) are set."
    exit 1
  }

  Write-Host "[sign-windows] No signing credentials configured; skipping Authenticode signature for $(Split-Path -Leaf $TargetPath)"
  exit 0
} finally {
  foreach ($f in $tempFiles) {
    if ($f -and (Test-Path -LiteralPath $f)) {
      Remove-Item -LiteralPath $f -Force -ErrorAction SilentlyContinue
    }
  }
}
