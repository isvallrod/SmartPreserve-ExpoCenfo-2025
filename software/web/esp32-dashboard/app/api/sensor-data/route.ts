import { type NextRequest, NextResponse } from "next/server"

// Simulamos una base de datos en memoria (en producción usa una DB real)
let sensorDataStore: any[] = []

export async function GET() {
  try {
    // Ordenar por timestamp descendente (más reciente primero)
    const sortedData = sensorDataStore.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json(sortedData)
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener datos" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Log detallado para debug
    console.log("=== DEBUG ESP32 ===")
    console.log("Headers:", Object.fromEntries(request.headers.entries()))
    console.log("Body recibido:", JSON.stringify(body, null, 2))
    console.log("Tipo de body:", typeof body)
    console.log("Keys del body:", Object.keys(body))
    console.log("==================")

    // Verificar si el body está vacío o es null
    if (!body || typeof body !== "object") {
      console.log("❌ Body vacío o inválido")
      return NextResponse.json(
        {
          error: "Body vacío o inválido",
          received: body,
          type: typeof body,
        },
        { status: 400 },
      )
    }

    // Extraer valores con múltiples variaciones de nombres
    const temperatura = body.temperatura || body.temperature || body.temp || null
    const humedad = body.humedad || body.humidity || body.hum || null
    const luz = body.luz || body.light || body.lightLevel || null

    console.log("Valores extraídos:")
    console.log("- Temperatura:", temperatura)
    console.log("- Humedad:", humedad)
    console.log("- Luz:", luz)

    // Validar que al menos un dato esté presente
    if (temperatura === null && humedad === null && luz === null) {
      console.log("❌ No se encontraron datos de sensores válidos")
      return NextResponse.json(
        {
          error: "No se encontraron datos de sensores válidos",
          received: body,
          expected: "temperatura, humedad, luz",
        },
        { status: 400 },
      )
    }

    // Crear nuevo registro
    const newData = {
      id: Date.now().toString(),
      temperature: temperatura ? Number.parseFloat(temperatura) : null,
      humidity: humedad ? Number.parseFloat(humedad) : null,
      lightLevel: luz ? Number.parseInt(luz) : null,
      voltage: body.voltage ? Number.parseFloat(body.voltage) : null,
      timestamp: new Date().toISOString(),
    }

    console.log("✅ Datos procesados:", newData)

    // Agregar a la "base de datos"
    sensorDataStore.unshift(newData)

    // Mantener solo los últimos 200 registros
    if (sensorDataStore.length > 200) {
      sensorDataStore = sensorDataStore.slice(0, 200)
    }

    return NextResponse.json({
      success: true,
      message: "Datos guardados correctamente",
      data: newData,
      debug: {
        received: body,
        processed: newData,
      },
    })
  } catch (error) {
    console.error("❌ Error al procesar datos:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
