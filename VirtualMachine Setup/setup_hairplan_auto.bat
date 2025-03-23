@echo off
:: Se lo script non è eseguito come amministratore, lo riavvia automaticamente con privilegi elevati
net session >nul 2>&1
if %errorLevel% neq 0 (
    powershell -Command "Start-Process -Verb runAs -FilePath '%~f0'"
    exit /b
)

:: Controllo e installazione di Chocolatey
where choco >nul 2>&1
if %errorLevel% neq 0 (
    echo Chocolatey non e' installato. Installalo manualmente da https://chocolatey.org/install
    exit /b
)

:: Controllo e installazione di VirtualBox
where VBoxManage >nul 2>&1
if %errorLevel% neq 0 (
    choco install virtualbox -y
)

:: Controllo e installazione di PuTTY
where putty.exe >nul 2>&1
if %errorLevel% neq 0 (
    choco install putty -y
)

:: Determinazione dei percorsi
if exist "%~dp0putty.exe" (
    set "PUTTY_PATH=%~dp0putty.exe"
) else (
    for /f "delims=" %%i in ('where putty.exe') do set "PUTTY_PATH=%%i"
)
for /f "delims=" %%i in ('where VBoxManage') do set "VBOX_PATH=%%i"

if "%PUTTY_PATH%"=="" (
    echo Errore: PuTTY non e' stato trovato. Verifica l'installazione.
    exit /b
)

:: Imposta sempre il nome di default per la VM
set "VM_NAME=AlpineServer"
echo Nome della VM: %VM_NAME%

:: Verifica dell'esistenza della VM
VBoxManage list vms | findstr /I "%VM_NAME%" >nul
if %errorLevel%==0 (
    :: Se la VM esiste ed è in esecuzione, la spegne
    VBoxManage list runningvms | findstr /I "%VM_NAME%" >nul
    if %errorLevel%==0 (
        VBoxManage controlvm "%VM_NAME%" poweroff
    )
) else (
    :: Se la VM non esiste, controlla SEMPRE la presenza di un file OVA nella stessa cartella
    if exist "%~dp0AlpineServer.ova" (
        VBoxManage import "%~dp0AlpineServer.ova" --vsys 0 --vmname "%VM_NAME%"
    ) else (
        echo [!] Nessun file OVA trovato nella cartella dello script.
        echo     Posiziona il file AlpineServer.ova nella stessa cartella di questo script.
        pause
        exit /b 1
    )
)

:: Configurazione del port forwarding
VBoxManage modifyvm "%VM_NAME%" --natpf1 "HairPlan,tcp,,3000,,3000"
VBoxManage modifyvm "%VM_NAME%" --natpf1 "SSH,tcp,,2222,,22"

:: Avvio della VM in modalità headless
VBoxManage startvm "%VM_NAME%" --type headless

echo Istruzioni per configurare la VM:
echo 1. Connettiti via SSH con PuTTY: host "localhost", porta "2222", utente "mastroiannim", password "paleocapa"
echo 2. Clona il repository HAIRPLAN: git clone https://github.com/StefaTerce/HairPlan.git
echo 3. Installa le dipendenze: cd HairPlan && npm install
echo 4. Avvia l'applicazione: node app.js
echo.
echo Apri il browser su: http://localhost:3000
echo.
:: Avvio di PuTTY e del browser
start "PuTTY" "%PUTTY_PATH%" -ssh mastroiannim@localhost -P 2222
start "" http://localhost:3000
