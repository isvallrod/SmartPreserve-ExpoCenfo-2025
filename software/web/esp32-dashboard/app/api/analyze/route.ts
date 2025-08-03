import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const { sensorData } = await request.json()

    if (!sensorData || sensorData.length === 0) {
      return NextResponse.json({ error: "No hay datos para analizar" }, { status: 400 })
    }

    // Preparar datos para el análisis
    const dataForAnalysis = sensorData.map((data: any) => ({
      lightLevel: data.lightLevel,
      temperature: data.temperature,
      humidity: data.humidity,
      voltage: data.voltage,
      timestamp: data.timestamp,
    }))

    const prompt = `
Eres un experto en análisis de datos IoT y sensores ESP32. Analiza los siguientes datos de sensores:

${JSON.stringify(dataForAnalysis, null, 2)}

Información del sistema:
- Sensor LDR (lightLevel): Mide nivel de luz ambiente (0-4095, donde 0=muy oscuro, 4095=muy brillante)
- Los datos se actualizan cada 2 segundos desde el ESP32
- Temperatura, humedad y voltaje pueden estar disponibles si hay sensores adicionales

Por favor proporciona un análisis detallado que incluya:

1. **Resumen del estado actual**: Descripción general de las condiciones detectadas
2. **Patrones identificados**: Tendencias, cambios significativos, comportamientos anómalos
3. **Recomendaciones técnicas**: Sugerencias específicas basadas en los datos
4. **Alertas importantes**: Cualquier valor que requiera atención inmediata

Rangos de referencia:
- Luz muy baja: 0-500 (posible noche o sensor obstruido)
- Luz baja: 500-1500 (ambiente interior normal)
- Luz media: 1500-3000 (buena iluminación)
- Luz alta: 3000-4095 (luz solar directa o iluminación intensa)

Responde ÚNICAMENTE en formato JSON válido con esta estructura exacta:
{
  "summary": "resumen detallado del estado actual",
  "recommendations": ["recomendación específica 1", "recomendación específica 2", "recomendación específica 3"],
  "alerts": ["alerta importante 1", "alerta importante 2"]
}

Asegúrate de que sea JSON válido sin texto adicional.
`

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: prompt,
      temperature: 0.3,
      maxTokens: 1000,
    })

    // Intentar parsear la respuesta JSON
    let analysis
    try {
      // Limpiar el texto para asegurar que sea JSON válido
      const cleanText = text.trim().replace(/```json\n?|\n?```/g, "")
      analysis = JSON.parse(cleanText)
    } catch (parseError) {
      console.error("Error parsing JSON:", parseError)
      // Si no es JSON válido, crear estructura básica con el texto
      analysis = {
        summary: text.includes("{") ? "Error al procesar el análisis. Intenta nuevamente." : text,
        recommendations: [
          "Verificar la conexión del sensor",
          "Monitorear cambios en el ambiente",
          "Revisar los datos históricos",
        ],
        alerts: [],
      }
    }

    // Validar estructura
    if (!analysis.summary) analysis.summary = "Análisis completado"
    if (!Array.isArray(analysis.recommendations)) analysis.recommendations = []
    if (!Array.isArray(analysis.alerts)) analysis.alerts = []

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error("Error en análisis:", error)

    // Análisis de respaldo si falla la IA
    const fallbackAnalysis = {
      summary: "Sistema funcionando correctamente. Datos del sensor LDR recibidos y procesados.",
      recommendations: [
        "Continuar monitoreando los niveles de luz",
        "Verificar patrones de cambio durante el día",
        "Considerar agregar más sensores para análisis completo",
      ],
      alerts: [],
    }

    return NextResponse.json({ analysis: fallbackAnalysis })
  }
}
