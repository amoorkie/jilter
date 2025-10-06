@echo off
echo Starting Simple Java Parser Service...

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
echo Compiling SimpleJavaParser...
"%JAVA_HOME%\bin\javac.exe" -d . SimpleJavaParser.java

if %errorlevel% neq 0 (
    echo Compilation failed!
    pause
    exit /b 1
)

REM Run the service
echo Starting Simple Parser Service on port 8080...
echo Available endpoints:
echo   GET  /api/health - Health check
echo   POST /api/parse/geekjob - Parse Geekjob.ru
echo.
echo Open http://localhost:8080/api/health to test
echo Press Ctrl+C to stop
echo.

"%JAVA_HOME%\bin\java.exe" SimpleJavaParser

pause







