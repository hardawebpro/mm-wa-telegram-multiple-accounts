param(
    [Parameter(Mandatory = $true)]
    [string]$ShortcutPath,

    [Parameter(Mandatory = $true)]
    [string]$AppUserModelId
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $ShortcutPath)) {
    throw "Shortcut not found: $ShortcutPath"
}

$typeDefinition = @'
using System;
using System.Runtime.InteropServices;

namespace MmWaShortcut {
    [ComImport]
    [Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IPropertyStore {
        void GetCount(out uint cProps);
        void GetAt(uint iProp, out PropertyKey pkey);
        void GetValue(ref PropertyKey key, out PropVariant pv);
        void SetValue(ref PropertyKey key, ref PropVariant pv);
        void Commit();
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct PropertyKey {
        public Guid fmtid;
        public uint pid;
    }

    [StructLayout(LayoutKind.Explicit, Pack = 8, Size = 24)]
    public struct PropVariant {
        [FieldOffset(0)] public ushort vt;
        [FieldOffset(8)] public IntPtr ptr;
    }

    public static class PropertyStoreHelper {
        private static readonly Guid IPropertyStoreGuid = new Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99");
        private static readonly PropertyKey AppUserModelIdKey = new PropertyKey {
            fmtid = new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3"),
            pid = 5
        };

        [DllImport("shell32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern int SHGetPropertyStoreFromParsingName(
            string pszPath,
            IntPtr bc,
            uint flags,
            ref Guid riid,
            out IPropertyStore ppv);

        public static void SetAppUserModelId(string shortcutPath, string appId) {
            IPropertyStore store;
            var iid = IPropertyStoreGuid;
            const uint GPS_READWRITE = 0x2;
            int hr = SHGetPropertyStoreFromParsingName(shortcutPath, IntPtr.Zero, GPS_READWRITE, ref iid, out store);
            if (hr != 0) {
                Marshal.ThrowExceptionForHR(hr);
            }

            var variant = new PropVariant {
                vt = 31,
                ptr = Marshal.StringToCoTaskMemUni(appId)
            };

            var key = AppUserModelIdKey;
            store.SetValue(ref key, ref variant);
            store.Commit();
            Marshal.FreeCoTaskMem(variant.ptr);
        }
    }
}
'@

if (-not ('MmWaShortcut.PropertyStoreHelper' -as [type])) {
    Add-Type -TypeDefinition $typeDefinition -Language CSharp
}

[MmWaShortcut.PropertyStoreHelper]::SetAppUserModelId($ShortcutPath, $AppUserModelId)
