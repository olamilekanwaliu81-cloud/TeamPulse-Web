# Removes the TeamPulse shortcuts and the sign-in saved on this computer. The team's data stays on the site.
. (Join-Path $PSScriptRoot 'common.ps1')

$answer = Show-Message ("Remove TeamPulse from this computer?`n`nThis removes the shortcuts and the sign-in saved on this computer. Your team's data is not deleted: it stays on the TeamPulse site.") 'YesNo'
if ($answer -ne 'Yes') { exit 0 }

try {
    $programs = [Environment]::GetFolderPath('Programs')
    $desktop = [Environment]::GetFolderPath('Desktop')
    foreach ($link in @((Join-Path $programs 'TeamPulse.lnk'), (Join-Path $programs 'Uninstall TeamPulse.lnk'), (Join-Path $desktop 'TeamPulse.lnk'))) {
        if (Test-Path $link) { Remove-Item -Path $link -Force }
    }
    $dest = Join-Path $env:LOCALAPPDATA 'TeamPulse'
    if (Test-Path $dest) { Remove-Item -Path $dest -Recurse -Force }
    Show-Message 'TeamPulse was removed.' | Out-Null
} catch {
    Show-Message ('TeamPulse could not be fully removed. Close TeamPulse and try again. (' + $_.Exception.Message + ')') | Out-Null
}
