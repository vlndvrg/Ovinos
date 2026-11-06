@echo off
REM =====================================================================
REM Script para levantar el sistema EBA completo en Windows
REM =====================================================================

cd /d "%~dp0"

echo [1/6] Levantando MariaDB en puerto 3307...
start "" "C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\Users\torre\AppData\Local\Temp\opencode\eba-mysql\data\my.ini" --console

echo Esperando a que MariaDB inicie...
timeout /t 8 /nobreak > nul

echo [2/6] Instalando dependencias...
npm install

echo [3/6] Creando base de datos y cargando esquema + seed...
npm run db:setup -w backend

echo [4/6] Cargando datos de demostración...
npm run db:seed:demo -w backend

echo [5/6] Actualizando criterios EBA de la norma (idempotente)...
npm run db:update-criterios -w backend

echo [6/6] Compilando y ejecutando pruebas...
npm run build
npm run test

echo.
echo =====================================================================
echo FLUJO COMPLETADO. Ahora puedes iniciar la aplicación con:
echo   npm run dev
echo =====================================================================
pause
