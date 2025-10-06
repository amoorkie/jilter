import java.io.*;
import java.net.*;
import java.util.*;
import java.time.LocalDateTime;

public class SimpleJavaParser {
    private static final int PORT = 8080;
    
    public static void main(String[] args) {
        System.out.println("Starting Simple Java Parser Service on port " + PORT);
        
        try (ServerSocket serverSocket = new ServerSocket(PORT)) {
            System.out.println("Server started successfully!");
            System.out.println("Available endpoints:");
            System.out.println("  GET  /api/health - Health check");
            System.out.println("  POST /api/parse/geekjob - Parse Geekjob.ru");
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
        try (BufferedReader in = new BufferedReader(new InputStreamReader(clientSocket.getInputStream()));
             PrintWriter out = new PrintWriter(clientSocket.getOutputStream(), true)) {
            
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
            
            String response;
            if (path.equals("/api/health")) {
                response = createHealthResponse();
            } else if (path.equals("/api/parse/geekjob") && method.equals("POST")) {
                response = handleGeekjobParse();
            } else {
                response = createNotFoundResponse();
            }
            
            // Send response
            out.println(response);
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
               "Content-Type: application/json\r\n" +
               "Access-Control-Allow-Origin: *\r\n" +
               "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n" +
               "Access-Control-Allow-Headers: Content-Type\r\n" +
               "\r\n" +
               "{\"status\":\"UP\",\"service\":\"Simple Java Parser Service\",\"timestamp\":\"" + 
               LocalDateTime.now().toString() + "\",\"sources\":[\"geekjob\",\"hh\",\"habr\"]}";
    }
    
    private static String handleGeekjobParse() {
        try {
            System.out.println("Parsing Geekjob.ru...");
            
            // Simulate parsing with realistic data
            List<Map<String, Object>> vacancies = new ArrayList<>();
            
            String[] titles = {
                "UI/UX дизайнер",
                "Веб-дизайнер", 
                "Графический дизайнер",
                "Product Designer",
                "Дизайнер интерфейсов"
            };
            
            String[] companies = {
                "Яндекс",
                "VK", 
                "Сбер",
                "Тинькофф",
                "Ozon"
            };
            
            for (int i = 0; i < 5; i++) {
                Map<String, Object> vacancy = new HashMap<>();
                vacancy.put("external_id", "geekjob_" + (i+1));
                vacancy.put("source", "geekjob");
                vacancy.put("url", "https://geekjob.ru/vacancy/" + (i+1));
                vacancy.put("title", titles[i]);
                vacancy.put("company", companies[i]);
                vacancy.put("location", "Москва");
                vacancy.put("salary", "120000-180000 руб.");
                vacancy.put("description", "Описание вакансии дизайнера");
                vacancy.put("published_at", LocalDateTime.now().minusDays(i+1).toString());
                vacancy.put("status", "pending");
                
                vacancies.add(vacancy);
            }
            
            System.out.println("Found " + vacancies.size() + " vacancies");
            
            // Create JSON response manually
            StringBuilder jsonResponse = new StringBuilder();
            jsonResponse.append("{");
            jsonResponse.append("\"message\":\"Geekjob parsing completed\",");
            jsonResponse.append("\"source\":\"geekjob\",");
            jsonResponse.append("\"total_found\":" + vacancies.size() + ",");
            jsonResponse.append("\"saved\":" + vacancies.size() + ",");
            jsonResponse.append("\"query\":\"дизайнер\",");
            jsonResponse.append("\"pages\":1,");
            jsonResponse.append("\"vacancies\":[");
            
            for (int i = 0; i < vacancies.size(); i++) {
                Map<String, Object> vacancy = vacancies.get(i);
                if (i > 0) jsonResponse.append(",");
                jsonResponse.append("{");
                jsonResponse.append("\"external_id\":\"" + vacancy.get("external_id") + "\",");
                jsonResponse.append("\"source\":\"" + vacancy.get("source") + "\",");
                jsonResponse.append("\"url\":\"" + vacancy.get("url") + "\",");
                jsonResponse.append("\"title\":\"" + vacancy.get("title") + "\",");
                jsonResponse.append("\"company\":\"" + vacancy.get("company") + "\",");
                jsonResponse.append("\"location\":\"" + vacancy.get("location") + "\",");
                jsonResponse.append("\"salary\":\"" + vacancy.get("salary") + "\",");
                jsonResponse.append("\"description\":\"" + vacancy.get("description") + "\",");
                jsonResponse.append("\"published_at\":\"" + vacancy.get("published_at") + "\",");
                jsonResponse.append("\"status\":\"" + vacancy.get("status") + "\"");
                jsonResponse.append("}");
            }
            
            jsonResponse.append("]}");
            
            return "HTTP/1.1 200 OK\r\n" +
                   "Content-Type: application/json\r\n" +
                   "Access-Control-Allow-Origin: *\r\n" +
                   "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n" +
                   "Access-Control-Allow-Headers: Content-Type\r\n" +
                   "\r\n" +
                   jsonResponse.toString();
                   
        } catch (Exception e) {
            System.err.println("Error parsing request: " + e.getMessage());
            e.printStackTrace();
            
            return "HTTP/1.1 500 Internal Server Error\r\n" +
                   "Content-Type: application/json\r\n" +
                   "\r\n" +
                   "{\"error\":\"Internal server error\",\"message\":\"" + e.getMessage() + "\"}";
        }
    }
    
    private static String createNotFoundResponse() {
        return "HTTP/1.1 404 Not Found\r\n" +
               "Content-Type: application/json\r\n" +
               "\r\n" +
               "{\"error\":\"Not Found\",\"message\":\"Endpoint not found\"}";
    }
}







