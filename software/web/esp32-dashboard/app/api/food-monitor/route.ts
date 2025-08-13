import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// Base de datos de alimentos y sus rangos de temperatura
const FOOD_DATABASE = {
  carnes: {
    name: "Carnes Rojas",
    tempMin: -2,
    tempMax: 4,
    humidityMin: 85,
    humidityMax: 95,
    description: "Carne de res, cerdo, cordero",
    shelfLife: "3-5 días",
    criticalTemp: 7,
  },
  pollo: {
    name: "Pollo y Aves",
    tempMin: -2,
    tempMax: 2,
    humidityMin: 85,
    humidityMax: 95,
    description: "Pollo, pavo, pato",
    shelfLife: "1-2 días",
    criticalTemp: 4,
  },
  pescado: {
    name: "Pescados y Mariscos",
    tempMin: -2,
    tempMax: 0,
    humidityMin: 90,
    humidityMax: 95,
    description: "Pescado fresco, mariscos",
    shelfLife: "1-2 días",
    criticalTemp: 2,
  },
  lacteos: {
    name: "Productos Lácteos",
    tempMin: 1,
    tempMax: 4,
    humidityMin: 80,
    humidityMax: 85,
    description: "Leche, yogurt, crema",
    shelfLife: "5-7 días",
    criticalTemp: 7,
  },
  quesos_duros: {
    name: "Quesos Duros",
    tempMin: 2,
    tempMax: 8,
    humidityMin: 80,
    humidityMax: 85,
    description: "Cheddar, parmesano, gouda",
    shelfLife: "2-4 semanas",
    criticalTemp: 12,
  },
  quesos_blandos: {
    name: "Quesos Blandos",
    tempMin: 1,
    tempMax: 4,
    humidityMin: 85,
    humidityMax: 90,
    description: "Brie, camembert, ricotta",
    shelfLife: "1-2 semanas",
    criticalTemp: 7,
  },
  embutidos: {
    name: "Embutidos",
    tempMin: 0,
    tempMax: 4,
    humidityMin: 75,
    humidityMax: 85,
    description: "Jamón, salami, chorizo",
    shelfLife: "2-3 semanas",
    criticalTemp: 8,
  },
  verduras: {
    name: "Verduras Frescas",
    tempMin: 0,
    tempMax: 4,
    humidityMin: 90,
    humidityMax: 95,
    description: "Lechuga, apio, zanahorias",
    shelfLife: "1-2 semanas",
    criticalTemp: 8,
  },
  frutas: {
    name: "Frutas Frescas",
    tempMin: 0,
    tempMax: 4,
    humidityMin: 85,
    humidityMax: 90,
    description: "Manzanas, peras, uvas",
    shelfLife: "1-4 semanas",
    criticalTemp: 10,
  },
}

export async function POST(request: NextRequest) {
  try {
    const { foodType, currentTemp, currentHumidity, duration } = await request.json()

    if (!foodType || currentTemp === undefined) {
      return NextResponse.json({ error: "Tipo de alimento y temperatura requeridos" }, { status: 400 })
    }

    const foodData = FOOD_DATABASE[foodType as keyof typeof FOOD_DATABASE]
    if (!foodData) {
      return NextResponse.json({ error: "Tipo de alimento no reconocido" }, { status: 400 })
    }

    // Análisis de temperatura
    const tempStatus = analyzeTemperature(currentTemp, foodData)
    const humidityStatus = currentHumidity ? analyzeHumidity(currentHumidity, foodData) : null

    // Generar análisis con IA
    const aiAnalysis = await generateAIFoodAnalysis(foodData, currentTemp, currentHumidity, duration, tempStatus)

    return NextResponse.json({
      foodType: foodData.name,
      currentConditions: {
        temperature: currentTemp,
        humidity: currentHumidity,
      },
      recommendedConditions: {
        temperatureRange: `${foodData.tempMin}°C a ${foodData.tempMax}°C`,
        humidityRange: `${foodData.humidityMin}% a ${foodData.humidityMax}%`,
        shelfLife: foodData.shelfLife,
      },
      status: tempStatus,
      humidityStatus,
      aiAnalysis,
      alerts: generateAlerts(currentTemp, currentHumidity, foodData),
    })
  } catch (error) {
    console.error("Error en análisis de alimentos:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

function analyzeTemperature(temp: number, foodData: any) {
  if (temp < foodData.tempMin) {
    return {
      status: "DEMASIADO_FRIO",
      severity: "warning",
      message: `Temperatura muy baja (${temp}°C). Riesgo de congelación.`,
    }
  } else if (temp > foodData.criticalTemp) {
    return {
      status: "PELIGRO_CRITICO",
      severity: "critical",
      message: `¡TEMPERATURA CRÍTICA! (${temp}°C). Riesgo de descomposición inmediata.`,
    }
  } else if (temp > foodData.tempMax) {
    return {
      status: "DEMASIADO_CALIENTE",
      severity: "danger",
      message: `Temperatura alta (${temp}°C). Reducción de vida útil.`,
    }
  } else {
    return {
      status: "OPTIMA",
      severity: "safe",
      message: `Temperatura óptima (${temp}°C). Condiciones ideales de conservación.`,
    }
  }
}

function analyzeHumidity(humidity: number, foodData: any) {
  if (humidity < foodData.humidityMin) {
    return {
      status: "BAJA",
      severity: "warning",
      message: `Humedad baja (${humidity}%). Riesgo de deshidratación.`,
    }
  } else if (humidity > foodData.humidityMax) {
    return {
      status: "ALTA",
      severity: "warning",
      message: `Humedad alta (${humidity}%). Riesgo de crecimiento bacteriano.`,
    }
  } else {
    return {
      status: "OPTIMA",
      severity: "safe",
      message: `Humedad óptima (${humidity}%). Condiciones ideales.`,
    }
  }
}

function generateAlerts(temp: number, humidity: number | null, foodData: any) {
  const alerts = []

  if (temp > foodData.criticalTemp) {
    alerts.push({
      type: "CRITICAL",
      message: `🚨 ALERTA CRÍTICA: Temperatura ${temp}°C excede límite seguro para ${foodData.name}`,
      action: "Reducir temperatura inmediatamente",
      priority: 1,
    })
  }

  if (temp > foodData.tempMax && temp <= foodData.criticalTemp) {
    alerts.push({
      type: "WARNING",
      message: `⚠️ Temperatura ${temp}°C por encima del rango óptimo`,
      action: "Ajustar refrigeración",
      priority: 2,
    })
  }

  if (humidity && humidity > foodData.humidityMax + 5) {
    alerts.push({
      type: "WARNING",
      message: `💧 Humedad alta ${humidity}% puede causar deterioro`,
      action: "Verificar ventilación",
      priority: 3,
    })
  }

  return alerts
}

async function generateAIFoodAnalysis(
  foodData: any,
  temp: number,
  humidity: number | null,
  duration: string | null,
  tempStatus: any,
) {
  const prompt = `
Eres un experto en conservación de alimentos y seguridad alimentaria. Analiza las siguientes condiciones:

ALIMENTO: ${foodData.name} (${foodData.description})
TEMPERATURA ACTUAL: ${temp}°C
HUMEDAD ACTUAL: ${humidity || "No disponible"}%
RANGO ÓPTIMO: ${foodData.tempMin}°C a ${foodData.tempMax}°C
HUMEDAD ÓPTIMA: ${foodData.humidityMin}% a ${foodData.humidityMax}%
VIDA ÚTIL ESPERADA: ${foodData.shelfLife}
ESTADO ACTUAL: ${tempStatus.message}

Proporciona un análisis profesional que incluya:

1. **Evaluación del riesgo actual**
2. **Impacto en la calidad y seguridad del alimento**
3. **Tiempo estimado antes de deterioro**
4. **Recomendaciones específicas de acción**
5. **Consecuencias si no se corrige**

Responde en formato JSON:
{
  "riskLevel": "BAJO|MEDIO|ALTO|CRÍTICO",
  "safetyAssessment": "evaluación de seguridad",
  "qualityImpact": "impacto en calidad",
  "timeToDeterioration": "tiempo estimado",
  "recommendations": ["recomendación 1", "recomendación 2"],
  "consequences": "consecuencias si no se actúa"
}
`

  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: prompt,
      temperature: 0.3,
      maxTokens: 800,
    })

    const cleanText = text.trim().replace(/```json\n?|\n?```/g, "")
    return JSON.parse(cleanText)
  } catch (error) {
    console.error("Error en análisis IA:", error)
    return {
      riskLevel: tempStatus.severity === "critical" ? "CRÍTICO" : "MEDIO",
      safetyAssessment: "Análisis automático no disponible",
      qualityImpact: tempStatus.message,
      timeToDeterioration: "Consultar manualmente",
      recommendations: ["Verificar temperatura", "Monitorear continuamente"],
      consequences: "Posible deterioro del alimento",
    }
  }
}
