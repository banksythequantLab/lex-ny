$root = "E:\nota_lawyer_hackathon\nota-build"
$envVars = @{}
Get-Content "$root\nota-lex\.env.local" | ForEach-Object {
    if ($_ -match '^([A-Z][A-Z_0-9]+)=(.*)$') { $envVars[$matches[1]] = $matches[2] }
}
$cmdLines = @()
foreach ($k in $envVars.Keys) { $cmdLines += "`$env:$k = '$($envVars[$k])'" }
$cmdLines += "Set-Location '$root\nota-lex'"
$cmdLines += "& '$root\node_modules\.bin\next.cmd' dev --port 3100 *> '$root\lex-server.log' 2>&1"
$bootScript = $cmdLines -join "; "
$proc = Start-Process powershell.exe -ArgumentList "-NoProfile","-WindowStyle","Hidden","-Command",$bootScript -PassThru -WindowStyle Hidden
Write-Host "LEX_PID $($proc.Id)"
