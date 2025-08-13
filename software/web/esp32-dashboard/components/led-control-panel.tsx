"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Lightbulb, Wifi, RefreshCw, Zap, WifiOff } from 'lucide-react'

interface LedControlPanelProps {
  selectedFood: string
  currentTemp: number
  isConnected: boolean
}

interface LedState {
  green: boolean
  yellow: boolean
  red: boolean
  status: string
  lastUpdate: string
  foodType: string | null
  temperature: number | null
}

export default function LedControlPanel({ selectedFood, currentTemp, isConnected }: LedControlPanelProps) {
  const [ledState, setLedState] = useState<LedState>({
    green: false,
    yellow: false,
    red: false,
    status: "UNKNOWN",
    lastUpdate: new Date().toISOString(),
    foodType: null,
    temperature: null
  })
  const [isUpdating, setIsUpdating] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  // Auto-actualizar LEDs cuando cambia la temperatura o el alimento
  useEffect(() => {
    if (selectedFood && currentTemp !== undefined && isConnected) {
      updateLeds()
    }
  }, [selectedFood, currentTemp, isConnected])

  // Consultar estado actual cada 5 segundos si está conectado
  useEffect(() => {
    if (!isConnected) return

    const interval = setInterval(fetchLedState, 5000)
    return () => clearInterval(interval)
  }, [isConnected])

  const fetchLedState = async () => {
    if (!isConnected) return

    try {
      const response = await fetch("/api/led-control")
      const data = await response.json()
      if (data.success) {
        setLedState(data.ledState)
        setLastError(null)
      }
    } catch (error) {
      console.error("Error fetching LED state:", error)
      setLastError("Error al consultar estado de LEDs")
    }
  }

  const updateLeds = async () => {
    if (!selectedFood || currentTemp === undefined) return

    setIsUpdating(true)
    setLastError(null)

    try {
      const response = await fetch("/api/led-control", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          foodType: selectedFood,
          temperature: currentTemp,
          forceUpdate: true
        }),
      })

      const result = await response.json()
      if (result.success) {
        setLedState(result.ledState)
        setLastError(null)
      } else {
        setLastError(result.error || "Error al actualizar LEDs")
      }
    } catch (error) {
      console.error("Error updating LEDs:", error)
      setLastError("Error de conexión al actualizar LEDs")
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "OPTIMAL":
        return {
          text: "Temperatura Óptima",
          color: "bg-green-100 text-green-800 border-green-200",
          icon: "✅",
          description: "Condiciones ideales para conservación"
        }
      case "WARNING":
        return {
          text: "Advertencia",
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
          icon: "⚠️",
          description: "Temperatura fuera del rango óptimo"
        }
      case "CRITICAL":
        return {
          text: "Crítico",
          color: "bg-red-100 text-red-800 border-red-200",
          icon: "🚨",
          description: "Temperatura peligrosa para el alimento"
        }
      case "TOO_COLD":
        return {
          text: "Muy Frío",
          color: "bg-blue-100 text-blue-800 border-blue-200",
          icon: "🧊",
          description: "Temperatura demasiado baja"
        }
      default:
        return {
          text: "Desconocido",
          color: "bg-gray-100 text-gray-800 border-gray-200",
          icon: "❓",
          description: "Estado no determinado"
        }
    }
  }

  const statusInfo = getStatusInfo(ledState.status)

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
            Control de LEDs ESP32
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
              {isConnected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
              {isConnected ? "Conectado" : "Desconectado"}
            </Badge>
            <Button 
              onClick={updateLeds} 
              disabled={isUpdating || !selectedFood || !isConnected} 
              variant="outline" 
              size="sm"
              className="bg-white/50"
            >
              {isUpdating ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Message */}
        {lastError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">⚠️ {lastError}</p>
          </div>
        )}

        {/* Connection Warning */}
        {!isConnected && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center mb-2">
              <WifiOff className="h-4 w-4 text-yellow-600 mr-2" />
              <span className="font-semibold text-yellow-800">ESP32 Desconectado</span>
            </div>
            <p className="text-sm text-yellow-700">
              Los LEDs no se pueden controlar sin conexión al ESP32. 
              Verifica la conexión WiFi y que el ESP32 esté enviando datos.
            </p>
          </div>
        )}

        {/* Estado Actual */}
        <div className={`p-4 rounded-lg border ${statusInfo.color}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <span className="text-lg mr-2">{statusInfo.icon}</span>
              <span className="font-semibold">{statusInfo.text}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {ledState.temperature}°C
            </Badge>
          </div>
          <p className="text-sm opacity-80">{statusInfo.description}</p>
        </div>

        {/* LEDs Visualization */}
        <div className="grid grid-cols-3 gap-4">
          {/* LED Verde */}
          <div className="text-center">
            <div 
              className={`w-16 h-16 mx-auto rounded-full border-4 transition-all duration-500 ${
                ledState.green && isConnected
                  ? 'bg-green-500 border-green-400 shadow-lg shadow-green-500/50 animate-pulse' 
                  : 'bg-gray-200 border-gray-300'
              }`}
            >
              <div className={`w-full h-full rounded-full ${
                ledState.green && isConnected ? 'bg-gradient-to-br from-green-400 to-green-600' : ''
              }`} />
            </div>
            <p className="text-xs mt-2 font-medium">Verde</p>
            <p className="text-xs text-gray-500">Óptimo</p>
            {ledState.green && isConnected && (
              <Badge variant="outline" className="text-xs mt-1 bg-green-50">ON</Badge>
            )}
          </div>

          {/* LED Amarillo */}
          <div className="text-center">
            <div 
              className={`w-16 h-16 mx-auto rounded-full border-4 transition-all duration-500 ${
                ledState.yellow && isConnected
                  ? 'bg-yellow-500 border-yellow-400 shadow-lg shadow-yellow-500/50 animate-pulse' 
                  : 'bg-gray-200 border-gray-300'
              }`}
            >
              <div className={`w-full h-full rounded-full ${
                ledState.yellow && isConnected ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' : ''
              }`} />
            </div>
            <p className="text-xs mt-2 font-medium">Amarillo</p>
            <p className="text-xs text-gray-500">Advertencia</p>
            {ledState.yellow && isConnected && (
              <Badge variant="outline" className="text-xs mt-1 bg-yellow-50">ON</Badge>
            )}
          </div>

          {/* LED Rojo */}
          <div className="text-center">
            <div 
              className={`w-16 h-16 mx-auto rounded-full border-4 transition-all duration-500 ${
                ledState.red && isConnected
                  ? 'bg-red-500 border-red-400 shadow-lg shadow-red-500/50 animate-pulse' 
                  : 'bg-gray-200 border-gray-300'
              }`}
            >
              <div className={`w-full h-full rounded-full ${
                ledState.red && isConnected ? 'bg-gradient-to-br from-red-400 to-red-600' : ''
              }`} />
            </div>
            <p className="text-xs mt-2 font-medium">Rojo</p>
            <p className="text-xs text-gray-500">Crítico</p>
            {ledState.red && isConnected && (
              <Badge variant="outline" className="text-xs mt-1 bg-red-50">ON</Badge>
            )}
          </div>
        </div>

        {/* Información Técnica */}
        <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1">
          <div className="flex justify-between">
            <span className="font-medium">Última actualización:</span>
            <span>{new Date(ledState.lastUpdate).toLocaleTimeString("es-ES")}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Alimento:</span>
            <span>{ledState.foodType || "No seleccionado"}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Estado ESP32:</span>
            <span className={isConnected ? "text-green-600" : "text-red-600"}>
              {isConnected ? "Online" : "Offline"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">LEDs activos:</span>
            <span>
              {[
                ledState.green && "Verde",
                ledState.yellow && "Amarillo", 
                ledState.red && "Rojo"
              ].filter(Boolean).join(", ") || "Ninguno"}
            </span>
          </div>
        </div>

        {/* Instrucciones */}
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">💡 Cómo funciona:</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• <strong>Verde:</strong> Temperatura en rango óptimo para el alimento</li>
            <li>• <strong>Amarillo:</strong> Temperatura fuera del rango (revisar condiciones)</li>
            <li>• <strong>Rojo:</strong> Temperatura crítica (acción inmediata requerida)</li>
            <li>• Los LEDs se actualizan automáticamente cada 3 segundos</li>
          </ul>
        </div>

        {/* Manual Control (solo si está conectado) */}
        {isConnected && selectedFood && (
          <div className="pt-2 border-t">
            <Button 
              onClick={updateLeds}
              disabled={isUpdating}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              size="sm"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                  Actualizando LEDs...
                </>
              ) : (
                <>
                  <Zap className="h-3 w-3 mr-2" />
                  Actualizar LEDs Manualmente
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
