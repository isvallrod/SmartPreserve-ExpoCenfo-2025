#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// Configuración WiFi
const char* ssid = "TU_WIFI_SSID";
const char* password = "TU_WIFI_PASSWORD";

// URL de tu aplicación Vercel
const char* serverURL = "https://tu-app.vercel.app";

// Configuración DHT11
#define DHT_PIN 4
#define DHT_TYPE DHT11
DHT dht(DHT_PIN, DHT_TYPE);

// Configuración LDR
#define LDR_PIN A0

// Configuración LEDs
#define LED_GREEN_PIN 2   // LED Verde - Temperatura óptima
#define LED_YELLOW_PIN 5  // LED Amarillo - Advertencia
#define LED_RED_PIN 18    // LED Rojo - Crítico

// Variables globales
unsigned long lastSensorRead = 0;
unsigned long lastLedCheck = 0;
const unsigned long SENSOR_INTERVAL = 3000;  // Leer sensores cada 3 segundos
const unsigned long LED_INTERVAL = 2000;     // Consultar LEDs cada 2 segundos

void setup() {
  Serial.begin(115200);
  
  // Inicializar DHT11
  dht.begin();
  
  // Configurar pines de LEDs como salida
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_YELLOW_PIN, OUTPUT);
  pinMode(LED_RED_PIN, OUTPUT);
  
  // Apagar todos los LEDs al inicio
  digitalWrite(LED_GREEN_PIN, LOW);
  digitalWrite(LED_YELLOW_PIN, LOW);
  digitalWrite(LED_RED_PIN, LOW);
  
  // Conectar a WiFi
  WiFi.begin(ssid, password);
  Serial.print("Conectando a WiFi");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.println("WiFi conectado!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
  
  // Parpadeo inicial de LEDs para indicar conexión exitosa
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_GREEN_PIN, HIGH);
    digitalWrite(LED_YELLOW_PIN, HIGH);
    digitalWrite(LED_RED_PIN, HIGH);
    delay(200);
    digitalWrite(LED_GREEN_PIN, LOW);
    digitalWrite(LED_YELLOW_PIN, LOW);
    digitalWrite(LED_RED_PIN, LOW);
    delay(200);
  }
  
  Serial.println("Sistema iniciado - Monitoreo de conservación de alimentos");
}

void loop() {
  unsigned long currentTime = millis();
  
  // Leer sensores y enviar datos
  if (currentTime - lastSensorRead >= SENSOR_INTERVAL) {
    readSensorsAndSend();
    lastSensorRead = currentTime;
  }
  
  // Consultar estado de LEDs
  if (currentTime - lastLedCheck >= LED_INTERVAL) {
    updateLEDs();
    lastLedCheck = currentTime;
  }
  
  delay(100);
}

void readSensorsAndSend() {
  // Leer DHT11
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  
  // Leer LDR
  int lightLevel = analogRead(LDR_PIN);
  
  // Verificar si las lecturas son válidas
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("Error leyendo DHT11!");
    return;
  }
  
  // Mostrar datos en Serial Monitor
  Serial.println("=== DATOS SENSORES ===");
  Serial.printf("Temperatura: %.1f°C\n", temperature);
  Serial.printf("Humedad: %.1f%%\n", humidity);
  Serial.printf("Luz: %d\n", lightLevel);
  Serial.println("=====================");
  
  // Enviar datos al servidor
  sendSensorData(temperature, humidity, lightLevel);
}

void sendSensorData(float temp, float hum, int light) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(String(serverURL) + "/api/sensor-data");
    http.addHeader("Content-Type", "application/json");
    
    // Crear JSON con los datos
    StaticJsonDocument<200> doc;
    doc["temperatura"] = temp;
    doc["humedad"] = hum;
    doc["luz"] = light;
    doc["voltage"] = 3.3; // Voltaje fijo para ESP32
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    Serial.println("Enviando datos: " + jsonString);
    
    int httpResponseCode = http.POST(jsonString);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.printf("Respuesta HTTP: %d\n", httpResponseCode);
      Serial.println("Respuesta: " + response);
    } else {
      Serial.printf("Error HTTP: %d\n", httpResponseCode);
    }
    
    http.end();
  } else {
    Serial.println("WiFi desconectado!");
  }
}

void updateLEDs() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(String(serverURL) + "/api/led-control");
    
    int httpResponseCode = http.PUT(); // Usar PUT para consultar estado
    
    if (httpResponseCode == 200) {
      String response = http.getString();
      
      // Parsear respuesta JSON
      StaticJsonDocument<300> doc;
      DeserializationError error = deserializeJson(doc, response);
      
      if (!error) {
        int greenState = doc["green"];
        int yellowState = doc["yellow"];
        int redState = doc["red"];
        String status = doc["status"];
        
        // Actualizar LEDs
        digitalWrite(LED_GREEN_PIN, greenState ? HIGH : LOW);
        digitalWrite(LED_YELLOW_PIN, yellowState ? HIGH : LOW);
        digitalWrite(LED_RED_PIN, redState ? HIGH : LOW);
        
        // Mostrar estado en Serial Monitor
        Serial.println("=== ESTADO LEDs ===");
        Serial.printf("Verde: %s\n", greenState ? "ON" : "OFF");
        Serial.printf("Amarillo: %s\n", yellowState ? "ON" : "OFF");
        Serial.printf("Rojo: %s\n", redState ? "ON" : "OFF");
        Serial.printf("Estado: %s\n", status.c_str());
        Serial.println("==================");
        
      } else {
        Serial.println("Error parseando JSON de LEDs");
      }
    } else {
      Serial.printf("Error consultando LEDs: %d\n", httpResponseCode);
    }
    
    http.end();
  }
}
