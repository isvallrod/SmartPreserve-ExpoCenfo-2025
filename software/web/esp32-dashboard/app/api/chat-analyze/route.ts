import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const { message, sensorData } = await request.json()

    if (!message || !sensorData) {
      return NextResponse.json({ error: "Mensaje y datos requeridos" }, { status: 400 })
    }

    // Determinar tipo de análisis basado en el mensaje
    const analysisType = determineAnalysisType(message)

    let response = ""
    let chartData = null

    switch (analysisType) {
      case "statistical":
        response = await generateStatisticalAnalysis(sensorData, message)
        break
      case "chart":
        const chartResult = await generateChartAnalysis(sensorData, message)
        response = chartResult.response
        chartData = chartResult.chartData
        break
      case "ai":
        response = await generateAIAnalysis(sensorData, message)
        break
      default:
        response = await generateGeneralResponse(sensorData, message)
    }

    return NextResponse.json({
      response,
      analysisType,
      chartData,
    })
  } catch (error) {
    console.error("Error en chat-analyze:", error)
    return NextResponse.json(
      {
        response: "Lo siento, hubo un error procesando tu solicitud. Por favor intenta nuevamente.",
        analysisType: "error",
      },
      { status: 500 },
    )
  }
}

function determineAnalysisType(message: string): string {
  const lowerMessage = message.toLowerCase()

  if (
    lowerMessage.includes("estadístic") ||
    lowerMessage.includes("media") ||
    lowerMessage.includes("promedio") ||
    lowerMessage.includes("desviación") ||
    lowerMessage.includes("mínimo") ||
    lowerMessage.includes("máximo")
  ) {
    return "statistical"
  }

  if (
    lowerMessage.includes("gráfico") ||
    lowerMessage.includes("grafica") ||
    lowerMessage.includes("chart") ||
    lowerMessage.includes("visualiz") ||
    lowerMessage.includes("hora") ||
    lowerMessage.includes("período") ||
    lowerMessage.includes("tiempo")
  ) {
    return "chart"
  }

  if (
    lowerMessage.includes("ia") ||
    lowerMessage.includes("inteligencia") ||
    lowerMessage.includes("recomend") ||
    lowerMessage.includes("analiz") ||
    lowerMessage.includes("patrón") ||
    lowerMessage.includes("tendencia")
  ) {
    return "ai"
  }

  return "general"
}

async function generateStatisticalAnalysis(sensorData: any[], message: string): Promise<string> {
  const lightValues = sensorData.map((d) => d.lightLevel || 0).filter((v) => v > 0)

  if (lightValues.length === 0) {
    return "No hay datos suficientes para realizar un análisis estadístico."
  }

  const mean = lightValues.reduce((sum, val) => sum + val, 0) / lightValues.length
  const min = Math.min(...lightValues)
  const max = Math.max(...lightValues)
  const median = lightValues.sort((a, b) => a - b)[Math.floor(lightValues.length / 2)]

  // Desviación estándar
  const variance = lightValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / lightValues.length
  const stdDev = Math.sqrt(variance)

  return `📊 **ANÁLISIS ESTADÍSTICO COMPLETO**

**Datos analizados:** ${lightValues.length} registros

**Medidas de tendencia central:**
• Media: ${mean.toFixed(2)}
• Mediana: ${median}
• Moda: ${findMode(lightValues)}

**Medidas de dispersión:**
• Mínimo: ${min}
• Máximo: ${max}
• Rango: ${max - min}
• Desviación estándar: ${stdDev.toFixed(2)}
• Varianza: ${variance.toFixed(2)}

**Interpretación:**
${interpretStatistics(mean, stdDev, min, max)}

**Distribución por rangos:**
${generateDistribution(lightValues)}`
}

async function generateChartAnalysis(
  sensorData: any[],
  message: string,
): Promise<{ response: string; chartData: any }> {
  // Determinar período solicitado
  const period = extractTimePeriod(message)
  const filteredData = filterDataByPeriod(sensorData, period)

  const chartData = {
    labels: filteredData.map((d) => new Date(d.timestamp).toLocaleTimeString("es-ES")),
    values: filteredData.map((d) => d.lightLevel || 0),
    period: period,
    dataPoints: filteredData.length,
  }

  const response = `📈 **GRÁFICO GENERADO - ${period.toUpperCase()}**

**Período:** ${period}
**Puntos de datos:** ${filteredData.length}
**Rango temporal:** ${
    filteredData.length > 0
      ? `${new Date(filteredData[filteredData.length - 1].timestamp).toLocaleString("es-ES")} - ${new Date(filteredData[0].timestamp).toLocaleString("es-ES")}`
      : "Sin datos"
  }

**Resumen del gráfico:**
• Valor mínimo: ${Math.min(...chartData.values)}
• Valor máximo: ${Math.max(...chartData.values)}
• Promedio: ${(chartData.values.reduce((a, b) => a + b, 0) / chartData.values.length).toFixed(2)}

**Tendencia observada:**
${analyzeTrend(chartData.values)}

*Los datos del gráfico están disponibles en el panel lateral para visualización.*`

  return { response, chartData }
}

async function generateAIAnalysis(sensorData: any[], message: string): Promise<string> {
  const prompt = `
Eres un experto en análisis de datos IoT. Analiza estos datos del sensor de luz ESP32:

Datos: ${JSON.stringify(sensorData.slice(0, 20), null, 2)}

Pregunta del usuario: "${message}"

Proporciona un análisis inteligente que incluya:
1. Interpretación de los patrones de luz
2. Posibles causas de las variaciones
3. Recomendaciones específicas
4. Predicciones o insights

Responde de forma conversacional y útil.
`

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: prompt,
    temperature: 0.7,
    maxTokens: 800,
  })

  return `🧠 **ANÁLISIS CON INTELIGENCIA ARTIFICIAL**

${text}

---
*Análisis generado por IA basado en ${sensorData.length} puntos de datos*`
}

async function generateGeneralResponse(sensorData: any[], message: string): Promise<string> {
  const prompt = `
El usuario pregunta: "${message}"

Datos disponibles del sensor ESP32: ${sensorData.length} registros de luz (0-4095)
Último valor: ${sensorData[0]?.lightLevel || "N/A"}

Responde de forma útil y sugiere qué tipo de análisis podría ser más apropiado.
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
function findMode(values: number[]): number {
  const frequency: { [key: number]: number } = {}
  values.forEach((val) => (frequency[val] = (frequency[val] || 0) + 1))
  return Number.parseInt(
    Object.keys(frequency).reduce((a, b) => (frequency[Number.parseInt(a)] > frequency[Number.parseInt(b)] ? a : b)),
  )
}

function interpretStatistics(mean: number, stdDev: number, min: number, max: number): string {
  let interpretation = ""

  if (mean < 1000) {
    interpretation += "• Ambiente predominantemente oscuro\n"
  } else if (mean < 2500) {
    interpretation += "• Condiciones de luz moderadas\n"
  } else {
    interpretation += "• Ambiente bien iluminado\n"
  }

  if (stdDev > 1000) {
    interpretation += "• Alta variabilidad en los datos (cambios significativos)\n"
  } else {
    interpretation += "• Baja variabilidad (condiciones estables)\n"
  }

  return interpretation
}

function generateDistribution(values: number[]): string {
  const ranges = [
    { min: 0, max: 500, label: "Muy oscuro" },
    { min: 501, max: 1500, label: "Oscuro" },
    { min: 1501, max: 3000, label: "Medio" },
    { min: 3001, max: 4095, label: "Brillante" },
  ]

  return ranges
    .map((range) => {
      const count = values.filter((v) => v >= range.min && v <= range.max).length
      const percentage = ((count / values.length) * 100).toFixed(1)
      return `• ${range.label}: ${count} registros (${percentage}%)`
    })
    .join("\n")
}

function extractTimePeriod(message: string): string {
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes("hora") || lowerMessage.includes("1h")) return "última hora"
  if (lowerMessage.includes("2 hora") || lowerMessage.includes("2h")) return "últimas 2 horas"
  if (lowerMessage.includes("24") || lowerMessage.includes("día")) return "últimas 24 horas"
  if (lowerMessage.includes("semana")) return "última semana"

  return "últimos datos disponibles"
}

function filterDataByPeriod(data: any[], period: string): any[] {
  const now = new Date()
  const cutoffTime = new Date()

  switch (period) {
    case "última hora":
      cutoffTime.setHours(now.getHours() - 1)
      break
    case "últimas 2 horas":
      cutoffTime.setHours(now.getHours() - 2)
      break
    case "últimas 24 horas":
      cutoffTime.setDate(now.getDate() - 1)
      break
    case "última semana":
      cutoffTime.setDate(now.getDate() - 7)
      break
    default:
      return data.slice(0, 20) // Últimos 20 registros
  }

  return data.filter((d) => new Date(d.timestamp) >= cutoffTime)
}

function analyzeTrend(values: number[]): string {
  if (values.length < 3) return "Datos insuficientes para determinar tendencia"

  const firstThird = values.slice(0, Math.floor(values.length / 3))
  const lastThird = values.slice(-Math.floor(values.length / 3))

  const firstAvg = firstThird.reduce((a, b) => a + b, 0) / firstThird.length
  const lastAvg = lastThird.reduce((a, b) => a + b, 0) / lastThird.length

  const difference = lastAvg - firstAvg

  if (Math.abs(difference) < 100) return "Tendencia estable"
  if (difference > 0) return `Tendencia creciente (+${difference.toFixed(0)} puntos)`
  return `Tendencia decreciente (${difference.toFixed(0)} puntos)`
}
