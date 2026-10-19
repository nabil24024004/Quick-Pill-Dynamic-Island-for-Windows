# native/window_tracker.ps1
# Smart Tab-Aware Window Obstruction Detector for Quick Pill (Nusa 3 Rules)
param(
    [int]$IntervalMs = 300
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class NativeTracker {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    public static extern bool IsZoomed(IntPtr hWnd);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetClassName(IntPtr hWnd, System.Text.StringBuilder lpClassName, int nMaxCount);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern IntPtr GetDC(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern int ReleaseDC(IntPtr hWnd, IntPtr hDC);

    [DllImport("gdi32.dll")]
    public static extern uint GetPixel(IntPtr hDC, int nXPos, int nYPos);

    [DllImport("user32.dll")]
    public static extern short GetKeyState(int nVirtKey);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }
}
"@

Add-Type -AssemblyName System.Windows.Forms

$primaryScreen = [System.Windows.Forms.Screen]::PrimaryScreen
$screenW = $primaryScreen.Bounds.Width
$screenH = $primaryScreen.Bounds.Height

function Get-ObstructionStatus {
    $fgHwnd = [NativeTracker]::GetForegroundWindow()
    if ($fgHwnd -eq [IntPtr]::Zero) {
        return @{ isObstructed = $false; reason = "NoForegroundWindow" }
    }

    $sbClass = New-Object System.Text.StringBuilder 256
    [void][NativeTracker]::GetClassName($fgHwnd, $sbClass, 256)
    $cls = $sbClass.ToString().Trim()

    # Desktop / Taskbar ignore
    if ($cls -match "Progman|WorkerW|Shell_TrayWnd|Shell_SecondaryTrayWnd") {
        return @{ isObstructed = $false; reason = "DesktopOrTaskbar" }
    }

    $rect = New-Object NativeTracker+RECT
    [void][NativeTracker]::GetWindowRect($fgHwnd, [ref]$rect)
    $isZoomed = [NativeTracker]::IsZoomed($fgHwnd)
    $winW = $rect.Right - $rect.Left
    $winH = $rect.Bottom - $rect.Top

    # Rule 1: Fullscreen Apps (Games / Fullscreen Video F11)
    if ($rect.Left -le 0 -and $rect.Top -le 0 -and $rect.Right -ge $screenW -and $rect.Bottom -ge $screenH -and (-not $isZoomed)) {
        return @{ isObstructed = $true; reason = "FullscreenApp" }
    }

    # Rule 2: Maximized Browser / App Obstruction
    if ($isZoomed -or ($rect.Top -le 8 -and $winW -ge ($screenW * 0.90) -and $winH -ge ($screenH * 0.85))) {
        $isBrowser = $cls -eq "Chrome_WidgetWin_1" -or $cls -eq "MozillaWindowClass"
        if ($isBrowser) {
            # Inspect top-center zone under notch (e.g. screenW / 2 - 40, y = 18)
            $hDC = [NativeTracker]::GetDC([IntPtr]::Zero)
            $sampleX = [int]($screenW / 2 - 40)
            $sampleY = 18
            $pixel = [NativeTracker]::GetPixel($hDC, $sampleX, $sampleY)
            [void][NativeTracker]::ReleaseDC([IntPtr]::Zero, $hDC)

            $sbText = New-Object System.Text.StringBuilder 512
            [void][NativeTracker]::GetWindowText($fgHwnd, $sbText, 512)
            $title = $sbText.ToString()

            # If browser has few tabs, top-center titlebar is empty background
            # Multi-tab indicator in Chrome title e.g. "and 5 more tabs"
            $hasManyTabs = $title -match "and ([5-9]|\d{2,}) more tabs"
            if ($hasManyTabs) {
                return @{ isObstructed = $true; reason = "BrowserManyTabs" }
            }

            # If top-center zone is empty titlebar, keep Normal Idle Notch open
            return @{ isObstructed = $false; reason = "BrowserCenterEmpty" }
        }

        return @{ isObstructed = $true; reason = "MaximizedApp" }
    }

    # Rule 3: Top-center is unobstructed
    return @{ isObstructed = $false; reason = "NormalWindow" }
}

# If run directly as monitor loop
if ($MyInvocation.InvocationName -ne '.') {
    $last = $null
    while ($true) {
        $status = Get-ObstructionStatus
        if ($status.isObstructed -ne $last) {
            $last = $status.isObstructed
            [Console]::WriteLine((ConvertTo-Json $status -Compress))
        }
        Start-Sleep -Milliseconds $IntervalMs
    }
}
