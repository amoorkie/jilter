@echo off
echo Starting Java Parser Service...

REM Set Java path
set JAVA_HOME=C:\Users\amoor\scoop\apps\openjdk17\17.0.2-8
set PATH=%JAVA_HOME%\bin;%PATH%

REM Create lib directory if it doesn't exist
if not exist "lib" mkdir lib

REM Download dependencies if not exist
if not exist "lib\selenium-java-4.15.0.jar" (
    echo Downloading Selenium...
    powershell -Command "Invoke-WebRequest -Uri 'https://repo1.maven.org/maven2/org/seleniumhq/selenium/selenium-java/4.15.0/selenium-java-4.15.0.jar' -OutFile 'lib\selenium-java-4.15.0.jar'"
)

if not exist "lib\jsoup-1.17.2.jar" (
    echo Downloading JSoup...
    powershell -Command "Invoke-WebRequest -Uri 'https://repo1.maven.org/maven2/org/jsoup/jsoup/1.17.2/jsoup-1.17.2.jar' -OutFile 'lib\jsoup-1.17.2.jar'"
)

if not exist "lib\spring-boot-starter-web-3.2.0.jar" (
    echo Downloading Spring Boot...
    powershell -Command "Invoke-WebRequest -Uri 'https://repo1.maven.org/maven2/org/springframework/boot/spring-boot-starter-web/3.2.0/spring-boot-starter-web-3.2.0.jar' -OutFile 'lib\spring-boot-starter-web-3.2.0.jar'"
)

REM Compile Java files
echo Compiling Java files...
javac -cp "lib\*" -d target\classes src\main\java\com\jobfilter\parser\*.java src\main\java\com\jobfilter\parser\model\*.java src\main\java\com\jobfilter\parser\parser\*.java src\main\java\com\jobfilter\parser\controller\*.java

REM Create JAR file
echo Creating JAR file...
cd target\classes
jar -cfm ..\parser-service.jar ..\..\META-INF\MANIFEST.MF com\jobfilter\parser\*.class com\jobfilter\parser\model\*.class com\jobfilter\parser\parser\*.class com\jobfilter\parser\controller\*.class
cd ..\..

REM Run the service
echo Starting Parser Service on port 8080...
java -cp "target\parser-service.jar;lib\*" com.jobfilter.parser.ParserServiceApplication

pause







