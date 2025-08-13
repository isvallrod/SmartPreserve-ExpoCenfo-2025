import { type NextRequest, NextResponse } from "next/server"

/**
 * Almacén de datos de sensores en memoria
 * En producción, esto debería ser una base de datos real como PostgreSQL o MongoDB
 * Aquí usamos un array en memoria para simplicidad en el desarrollo
 */
let sensorDataStore: any[] = []

/**
 * GET /api/sensor-data
 * Endpoint para obtener todos los datos de sensores almacenados
 *
 * @returns Array de datos de sensores ordenados por timestamp descendente (más reciente primero)
 */
export async function GET() {
  try {
    // Ordenar por timestamp descendente (más reciente primero)
    const sortedData = sensorDataStore.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json(sortedData)
  } catch (error) {
    console.error("Error al obtener datos:", error)
    return NextResponse.json({ error: "Error al obtener datos" }, { status: 500 })
  }
}

/**
 * POST /api/sensor-data
 * Endpoint para recibir nuevos datos del ESP32
 *
 * El ESP32 envía datos en formato JSON con temperatura, humedad y luz
 * Este endpoint procesa, valida y almacena los datos
 *
 * @param request - Petición HTTP con datos JSON del ESP32
 * @returns Respuesta con confirmación y datos procesados
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Log detallado para debug y monitoreo
    console.log("=== 📡 DATOS ESP32 RECIBIDOS ===")
    console.log("Headers:", Object.fromEntries(request.headers.entries()))
    console.log("Body recibido:", JSON.stringify(body, null, 2))
    console.log("Tipo de body:", typeof body)
    console.log("Keys del body:", Object.keys(body))
    console.log("================================")

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

    // Extraer valores con múltiples variaciones de nombres (español e inglés)
    // Esto permite flexibilidad en cómo el ESP32 envía los datos
    const temperatura = body.temperatura || body.temperature || body.temp || null
    const humedad = body.humedad || body.humidity || body.hum || null
    const luz = body.luz || body.light || body.lightLevel || null
    const voltaje = body.voltage || body.voltaje || null

    console.log("📊 Valores extraídos:")
    console.log("- Temperatura:", temperatura)
    console.log("- Humedad:", humedad)
    console.log("- Luz:", luz)
    console.log("- Voltaje:", voltaje)

    // Validar que al menos un dato esté presente
    if (temperatura === null && humedad === null && luz === null) {
      console.log("❌ No se encontraron datos de sensores válidos")
      return NextResponse.json(
        {
          error: "No se encontraron datos de sensores válidos",
          received: body,
          expected: "temperatura/temperature, humedad/humidity, luz/light",
        },
        { status: 400 },
      )
    }

    // Crear nuevo registro con validación de tipos
    const newData = {
      id: Date.now().toString(), // ID único basado en timestamp
      temperature: temperatura !== null ? Number.parseFloat(temperatura) : null, // Convertir a número
      humidity: humedad !== null ? Number.parseFloat(humedad) : null, // Convertir a número
      lightLevel: luz !== null ? Number.parseInt(luz) : null, // Convertir a entero
      voltage: voltaje !== null ? Number.parseFloat(voltaje) : null, // Convertir a número
      timestamp: new Date().toISOString(), // Timestamp del servidor
    }

    // Validar rangos de datos para detectar posibles errores de sensores
    if (newData.temperature !== null && (newData.temperature < -50 || newData.temperature > 100)) {
      console.log("⚠️ Temperatura fuera de rango:", newData.temperature)
    }
    if (newData.humidity !== null && (newData.humidity < 0 || newData.humidity > 100)) {
      console.log("⚠️ Humedad fuera de rango:", newData.humidity)
    }
    if (newData.lightLevel !== null && (newData.lightLevel < 0 || newData.lightLevel > 4095)) {
      console.log("⚠️ Nivel de luz fuera de rango:", newData.lightLevel)
    }

    console.log("✅ Datos procesados correctamente:", newData)

    // Agregar a la "base de datos" en memoria
    sensorDataStore.unshift(newData) // unshift() agrega al inicio del array

    // Mantener solo los últimos 500 registros para evitar uso excesivo de memoria
    if (sensorDataStore.length > 500) {
      sensorDataStore = sensorDataStore.slice(0, 500)
      console.log("🗂️ Datos antiguos eliminados, manteniendo últimos 500 registros")
    }

    // Respuesta exitosa con información detallada para debugging
    return NextResponse.json({
      success: true,
      message: "Datos guardados correctamente",
      data: newData, // Datos procesados
      totalRecords: sensorDataStore.length, // Total de registros almacenados
      timestamp: new Date().toISOString(), // Timestamp de la respuesta
      debug: {
        // Información de debug
        received: body,
        processed: newData,
        validationPassed: true,
      },
    })
  } catch (error) {
    console.error("❌ Error al procesar datos del ESP32:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

/**
 * PUT /api/sensor-data
 * Endpoint adicional para obtener estadísticas de los datos almacenados
 *
 * @returns Estadísticas detalladas de los datos de sensores
 */
export async function PUT() {
  try {
    // Calcular estadísticas de los datos almacenados
    const stats = {
      totalRecords: sensorDataStore.length,
      latestRecord: sensorDataStore.length > 0 ? sensorDataStore[0] : null,
      oldestRecord: sensorDataStore.length > 0 ? sensorDataStore[sensorDataStore.length - 1] : null,
      dataRange: {
        // Calcular rangos mínimos y máximos para cada sensor
        temperature: {
          min: Math.min(...sensorDataStore.filter((d) => d.temperature !== null).map((d) => d.temperature)),
          max: Math.max(...sensorDataStore.filter((d) => d.temperature !== null).map((d) => d.temperature)),
        },
        humidity: {
          min: Math.min(...sensorDataStore.filter((d) => d.humidity !== null).map((d) => d.humidity)),
          max: Math.max(...sensorDataStore.filter((d) => d.humidity !== null).map((d) => d.humidity)),
        },
        light: {
          min: Math.min(...sensorDataStore.filter((d) => d.lightLevel !== null).map((d) => d.lightLevel)),
          max: Math.max(...sensorDataStore.filter((d) => d.lightLevel !== null).map((d) => d.lightLevel)),
        },
      },
      serverTime: new Date().toISOString(),
    }

    return NextResponse.json(stats)
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener estadísticas" }, { status: 500 })
  }
}
