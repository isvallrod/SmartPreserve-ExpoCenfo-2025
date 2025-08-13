#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// === CONFIGURACIÓN DE WIFI ===
const char* ssid = "Vargas";      // Nombre de tu red WiFi
const char* password = "Contra";   // Contraseña de tu red WiFi

// === URLs DEL SERVIDOR VERCEL ===
const char* sensorUrl = "https://v0-esp32-to-web-page.vercel.app/api/sensor-data";  // Endpoint para enviar datos de sensores
const char* ledUrl = "https://v0-esp32-to-web-page.vercel.app/api/led-control";     // Endpoint para consultar estado de LEDs

// === CONFIGURACIÓN DE PINES DE SENSORES ===
#define DHTPIN 32         // Pin digital donde está conectado el DHT11
#define DHTTYPE DHT11     // Tipo de sensor DHT (DHT11, DHT22, etc.)
#define LIGHT_SENSOR_PIN 34  // Pin analógico para el sensor de luz (LDR)

// === CONFIGURACIÓN DE PINES DE LEDs ===
// Estos pines deben coincidir con tu conexión física
#define LED_GREEN_PIN 4   // LED Verde - Indica temperatura óptima
#define LED_YELLOW_PIN 5  // LED Amarillo - Indica advertencia
#define LED_RED_PIN 18    // LED Rojo - Indica estado crítico

// Crear objeto del sensor DHT
DHT dht(DHTPIN, DHTTYPE);

// === VARIABLES DE CONTROL DE TIEMPO ===
// Usamos estas variables para controlar cuándo ejecutar cada tarea
unsigned long lastSensorRead = 0;     // Última vez que leímos los sensores
unsigned long lastLedCheck = 0;       // Última vez que consultamos el estado de LEDs
const unsigned long SENSOR_INTERVAL = 5000;  // Leer sensores cada 5 segundos (5000ms)
const unsigned long LED_INTERVAL = 3000;     // Consultar LEDs cada 3 segundos (3000ms)

/**
 * FUNCIÓN SETUP - Se ejecuta una sola vez al iniciar el ESP32
 * Aquí configuramos todo lo necesario: WiFi, pines, sensores, etc.
 */
void setup() {
  // Inicializar comunicación serie a 115200 baudios para debug
  Serial.begin(115200);
  
  // Inicializar el sensor DHT11
  dht.begin();
  
  // === CONFIGURAR PINES DE LEDs COMO SALIDA ===
  pinMode(LED_GREEN_PIN, OUTPUT);   // Pin 4 como salida
  pinMode(LED_YELLOW_PIN, OUTPUT);  // Pin 5 como salida
  pinMode(LED_RED_PIN, OUTPUT);     // Pin 18 como salida
  
  // === APAGAR TODOS LOS LEDs AL INICIO ===
  digitalWrite(LED_GREEN_PIN, LOW);   // LED verde apagado
  digitalWrite(LED_YELLOW_PIN, LOW);  // LED amarillo apagado
  digitalWrite(LED_RED_PIN, LOW);     // LED rojo apagado
  
  // Mostrar configuración de pines en el Serial Monitor
  Serial.println("🚦 Configuración de LEDs:");
  Serial.printf("🟢 LED Verde: Pin %d\n", LED_GREEN_PIN);
  Serial.printf("🟡 LED Amarillo: Pin %d\n", LED_YELLOW_PIN);
  Serial.printf("🔴 LED Rojo: Pin %d\n", LED_RED_PIN);
  
  // === CONECTAR A WIFI ===
  WiFi.begin(ssid, password);
  Serial.print("Conectando a WiFi...");
      
  // Esperar hasta que se conecte al WiFi
  while (WiFi.status() != WL_CONNECTED) {
      delay(500);
      Serial.print(".");  // Mostrar progreso de conexión
  }
  
  // Mostrar información de conexión exitosa
  Serial.println("\n✅ ¡Conectado a WiFi!");
  Serial.print("Dirección IP: ");
  Serial.println(WiFi.localIP());
  
  // === PRUEBA INICIAL DE LEDs ===
  // Parpadear todos los LEDs para confirmar que funcionan
  Serial.println("🚦 Probando LEDs en pines 4, 5 y 18...");
  for (int i = 0; i < 3; i++) {
      // Encender todos los LEDs
      digitalWrite(LED_GREEN_PIN, HIGH);   // Pin 4
      digitalWrite(LED_YELLOW_PIN, HIGH);  // Pin 5
      digitalWrite(LED_RED_PIN, HIGH);     // Pin 18
      delay(300);
      
      // Apagar todos los LEDs
      digitalWrite(LED_GREEN_PIN, LOW);
      digitalWrite(LED_YELLOW_PIN, LOW);
      digitalWrite(LED_RED_PIN, LOW);
      delay(300);
  }
  
  // Mensajes informativos
  Serial.println("🧊 Sistema de conservación de alimentos iniciado");
  Serial.println("📡 Esperando configuración de alimento desde el chat...");
}

/**
 * FUNCIÓN LOOP - Se ejecuta continuamente después del setup()
 * Aquí manejamos las tareas principales: leer sensores y actualizar LEDs
 */
void loop() {
  unsigned long currentTime = millis();  // Tiempo actual en milisegundos
  
  // === LEER SENSORES Y ENVIAR DATOS ===
  // Solo ejecutar si ha pasado el tiempo suficiente (SENSOR_INTERVAL)
  if (currentTime - lastSensorRead >= SENSOR_INTERVAL) {
      readSensorsAndSend();
      lastSensorRead = currentTime;  // Actualizar timestamp
  }
  
  // === CONSULTAR ESTADO DE LEDs ===
  // Solo ejecutar si ha pasado el tiempo suficiente (LED_INTERVAL)
  if (currentTime - lastLedCheck >= LED_INTERVAL) {
      updateLEDs();
      lastLedCheck = currentTime;  // Actualizar timestamp
  }
  
  delay(100);  // Pequeña pausa para no saturar el procesador
}

/**
 * FUNCIÓN PARA LEER SENSORES Y ENVIAR DATOS AL SERVIDOR
 * Lee DHT11 (temperatura y humedad) y LDR (luz), luego envía los datos vía HTTP POST
 */
void readSensorsAndSend() {
  // === LEER SENSORES ===
  float temperatura = dht.readTemperature(); // Leer temperatura en grados Celsius
  float humedad = dht.readHumidity();        // Leer humedad relativa en porcentaje
  
  // Leer sensor de luz (LDR)
  int luz_raw = analogRead(LIGHT_SENSOR_PIN);  // Valor crudo del ADC (0-4095)
  int luz_invertida = 4095 - luz_raw;          // Invertir valor (más luz = mayor número)
  
  // Verificar si las lecturas del DHT11 son válidas
  if (isnan(temperatura) || isnan(humedad)) {
      Serial.println("❌ Error al leer el sensor DHT11.");
      return;  // Salir de la función si hay error
  }
  
  // === MOSTRAR DATOS EN SERIAL MONITOR ===
  Serial.println("=== 📊 DATOS SENSORES ===");
  Serial.printf("🌡️ Temperatura: %.1f°C\n", temperatura);
  Serial.printf("💧 Humedad: %.1f%%\n", humedad);
  Serial.printf("💡 Luz: %d\n", luz_invertida);
  Serial.println("========================");
  
  // === ENVIAR DATOS AL SERVIDOR ===
  if (WiFi.status() == WL_CONNECTED) {  // Verificar que WiFi esté conectado
      HTTPClient http;
      http.begin(sensorUrl);  // Configurar URL del endpoint
      http.addHeader("Content-Type", "application/json");  // Especificar tipo de contenido JSON
      
      // === CREAR JSON CON LOS DATOS ===
      // Construir string JSON manualmente (alternativa a ArduinoJson para envío)
      String jsonBody = "{";
      jsonBody += "\"temperatura\":" + String(temperatura, 2) + ",";  // 2 decimales
      jsonBody += "\"humedad\":" + String(humedad, 2) + ",";          // 2 decimales
      jsonBody += "\"luz\":" + String(luz_invertida);                 // Entero
      jsonBody += "}";
      
      Serial.println("📤 Enviando: " + jsonBody);
      
      // === REALIZAR PETICIÓN HTTP POST ===
      int httpCode = http.POST(jsonBody);
      String response = http.getString();
      
      // Verificar respuesta del servidor
      if (httpCode == HTTP_CODE_OK) {  // HTTP 200 OK
          Serial.println("✅ Datos enviados correctamente");
      } else {
          Serial.printf("❌ Error HTTP: %d\n", httpCode);
          Serial.println("Respuesta: " + response);
      }
      
      http.end();  // Cerrar conexión HTTP
  } else {
      Serial.println("⚠️ WiFi desconectado");
  }
}

/**
 * FUNCIÓN PARA ACTUALIZAR EL ESTADO DE LOS LEDs
 * Consulta el servidor para obtener qué LEDs deben estar encendidos
 * basado en el tipo de alimento seleccionado y la temperatura actual
 */
void updateLEDs() {
  if (WiFi.status() == WL_CONNECTED) {  // Verificar conexión WiFi
      HTTPClient http;
      http.begin(ledUrl);  // Configurar URL del endpoint de LEDs
      
      Serial.println("🔍 Consultando estado de LEDs...");
      
      // === REALIZAR PETICIÓN HTTP GET ===
      // Usamos GET para consultar el estado actual de los LEDs
      int httpCode = http.GET();
      
      if (httpCode == 200) {  // HTTP 200 OK
          String response = http.getString();
          
          // Mostrar respuesta cruda para debugging
          Serial.println("📥 Raw JSON Response from Server: " + response);
          Serial.println("📥 Respuesta del servidor: " + response);
          
          // === PARSEAR RESPUESTA JSON ===
          StaticJsonDocument<400> doc;  // Crear documento JSON con capacidad para 400 bytes
          DeserializationError error = deserializeJson(doc, response);
          
          if (!error) {  // Si el parsing fue exitoso
              // === EXTRAER VALORES DEL JSON ANIDADO ===
              // La respuesta tiene formato: {"success": true, "ledState": {...}, "green": 1, ...}
              // Intentamos acceder tanto al formato anidado como al plano
              int greenState = doc["ledState"]["green"].as<int>();
              int yellowState = doc["ledState"]["yellow"].as<int>();
              int redState = doc["ledState"]["red"].as<int>();
              String status = doc["ledState"]["status"].as<String>();
              String foodType = doc["ledState"]["foodType"].as<String>();
              float temperature = doc["ledState"]["temperature"].as<float>();

              // === MOSTRAR VALORES PARSEADOS PARA DEBUG ===
              Serial.println("🔍 Valores parseados por ESP32:");
              Serial.printf("   greenState: %d\n", greenState);
              Serial.printf("   yellowState: %d\n", yellowState);
              Serial.printf("   redState: %d\n", redState);
              Serial.printf("   status: '%s'\n", status.c_str());
              Serial.printf("   foodType: '%s'\n", foodType.c_str());
              Serial.printf("   temperature: %.1f\n", temperature);
              
              // === ACTUALIZAR LEDs FÍSICOS ===
              // Convertir 1/0 a HIGH/LOW y escribir a los pines
              digitalWrite(LED_GREEN_PIN, greenState ? HIGH : LOW);    // Pin 4
              digitalWrite(LED_YELLOW_PIN, yellowState ? HIGH : LOW);  // Pin 5
              digitalWrite(LED_RED_PIN, redState ? HIGH : LOW);        // Pin 18
              
              // === MOSTRAR ESTADO DETALLADO ===
              Serial.println("=== 🚦 ESTADO LEDs ACTUALIZADO ===");
              Serial.printf("🟢 Verde: %s (Pin %d)\n", greenState ? "ENCENDIDO" : "APAGADO", LED_GREEN_PIN);
              Serial.printf("🟡 Amarillo: %s (Pin %d)\n", yellowState ? "ENCENDIDO" : "APAGADO", LED_YELLOW_PIN);
              Serial.printf("🔴 Rojo: %s (Pin %d)\n", redState ? "ENCENDIDO" : "APAGADO", LED_RED_PIN);
              Serial.printf("📊 Estado: %s\n", status.c_str());
              Serial.printf("🍽️ Alimento: %s\n", foodType.c_str());
              Serial.printf("🌡️ Temperatura: %.1f°C\n", temperature);
              Serial.println("=================================");
              
              // === VERIFICACIÓN FÍSICA DE LEDs ===
              // Leer el estado actual de los pines para confirmar
              Serial.println("🔍 VERIFICACIÓN FÍSICA:");
              Serial.printf("   Pin 4 (Verde): %s\n", digitalRead(LED_GREEN_PIN) ? "HIGH" : "LOW");
              Serial.printf("   Pin 5 (Amarillo): %s\n", digitalRead(LED_YELLOW_PIN) ? "HIGH" : "LOW");
              Serial.printf("   Pin 18 (Rojo): %s\n", digitalRead(LED_RED_PIN) ? "HIGH" : "LOW");
              
              // === EFECTO ESPECIAL PARA ESTADO CRÍTICO ===
              if (redState && status == "CRITICAL") {
                  Serial.println("🚨 ALERTA CRÍTICA - Parpadeo rápido LED rojo (Pin 18)");
                  // Hacer parpadear el LED rojo rápidamente para llamar la atención
                  for (int i = 0; i < 3; i++) {
                      digitalWrite(LED_RED_PIN, LOW);
                      delay(100);
                      digitalWrite(LED_RED_PIN, HIGH);
                      delay(100);
                  }
              }
              
              // === INFORMACIÓN DE DIAGNÓSTICO ===
              if (status == "UNKNOWN" || foodType == "No configurado") {
                  Serial.println("⚠️ ESPERANDO CONFIGURACIÓN:");
                  Serial.println("   1. Abrir el chat en la página web");
                  Serial.println("   2. Escribir: 'Seleccionar [tipo de alimento]'");
                  Serial.println("   3. Los LEDs se activarán automáticamente");
                  Serial.println("   4. Verificar que los LEDs estén conectados a:");
                  Serial.println("      - Pin 4 (Verde)");
                  Serial.println("      - Pin 5 (Amarillo)");
                  Serial.println("      - Pin 18 (Rojo)");
              }
              
          } else {
              // === ERROR AL PARSEAR JSON ===
              Serial.println("❌ Error parseando JSON de LEDs");
              Serial.println("Detalle del error: " + String(error.c_str()));
              Serial.println("Respuesta recibida: " + response);
              
              // Parpadear LED amarillo para indicar error de parsing
              digitalWrite(LED_YELLOW_PIN, HIGH);
              delay(200);
              digitalWrite(LED_YELLOW_PIN, LOW);
          }
      } else {
          // === ERROR HTTP ===
          Serial.printf("❌ Error HTTP consultando LEDs: %d\n", httpCode);
          
          // Parpadear LED amarillo para indicar error HTTP
          digitalWrite(LED_YELLOW_PIN, HIGH);
          delay(200);
          digitalWrite(LED_YELLOW_PIN, LOW);
      }
      
      http.end();  // Cerrar conexión HTTP
  } else {
      // === WIFI DESCONECTADO ===
      Serial.println("⚠️ WiFi desconectado - No se pueden actualizar LEDs");
      
      // Parpadear todos los LEDs para indicar desconexión WiFi
      digitalWrite(LED_GREEN_PIN, HIGH);   // Pin 4
      digitalWrite(LED_YELLOW_PIN, HIGH);  // Pin 5
      digitalWrite(LED_RED_PIN, HIGH);     // Pin 18
      delay(100);
      digitalWrite(LED_GREEN_PIN, LOW);
      digitalWrite(LED_YELLOW_PIN, LOW);
      digitalWrite(LED_RED_PIN, LOW);
  }
}
