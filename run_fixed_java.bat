@echo off
chcp 65001
echo Starting Fixed Java Parser Service with UTF-8 support...

REM Set Java path explicitly
set JAVA_HOME=C:\Users\amoor\scoop\apps\openjdk17\17.0.2-8
set PATH=%JAVA_HOME%\bin;%PATH%

REM Check if Java is available
echo Checking Java installation...
"%JAVA_HOME%\bin\java.exe" -version
if %errorlevel% neq 0 (
    echo Java not found! Please install Java 17 or higher.
    pause
    exit /b 1
)

REM Compile Java file
echo Compiling FixedJavaParser...
"%JAVA_HOME%\bin\javac.exe" -d . FixedJavaParser.java

if %errorlevel% neq 0 (
    echo Compilation failed!
    pause
    exit /b 1
)

REM Run the service
echo Starting Fixed Parser Service on port 8080...
echo Available endpoints:
echo   GET  /api/health - Health check
echo   POST /api/parse/geekjob - Parse Geekjob.ru
echo   POST /api/parse/hh - Parse HH.ru
echo   POST /api/parse/habr - Parse Habr Career
echo.
echo Open http://localhost:8080/api/health to test
echo Press Ctrl+C to stop
echo.

"%JAVA_HOME%\bin\java.exe" FixedJavaParser

pause







