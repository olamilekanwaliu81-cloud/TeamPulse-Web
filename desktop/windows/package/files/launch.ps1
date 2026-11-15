# Opens the live TeamPulse site in its own window, without installing anything.
. (Join-Path $PSScriptRoot 'common.ps1')

$browser = Find-Browser
if (-not $browser) {
    Show-Message $NoBrowserText | Out-Null
    exit 1
}

$profileDir = Join-Path $env:LOCALAPPDATA 'TeamPulse\profile'
New-Item -ItemType Directory -Force -Path $profileDir | Out-Null
Start-Process -FilePath $browser -ArgumentList (Get-AppArguments $profileDir)
