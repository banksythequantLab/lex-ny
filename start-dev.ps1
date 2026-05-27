# Launch Lex.NY dev server in a detached window so it survives the launcher exit
$root = "E:\nota_lawyer_hackathon\nota-build"

# Load .env.local
$envVars = @{}
Get-Content "$root\nota-lex\.env.local" | ForEach-Object {
    if ($_ -match '^([A-Z][A-Z_]+)=(.*)$') {
        $envVars[$matches[1]] = $matches[2]
    }
}

# Build a single-command string that loads env then runs next dev
$cmdLines = @()
foreach ($k in $envVars.Keys) {
    $cmdLines += "`$env:$k = '$($envVars[$k])'"
}
$cmdLines += "Set-Location '$root\nota-lex'"
$cmdLines += "& '$root\node_modules\.bin\next.cmd' dev --turbo --port 3000 *> '$root\dev-server.log' 2>&1"

$bootScript = $cmdLines -join "; "

# Start detached PowerShell that runs forever
$proc = Start-Process powershell.exe `
    -ArgumentList "-NoProfile","-WindowStyle","Hidden","-Command",$bootScript `
    -PassThru `
    -WindowStyle Hidden

Write-Host "Started detached dev server, PID $($proc.Id)"
Write-Host "Logs: $root\dev-server.log"
