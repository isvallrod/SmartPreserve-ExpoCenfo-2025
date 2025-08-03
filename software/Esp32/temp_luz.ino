#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

// === WiFi ===
const char* ssid = "Vargas";
const char* password = "Carlos-96";

// === URL del servidor ===
const char* serverUrl = "https://v0-esp32-to-web-page.vercel.app/api/sensor-data";

// === Pines de sensores ===
#define DHTPIN 32         // Pin del DHT11
#define DHTTYPE DHT11     // Tipo de sensor
#define LIGHT_SENSOR_PIN 34  // Pin analógico para sensor de luz

DHT dht(DHTPIN, DHTTYPE); // Objeto del sensor DHT

void setup() {
    Serial.begin(115200);
    dht.begin();

    WiFi.begin(ssid, password);
    Serial.print("Conectando a WiFi...");
    
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\n✅ ¡Conectado a WiFi!");
    Serial.print("Dirección IP: ");
    Serial.println(WiFi.localIP());
}

void loop() {
    // === Leer sensores ===
    float temperatura = dht.readTemperature(); // °C
    float humedad = dht.readHumidity();
    int luz_raw = analogRead(LIGHT_SENSOR_PIN);
    int luz_invertida = 4095 - luz_raw;

    // Verificar errores
    if (isnan(temperatura) || isnan(humedad)) {
        Serial.println("❌ Error al leer el sensor DHT11.");
        delay(2000);
        return;
    }

    // Mostrar datos en Serial
    Serial.print("🌡️ Temp: ");
    Serial.print(temperatura);
    Serial.print(" °C\t💧 Hum: ");
    Serial.print(humedad);
    Serial.print(" %\t💡 Luz: ");
    Serial.println(luz_invertida);

    // === Enviar datos al servidor ===
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        http.begin(serverUrl);
        http.addHeader("Content-Type", "application/json");

        // Enviar los tres valores: temperatura, humedad y luz
        String jsonBody = "{";
        jsonBody += "\"temperatura\":" + String(temperatura, 2) + ",";
        jsonBody += "\"humedad\":" + String(humedad, 2) + ",";
        jsonBody += "\"luz\":" + String(luz_invertida);
        jsonBody += "}";

        int httpCode = http.POST(jsonBody);
        String response = http.getString(); // Agregar esta línea

        if (httpCode == HTTP_CODE_OK) {
            Serial.println("✅ Datos enviados correctamente al servidor.");
            Serial.println("Respuesta: " + response); // Agregar esta línea
            
        } else {
            Serial.println("❌ Error en el envío. Código HTTP: " + String(httpCode));
            Serial.println("Respuesta del servidor: " + response); // Agregar esta línea
        }

        http.end();
    } else {
        Serial.println("⚠️ WiFi desconectado. No se enviaron datos.");
    }


    delay(5000); // Espera entre lecturas/envíos
}
