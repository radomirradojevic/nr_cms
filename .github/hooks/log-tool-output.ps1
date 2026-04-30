$ts = Get-Date -Format 'yyyyMMddHHmmss'
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$logsDir = Join-Path $projectRoot 'logs'
$null = New-Item -Path $logsDir -ItemType Directory -Force
$content = [Console]::In.ReadToEnd()
if ($content.Trim()) {
    Set-Content -Path (Join-Path $logsDir "$ts-ptu.json") -Value $content
}
