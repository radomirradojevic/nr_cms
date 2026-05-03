$content = [Console]::In.ReadToEnd()
if (-not $content.Trim()) { exit 0 }

$data = $content | ConvertFrom-Json
if ($data.tool_name -eq 'replace_string_in_file' -or $data.tool_name -eq 'create_file') {
    $cwd = if ($data.cwd) { $data.cwd } else { $PSScriptRoot }
    Push-Location $cwd
    try {
        npx prettier --write .
    } finally {
        Pop-Location
    }
}
