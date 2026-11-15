# Installs TeamPulse for the current Windows user. No administrator rights are needed.
# It adds Start menu and desktop shortcuts that open the live TeamPulse site in its own window.
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')

try {
    $browser = Find-Browser
    if (-not $browser) {
        Show-Message $NoBrowserText | Out-Null
        exit 1
    }

    $dest = Join-Path $env:LOCALAPPDATA 'TeamPulse'
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    foreach ($name in @('TeamPulse.ico', 'common.ps1', 'uninstall.ps1', 'site-url.txt')) {
        Copy-Item -Path (Join-Path $PSScriptRoot $name) -Destination $dest -Force
    }

    $arguments = Get-AppArguments (Join-Path $dest 'profile')
    $icon = Join-Path $dest 'TeamPulse.ico'
    $shell = New-Object -ComObject WScript.Shell

    foreach ($folder in @([Environment]::GetFolderPath('Programs'), [Environment]::GetFolderPath('Desktop'))) {
        $shortcut = $shell.CreateShortcut((Join-Path $folder 'TeamPulse.lnk'))
        $shortcut.TargetPath = $browser
        $shortcut.Arguments = $arguments
        $shortcut.WorkingDirectory = $dest
        $shortcut.IconLocation = $icon
        $shortcut.Description = 'TeamPulse'
        $shortcut.Save()
    }

    $remove = $shell.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Programs')) 'Uninstall TeamPulse.lnk'))
    $remove.TargetPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $remove.Arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + (Join-Path $dest 'uninstall.ps1') + '"'
    $remove.WorkingDirectory = $dest
    $remove.IconLocation = $icon
    $remove.Description = 'Remove TeamPulse from this computer'
    $remove.Save()

    Show-Message 'TeamPulse is installed. Open it from the Start menu or from the TeamPulse icon on your desktop.' | Out-Null
} catch {
    Show-Message ('The installation did not finish: ' + $_.Exception.Message) | Out-Null
    exit 1
}
