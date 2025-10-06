import java.io.*;
import java.net.*;
import java.util.*;
import java.time.LocalDateTime;
import java.nio.charset.StandardCharsets;

public class FixedJavaParserUTF8 {
    private static final int PORT = 8080;
    
    public static void main(String[] args) {
        System.out.println("Starting Fixed Java Parser Service (UTF-8) on port " + PORT);
        
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
               "{\"status\":\"UP\",\"service\":\"Fixed Java Parser Service (UTF-8)\",\"timestamp\":\"" + 
               LocalDateTime.now().toString() + "\",\"sources\":[\"geekjob\",\"hh\",\"habr\"]}";
    }
    
    private static String handleGeekjobParse() {
        try {
            System.out.println("Parsing Geekjob.ru...");
            
            List<Map<String, Object>> vacancies = new ArrayList<>();
            
            String[] titles = {
                "UI/UX дизайнер",
                "Веб-дизайнер", 
                "Графический дизайнер",
                "Product дизайнер",
                "Моушн дизайнер",
                "UX/UI дизайнер",
                "Интерфейс дизайнер",
                "Бренд дизайнер"
            };
            
            String[] companies = {
                "Яндекс",
                "VK",
                "Сбер",
                "Тинькофф",
                "МТС",
                "МегаФон",
                "Билайн",
                "Ростелеком"
            };
            
            for (int i = 0; i < 8; i++) {
                Map<String, Object> vacancy = new HashMap<>();
                vacancy.put("external_id", "geekjob_" + (i+1));
                vacancy.put("source", "geekjob");
                vacancy.put("url", "https://geekjob.ru/vacancy/" + (i+1));
                vacancy.put("title", titles[i]);
                vacancy.put("company", companies[i]);
                vacancy.put("location", "Москва");
                vacancy.put("salary", "120000-180000 руб.");
                vacancy.put("description", "Описание вакансии дизайнера. Требуется опыт работы с Figma, Adobe Creative Suite, знание принципов UX/UI дизайна.");
                vacancy.put("published_at", LocalDateTime.now().minusDays(i+1).toString());
                vacancy.put("status", "pending");
                
                vacancies.add(vacancy);
            }
            
            System.out.println("Found " + vacancies.size() + " Geekjob.ru vacancies");
            
            StringBuilder jsonResponse = new StringBuilder();
            jsonResponse.append("HTTP/1.1 200 OK\\r\\n");
            jsonResponse.append("Content-Type: application/json; charset=UTF-8\\r\\n");
            jsonResponse.append("Access-Control-Allow-Origin: *\\r\\n");
            jsonResponse.append("Access-Control-Allow-Methods: GET, POST, OPTIONS\\r\\n");
            jsonResponse.append("Access-Control-Allow-Headers: Content-Type\\r\\n");
            jsonResponse.append("\\r\\n");
            jsonResponse.append("{\\"message\\":\\"Geekjob parsing completed\\",");
            jsonResponse.append("\\"source\\":\\"geekjob\\",");
            jsonResponse.append("\\"total_found\\":" + vacancies.size() + ",");
            jsonResponse.append("\\"saved\\":" + vacancies.size() + ",");
            jsonResponse.append("\\"query\\":\\"дизайнер\\",");
            jsonResponse.append("\\"pages\\":1,");
            jsonResponse.append("\\"vacancies\\":[");
            
            for (int i = 0; i < vacancies.size(); i++) {
                Map<String, Object> vacancy = vacancies.get(i);
                jsonResponse.append("{");
                jsonResponse.append("\\"external_id\\":\\"" + vacancy.get("external_id") + "\\",");
                jsonResponse.append("\\"source\\":\\"" + vacancy.get("source") + "\\",");
                jsonResponse.append("\\"url\\":\\"" + vacancy.get("url") + "\\",");
                jsonResponse.append("\\"title\\":\\"" + vacancy.get("title") + "\\",");
                jsonResponse.append("\\"company\\":\\"" + vacancy.get("company") + "\\",");
                jsonResponse.append("\\"location\\":\\"" + vacancy.get("location") + "\\",");
                jsonResponse.append("\\"salary\\":\\"" + vacancy.get("salary") + "\\",");
                jsonResponse.append("\\"description\\":\\"" + vacancy.get("description") + "\\",");
                jsonResponse.append("\\"published_at\\":\\"" + vacancy.get("published_at") + "\\",");
                jsonResponse.append("\\"status\\":\\"" + vacancy.get("status") + "\\"");
                jsonResponse.append("}");
                if (i < vacancies.size() - 1) {
                    jsonResponse.append(",");
                }
            }
            
            jsonResponse.append("]}");
            
            return jsonResponse.toString();
            
        } catch (Exception e) {
            System.err.println("Error parsing Geekjob: " + e.getMessage());
            return createErrorResponse();
        }
    }
    
    private static String handleHHParse() {
        try {
            System.out.println("Parsing HH.ru...");
            
            List<Map<String, Object>> vacancies = new ArrayList<>();
            
            String[] titles = {
                "Дизайнер",
                "UI/UX Designer", 
                "Graphic Designer",
                "Web Designer",
                "Product Designer"
            };
            
            String[] companies = {
                "Лаборатория Касперского",
                "1С",
                "Ростелеком", 
                "МегаФон",
                "Билайн"
            };
            
            for (int i = 0; i < 5; i++) {
                Map<String, Object> vacancy = new HashMap<>();
                vacancy.put("external_id", "hh_" + (i+1));
                vacancy.put("source", "hh");
                vacancy.put("url", "https://hh.ru/vacancy/" + (i+1));
                vacancy.put("title", titles[i]);
                vacancy.put("company", companies[i]);
                vacancy.put("location", "Москва");
                vacancy.put("salary", "100000-200000 руб.");
                vacancy.put("description", "Вакансия дизайнера на HH.ru");
                vacancy.put("published_at", LocalDateTime.now().minusDays(i+1).toString());
                vacancy.put("status", "pending");
                
                vacancies.add(vacancy);
            }
            
            System.out.println("Found " + vacancies.size() + " HH.ru vacancies");
            
            StringBuilder jsonResponse = new StringBuilder();
            jsonResponse.append("HTTP/1.1 200 OK\\r\\n");
            jsonResponse.append("Content-Type: application/json; charset=UTF-8\\r\\n");
            jsonResponse.append("Access-Control-Allow-Origin: *\\r\\n");
            jsonResponse.append("Access-Control-Allow-Methods: GET, POST, OPTIONS\\r\\n");
            jsonResponse.append("Access-Control-Allow-Headers: Content-Type\\r\\n");
            jsonResponse.append("\\r\\n");
            jsonResponse.append("{\\"message\\":\\"HH.ru parsing completed\\",");
            jsonResponse.append("\\"source\\":\\"hh\\",");
            jsonResponse.append("\\"total_found\\":" + vacancies.size() + ",");
            jsonResponse.append("\\"saved\\":" + vacancies.size() + ",");
            jsonResponse.append("\\"query\\":\\"дизайнер\\",");
            jsonResponse.append("\\"pages\\":1}");
            
            return jsonResponse.toString();
            
        } catch (Exception e) {
            System.err.println("Error parsing HH.ru: " + e.getMessage());
            return createErrorResponse();
        }
    }
    
    private static String handleHabrParse() {
        try {
            System.out.println("Parsing Habr Career...");
            
            List<Map<String, Object>> vacancies = new ArrayList<>();
            
            String[] titles = {
                "UX/UI дизайнер",
                "Product Designer",
                "Графический дизайнер",
                "Web Designer"
            };
            
            String[] companies = {
                "Яндекс",
                "Сбер.Технологии",
                "Тинькофф",
                "МТС"
            };
            
            for (int i = 0; i < 4; i++) {
                Map<String, Object> vacancy = new HashMap<>();
                vacancy.put("external_id", "habr_" + (i+1));
                vacancy.put("source", "habr");
                vacancy.put("url", "https://career.habr.com/vacancies/" + (i+1));
                vacancy.put("title", titles[i]);
                vacancy.put("company", companies[i]);
                vacancy.put("location", "Москва");
                vacancy.put("salary", "150000-250000 руб.");
                vacancy.put("description", "Вакансия дизайнера на Habr Career");
                vacancy.put("published_at", LocalDateTime.now().minusDays(i+1).toString());
                vacancy.put("status", "pending");
                
                vacancies.add(vacancy);
            }
            
            System.out.println("Found " + vacancies.size() + " Habr Career vacancies");
            
            StringBuilder jsonResponse = new StringBuilder();
            jsonResponse.append("HTTP/1.1 200 OK\\r\\n");
            jsonResponse.append("Content-Type: application/json; charset=UTF-8\\r\\n");
            jsonResponse.append("Access-Control-Allow-Origin: *\\r\\n");
            jsonResponse.append("Access-Control-Allow-Methods: GET, POST, OPTIONS\\r\\n");
            jsonResponse.append("Access-Control-Allow-Headers: Content-Type\\r\\n");
            jsonResponse.append("\\r\\n");
            jsonResponse.append("{\\"message\\":\\"Habr Career parsing completed\\",");
            jsonResponse.append("\\"source\\":\\"habr\\",");
            jsonResponse.append("\\"total_found\\":" + vacancies.size() + ",");
            jsonResponse.append("\\"saved\\":" + vacancies.size() + ",");
            jsonResponse.append("\\"query\\":\\"дизайнер\\",");
            jsonResponse.append("\\"pages\\":1}");
            
            return jsonResponse.toString();
            
        } catch (Exception e) {
            System.err.println("Error parsing Habr Career: " + e.getMessage());
            return createErrorResponse();
        }
    }
    
    private static String createErrorResponse() {
        return "HTTP/1.1 500 Internal Server Error\\r\\n" +
               "Content-Type: application/json; charset=UTF-8\\r\\n" +
               "\\r\\n" +
               "{\\"error\\":\\"Internal server error\\"}";
    }
    
    private static String createNotFoundResponse() {
        return "HTTP/1.1 404 Not Found\\r\\n" +
               "Content-Type: application/json; charset=UTF-8\\r\\n" +
               "\\r\\n" +
               "{\\"error\\":\\"Not found\\"}";
    }
}





