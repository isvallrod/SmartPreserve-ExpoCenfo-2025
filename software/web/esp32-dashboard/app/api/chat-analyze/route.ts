import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// Base de datos de alimentos
const FOOD_DATABASE = {
  carnes: { name: "Carnes Rojas", icon: "🥩", tempMin: -2, tempMax: 4, criticalTemp: 7 },
  pollo: { name: "Pollo y Aves", icon: "🐔", tempMin: -2, tempMax: 2, criticalTemp: 4 },
  pescado: { name: "Pescados y Mariscos", icon: "🐟", tempMin: -2, tempMax: 0, criticalTemp: 2 },
  lacteos: { name: "Productos Lácteos", icon: "🥛", tempMin: 1, tempMax: 4, criticalTemp: 7 },
  quesos_duros: { name: "Quesos Duros", icon: "🧀", tempMin: 2, tempMax: 8, criticalTemp: 12 },
  quesos_blandos: { name: "Quesos Blandos", icon: "🧀", tempMin: 1, tempMax: 4, criticalTemp: 7 },
  embutidos: { name: "Embutidos", icon: "🥓", tempMin: 0, tempMax: 4, criticalTemp: 8 },
  verduras: { name: "Verduras Frescas", icon: "🥬", tempMin: 0, tempMax: 4, criticalTemp: 8 },
  frutas: { name: "Frutas Frescas", icon: "🍎", tempMin: 0, tempMax: 4, criticalTemp: 10 },
}

export async function POST(request: NextRequest) {
  try {
    const { message, sensorData } = await request.json()

    if (!message) {
      return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 })
    }

    console.log("Chat message:", message)
    console.log("Sensor data length:", sensorData?.length || 0)

    // Determinar tipo de consulta
    const queryType = determineQueryType(message)
    console.log("Query type:", queryType)

    let response = ""
    let actionData = null

    switch (queryType) {
      case "food_selection":
        const result = await handleFoodSelection(message, sensorData)
        response = result.response
        actionData = result.actionData
        break
      case "food_analysis":
        response = await handleFoodAnalysis(message, sensorData)
        break
      case "led_control":
        response = await handleLedControl(message, sensorData)
        break
      case "temperature_analysis":
        response = await handleTemperatureAnalysis(message, sensorData)
        break
      case "system_config":
        response = await handleSystemConfig(message, sensorData)
        break
      default:
        response = await handleGeneralQuery(message, sensorData)
    }

    return NextResponse.json({
      response,
      queryType,
      actionData,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Error en chat-analyze:", error)
    return NextResponse.json({
      response: "Lo siento, hubo un error procesando tu consulta. Por favor intenta nuevamente.",
      queryType: "error",
    }, { status: 500 })
  }
}

function determineQueryType(message: string): string {
  const lowerMessage = message.toLowerCase()

  // Selección de alimentos
  if (
    lowerMessage.includes("seleccionar") ||
    lowerMessage.includes("elegir") ||
    lowerMessage.includes("monitorear") ||
    lowerMessage.includes("carne") ||
    lowerMessage.includes("pollo") ||
    lowerMessage.includes("pescado") ||
    lowerMessage.includes("lácteo") ||
    lowerMessage.includes("queso") ||
    lowerMessage.includes("embutido") ||
    lowerMessage.includes("verdura") ||
    lowerMessage.includes("fruta") ||
    lowerMessage.includes("alimento")
  ) {
    return "food_selection"
  }

  // Control de LEDs
  if (
    lowerMessage.includes("led") ||
    lowerMessage.includes("luz") ||
    lowerMessage.includes("verde") ||
    lowerMessage.includes("amarillo") ||
    lowerMessage.includes("rojo") ||
    lowerMessage.includes("alerta")
  ) {
    return "led_control"
  }

  // Análisis de temperatura
  if (
    lowerMessage.includes("temperatura") ||
    lowerMessage.includes("frío") ||
    lowerMessage.includes("caliente") ||
    lowerMessage.includes("grado")
  ) {
    return "temperature_analysis"
  }

  // Análisis de alimentos
  if (
    lowerMessage.includes("seguridad") ||
    lowerMessage.includes("conservación") ||
    lowerMessage.includes("deterioro") ||
    lowerMessage.includes("vida útil")
  ) {
    return "food_analysis"
  }

  // Configuración del sistema
  if (
    lowerMessage.includes("configurar") ||
    lowerMessage.includes("ajustar") ||
    lowerMessage.includes("cambiar") ||
    lowerMessage.includes("sistema")
  ) {
    return "system_config"
  }

  return "general"
}

async function handleFoodSelection(message: string, sensorData: any[]) {
  const lowerMessage = message.toLowerCase()
  let selectedFood = null
  let foodKey = null

  // Detectar tipo de alimento mencionado
  for (const [key, food] of Object.entries(FOOD_DATABASE)) {
    if (lowerMessage.includes(key) || 
        lowerMessage.includes(food.name.toLowerCase()) ||
        (key === "carnes" && (lowerMessage.includes("carne") || lowerMessage.includes("res"))) ||
        (key === "pollo" && (lowerMessage.includes("pollo") || lowerMessage.includes("ave"))) ||
        (key === "lacteos" && lowerMessage.includes("lácteo")) ||
        (key === "verduras" && lowerMessage.includes("verdura")) ||
        (key === "frutas" && lowerMessage.includes("fruta"))) {
      selectedFood = food
      foodKey = key
      break
    }
  }

  const currentTemp = sensorData?.[0]?.temperature || null
  const currentHumidity = sensorData?.[0]?.humidity || null

  if (selectedFood && foodKey) {
    // IMPORTANTE: Configurar LEDs automáticamente con la URL correcta
    let ledUpdateResult = null
    if (currentTemp !== null) {
      try {
        console.log(`🚦 Actualizando LEDs para ${foodKey} con temperatura ${currentTemp}°C`)
        
        const ledResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/led-control`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            foodType: foodKey,
            temperature: currentTemp,
            forceUpdate: true
          })
        })

        ledUpdateResult = await ledResponse.json()
        console.log("🚦 Resultado actualización LEDs:", ledUpdateResult)
        
      } catch (error) {
        console.error("❌ Error updating LEDs:", error)
      }
    }

    const tempStatus = currentTemp !== null ? analyzeTemperatureForFood(currentTemp, selectedFood) : null

    const response = `✅ **${selectedFood.icon} ${selectedFood.name} SELECCIONADO**

**🎯 Configuración Automática Completada:**
• Tipo de alimento: ${selectedFood.name}
• Monitoreo activado para conservación en frío
• LEDs configurados automáticamente
• Rangos de temperatura establecidos

**📊 Condiciones Actuales:**
${currentTemp !== null ? `🌡️ Temperatura: ${currentTemp}°C` : '🌡️ Temperatura: Esperando datos...'}
${currentHumidity !== null ? `💧 Humedad: ${currentHumidity}%` : '💧 Humedad: Esperando datos...'}

**🎯 Rangos Óptimos para ${selectedFood.name}:**
• 🌡️ Temperatura: ${selectedFood.tempMin}°C a ${selectedFood.tempMax}°C
• ⚠️ Temperatura crítica: >${selectedFood.criticalTemp}°C

**🚦 Estado de LEDs:**
${tempStatus ? `• ${tempStatus.ledStatus}` : '• Esperando datos de temperatura...'}
${ledUpdateResult?.success ? '✅ LEDs actualizados correctamente' : '⚠️ Error actualizando LEDs - verificar ESP32'}

**💡 Instrucciones:**
1. Los LEDs se actualizarán automáticamente cada 3 segundos
2. 🟢 Verde = Temperatura óptima
3. 🟡 Amarillo = Advertencia (revisar condiciones)
4. 🔴 Rojo = Crítico (acción inmediata requerida)

${tempStatus?.message ? `**⚠️ Estado Actual:** ${tempStatus.message}` : ''}

**🔧 Debug Info:**
• LED Update Success: ${ledUpdateResult?.success ? 'SÍ' : 'NO'}
• ESP32 debe consultar: /api/led-control (PUT)
• Próxima actualización: 3 segundos

¿Los LEDs del ESP32 se encendieron correctamente?`

    return {
      response,
      actionData: {
        selectedFood: foodKey,
        foodName: selectedFood.name,
        currentTemp,
        tempStatus: tempStatus?.status || 'UNKNOWN',
        ledUpdateResult
      }
    }
  } else {
    // Mostrar opciones disponibles
    const foodOptions = Object.entries(FOOD_DATABASE)
      .map(([key, food]) => `• **${food.icon} ${food.name}** (${food.tempMin}°C a ${food.tempMax}°C)`)
      .join('\n')

    const response = `🍽️ **SELECCIÓN DE ALIMENTO PARA MONITOREO**

**Tipos de alimentos disponibles:**

${foodOptions}

**💬 Ejemplos de comandos:**
• "Quiero monitorear carnes rojas"
• "Seleccionar pollo para conservación"
• "Configurar para quesos duros"
• "Monitorear pescado fresco"

**📊 Condiciones actuales:**
${currentTemp !== null ? `🌡️ Temperatura: ${currentTemp}°C` : '🌡️ Esperando datos de temperatura...'}
${currentHumidity !== null ? `💧 Humedad: ${currentHumidity}%` : '💧 Esperando datos de humedad...'}

¿Qué tipo de alimento quieres monitorear?`

    return { response, actionData: null }
  }
}

async function handleLedControl(message: string, sensorData: any[]) {
  const currentTemp = sensorData?.[0]?.temperature || null

  // Consultar estado actual de LEDs
  let currentLedState = null
  try {
    const ledResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/led-control`, {
      method: "GET"
    })
    const ledData = await ledResponse.json()
    currentLedState = ledData.ledState
  } catch (error) {
    console.error("Error fetching LED state:", error)
  }

  const response = `🚦 **SISTEMA DE CONTROL DE LEDs ESP32**

**Estado actual del sistema:**
• 🌡️ Temperatura: ${currentTemp || 'N/A'}°C
• 🔌 ESP32: ${sensorData?.length > 0 ? 'Conectado' : 'Desconectado'}
• 📡 Última actualización: ${sensorData?.[0]?.timestamp ? new Date(sensorData[0].timestamp).toLocaleTimeString('es-ES') : 'N/A'}

**🚦 Estado Actual de LEDs:**
${currentLedState ? `
• 🟢 LED Verde: ${currentLedState.green ? 'ENCENDIDO' : 'APAGADO'}
• 🟡 LED Amarillo: ${currentLedState.yellow ? 'ENCENDIDO' : 'APAGADO'}  
• 🔴 LED Rojo: ${currentLedState.red ? 'ENCENDIDO' : 'APAGADO'}
• 📊 Estado: ${currentLedState.status}
• 🍽️ Alimento: ${currentLedState.foodType || 'No seleccionado'}
• ⏰ Última actualización: ${new Date(currentLedState.lastUpdate).toLocaleTimeString('es-ES')}
` : '⚠️ No se puede consultar estado de LEDs'}

**🚦 Funcionamiento de LEDs:**
• 🟢 **LED Verde**: Temperatura en rango óptimo para el alimento seleccionado
• 🟡 **LED Amarillo**: Advertencia - temperatura fuera del rango (revisar condiciones)
• 🔴 **LED Rojo**: CRÍTICO - temperatura peligrosa (acción inmediata requerida)

**⚙️ Configuración automática:**
• Los LEDs se actualizan cada 3 segundos
• El ESP32 consulta el estado desde la web
• El control depende del tipo de alimento seleccionado
• Sin alimento seleccionado = LEDs inactivos

**🔧 Diagnóstico ESP32:**
• URL consulta: /api/led-control (método PUT)
• Respuesta esperada: {"green": 0/1, "yellow": 0/1, "red": 0/1}
• Frecuencia: Cada 3 segundos
• Pines: Verde=2, Amarillo=5, Rojo=18

**🔧 Comandos de diagnóstico:**
• "Seleccionar [tipo de alimento]" - Configura LEDs para ese alimento
• "Estado de los LEDs" - Información actual
• "¿Por qué no se encienden los LEDs?" - Diagnóstico avanzado

${!currentTemp ? '⚠️ **Sin datos de temperatura** - Verifica conexión ESP32' : ''}
${!currentLedState ? '⚠️ **Sin estado de LEDs** - Verifica API de control' : ''}

¿Los LEDs físicos del ESP32 coinciden con este estado?`

  return response
}

async function handleTemperatureAnalysis(message: string, sensorData: any[]) {
  if (!sensorData || sensorData.length === 0) {
    return `🌡️ **ANÁLISIS DE TEMPERATURA**

⚠️ **No hay datos de temperatura disponibles**

**Posibles causas:**
• ESP32 desconectado del WiFi
• Sensor DHT11 no funciona correctamente
• Problema en la comunicación con el servidor

**Soluciones:**
1. Verificar conexión WiFi del ESP32
2. Revisar conexiones del sensor DHT11
3. Comprobar que el ESP32 esté enviando datos

**Estado esperado:**
• Datos cada 5 segundos desde ESP32
• Temperatura en rango de cámara frigorífica (-5°C a 15°C)
• Humedad entre 70% y 95%

¿Necesitas ayuda para diagnosticar el problema?`
  }

  const temps = sensorData.map(d => d.temperature).filter(t => t !== null && t !== undefined)
  const currentTemp = temps[0]
  const minTemp = Math.min(...temps)
  const maxTemp = Math.max(...temps)
  const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length

  const response = `🌡️ **ANÁLISIS DETALLADO DE TEMPERATURA**

**📊 Estadísticas actuales:**
• **Temperatura actual:** ${currentTemp?.toFixed(1)}°C
• **Mínima registrada:** ${minTemp?.toFixed(1)}°C
• **Máxima registrada:** ${maxTemp?.toFixed(1)}°C
• **Promedio:** ${avgTemp?.toFixed(1)}°C
• **Registros analizados:** ${temps.length}

**🎯 Evaluación para conservación:**
${evaluateTemperatureForConservation(currentTemp)}

**📈 Tendencia:**
${analyzeTrend(temps.slice(0, 10))}

**🧊 Recomendaciones:**
${getTemperatureRecommendations(currentTemp, avgTemp)}

**⚠️ Alertas:**
${getTemperatureAlerts(currentTemp, maxTemp)}

¿Quieres que analice la temperatura para un tipo específico de alimento?`

  return response
}

async function handleFoodAnalysis(message: string, sensorData: any[]) {
  const currentTemp = sensorData?.[0]?.temperature || null
  const currentHumidity = sensorData?.[0]?.humidity || null

  const prompt = `
Eres un experto en seguridad alimentaria y conservación de alimentos en cámaras frigoríficas.

Consulta del usuario: "${message}"

Datos actuales:
- Temperatura: ${currentTemp}°C
- Humedad: ${currentHumidity}%
- Datos históricos: ${sensorData?.length || 0} registros

Proporciona un análisis profesional sobre seguridad alimentaria, conservación y recomendaciones específicas.
Incluye información sobre riesgos, mejores prácticas y acciones recomendadas.
`

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: prompt,
    temperature: 0.3,
    maxTokens: 600,
  })

  return `🧠 **ANÁLISIS DE SEGURIDAD ALIMENTARIA**

${text}

---
**📊 Datos del sistema:**
• Temperatura actual: ${currentTemp || 'N/A'}°C
• Humedad actual: ${currentHumidity || 'N/A'}%
• Registros históricos: ${sensorData?.length || 0}

*Análisis generado por IA especializada en conservación de alimentos*`
}

async function handleSystemConfig(message: string, sensorData: any[]) {
  const response = `⚙️ **CONFIGURACIÓN DEL SISTEMA**

**🔧 Configuraciones disponibles:**

**1. Selección de Alimento:**
• Comando: "Seleccionar [tipo de alimento]"
• Configura automáticamente rangos de temperatura
• Activa control de LEDs específico

**2. Ajustes de Monitoreo:**
• Frecuencia de datos: Cada 5 segundos (ESP32)
• Actualización LEDs: Cada 3 segundos
• Retención de datos: 500 registros máximo

**3. Tipos de Alimentos Soportados:**
${Object.entries(FOOD_DATABASE).map(([key, food]) => 
  `• ${food.icon} **${food.name}**: ${food.tempMin}°C a ${food.tempMax}°C`
).join('\n')}

**4. Configuración de Alertas:**
• LED Verde: Temperatura óptima
• LED Amarillo: Fuera de rango (advertencia)
• LED Rojo: Temperatura crítica

**📊 Estado actual del sistema:**
• ESP32: ${sensorData?.length > 0 ? '✅ Conectado' : '❌ Desconectado'}
• Datos recibidos: ${sensorData?.length || 0} registros
• Última actualización: ${sensorData?.[0]?.timestamp ? new Date(sensorData[0].timestamp).toLocaleTimeString('es-ES') : 'N/A'}

**💬 Comandos de configuración:**
• "Configurar para carnes rojas"
• "Cambiar a monitoreo de pescado"
• "Ajustar alertas para lácteos"
• "Estado del sistema"

¿Qué configuración quieres ajustar?`

  return response
}

async function handleGeneralQuery(message: string, sensorData: any[]) {
  const prompt = `
Eres un asistente especializado en conservación de alimentos y monitoreo con ESP32.

Consulta: "${message}"

Datos disponibles:
- Temperatura actual: ${sensorData?.[0]?.temperature || 'N/A'}°C
- Humedad: ${sensorData?.[0]?.humidity || 'N/A'}%
- Registros: ${sensorData?.length || 0}

Responde de manera útil y específica sobre conservación de alimentos, uso del sistema, o análisis de datos.
`

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: prompt,
    temperature: 0.5,
    maxTokens: 400,
  })

  return text
}

// Funciones auxiliares
function analyzeTemperatureForFood(temp: number, food: any) {
  if (temp >= food.tempMin && temp <= food.tempMax) {
    return {
      status: "OPTIMAL",
      message: `Temperatura óptima para ${food.name}`,
      ledStatus: "🟢 LED Verde encendido (condiciones ideales)"
    }
  } else if (temp > food.tempMax && temp <= food.criticalTemp) {
    return {
      status: "WARNING",
      message: `Temperatura alta para ${food.name} - revisar refrigeración`,
      ledStatus: "🟡 LED Amarillo encendido (advertencia)"
    }
  } else if (temp > food.criticalTemp) {
    return {
      status: "CRITICAL",
      message: `¡TEMPERATURA CRÍTICA! Riesgo de deterioro inmediato`,
      ledStatus: "🔴 LED Rojo encendido (CRÍTICO)"
    }
  } else {
    return {
      status: "TOO_COLD",
      message: `Temperatura muy baja - riesgo de congelación`,
      ledStatus: "🟡 LED Amarillo encendido (muy frío)"
    }
  }
}

function evaluateTemperatureForConservation(temp: number) {
  if (temp < -5) return "❄️ **Congelación** - Ideal para almacenamiento a largo plazo"
  if (temp < 0) return "🧊 **Muy frío** - Excelente para carnes y pescados"
  if (temp < 4) return "✅ **Refrigeración óptima** - Ideal para la mayoría de alimentos"
  if (temp < 8) return "⚠️ **Refrigeración marginal** - Monitorear de cerca"
  return "🚨 **Temperatura de riesgo** - Acción inmediata requerida"
}

function analyzeTrend(temps: number[]) {
  if (temps.length < 3) return "Datos insuficientes para determinar tendencia"
  
  const recent = temps.slice(0, 3).reduce((a, b) => a + b, 0) / 3
  const older = temps.slice(-3).reduce((a, b) => a + b, 0) / 3
  const diff = recent - older
  
  if (Math.abs(diff) < 0.5) return "📊 **Estable** - Temperatura constante"
  if (diff > 0) return `📈 **Subiendo** - Incremento de ${diff.toFixed(1)}°C`
  return `📉 **Bajando** - Descenso de ${Math.abs(diff).toFixed(1)}°C`
}

function getTemperatureRecommendations(current: number, avg: number) {
  const recommendations = []
  
  if (current > 8) recommendations.push("• Verificar sistema de refrigeración inmediatamente")
  if (current > 4) recommendations.push("• Monitorear alimentos perecederos de cerca")
  if (current < -3) recommendations.push("• Verificar que no haya congelación no deseada")
  if (Math.abs(current - avg) > 2) recommendations.push("• Investigar fluctuaciones de temperatura")
  
  return recommendations.length > 0 ? recommendations.join('\n') : "• Condiciones dentro de parámetros normales"
}

function getTemperatureAlerts(current: number, max: number) {
  const alerts = []
  
  if (current > 10) alerts.push("🚨 **CRÍTICO**: Temperatura muy alta - riesgo de deterioro")
  if (max > 8) alerts.push("⚠️ **ADVERTENCIA**: Se registraron temperaturas altas")
  if (current < -10) alerts.push("❄️ **ATENCIÓN**: Temperatura muy baja - posible congelación")
  
  return alerts.length > 0 ? alerts.join('\n') : "✅ Sin alertas críticas"
}
