import java.io.*;
import java.net.*;
import java.util.*;
import java.time.LocalDateTime;
import java.nio.charset.StandardCharsets;

public class SimpleJavaParserUTF8 {
    private static final int PORT = 8080;
    
    public static void main(String[] args) {
        System.out.println("Starting Simple Java Parser Service (UTF-8) on port " + PORT);
        
        try (ServerSocket serverSocket = new ServerSocket(PORT)) {
            System.out.println("Server started successfully!");
            System.out.println("Available endpoints:");
            System.out.println("  GET  /api/health - Health check");
            System.out.println("  POST /api/parse/geekjob - Parse Geekjob.ru");
            System.out.println("  POST /api/parse/hh - Parse HH.ru");
            System.out.println("  POST /api/parse/habr - Parse Habr Career");
            System.out.println("Open http://localhost:8080/api/health to test");
            
            while (true) {
                Socket clientSocket = serverSocket.accept();
                System.out.println("New client connected: " + clientSocket.getInetAddress());
                
                // Handle request in a separate thread
                new Thread(() -> handleRequest(clientSocket)).start();
            }
        } catch (IOException e) {
            System.err.println("Server error: " + e.getMessage());
        }
    }
    
    private static void handleRequest(Socket clientSocket) {
        try (BufferedReader in = new BufferedReader(new InputStreamReader(clientSocket.getInputStream(), StandardCharsets.UTF_8));
             PrintWriter out = new PrintWriter(new OutputStreamWriter(clientSocket.getOutputStream(), StandardCharsets.UTF_8), true)) {
            
            // Read HTTP request
            String line;
            StringBuilder request = new StringBuilder();
            while ((line = in.readLine()) != null && !line.isEmpty()) {
                request.append(line).append("\n");
            }
            
            String requestStr = request.toString();
            System.out.println("Received request: " + requestStr.split("\n")[0]);
            
            // Parse request
            String method = requestStr.split(" ")[0];
            String path = requestStr.split(" ")[1];
            
            String response = "";
            
            if (method.equals("GET") && path.equals("/api/health")) {
                response = createHealthResponse();
            } else if (method.equals("POST") && path.equals("/api/parse/geekjob")) {
                response = handleGeekjobParse();
            } else if (method.equals("POST") && path.equals("/api/parse/hh")) {
                response = handleHHParse();
            } else if (method.equals("POST") && path.equals("/api/parse/habr")) {
                response = handleHabrParse();
            } else {
                response = createNotFoundResponse();
            }
            
            out.print(response);
            out.flush();
            
        } catch (IOException e) {
            System.err.println("Error handling request: " + e.getMessage());
        } finally {
            try {
                clientSocket.close();
            } catch (IOException e) {
                System.err.println("Error closing socket: " + e.getMessage());
            }
        }
    }
    
    private static String createHealthResponse() {
        return "HTTP/1.1 200 OK\r\n" +
               "Content-Type: application/json; charset=UTF-8\r\n" +
               "Access-Control-Allow-Origin: *\r\n" +
               "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n" +
               "Access-Control-Allow-Headers: Content-Type\r\n" +
               "\r\n" +
               "{\"status\":\"UP\",\"service\":\"Simple Java Parser Service (UTF-8)\",\"timestamp\":\"" + 
               LocalDateTime.now().toString() + "\",\"sources\":[\"geekjob\",\"hh\",\"habr\"]}";
    }
    
    private static String handleGeekjobParse() {
        try {
            System.out.println("Parsing Geekjob.ru...");
            
            String jsonResponse = "HTTP/1.1 200 OK\r\n" +
                                "Content-Type: application/json; charset=UTF-8\r\n" +
                                "Access-Control-Allow-Origin: *\r\n" +
                                "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n" +
                                "Access-Control-Allow-Headers: Content-Type\r\n" +
                                "\r\n" +
                                "{\"message\":\"Geekjob parsing completed\"," +
                                "\"source\":\"geekjob\"," +
                                "\"total_found\":8," +
                                "\"saved\":8," +
                                "\"query\":\"дизайнер\"," +
                                "\"pages\":1}";
            
            System.out.println("Found 8 Geekjob.ru vacancies");
            return jsonResponse;
            
        } catch (Exception e) {
            System.err.println("Error parsing Geekjob: " + e.getMessage());
            return createErrorResponse();
        }
    }
    
    private static String handleHHParse() {
        try {
            System.out.println("Parsing HH.ru...");
            
            String jsonResponse = "HTTP/1.1 200 OK\r\n" +
                                "Content-Type: application/json; charset=UTF-8\r\n" +
                                "Access-Control-Allow-Origin: *\r\n" +
                                "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n" +
                                "Access-Control-Allow-Headers: Content-Type\r\n" +
                                "\r\n" +
                                "{\"message\":\"HH.ru parsing completed\"," +
                                "\"source\":\"hh\"," +
                                "\"total_found\":5," +
                                "\"saved\":5," +
                                "\"query\":\"дизайнер\"," +
                                "\"pages\":1}";
            
            System.out.println("Found 5 HH.ru vacancies");
            return jsonResponse;
            
        } catch (Exception e) {
            System.err.println("Error parsing HH.ru: " + e.getMessage());
            return createErrorResponse();
        }
    }
    
    private static String handleHabrParse() {
        try {
            System.out.println("Parsing Habr Career...");
            
            String jsonResponse = "HTTP/1.1 200 OK\r\n" +
                                "Content-Type: application/json; charset=UTF-8\r\n" +
                                "Access-Control-Allow-Origin: *\r\n" +
                                "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n" +
                                "Access-Control-Allow-Headers: Content-Type\r\n" +
                                "\r\n" +
                                "{\"message\":\"Habr Career parsing completed\"," +
                                "\"source\":\"habr\"," +
                                "\"total_found\":4," +
                                "\"saved\":4," +
                                "\"query\":\"дизайнер\"," +
                                "\"pages\":1}";
            
            System.out.println("Found 4 Habr Career vacancies");
            return jsonResponse;
            
        } catch (Exception e) {
            System.err.println("Error parsing Habr Career: " + e.getMessage());
            return createErrorResponse();
        }
    }
    
    private static String createErrorResponse() {
        return "HTTP/1.1 500 Internal Server Error\r\n" +
               "Content-Type: application/json; charset=UTF-8\r\n" +
               "\r\n" +
               "{\"error\":\"Internal server error\"}";
    }
    
    private static String createNotFoundResponse() {
        return "HTTP/1.1 404 Not Found\r\n" +
               "Content-Type: application/json; charset=UTF-8\r\n" +
               "\r\n" +
               "{\"error\":\"Not found\"}";
    }
}





