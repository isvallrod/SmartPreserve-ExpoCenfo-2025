# SmartPreserve ExpoCenfo 2025

## Descripción del Proyecto

**SmartPreserve Edge** es un sistema IoT basado en microcontroladores que utiliza sensores, lógica generada por modelos de lenguaje (LLMs) y componentes físicos para monitorear y preservar alimentos perecederos en comercios pequeños como carnicerías, supermercados o panaderías.

Este proyecto propone una arquitectura `Computing at the Edge` capaz de detectar condiciones críticas de almacenamiento (como temperatura, humedad, iluminación o gases) y tomar acciones físicas inmediatas como activar ventiladores, emitir alarmas, ajustar limites o mostrar mensajes en pantalla.

---

## Equipo

- **Integrante 1:** Carlos Andrey Naranjo Arias – Programación del microcontrolador, conexión de sensores y montaje de los circuitos
- **Integrante 2:** Maria Isabel Vallejos Rodriguez – Backend, conexión con LLM, despliegue en la nube

---

## Objetivos

### Objetivo General
Desarrollar un sistema IoT inteligente que monitorice el estado de alimentos almacenados y ejecute acciones físicas o recomendaciones automáticas usando un LLM.

### Objetivos Específicos
- Implementar una red de sensores (temperatura, humedad, iluminación, gases).
- Integrar la IdeaBoard con un backend conectado a un LLM.
- Ejecutar acciones físicas desde el ESP32 según las respuestas JSON del LLM.
- Usar elementos físicos para seleccionar los productos almacenados.
- Evaluar el sistema en un entorno real simulado.

---

## Requisitos Iniciales

- Detectar condiciones críticas de almacenamiento.
- Enviar datos al backend y recibir respuestas estructuradas del LLM.
- Activar componentes físicos como buzzer, ventilador o pantalla.
- Modificar la lógica automáticamente según las mediciones tomadas.
- Registrar eventos para auditoría.

---

## Diseño Preliminar del Sistema

### Arquitectura MCP

### Componentes

- **Microcontrolador:** IdeaBoard ESP32
- **Sensores:** Temperatura, humedad, luz
- **Actuadores:** TBD
- **Interacción:** TBD
- **LLM:** V0
- **Backend:** TBD
- **Firmware:** CircuitPython

---

## Plan de Trabajo

| Semana | Actividad                                            | Responsable      |
|--------|------------------------------------------------------|------------------|
| 1      | Lectura de sensores con IdeaBoard                    | Integrante 2     |
| 1-2    | Desarrollo de backend y conexión con LLM             | Integrante 1     |
| 2      | Comunicación bidireccional ESP32 - API               | Ambos            |
| 3      | Implementación de lógica dinámica (`logica_nueva`)   | Ambos            |
| 3      | Montaje físico del sistema                           | Integrante 2     |
| 4      | Pruebas y ajustes finales                            | Ambos            |

---

## Riesgos y Mitigaciones

- **Riesgo:** Conexión WiFi inestable  
  **Mitigación:** Buffer local con reintentos automáticos

- **Riesgo:** JSON no válido desde el LLM  
  **Mitigación:** Validación en backend y fallback local

- **Riesgo:** Lectura erronea de los sensores  
  **Mitigación:** Validación con medición con otro sensor equivalente

---

## Prototipo Inicial


---

## 📷 Evidencia Visual

---