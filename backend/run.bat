@echo off
setlocal EnableDelayedExpansion

if not exist ".env" (
    echo Arquivo .env nao encontrado.
    echo Copie o .env.example para .env e preencha as variaveis.
    exit /b 1
)

for /f "usebackq eol=# tokens=1,* delims==" %%A in (".env") do (
    if not "%%A"=="" set "%%A=%%B"
)

echo Variaveis carregadas. Subindo backend...
call gradlew.bat bootRun --args="--spring.profiles.active=dev"
