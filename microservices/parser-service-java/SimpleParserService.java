import java.io.*;
import java.net.*;
import java.util.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;

public class SimpleParserService {
    private static final int PORT = 8080;
    private static final ObjectMapper objectMapper = new ObjectMapper();
    
    public static void main(String[] args) {
        System.out.println("Starting Simple Java Parser Service on port " + PORT);
        
        try (ServerSocket serverSocket = new ServerSocket(PORT)) {
            System.out.println("Server started successfully!");
            
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
                response = handleGeekjobParse(in, out);
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
               LocalDateTime.now().toString() + "\"}";
    }
    
    private static String handleGeekjobParse(BufferedReader in, PrintWriter out) {
        try {
            // Read request body
            StringBuilder body = new StringBuilder();
            while (in.ready()) {
                body.append((char) in.read());
            }
            
            System.out.println("Request body: " + body.toString());
            
            // Parse JSON request
            JsonNode requestJson = objectMapper.readTree(body.toString());
            String query = requestJson.has("query") ? requestJson.get("query").asText() : "дизайнер";
            int pages = requestJson.has("pages") ? requestJson.get("pages").asInt() : 1;
            
            System.out.println("Parsing Geekjob.ru: query='" + query + "', pages=" + pages);
            
            // Simulate parsing (in real implementation, this would use Selenium)
            List<Map<String, Object>> vacancies = parseGeekjobVacancies(query, pages);
            
            // Create response
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Geekjob parsing completed");
            response.put("source", "geekjob");
            response.put("total_found", vacancies.size());
            response.put("saved", vacancies.size());
            response.put("query", query);
            response.put("pages", pages);
            response.put("vacancies", vacancies);
            
            String jsonResponse = objectMapper.writeValueAsString(response);
            
            return "HTTP/1.1 200 OK\r\n" +
                   "Content-Type: application/json\r\n" +
                   "Access-Control-Allow-Origin: *\r\n" +
                   "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n" +
                   "Access-Control-Allow-Headers: Content-Type\r\n" +
                   "\r\n" +
                   jsonResponse;
                   
        } catch (Exception e) {
            System.err.println("Error parsing request: " + e.getMessage());
            e.printStackTrace();
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Internal server error");
            errorResponse.put("message", e.getMessage());
            
            try {
                String jsonError = objectMapper.writeValueAsString(errorResponse);
                return "HTTP/1.1 500 Internal Server Error\r\n" +
                       "Content-Type: application/json\r\n" +
                       "Access-Control-Allow-Origin: *\r\n" +
                       "\r\n" +
                       jsonError;
            } catch (Exception ex) {
                return "HTTP/1.1 500 Internal Server Error\r\n" +
                       "Content-Type: text/plain\r\n" +
                       "\r\n" +
                       "Internal server error";
            }
        }
    }
    
    private static List<Map<String, Object>> parseGeekjobVacancies(String query, int pages) {
        List<Map<String, Object>> vacancies = new ArrayList<>();
        
        // Simulate parsing results
        for (int i = 1; i <= Math.min(pages, 3); i++) {
            for (int j = 1; j <= 5; j++) {
                Map<String, Object> vacancy = new HashMap<>();
                vacancy.put("external_id", "geekjob_" + i + "_" + j);
                vacancy.put("source", "geekjob");
                vacancy.put("url", "https://geekjob.ru/vacancy/" + i + "_" + j);
                vacancy.put("title", "Дизайнер " + query + " (вакансия " + j + ")");
                vacancy.put("company", "Компания " + j);
                vacancy.put("location", "Москва");
                vacancy.put("salary", "100000-150000 руб.");
                vacancy.put("description", "Описание вакансии для " + query);
                vacancy.put("published_at", LocalDateTime.now().minusDays(j).toString());
                vacancy.put("status", "pending");
                
                vacancies.add(vacancy);
            }
        }
        
        System.out.println("Simulated parsing: found " + vacancies.size() + " vacancies");
        return vacancies;
    }
    
    private static String createNotFoundResponse() {
        return "HTTP/1.1 404 Not Found\r\n" +
               "Content-Type: application/json\r\n" +
               "\r\n" +
               "{\"error\":\"Not Found\",\"message\":\"Endpoint not found\"}";
    }
}







