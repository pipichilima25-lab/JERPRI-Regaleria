@echo off
REM JERPRI - Enciende el servidor (doble clic). Deja esta ventana abierta mientras uses la tienda.
cd /d "%~dp0servidor"
call npm start
pause
