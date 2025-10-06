@echo off
echo Compiling Fixed Java Parser Service (UTF-8)...

javac -encoding UTF-8 FixedJavaParserUTF8.java

if %ERRORLEVEL% NEQ 0 (
    echo Compilation failed!
    pause
    exit /b 1
)

echo Compilation successful!
echo Starting Fixed Java Parser Service (UTF-8)...

java -Dfile.encoding=UTF-8 FixedJavaParserUTF8

pause

