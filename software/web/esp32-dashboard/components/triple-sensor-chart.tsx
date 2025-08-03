"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { TrendingUp, Pause, Play, RotateCcw, Thermometer, Droplets, Sun, Maximize2 } from "lucide-react"

interface DataPoint {
  x: number // timestamp en minutos desde el inicio
  temperature?: number
  humidity?: number
  lightLevel?: number
  timestamp: string
  id: string
}

interface TripleSensorChartProps {
  data: any[]
  isRealTime?: boolean
  maxPoints?: number
}

export default function TripleSensorChart({ data, isRealTime = true, maxPoints = 150 }: TripleSensorChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [chartData, setChartData] = useState<DataPoint[]>([])
  const [startTime, setStartTime] = useState<number>(Date.now())
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Controles de visualización
  const [showTemperature, setShowTemperature] = useState(true)
  const [showHumidity, setShowHumidity] = useState(true)
  const [showLight, setShowLight] = useState(true)

  // Convertir datos a puntos del gráfico
  useEffect(() => {
    if (!data || data.length === 0) return

    const baseTime = startTime
    const points: DataPoint[] = data
      .slice(0, maxPoints)
      .map((d, index) => ({
        x: (new Date(d.timestamp).getTime() - baseTime) / (1000 * 60), // minutos desde el inicio
        temperature: d.temperature,
        humidity: d.humidity,
        lightLevel: d.lightLevel,
        timestamp: d.timestamp,
        id: d.id,
      }))
      .reverse() // Mostrar más recientes a la derecha

    setChartData(points)
  }, [data, startTime, maxPoints])

  // Dibujar el gráfico
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || chartData.length === 0) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Configurar canvas
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    const width = rect.width
    const height = rect.height
    const padding = 80

    // Limpiar canvas
    ctx.clearRect(0, 0, width, height)

    // Calcular rangos para cada sensor
    const xValues = chartData.map((d) => d.x)
    const tempValues = chartData.map((d) => d.temperature).filter((v) => v !== null && v !== undefined)
    const humValues = chartData.map((d) => d.humidity).filter((v) => v !== null && v !== undefined)
    const lightValues = chartData.map((d) => d.lightLevel).filter((v) => v !== null && v !== undefined)

    const xMin = Math.min(...xValues, 0)
    const xMax = Math.max(...xValues, 10)

    // Rangos específicos para cada sensor
    const tempMin = tempValues.length > 0 ? Math.min(...tempValues) - 3 : 0
    const tempMax = tempValues.length > 0 ? Math.max(...tempValues) + 3 : 50
    const humMin = 0
    const humMax = 100
    const lightMin = 0
    const lightMax = 4095

    // Funciones de escala (normalizadas para usar el mismo eje Y)
    const scaleX = (x: number) => padding + ((x - xMin) / (xMax - xMin)) * (width - 2 * padding)

    // Escalas normalizadas (0-1) para poder mostrar todos los sensores juntos
    const scaleYTemp = (y: number) => {
      const normalized = (y - tempMin) / (tempMax - tempMin)
      return height - padding - normalized * (height - 2 * padding)
    }
    const scaleYHum = (y: number) => {
      const normalized = y / 100 // Humedad ya está en 0-100
      return height - padding - normalized * (height - 2 * padding)
    }
    const scaleYLight = (y: number) => {
      const normalized = y / 4095 // Luz en 0-4095
      return height - padding - normalized * (height - 2 * padding)
    }

    // Dibujar ejes
    ctx.strokeStyle = "#e5e7eb"
    ctx.lineWidth = 1

    // Eje X
    ctx.beginPath()
    ctx.moveTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.stroke()

    // Eje Y
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height - padding)
    ctx.stroke()

    // Etiquetas del eje Y (múltiples escalas)
    ctx.font = "10px sans-serif"
    ctx.textAlign = "right"

    // Etiquetas de temperatura (lado izquierdo)
    if (showTemperature && tempValues.length > 0) {
      for (let i = 0; i <= 4; i++) {
        const temp = tempMin + (tempMax - tempMin) * (i / 4)
        const yPos = scaleYTemp(temp)
        ctx.fillStyle = "#ef4444"
        ctx.fillText(`${temp.toFixed(1)}°C`, padding - 5, yPos + 3)
      }
    }

    // Etiquetas del eje X (tiempo)
    ctx.fillStyle = "#6b7280"
    ctx.textAlign = "center"
    for (let i = 0; i <= 6; i++) {
      const x = xMin + (xMax - xMin) * (i / 6)
      const xPos = scaleX(x)
      const timeLabel = x < 60 ? `${Math.round(x)}m` : `${Math.round(x / 60)}h`
      ctx.fillText(timeLabel, xPos, height - padding + 15)

      // Líneas de cuadrícula verticales
      ctx.strokeStyle = "#f9fafb"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(xPos, padding)
      ctx.lineTo(xPos, height - padding)
      ctx.stroke()
    }

    // Líneas de cuadrícula horizontales
    ctx.strokeStyle = "#f9fafb"
    for (let i = 0; i <= 8; i++) {
      const yPos = padding + (height - 2 * padding) * (i / 8)
      ctx.beginPath()
      ctx.moveTo(padding, yPos)
      ctx.lineTo(width - padding, yPos)
      ctx.stroke()
    }

    // Dibujar líneas de tendencia
    const drawTrendLine = (
      points: DataPoint[],
      getValue: (p: DataPoint) => number | undefined,
      scaleY: (y: number) => number,
      color: string,
      lineWidth = 2,
    ) => {
      const validPoints = points.filter((p) => getValue(p) !== null && getValue(p) !== undefined)
      if (validPoints.length < 2) return

      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.globalAlpha = 0.6
      ctx.beginPath()

      validPoints.forEach((point, index) => {
        const x = scaleX(point.x)
        const y = scaleY(getValue(point)!)

        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })

      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // Dibujar líneas de tendencia para cada sensor activo
    if (showTemperature) drawTrendLine(chartData, (p) => p.temperature, scaleYTemp, "#ef4444", 3)
    if (showHumidity) drawTrendLine(chartData, (p) => p.humidity, scaleYHum, "#3b82f6", 3)
    if (showLight) drawTrendLine(chartData, (p) => p.lightLevel, scaleYLight, "#f59e0b", 3)

    // Dibujar puntos de dispersión
    chartData.forEach((point, index) => {
      const x = scaleX(point.x)
      const age = chartData.length - index - 1
      const maxAge = Math.min(chartData.length, 30)
      const baseSize = Math.max(4, 9 - (age / maxAge) * 5)

      // Temperatura
      if (showTemperature && point.temperature !== null && point.temperature !== undefined) {
        const y = scaleYTemp(point.temperature)

        // Sombra
        ctx.fillStyle = "rgba(239, 68, 68, 0.2)"
        ctx.beginPath()
        ctx.arc(x + 1, y + 1, baseSize + 1, 0, 2 * Math.PI)
        ctx.fill()

        // Punto principal
        ctx.fillStyle = "#ef4444"
        ctx.beginPath()
        ctx.arc(x, y, baseSize, 0, 2 * Math.PI)
        ctx.fill()

        // Borde
        ctx.strokeStyle = "#ffffff"
        ctx.lineWidth = 2
        ctx.stroke()

        // Efecto de brillo para el punto más reciente
        if (index === chartData.length - 1 && isRealTime && !isPaused) {
          ctx.strokeStyle = "#ef4444"
          ctx.lineWidth = 2
          ctx.globalAlpha = 0.7
          ctx.beginPath()
          ctx.arc(x, y, baseSize + 4, 0, 2 * Math.PI)
          ctx.stroke()
          ctx.globalAlpha = 1
        }
      }

      // Humedad
      if (showHumidity && point.humidity !== null && point.humidity !== undefined) {
        const y = scaleYHum(point.humidity)
        const offsetX = showTemperature ? -4 : 0

        // Sombra
        ctx.fillStyle = "rgba(59, 130, 246, 0.2)"
        ctx.beginPath()
        ctx.arc(x + offsetX + 1, y + 1, baseSize + 1, 0, 2 * Math.PI)
        ctx.fill()

        // Punto principal
        ctx.fillStyle = "#3b82f6"
        ctx.beginPath()
        ctx.arc(x + offsetX, y, baseSize, 0, 2 * Math.PI)
        ctx.fill()

        ctx.strokeStyle = "#ffffff"
        ctx.lineWidth = 2
        ctx.stroke()

        if (index === chartData.length - 1 && isRealTime && !isPaused) {
          ctx.strokeStyle = "#3b82f6"
          ctx.lineWidth = 2
          ctx.globalAlpha = 0.7
          ctx.beginPath()
          ctx.arc(x + offsetX, y, baseSize + 4, 0, 2 * Math.PI)
          ctx.stroke()
          ctx.globalAlpha = 1
        }
      }

      // Nivel de luz
      if (showLight && point.lightLevel !== null && point.lightLevel !== undefined) {
        const y = scaleYLight(point.lightLevel)
        const offsetX = (showTemperature ? 4 : 0) + (showHumidity ? 4 : 0)

        // Sombra
        ctx.fillStyle = "rgba(245, 158, 11, 0.2)"
        ctx.beginPath()
        ctx.arc(x + offsetX + 1, y + 1, baseSize + 1, 0, 2 * Math.PI)
        ctx.fill()

        // Punto principal
        ctx.fillStyle = "#f59e0b"
        ctx.beginPath()
        ctx.arc(x + offsetX, y, baseSize, 0, 2 * Math.PI)
        ctx.fill()

        ctx.strokeStyle = "#ffffff"
        ctx.lineWidth = 2
        ctx.stroke()

        if (index === chartData.length - 1 && isRealTime && !isPaused) {
          ctx.strokeStyle = "#f59e0b"
          ctx.lineWidth = 2
          ctx.globalAlpha = 0.7
          ctx.beginPath()
          ctx.arc(x + offsetX, y, baseSize + 4, 0, 2 * Math.PI)
          ctx.stroke()
          ctx.globalAlpha = 1
        }
      }
    })

    // Título y estadísticas en tiempo real
    ctx.fillStyle = "#1f2937"
    ctx.font = "bold 16px sans-serif"
    ctx.textAlign = "left"
    ctx.fillText("🌡️💧💡 Estación Climática ESP32", padding, 30)

    // Estadísticas actuales
    if (chartData.length > 0) {
      const latest = chartData[chartData.length - 1]
      ctx.font = "12px sans-serif"
      let xOffset = padding

      if (showTemperature && latest.temperature !== null && latest.temperature !== undefined) {
        ctx.fillStyle = "#ef4444"
        ctx.fillText(`🌡️ ${latest.temperature.toFixed(1)}°C`, xOffset, 50)
        xOffset += 90
      }

      if (showHumidity && latest.humidity !== null && latest.humidity !== undefined) {
        ctx.fillStyle = "#3b82f6"
        ctx.fillText(`💧 ${latest.humidity.toFixed(1)}%`, xOffset, 50)
        xOffset += 90
      }

      if (showLight && latest.lightLevel !== null && latest.lightLevel !== undefined) {
        ctx.fillStyle = "#f59e0b"
        ctx.fillText(`💡 ${latest.lightLevel}`, xOffset, 50)
      }
    }

    // Etiquetas de escala en el lado derecho
    ctx.textAlign = "left"
    ctx.font = "10px sans-serif"

    if (showHumidity) {
      ctx.fillStyle = "#3b82f6"
      ctx.fillText("100%", width - padding + 5, padding + 10)
      ctx.fillText("50%", width - padding + 5, height / 2)
      ctx.fillText("0%", width - padding + 5, height - padding - 5)
    }

    if (showLight) {
      ctx.fillStyle = "#f59e0b"
      ctx.fillText("4095", width - padding + 35, padding + 10)
      ctx.fillText("2048", width - padding + 35, height / 2)
      ctx.fillText("0", width - padding + 35, height - padding - 5)
    }
  }, [chartData, isPaused, isRealTime, showTemperature, showHumidity, showLight, isFullscreen])

  const resetChart = () => {
    setStartTime(Date.now())
    setChartData([])
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const getStatusColor = () => {
    if (!isRealTime) return "secondary"
    if (isPaused) return "destructive"
    return "default"
  }

  const getStatusText = () => {
    if (!isRealTime) return "Estático"
    if (isPaused) return "Pausado"
    return "En Vivo"
  }

  // Calcular estadísticas
  const getStats = () => {
    if (chartData.length === 0) return null

    const tempValues = chartData.map((d) => d.temperature).filter((v) => v !== null && v !== undefined)
    const humValues = chartData.map((d) => d.humidity).filter((v) => v !== null && v !== undefined)
    const lightValues = chartData.map((d) => d.lightLevel).filter((v) => v !== null && v !== undefined)

    return {
      temperature:
        tempValues.length > 0
          ? {
              current: tempValues[tempValues.length - 1],
              min: Math.min(...tempValues),
              max: Math.max(...tempValues),
              avg: tempValues.reduce((a, b) => a + b, 0) / tempValues.length,
            }
          : null,
      humidity:
        humValues.length > 0
          ? {
              current: humValues[humValues.length - 1],
              min: Math.min(...humValues),
              max: Math.max(...humValues),
              avg: humValues.reduce((a, b) => a + b, 0) / humValues.length,
            }
          : null,
      light:
        lightValues.length > 0
          ? {
              current: lightValues[lightValues.length - 1],
              min: Math.min(...lightValues),
              max: Math.max(...lightValues),
              avg: lightValues.reduce((a, b) => a + b, 0) / lightValues.length,
            }
          : null,
    }
  }

  const stats = getStats()

  return (
    <Card className={`bg-white/80 backdrop-blur-sm border-0 shadow-lg ${isFullscreen ? "fixed inset-4 z-50" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
            Gráfico Triple Sensor ESP32
          </CardTitle>
          <div className="flex items-center space-x-2 mt-2">
            <Badge variant={getStatusColor()}>{getStatusText()}</Badge>
            <span className="text-sm text-gray-500">{chartData.length} puntos</span>
            <Badge variant="outline" className="text-xs">
              DHT11 + LDR
            </Badge>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={toggleFullscreen} className="bg-white/50">
            <Maximize2 className="h-4 w-4 mr-1" />
            {isFullscreen ? "Salir" : "Pantalla Completa"}
          </Button>
          {isRealTime && (
            <Button variant="outline" size="sm" onClick={() => setIsPaused(!isPaused)} className="bg-white/50">
              {isPaused ? (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Reanudar
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  Pausar
                </>
              )}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={resetChart} className="bg-white/50">
            <RotateCcw className="h-4 w-4 mr-1" />
            Reiniciar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Controles de visualización */}
        <div className="flex flex-wrap gap-6 mb-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border">
          <div className="flex items-center space-x-3">
            <Switch id="show-temperature" checked={showTemperature} onCheckedChange={setShowTemperature} />
            <Label htmlFor="show-temperature" className="flex items-center text-sm font-medium">
              <Thermometer className="h-4 w-4 mr-2 text-red-500" />
              Temperatura
            </Label>
          </div>
          <div className="flex items-center space-x-3">
            <Switch id="show-humidity" checked={showHumidity} onCheckedChange={setShowHumidity} />
            <Label htmlFor="show-humidity" className="flex items-center text-sm font-medium">
              <Droplets className="h-4 w-4 mr-2 text-blue-500" />
              Humedad
            </Label>
          </div>
          <div className="flex items-center space-x-3">
            <Switch id="show-light" checked={showLight} onCheckedChange={setShowLight} />
            <Label htmlFor="show-light" className="flex items-center text-sm font-medium">
              <Sun className="h-4 w-4 mr-2 text-yellow-500" />
              Nivel de Luz
            </Label>
          </div>
        </div>

        <div className="relative">
          <canvas
            ref={canvasRef}
            className={`w-full border rounded-lg bg-white shadow-inner ${isFullscreen ? "h-[calc(100vh-200px)]" : "h-96"}`}
            style={{ width: "100%", height: isFullscreen ? "calc(100vh - 200px)" : "384px" }}
          />

          {/* Leyenda mejorada */}
          <div className="flex justify-center space-x-8 mt-4 text-sm bg-white/50 p-3 rounded-lg">
            {showTemperature && (
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded-full mr-2 shadow-sm"></div>
                <span className="font-medium">Temperatura (°C)</span>
              </div>
            )}
            {showHumidity && (
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-500 rounded-full mr-2 shadow-sm"></div>
                <span className="font-medium">Humedad (%)</span>
              </div>
            )}
            {showLight && (
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-500 rounded-full mr-2 shadow-sm"></div>
                <span className="font-medium">Luz (0-4095)</span>
              </div>
            )}
          </div>

          {/* Estadísticas mejoradas */}
          {stats && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {showTemperature && stats.temperature && (
                <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200 shadow-sm">
                  <div className="flex items-center mb-3">
                    <Thermometer className="h-5 w-5 text-red-500 mr-2" />
                    <span className="font-semibold text-red-700">Temperatura</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Actual:</span>
                      <span className="font-bold text-red-600">{stats.temperature.current.toFixed(1)}°C</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rango:</span>
                      <span>
                        {stats.temperature.min.toFixed(1)}°C - {stats.temperature.max.toFixed(1)}°C
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Promedio:</span>
                      <span className="font-medium">{stats.temperature.avg.toFixed(1)}°C</span>
                    </div>
                  </div>
                </div>
              )}

              {showHumidity && stats.humidity && (
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 shadow-sm">
                  <div className="flex items-center mb-3">
                    <Droplets className="h-5 w-5 text-blue-500 mr-2" />
                    <span className="font-semibold text-blue-700">Humedad</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Actual:</span>
                      <span className="font-bold text-blue-600">{stats.humidity.current.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rango:</span>
                      <span>
                        {stats.humidity.min.toFixed(1)}% - {stats.humidity.max.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Promedio:</span>
                      <span className="font-medium">{stats.humidity.avg.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}

              {showLight && stats.light && (
                <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200 shadow-sm">
                  <div className="flex items-center mb-3">
                    <Sun className="h-5 w-5 text-yellow-500 mr-2" />
                    <span className="font-semibold text-yellow-700">Nivel de Luz</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Actual:</span>
                      <span className="font-bold text-yellow-600">{stats.light.current}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rango:</span>
                      <span>
                        {stats.light.min} - {stats.light.max}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Promedio:</span>
                      <span className="font-medium">{Math.round(stats.light.avg)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
