#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// === WiFi ===
const char* ssid = "Vargas";
const char* password = "Contra";

// === URLs del servidor ===
const char* sensorUrl = "https://v0-esp32-to-web-page.vercel.app/api/sensor-data";
const char* ledUrl = "https://v0-esp32-to-web-page.vercel.app/api/led-control";

// === Pines de sensores ===
#define DHTPIN 32         // Pin del DHT11
#define DHTTYPE DHT11     // Tipo de sensor
#define LIGHT_SENSOR_PIN 34  // Pin analógico para sensor de luz

// === Pines de LEDs ===
#define LED_GREEN_PIN 2   // LED Verde - Temperatura óptima
#define LED_YELLOW_PIN 5  // LED Amarillo - Advertencia
#define LED_RED_PIN 18    // LED Rojo - Crítico

DHT dht(DHTPIN, DHTTYPE); // Objeto del sensor DHT

// === Variables de control de tiempo ===
unsigned long lastSensorRead = 0;
unsigned long lastLedCheck = 0;
const unsigned long SENSOR_INTERVAL = 5000;  // Leer sensores cada 5 segundos
const unsigned long LED_INTERVAL = 3000;     // Consultar LEDs cada 3 segundos

void setup() {
  Serial.begin(115200);
  dht.begin();
  
  // === Configurar pines de LEDs como salida ===
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_YELLOW_PIN, OUTPUT);
  pinMode(LED_RED_PIN, OUTPUT);
  
  // === Apagar todos los LEDs al inicio ===
  digitalWrite(LED_GREEN_PIN, LOW);
  digitalWrite(LED_YELLOW_PIN, LOW);
  digitalWrite(LED_RED_PIN, LOW);
  
  // === Conectar a WiFi ===
  WiFi.begin(ssid, password);
  Serial.print("Conectando a WiFi...");
      
  while (WiFi.status() != WL_CONNECTED) {
      delay(500);
      Serial.print(".");
  }
  
  Serial.println("\n✅ ¡Conectado a WiFi!");
  Serial.print("Dirección IP: ");
  Serial.println(WiFi.localIP());
  
  // === Parpadeo inicial de LEDs para indicar conexión exitosa ===
  Serial.println("🚦 Probando LEDs...");
  for (int i = 0; i < 3; i++) {
      digitalWrite(LED_GREEN_PIN, HIGH);
      digitalWrite(LED_YELLOW_PIN, HIGH);
      digitalWrite(LED_RED_PIN, HIGH);
      delay(300);
      digitalWrite(LED_GREEN_PIN, LOW);
      digitalWrite(LED_YELLOW_PIN, LOW);
      digitalWrite(LED_RED_PIN, LOW);
      delay(300);
  }
  
  Serial.println("🧊 Sistema de conservación de alimentos iniciado");
  Serial.println("📡 Esperando configuración de alimento desde el chat...");
}

void loop() {
  unsigned long currentTime = millis();
  
  // === Leer sensores y enviar datos ===
  if (currentTime - lastSensorRead >= SENSOR_INTERVAL) {
      readSensorsAndSend();
      lastSensorRead = currentTime;
  }
  
  // === Consultar estado de LEDs ===
  if (currentTime - lastLedCheck >= LED_INTERVAL) {
      updateLEDs();
      lastLedCheck = currentTime;
  }
  
  delay(100);
}

void readSensorsAndSend() {
  // === Leer sensores ===
  float temperatura = dht.readTemperature(); // °C
  float humedad = dht.readHumidity();
  int luz_raw = analogRead(LIGHT_SENSOR_PIN);
  int luz_invertida = 4095 - luz_raw;
  
  // Verificar errores
  if (isnan(temperatura) || isnan(humedad)) {
      Serial.println("❌ Error al leer el sensor DHT11.");
      return;
  }
  
  // Mostrar datos en Serial
  Serial.println("=== 📊 DATOS SENSORES ===");
  Serial.printf("🌡️ Temperatura: %.1f°C\n", temperatura);
  Serial.printf("💧 Humedad: %.1f%%\n", humedad);
  Serial.printf("💡 Luz: %d\n", luz_invertida);
  Serial.println("========================");
  
  // === Enviar datos al servidor ===
  if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(sensorUrl);
      http.addHeader("Content-Type", "application/json");
      
      // Crear JSON con los datos
      String jsonBody = "{";
      jsonBody += "\"temperatura\":" + String(temperatura, 2) + ",";
      jsonBody += "\"humedad\":" + String(humedad, 2) + ",";
      jsonBody += "\"luz\":" + String(luz_invertida);
      jsonBody += "}";
      
      Serial.println("📤 Enviando: " + jsonBody);
      
      int httpCode = http.POST(jsonBody);
      String response = http.getString();
      
      if (httpCode == HTTP_CODE_OK) {
          Serial.println("✅ Datos enviados correctamente");
      } else {
          Serial.printf("❌ Error HTTP: %d\n", httpCode);
          Serial.println("Respuesta: " + response);
      }
      
      http.end();
  } else {
      Serial.println("⚠️ WiFi desconectado");
  }
}

void updateLEDs() {
  if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(ledUrl);
      
      Serial.println("🔍 Consultando estado de LEDs...");
      
      // Usar método PUT para consultar estado de LEDs
      int httpCode = http.PUT();
      
      if (httpCode == 200) {
          String response = http.getString();
          Serial.println("📥 Respuesta del servidor: " + response);
          
          // Parsear respuesta JSON
          StaticJsonDocument<400> doc;
          DeserializationError error = deserializeJson(doc, response);
          
          if (!error) {
              int greenState = doc["green"];
              int yellowState = doc["yellow"];
              int redState = doc["red"];
              String status = doc["status"];
              String foodType = doc["foodType"] | "No configurado";
              float temperature = doc["temperature"] | 0.0;
              
              // === Actualizar LEDs físicos ===
              digitalWrite(LED_GREEN_PIN, greenState ? HIGH : LOW);
              digitalWrite(LED_YELLOW_PIN, yellowState ? HIGH : LOW);
              digitalWrite(LED_RED_PIN, redState ? HIGH : LOW);
              
              // === Mostrar estado detallado en Serial Monitor ===
              Serial.println("=== 🚦 ESTADO LEDs ACTUALIZADO ===");
              Serial.printf("🟢 Verde: %s (Pin %d)\n", greenState ? "ENCENDIDO" : "APAGADO", LED_GREEN_PIN);
              Serial.printf("🟡 Amarillo: %s (Pin %d)\n", yellowState ? "ENCENDIDO" : "APAGADO", LED_YELLOW_PIN);
              Serial.printf("🔴 Rojo: %s (Pin %d)\n", redState ? "ENCENDIDO" : "APAGADO", LED_RED_PIN);
              Serial.printf("📊 Estado: %s\n", status.c_str());
              Serial.printf("🍽️ Alimento: %s\n", foodType.c_str());
              Serial.printf("🌡️ Temperatura: %.1f°C\n", temperature);
              Serial.println("=================================");
              
              // === Efecto visual adicional para estado crítico ===
              if (redState && status == "CRITICAL") {
                  Serial.println("🚨 ALERTA CRÍTICA - Parpadeo rápido LED rojo");
                  // Parpadeo rápido del LED rojo para alerta crítica
                  for (int i = 0; i < 3; i++) {
                      digitalWrite(LED_RED_PIN, LOW);
                      delay(100);
                      digitalWrite(LED_RED_PIN, HIGH);
                      delay(100);
                  }
              }
              
              // === Información de diagnóstico ===
              if (status == "UNKNOWN" || foodType == "No configurado") {
                  Serial.println("⚠️ ESPERANDO CONFIGURACIÓN:");
                  Serial.println("   1. Abrir el chat en la página web");
                  Serial.println("   2. Escribir: 'Seleccionar [tipo de alimento]'");
                  Serial.println("   3. Los LEDs se activarán automáticamente");
              }
              
          } else {
              Serial.println("❌ Error parseando JSON de LEDs");
              Serial.println("Respuesta recibida: " + response);
              
              // Parpadear LED amarillo para indicar error de parsing
              digitalWrite(LED_YELLOW_PIN, HIGH);
              delay(200);
              digitalWrite(LED_YELLOW_PIN, LOW);
          }
      } else {
          Serial.printf("❌ Error HTTP consultando LEDs: %d\n", httpCode);
          
          // En caso de error HTTP, parpadear LED amarillo
          digitalWrite(LED_YELLOW_PIN, HIGH);
          delay(200);
          digitalWrite(LED_YELLOW_PIN, LOW);
      }
      
      http.end();
  } else {
      Serial.println("⚠️ WiFi desconectado - No se pueden actualizar LEDs");
      
      // Parpadear todos los LEDs para indicar desconexión WiFi
      digitalWrite(LED_GREEN_PIN, HIGH);
      digitalWrite(LED_YELLOW_PIN, HIGH);
      digitalWrite(LED_RED_PIN, HIGH);
      delay(100);
      digitalWrite(LED_GREEN_PIN, LOW);
      digitalWrite(LED_YELLOW_PIN, LOW);
      digitalWrite(LED_RED_PIN, LOW);
  }
}
