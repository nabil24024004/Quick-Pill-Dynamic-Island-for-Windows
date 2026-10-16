using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using NAudio.CoreAudioApi;
using NAudio.CoreAudioApi.Interfaces;

namespace QuickPill.AudioHelper
{
    class Program
    {
        // P/Invoke for robust process executable path resolution across permissions/architectures
        [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern IntPtr OpenProcess(int dwDesiredAccess, bool bInheritHandle, int dwProcessId);

        [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern bool QueryFullProcessImageName(IntPtr hProcess, int dwFlags, StringBuilder lpExeName, ref int lpdwSize);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool CloseHandle(IntPtr hObject);

        private const int PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;

        // Icon cache keyed by exePath or processName: base64 Data URL
        private static readonly ConcurrentDictionary<string, string> _iconCache = new(StringComparer.OrdinalIgnoreCase);

        // Display name cache
        private static readonly ConcurrentDictionary<string, string> _nameCache = new(StringComparer.OrdinalIgnoreCase);

        private static readonly JsonSerializerOptions _jsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };

        static void Main(string[] args)
        {
            // Configure Console stdout for UTF-8 without BOM
            Console.OutputEncoding = new UTF8Encoding(false);
            Console.InputEncoding = new UTF8Encoding(false);

            MMDeviceEnumerator? enumerator = null;
            try
            {
                enumerator = new MMDeviceEnumerator();
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[AudioHelper] Failed to initialize MMDeviceEnumerator: {ex.Message}");
                return;
            }

            string? line;
            while ((line = Console.ReadLine()) != null)
            {
                line = line.Trim().Trim('\uFEFF');
                if (string.IsNullOrEmpty(line)) continue;

                RequestMessage? req = null;
                try
                {
                    req = JsonSerializer.Deserialize<RequestMessage>(line, _jsonOptions);
                }
                catch (Exception ex)
                {
                    SendResponse(0, false, null, $"Invalid JSON: {ex.Message}");
                    continue;
                }

                if (req == null) continue;

                if (string.Equals(req.Cmd, "shutdown", StringComparison.OrdinalIgnoreCase))
                {
                    SendResponse(req.Id, true, new { status = "shutting_down" });
                    break;
                }

                try
                {
                    HandleCommand(enumerator, req);
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"[AudioHelper] Error executing command '{req.Cmd}': {ex}");
                    SendResponse(req.Id, false, null, ex.Message);
                }
            }

            try
            {
                enumerator?.Dispose();
            }
            catch { }
        }

        private static void HandleCommand(MMDeviceEnumerator enumerator, RequestMessage req)
        {
            switch (req.Cmd?.ToLowerInvariant())
            {
                case "ping":
                    SendResponse(req.Id, true, new { status = "pong", timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() });
                    break;

                case "listdevices":
                case "getdevices":
                    HandleListDevices(enumerator, req);
                    break;

                case "listsessions":
                case "getsessions":
                    HandleListSessions(enumerator, req);
                    break;

                case "setsessionvolume":
                case "setvolume":
                    HandleSetSessionVolume(enumerator, req);
                    break;

                case "setsessionmute":
                case "setmute":
                    HandleSetSessionMute(enumerator, req);
                    break;

                case "setmastervolume":
                    HandleSetMasterVolume(enumerator, req);
                    break;

                case "setmastermute":
                    HandleSetMasterMute(enumerator, req);
                    break;

                default:
                    SendResponse(req.Id, false, null, $"Unknown command '{req.Cmd}'");
                    break;
            }
        }

        private static MMDevice? GetTargetDevice(MMDeviceEnumerator enumerator, string? deviceId)
        {
            if (!string.IsNullOrEmpty(deviceId))
            {
                try
                {
                    return enumerator.GetDevice(deviceId);
                }
                catch
                {
                    // Fall back to default
                }
            }

            try
            {
                return enumerator.GetDefaultAudioEndpoint(DataFlow.Render, Role.Multimedia);
            }
            catch
            {
                return null;
            }
        }

        private static void HandleListDevices(MMDeviceEnumerator enumerator, RequestMessage req)
        {
            var result = new List<DeviceInfo>();
            string defaultId = "";

            try
            {
                var def = enumerator.GetDefaultAudioEndpoint(DataFlow.Render, Role.Multimedia);
                if (def != null)
                {
                    defaultId = def.ID;
                }
            }
            catch { }

            var devices = enumerator.EnumerateAudioEndPoints(DataFlow.Render, DeviceState.Active);
            foreach (var dev in devices)
            {
                try
                {
                    float masterVol = 0f;
                    bool isMuted = false;
                    try
                    {
                        masterVol = dev.AudioEndpointVolume?.MasterVolumeLevelScalar ?? 0f;
                        isMuted = dev.AudioEndpointVolume?.Mute ?? false;
                    }
                    catch { }

                    result.Add(new DeviceInfo
                    {
                        Id = dev.ID,
                        Name = dev.FriendlyName,
                        IsDefault = string.Equals(dev.ID, defaultId, StringComparison.OrdinalIgnoreCase),
                        MasterVolume = (float)Math.Round(masterVol, 4),
                        IsMuted = isMuted,
                        State = dev.State.ToString()
                    });
                }
                catch { }
            }

            SendResponse(req.Id, true, new
            {
                devices = result,
                defaultDeviceId = defaultId
            });
        }

        private static void HandleListSessions(MMDeviceEnumerator enumerator, RequestMessage req)
        {
            var device = GetTargetDevice(enumerator, req.DeviceId);
            if (device == null)
            {
                SendResponse(req.Id, false, null, "No audio output device available.");
                return;
            }

            float masterVol = 0f;
            bool masterMute = false;
            float devicePeak = 0f;

            try
            {
                masterVol = device.AudioEndpointVolume?.MasterVolumeLevelScalar ?? 0f;
                masterMute = device.AudioEndpointVolume?.Mute ?? false;
                devicePeak = device.AudioMeterInformation?.MasterPeakValue ?? 0f;
            }
            catch { }

            var sessionManager = device.AudioSessionManager;
            sessionManager.RefreshSessions();
            var sessions = sessionManager.Sessions;

            // Group sessions by application (PID or System Sounds)
            var groups = new Dictionary<string, AppSessionGroup>();

            for (int i = 0; i < sessions.Count; i++)
            {
                AudioSessionControl? session = null;
                try
                {
                    session = sessions[i];
                }
                catch { continue; }

                if (session == null) continue;

                try
                {
                    uint pid = session.GetProcessID;
                    bool isSystemSounds = session.IsSystemSoundsSession || pid == 0;
                    string groupKey = isSystemSounds ? "system_sounds" : pid.ToString();

                    float vol = 0f;
                    bool mute = false;
                    try
                    {
                        var sav = session.SimpleAudioVolume;
                        if (sav != null)
                        {
                            vol = sav.Volume;
                            mute = sav.Mute;
                        }
                    }
                    catch { }

                    float peak = 0f;
                    try
                    {
                        var meter = session.AudioMeterInformation;
                        if (meter != null)
                        {
                            peak = meter.MasterPeakValue;
                        }
                    }
                    catch { }

                    string state = session.State.ToString();

                    if (!groups.TryGetValue(groupKey, out var appGroup))
                    {
                        string processName = "Unknown";
                        string displayName = "";
                        string exePath = "";
                        string iconBase64 = "";

                        if (isSystemSounds)
                        {
                            processName = "System Sounds";
                            displayName = "Windows System Sounds";
                        }
                        else
                        {
                            GetProcessDetails((int)pid, out processName, out displayName, out exePath, out iconBase64);
                        }

                        appGroup = new AppSessionGroup
                        {
                            Id = groupKey,
                            ProcessId = pid,
                            ProcessName = processName,
                            DisplayName = string.IsNullOrWhiteSpace(displayName) ? processName : displayName,
                            ExePath = exePath,
                            Icon = iconBase64,
                            IsSystemSounds = isSystemSounds,
                            SessionsCount = 0,
                            Volume = vol,
                            IsMuted = mute,
                            Peak = peak,
                            State = state
                        };
                        groups[groupKey] = appGroup;
                    }

                    appGroup.SessionsCount++;
                    // If multiple sessions, keep highest volume and max peak
                    if (appGroup.SessionsCount > 1)
                    {
                        appGroup.Volume = Math.Max(appGroup.Volume, vol);
                        appGroup.Peak = Math.Max(appGroup.Peak, peak);
                        if (!mute) appGroup.IsMuted = false; // if any session unmuted, group is unmuted
                        if (state == "AudioSessionStateActive") appGroup.State = "AudioSessionStateActive";
                    }
                }
                catch { }
            }

            var appList = groups.Values.OrderByDescending(g => g.Peak > 0.01f)
                                      .ThenByDescending(g => g.State == "AudioSessionStateActive")
                                      .ThenBy(g => g.DisplayName)
                                      .ToList();

            SendResponse(req.Id, true, new
            {
                deviceId = device.ID,
                deviceName = device.FriendlyName,
                masterVolume = (float)Math.Round(masterVol, 4),
                isMuted = masterMute,
                peak = (float)Math.Round(devicePeak, 4),
                sessions = appList
            });
        }

        private static void HandleSetSessionVolume(MMDeviceEnumerator enumerator, RequestMessage req)
        {
            var device = GetTargetDevice(enumerator, req.DeviceId);
            if (device == null)
            {
                SendResponse(req.Id, false, null, "Device not found");
                return;
            }

            if (!req.Volume.HasValue)
            {
                SendResponse(req.Id, false, null, "Volume parameter is required (0.0 to 1.0)");
                return;
            }

            float newVol = Math.Clamp(req.Volume.Value, 0.0f, 1.0f);
            var sessionManager = device.AudioSessionManager;
            sessionManager.RefreshSessions();
            var sessions = sessionManager.Sessions;

            int updatedCount = 0;
            for (int i = 0; i < sessions.Count; i++)
            {
                try
                {
                    var s = sessions[i];
                    bool match = false;

                    if (req.IsSystemSounds.HasValue && req.IsSystemSounds.Value)
                    {
                        if (s.IsSystemSoundsSession || s.GetProcessID == 0) match = true;
                    }
                    else if (req.ProcessId.HasValue)
                    {
                        if (s.GetProcessID == req.ProcessId.Value) match = true;
                    }
                    else if (!string.IsNullOrEmpty(req.SessionId))
                    {
                        if (req.SessionId == "system_sounds" && (s.IsSystemSoundsSession || s.GetProcessID == 0)) match = true;
                        else if (uint.TryParse(req.SessionId, out uint parsedPid) && s.GetProcessID == parsedPid) match = true;
                    }

                    if (match)
                    {
                        s.SimpleAudioVolume.Volume = newVol;
                        updatedCount++;
                    }
                }
                catch { }
            }

            SendResponse(req.Id, true, new { updatedCount, volume = newVol });
        }

        private static void HandleSetSessionMute(MMDeviceEnumerator enumerator, RequestMessage req)
        {
            var device = GetTargetDevice(enumerator, req.DeviceId);
            if (device == null)
            {
                SendResponse(req.Id, false, null, "Device not found");
                return;
            }

            if (!req.IsMuted.HasValue)
            {
                SendResponse(req.Id, false, null, "IsMuted parameter is required");
                return;
            }

            bool newMute = req.IsMuted.Value;
            var sessionManager = device.AudioSessionManager;
            sessionManager.RefreshSessions();
            var sessions = sessionManager.Sessions;

            int updatedCount = 0;
            for (int i = 0; i < sessions.Count; i++)
            {
                try
                {
                    var s = sessions[i];
                    bool match = false;

                    if (req.IsSystemSounds.HasValue && req.IsSystemSounds.Value)
                    {
                        if (s.IsSystemSoundsSession || s.GetProcessID == 0) match = true;
                    }
                    else if (req.ProcessId.HasValue)
                    {
                        if (s.GetProcessID == req.ProcessId.Value) match = true;
                    }
                    else if (!string.IsNullOrEmpty(req.SessionId))
                    {
                        if (req.SessionId == "system_sounds" && (s.IsSystemSoundsSession || s.GetProcessID == 0)) match = true;
                        else if (uint.TryParse(req.SessionId, out uint parsedPid) && s.GetProcessID == parsedPid) match = true;
                    }

                    if (match)
                    {
                        s.SimpleAudioVolume.Mute = newMute;
                        updatedCount++;
                    }
                }
                catch { }
            }

            SendResponse(req.Id, true, new { updatedCount, isMuted = newMute });
        }

        private static void HandleSetMasterVolume(MMDeviceEnumerator enumerator, RequestMessage req)
        {
            var device = GetTargetDevice(enumerator, req.DeviceId);
            if (device == null)
            {
                SendResponse(req.Id, false, null, "Device not found");
                return;
            }

            if (!req.Volume.HasValue)
            {
                SendResponse(req.Id, false, null, "Volume parameter is required (0.0 to 1.0)");
                return;
            }

            float newVol = Math.Clamp(req.Volume.Value, 0.0f, 1.0f);
            try
            {
                device.AudioEndpointVolume.MasterVolumeLevelScalar = newVol;
                SendResponse(req.Id, true, new { masterVolume = newVol });
            }
            catch (Exception ex)
            {
                SendResponse(req.Id, false, null, ex.Message);
            }
        }

        private static void HandleSetMasterMute(MMDeviceEnumerator enumerator, RequestMessage req)
        {
            var device = GetTargetDevice(enumerator, req.DeviceId);
            if (device == null)
            {
                SendResponse(req.Id, false, null, "Device not found");
                return;
            }

            if (!req.IsMuted.HasValue)
            {
                SendResponse(req.Id, false, null, "IsMuted parameter is required");
                return;
            }

            bool newMute = req.IsMuted.Value;
            try
            {
                device.AudioEndpointVolume.Mute = newMute;
                SendResponse(req.Id, true, new { isMuted = newMute });
            }
            catch (Exception ex)
            {
                SendResponse(req.Id, false, null, ex.Message);
            }
        }

        private static void GetProcessDetails(int pid, out string processName, out string displayName, out string exePath, out string iconBase64)
        {
            processName = "App";
            displayName = "";
            exePath = "";
            iconBase64 = "";

            try
            {
                using var proc = Process.GetProcessById(pid);
                processName = proc.ProcessName;

                // Try to get executable path
                exePath = GetProcessExecutablePath(proc) ?? "";

                // Display name from cache or FileVersionInfo or Window title
                if (!string.IsNullOrEmpty(exePath) && _nameCache.TryGetValue(exePath, out var cachedName))
                {
                    displayName = cachedName;
                }
                else if (!string.IsNullOrEmpty(exePath) && File.Exists(exePath))
                {
                    try
                    {
                        var vi = FileVersionInfo.GetVersionInfo(exePath);
                        if (!string.IsNullOrWhiteSpace(vi.FileDescription))
                        {
                            displayName = vi.FileDescription.Trim();
                            _nameCache[exePath] = displayName;
                        }
                    }
                    catch { }
                }

                if (string.IsNullOrWhiteSpace(displayName))
                {
                    try
                    {
                        if (!string.IsNullOrWhiteSpace(proc.MainWindowTitle))
                        {
                            displayName = proc.MainWindowTitle.Trim();
                        }
                    }
                    catch { }
                }

                if (string.IsNullOrWhiteSpace(displayName))
                {
                    displayName = NicifyProcessName(processName);
                }

                // Icon from cache or extract
                string iconLookupKey = !string.IsNullOrEmpty(exePath) ? exePath : processName;
                if (_iconCache.TryGetValue(iconLookupKey, out var cachedIcon))
                {
                    iconBase64 = cachedIcon;
                }
                else if (!string.IsNullOrEmpty(exePath) && File.Exists(exePath))
                {
                    iconBase64 = ExtractIconAsBase64(exePath);
                    if (!string.IsNullOrEmpty(iconBase64))
                    {
                        _iconCache[iconLookupKey] = iconBase64;
                    }
                }
            }
            catch
            {
                if (string.IsNullOrEmpty(displayName)) displayName = processName;
            }
        }

        private static string? GetProcessExecutablePath(Process proc)
        {
            try
            {
                return proc.MainModule?.FileName;
            }
            catch
            {
                // Fallback to Win32 QueryFullProcessImageName
                try
                {
                    IntPtr hProcess = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, proc.Id);
                    if (hProcess != IntPtr.Zero)
                    {
                        try
                        {
                            var sb = new StringBuilder(1024);
                            int size = sb.Capacity;
                            if (QueryFullProcessImageName(hProcess, 0, sb, ref size))
                            {
                                return sb.ToString();
                            }
                        }
                        finally
                        {
                            CloseHandle(hProcess);
                        }
                    }
                }
                catch { }
            }
            return null;
        }

        private static string ExtractIconAsBase64(string exePath)
        {
            try
            {
                using var icon = Icon.ExtractAssociatedIcon(exePath);
                if (icon != null)
                {
                    using var bmp = icon.ToBitmap();
                    using var ms = new MemoryStream();
                    bmp.Save(ms, ImageFormat.Png);
                    return "data:image/png;base64," + Convert.ToBase64String(ms.ToArray());
                }
            }
            catch { }
            return "";
        }

        private static string NicifyProcessName(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return "App";
            // Common mappings
            var lower = raw.ToLowerInvariant();
            return lower switch
            {
                "chrome" => "Google Chrome",
                "msedge" => "Microsoft Edge",
                "firefox" => "Mozilla Firefox",
                "spotify" => "Spotify",
                "discord" => "Discord",
                "slack" => "Slack",
                "steam" => "Steam",
                "vlc" => "VLC Media Player",
                "devenv" => "Visual Studio",
                "code" => "VS Code",
                "quick-pill" or "electron" => "Quick Pill",
                _ => char.ToUpper(raw[0]) + (raw.Length > 1 ? raw.Substring(1) : "")
            };
        }

        private static void SendResponse(long id, bool success, object? data = null, string? error = null)
        {
            var res = new ResponseMessage
            {
                Id = id,
                Success = success,
                Data = data,
                Error = error
            };

            try
            {
                string json = JsonSerializer.Serialize(res, _jsonOptions);
                Console.WriteLine(json);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[AudioHelper] Failed to serialize response: {ex.Message}");
            }
        }
    }

    public class RequestMessage
    {
        public long Id { get; set; }
        public string? Cmd { get; set; }
        public string? DeviceId { get; set; }
        public uint? ProcessId { get; set; }
        public string? SessionId { get; set; }
        public float? Volume { get; set; }
        public bool? IsMuted { get; set; }
        public bool? IsSystemSounds { get; set; }
    }

    public class ResponseMessage
    {
        public long Id { get; set; }
        public bool Success { get; set; }
        public object? Data { get; set; }
        public string? Error { get; set; }
    }

    public class DeviceInfo
    {
        public string Id { get; set; } = "";
        public string Name { get; set; } = "";
        public bool IsDefault { get; set; }
        public float MasterVolume { get; set; }
        public bool IsMuted { get; set; }
        public string State { get; set; } = "";
    }

    public class AppSessionGroup
    {
        public string Id { get; set; } = "";
        public uint ProcessId { get; set; }
        public string ProcessName { get; set; } = "";
        public string DisplayName { get; set; } = "";
        public string ExePath { get; set; } = "";
        public string Icon { get; set; } = "";
        public bool IsSystemSounds { get; set; }
        public int SessionsCount { get; set; }
        public float Volume { get; set; }
        public bool IsMuted { get; set; }
        public float Peak { get; set; }
        public string State { get; set; } = "";
    }
}
