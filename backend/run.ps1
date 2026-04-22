# Carrega o .env e sobe o backend com perfil dev
# Uso: cd backend; .\run.ps1

$envFile = Join-Path $PSScriptRoot ".env"

if (-not (Test-Path $envFile)) {
    Write-Error "Arquivo .env não encontrado em $envFile"
    Write-Host "Copie o .env.example para .env e preencha as variáveis."
    exit 1
}

Get-Content $envFile | Where-Object { $_ -match '^\s*\w' } | ForEach-Object {
    $idx = $_.IndexOf('=')
    if ($idx -gt 0) {
        $key = $_.Substring(0, $idx).Trim()
        $val = $_.Substring($idx + 1).Trim()
        Set-Item -Path "Env:$key" -Value $val
    }
}

Write-Host "Variáveis carregadas. Subindo backend..." -ForegroundColor Green
& "$PSScriptRoot\gradlew.bat" bootRun --args='--spring.profiles.active=dev'
