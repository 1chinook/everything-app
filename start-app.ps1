$ErrorActionPreference = 'Stop'
$appUrl = 'http://127.0.0.1:4173/'

function Test-AppReady {
    try {
        $response = Invoke-WebRequest -Uri $appUrl -UseBasicParsing -TimeoutSec 1
        return $response.StatusCode -eq 200 -and $response.Content -match '<title>[^<]*Everything App'
    } catch {
        return $false
    }
}

try {
    if (-not (Test-AppReady)) {
        $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
        $nodePath = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:ProgramFiles 'nodejs\node.exe' }
        Start-Process -FilePath $nodePath -ArgumentList 'server.js' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
        $ready = $false
        for ($attempt = 0; $attempt -lt 20; $attempt++) {
            if (Test-AppReady) {
                $ready = $true
                break
            }
            Start-Sleep -Milliseconds 250
        }
        if (-not $ready) { throw 'Everything App could not start. Check whether port 4173 is in use.' }
    }
    Start-Process $appUrl
} catch {
    $shell = New-Object -ComObject WScript.Shell
    $null = $shell.Popup($_.Exception.Message, 0, 'Everything App', 16)
    exit 1
}
