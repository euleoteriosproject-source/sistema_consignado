# Para qualquer processo usando porta 8080 e reinicia o backend
$port = 8080

Write-Host "Parando processos Java e processos na porta $port..." -ForegroundColor Yellow

# Mata todos os processos Java (JVM)
Get-Process java -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "Matando Java PID=$($_.Id)..." -ForegroundColor Red
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

# Mata qualquer processo remanescente na porta
$pid8080 = netstat -ano | Select-String ":$port\s" | ForEach-Object {
    ($_ -split '\s+')[-1]
} | Select-Object -Unique | Where-Object { $_ -match '^\d+$' }

if ($pid8080) {
    foreach ($p in $pid8080) {
        Write-Host "Matando processo PID=$p (porta $port)..." -ForegroundColor Red
        Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
    }
}

Start-Sleep -Seconds 3
Write-Host "Iniciando backend com perfil dev..." -ForegroundColor Green

& "$PSScriptRoot\gradlew.bat" bootRun
