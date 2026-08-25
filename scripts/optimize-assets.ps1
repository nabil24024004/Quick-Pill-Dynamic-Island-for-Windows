Add-Type -AssemblyName System.Drawing

# 1. Optimize smartscreen-step2.jpg
$step2Path = "D:\Ripple Island\web app\public\smartscreen-step2.jpg"
$step2Backup = "D:\Ripple Island\web app\public\smartscreen-step2-original.jpg"

if (Test-Path $step2Path) {
    if (-not (Test-Path $step2Backup)) {
        Copy-Item $step2Path $step2Backup
    }
    $img = [System.Drawing.Image]::FromFile($step2Backup)
    Write-Host "SmartScreen Step 2: $($img.Width)x$($img.Height), Size: $((Get-Item $step2Backup).Length) bytes"

    # Scale down if width > 1000
    $w = $img.Width
    $h = $img.Height
    if ($w > 800) {
        $scale = 800.0 / $w
        $w = [int]($w * $scale)
        $h = [int]($h * $scale)
    }

    $newBmp = New-Object System.Drawing.Bitmap $w, $h
    $graphics = [System.Drawing.Graphics]::FromImage($newBmp)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($img, 0, 0, $w, $h)

    $img.Dispose()
    $graphics.Dispose()

    # JPEG Encoder with 80 quality
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]80)

    $newBmp.Save($step2Path, $codec, $encoderParams)
    $newBmp.Dispose()
    Write-Host "Optimized SmartScreen Step 2 Size: $((Get-Item $step2Path).Length) bytes"
}

# Remove backup files so they don't bloat public folder
if (Test-Path "D:\Ripple Island\web app\public\icon-original.png") {
    Remove-Item "D:\Ripple Island\web app\public\icon-original.png" -Force
}
if (Test-Path "D:\Ripple Island\web app\public\smartscreen-step2-original.jpg") {
    Remove-Item "D:\Ripple Island\web app\public\smartscreen-step2-original.jpg" -Force
}
