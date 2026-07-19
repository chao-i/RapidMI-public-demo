$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot

$ForbiddenExtensions = @('.pkl', '.joblib', '.onnx', '.h5', '.pt', '.pth', '.csv', '.xlsx', '.xls', '.dcm', '.docx', '.pdf', '.pem', '.key', '.htpasswd')
$ForbiddenDirectories = @('data', 'uploads', 'results', 'secrets', '.venv', '__pycache__')
$Findings = @()

Get-ChildItem -LiteralPath $Root -Recurse -Force -File | ForEach-Object {
    $relative = $_.FullName.Substring($Root.Length).TrimStart([char[]]@('\', '/'))
    $parts = $relative -split '[\\/]'
    if ($ForbiddenDirectories | Where-Object { $parts -contains $_ }) {
        $Findings += "Forbidden directory content: $relative"
    }
    if ($ForbiddenExtensions -contains $_.Extension.ToLowerInvariant()) {
        $Findings += "Forbidden file extension: $relative"
    }
    if ($_.Length -gt 10MB) {
        $Findings += "Large file requires manual review: $relative"
    }
}

$TextFiles = Get-ChildItem -LiteralPath $Root -Recurse -File -Include *.py,*.js,*.css,*.html,*.md,*.yml,*.yaml,*.ps1,*.txt
foreach ($file in $TextFiles) {
    if ($file.FullName -eq $PSCommandPath) {
        continue
    }
    $matches = Select-String -Path $file.FullName -Pattern 'D:\\|C:\\|/opt/rapidmi|rapidmiadmin|120\.77\.77\.156|password\s*=|BEGIN (RSA|OPENSSH) PRIVATE KEY' -AllMatches
    foreach ($match in $matches) {
        $relative = $file.FullName.Substring($Root.Length).TrimStart([char[]]@('\', '/'))
        $Findings += "Potential private detail in $relative at line $($match.LineNumber)"
    }
}

if ($Findings.Count -gt 0) {
    Write-Host "PUBLIC RELEASE AUDIT FAILED" -ForegroundColor Red
    $Findings | Sort-Object -Unique | ForEach-Object { Write-Host " - $_" -ForegroundColor Yellow }
    exit 1
}

Write-Host "PUBLIC RELEASE AUDIT PASSED" -ForegroundColor Green
