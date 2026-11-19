$ErrorActionPreference = 'Stop'
$scriptPath = Join-Path $PSScriptRoot 'start-app.vbs'
$scriptHost = Join-Path $env:WINDIR 'System32\wscript.exe'
$launcherProcess = Start-Process -FilePath $scriptHost -ArgumentList ('"' + $scriptPath + '"') -WindowStyle Hidden -Wait -PassThru
exit $launcherProcess.ExitCode