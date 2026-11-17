$ErrorActionPreference = 'Stop'
$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
$workerPath = Join-Path $PSScriptRoot 'refresh-daily.js'
$command = "& '" + $nodePath.Replace("'", "''") + "' '" + $workerPath.Replace("'", "''") + "'"
$payload = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($command))
$powershellPath = Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'
$action = New-ScheduledTaskAction -Execute $powershellPath -Argument "-NoProfile -NonInteractive -WindowStyle Hidden -EncodedCommand $payload"
$daily = New-ScheduledTaskTrigger -Daily -At '09:00'
$logon = New-ScheduledTaskTrigger -AtLogOn -User ([Security.Principal.WindowsIdentity]::GetCurrent().Name)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
$principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName 'EverythingApp-DailyContent' -Action $action -Trigger @($daily, $logon) -Settings $settings -Principal $principal -Description 'Refresh Everything App news and Spotify daily picks.' -Force | Out-Null
Start-ScheduledTask -TaskName 'EverythingApp-DailyContent'
Get-ScheduledTask -TaskName 'EverythingApp-DailyContent' | Select-Object TaskName, State
