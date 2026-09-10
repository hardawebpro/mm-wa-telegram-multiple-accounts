param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectDir,

    [Parameter(Mandatory = $true)]
    [string]$AppName,

    [Parameter(Mandatory = $true)]
    [string]$AppUserModelId
)

$ErrorActionPreference = 'Stop'

$ProjectDir = (Resolve-Path -LiteralPath $ProjectDir).Path
$TargetPath = Join-Path $ProjectDir 'start-app.vbs'

if (-not (Test-Path -LiteralPath $TargetPath)) {
    throw "start-app.vbs not found in project folder: $ProjectDir"
}

$iconIco = Join-Path $ProjectDir 'resources\256.ico'
$iconPng = Join-Path $ProjectDir 'resources\256.png'
$iconPath = if (Test-Path -LiteralPath $iconIco) { $iconIco } elseif (Test-Path -LiteralPath $iconPng) { $iconPng } else { $null }

function New-AppShortcut {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ShortcutPath,

        [Parameter(Mandatory = $true)]
        [string]$Description
    )

    $shortcutDir = Split-Path -Parent $ShortcutPath
    if (-not (Test-Path -LiteralPath $shortcutDir)) {
        New-Item -ItemType Directory -Path $shortcutDir -Force | Out-Null
    }

    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($ShortcutPath)
    $shortcut.TargetPath = $TargetPath
    $shortcut.WorkingDirectory = $ProjectDir
    $shortcut.Description = $Description
    if ($iconPath) {
        $shortcut.IconLocation = "$iconPath,0"
    }
    $shortcut.Save()

    & (Join-Path $ProjectDir 'scripts\Set-ShortcutAppUserModelId.ps1') -ShortcutPath $ShortcutPath -AppUserModelId $AppUserModelId
}

$desktopShortcut = Join-Path $env:USERPROFILE "Desktop\$AppName.lnk"
$startMenuShortcut = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\$AppName.lnk"

New-AppShortcut -ShortcutPath $desktopShortcut -Description 'Manage multiple WhatsApp and Telegram accounts'
New-AppShortcut -ShortcutPath $startMenuShortcut -Description 'Manage multiple WhatsApp and Telegram accounts'

Write-Output "Desktop shortcut: $desktopShortcut"
Write-Output "Start Menu shortcut: $startMenuShortcut"
Write-Output "AppUserModelID: $AppUserModelId"
