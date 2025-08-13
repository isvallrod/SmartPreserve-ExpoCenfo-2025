import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@vercel/kv"

// Clave para almacenar el estado de los LEDs en Vercel KV (base de datos Redis)
const LED_STATE_KEY = "esp32:ledState"

/**
 * Tipo TypeScript para el estado de los LEDs
 * Define la estructura de datos que manejamos para controlar los LEDs
 */
type LedState = {
  green: boolean // Estado del LED verde (temperatura óptima)
  yellow: boolean // Estado del LED amarillo (advertencia)
  red: boolean // Estado del LED rojo (crítico)
  lastUpdate: string // Timestamp de la última actualización
  foodType: string | null // Tipo de alimento seleccionado
  temperature: number | null // Temperatura actual
  status: "OPTIMAL" | "WARNING" | "CRITICAL" | "TOO_COLD" | "UNKNOWN" // Estado del sistema
}

/**
 * Estado en memoria como fallback si no hay Vercel KV configurado
 * Esto permite que la aplicación funcione incluso sin base de datos
 */
let memoryLedState: LedState = {
  green: false,
  yellow: false,
  red: false,
  lastUpdate: new Date().toISOString(),
  foodType: null,
  temperature: null,
  status: "UNKNOWN",
}

// Verificar si Vercel KV está disponible (variables de entorno configuradas)
const kvAvailable = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
const kv = kvAvailable
  ? createClient({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    })
  : null

/**
 * Base de datos de alimentos con sus rangos de temperatura óptimos
 * Cada alimento tiene rangos específicos para conservación segura
 */
const FOOD_DATABASE = {
  carnes: { tempMin: -2, tempMax: 4, criticalTemp: 7 }, // Carnes rojas
  pollo: { tempMin: -2, tempMax: 2, criticalTemp: 4 }, // Pollo y aves
  pescado: { tempMin: -2, tempMax: 0, criticalTemp: 2 }, // Pescados y mariscos
  lacteos: { tempMin: 1, tempMax: 4, criticalTemp: 7 }, // Productos lácteos
  quesos_duros: { tempMin: 2, tempMax: 8, criticalTemp: 12 }, // Quesos duros
  quesos_blandos: { tempMin: 1, tempMax: 4, criticalTemp: 7 }, // Quesos blandos
  embutidos: { tempMin: 0, tempMax: 4, criticalTemp: 8 }, // Embutidos
  verduras: { tempMin: 0, tempMax: 4, criticalTemp: 8 }, // Verduras frescas
  frutas: { tempMin: 0, tempMax: 4, criticalTemp: 10 }, // Frutas frescas
} as const

/**
 * Función para leer el estado de los LEDs desde KV o memoria
 * Intenta leer de KV primero, si falla usa el estado en memoria
 */
async function readLedState(): Promise<LedState> {
  try {
    if (kv) {
      const s = (await kv.get<LedState>(LED_STATE_KEY)) || null
      if (s) {
        memoryLedState = s // Sincronizar memoria con KV
      }
    }
  } catch (err) {
    console.error("KV get error, using memory fallback:", err)
  }
  return memoryLedState
}

/**
 * Función para escribir el estado de los LEDs a KV y memoria
 * Guarda en memoria siempre, intenta guardar en KV si está disponible
 */
async function writeLedState(state: LedState) {
  memoryLedState = state // Siempre actualizar memoria
  try {
    if (kv) {
      await kv.set(LED_STATE_KEY, state) // Intentar guardar en KV
    }
  } catch (err) {
    console.error("KV set error, kept memory state:", err)
  }
}

/**
 * Función para evaluar qué LEDs deben encenderse según el alimento y temperatura
 *
 * @param foodKey - Tipo de alimento (clave del FOOD_DATABASE)
 * @param temperature - Temperatura actual en grados Celsius
 * @returns Nuevo estado de los LEDs basado en la lógica de conservación
 */
function evaluateLeds(foodKey: keyof typeof FOOD_DATABASE, temperature: number): LedState {
  const food = FOOD_DATABASE[foodKey]
  const newState: LedState = {
    green: false,
    yellow: false,
    red: false,
    lastUpdate: new Date().toISOString(),
    foodType: foodKey,
    temperature,
    status: "UNKNOWN",
  }

  // Lógica de control de LEDs basada en rangos de temperatura
  if (temperature >= food.tempMin && temperature <= food.tempMax) {
    // VERDE: Temperatura en rango óptimo para el alimento
    newState.green = true
    newState.status = "OPTIMAL"
  } else if (temperature > food.tempMax && temperature <= food.criticalTemp) {
    // AMARILLO: Temperatura alta pero no crítica (advertencia)
    newState.yellow = true
    newState.status = "WARNING"
  } else if (temperature > food.criticalTemp || temperature < food.tempMin - 3) {
    // ROJO: Temperatura crítica (muy alta o muy baja)
    newState.red = true
    newState.status = "CRITICAL"
  } else if (temperature < food.tempMin) {
    // AMARILLO: Temperatura un poco baja (riesgo de congelación)
    newState.yellow = true
    newState.status = "TOO_COLD"
  }

  return newState
}

/**
 * GET /api/led-control
 * Endpoint para obtener el estado actual de los LEDs
 * Usado por el dashboard web y como alternativa para el ESP32
 */
export async function GET() {
  try {
    const s = await readLedState()
    return NextResponse.json({
      success: true,
      ledState: s, // formato anidado para el dashboard web
      // formato plano para compatibilidad con ESP32
      green: s.green ? 1 : 0,
      yellow: s.yellow ? 1 : 0,
      red: s.red ? 1 : 0,
      status: s.status,
      foodType: s.foodType,
      temperature: s.temperature,
      timestamp: s.lastUpdate,
    })
  } catch (error) {
    console.error("GET /api/led-control error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

/**
 * POST /api/led-control
 * Endpoint para actualizar el estado de los LEDs
 * Usado cuando se selecciona un alimento y se quiere actualizar la lógica de LEDs
 */
export async function POST(request: NextRequest) {
  try {
    const { foodType, temperature } = await request.json()

    // Validar que se proporcionen los datos necesarios
    if (!foodType || temperature === undefined) {
      return NextResponse.json(
        { error: "Tipo de alimento y temperatura requeridos", received: { foodType, temperature } },
        { status: 400 },
      )
    }

    // Verificar que el tipo de alimento sea válido
    const key = foodType as keyof typeof FOOD_DATABASE
    if (!FOOD_DATABASE[key]) {
      return NextResponse.json({ error: "Tipo de alimento no reconocido" }, { status: 400 })
    }

    // Evaluar nuevo estado de LEDs y guardarlo
    const newState = evaluateLeds(key, Number(temperature))
    await writeLedState(newState)

    // Respuesta con información completa para debugging
    return NextResponse.json({
      success: true,
      message: `LEDs actualizados para ${key} a ${temperature}°C`,
      ledState: newState,
      ranges: {
        optimal: `${FOOD_DATABASE[key].tempMin}°C a ${FOOD_DATABASE[key].tempMax}°C`,
        critical: `>${FOOD_DATABASE[key].criticalTemp}°C`,
      },
      // formato plano para clientes simples
      green: newState.green ? 1 : 0,
      yellow: newState.yellow ? 1 : 0,
      red: newState.red ? 1 : 0,
      status: newState.status,
      foodType: newState.foodType,
      temperature: newState.temperature,
      timestamp: newState.lastUpdate,
    })
  } catch (error: any) {
    console.error("POST /api/led-control error:", error)
    return NextResponse.json({ error: "Internal Server Error", details: error?.message }, { status: 500 })
  }
}

/**
 * PUT /api/led-control
 * Endpoint específico para consultas del ESP32
 * Devuelve el estado actual en formato simple que el ESP32 puede parsear fácilmente
 */
export async function PUT() {
  try {
    const s = await readLedState()

    // Formato optimizado para el ESP32
    const esp32Response = {
      green: s.green ? 1 : 0, // 1 = encendido, 0 = apagado
      yellow: s.yellow ? 1 : 0, // 1 = encendido, 0 = apagado
      red: s.red ? 1 : 0, // 1 = encendido, 0 = apagado
      status: s.status, // Estado textual
      timestamp: s.lastUpdate, // Timestamp de última actualización
      foodType: s.foodType, // Tipo de alimento configurado
      temperature: s.temperature, // Temperatura de referencia
    }

    return NextResponse.json({
      success: true,
      ...esp32Response,
      ledState: s, // opcional: también formato anidado para compatibilidad
    })
  } catch (error) {
    console.error("PUT /api/led-control error:", error)
    // En caso de error, devolver estado seguro para el ESP32
    return NextResponse.json(
      { success: false, green: 0, yellow: 0, red: 0, status: "ERROR", timestamp: new Date().toISOString() },
      { status: 500 },
    )
  }
}
