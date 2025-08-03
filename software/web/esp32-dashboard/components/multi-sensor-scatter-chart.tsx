"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { TrendingUp, Pause, Play, RotateCcw, Thermometer, Droplets, Sun } from "lucide-react"

interface DataPoint {
  x: number // timestamp en minutos desde el inicio
  temperature?: number
  humidity?: number
  lightLevel?: number
  timestamp: string
  id: string
}

interface MultiSensorScatterChartProps {
  data: any[]
  isRealTime?: boolean
  maxPoints?: number
}

export default function MultiSensorScatterChart({
  data,
  isRealTime = true,
  maxPoints = 100,
}: MultiSensorScatterChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [chartData, setChartData] = useState<DataPoint[]>([])
  const [startTime, setStartTime] = useState<number>(Date.now())

  // Controles de visualización
  const [showTemperature, setShowTemperature] = useState(true)
  const [showHumidity, setShowHumidity] = useState(true)
  const [showLight, setShowLight] = useState(false) // Oculto por defecto ya que ahora es temperatura

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
    const padding = 70

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
    const tempMin = tempValues.length > 0 ? Math.min(...tempValues) - 2 : 0
    const tempMax = tempValues.length > 0 ? Math.max(...tempValues) + 2 : 50
    const humMin = 0
    const humMax = 100
    const lightMin = 0
    const lightMax = 4095

    // Funciones de escala
    const scaleX = (x: number) => padding + ((x - xMin) / (xMax - xMin)) * (width - 2 * padding)
    const scaleYTemp = (y: number) => height - padding - ((y - tempMin) / (tempMax - tempMin)) * (height - 2 * padding)
    const scaleYHum = (y: number) => height - padding - ((y - humMin) / (humMax - humMin)) * (height - 2 * padding)
    const scaleYLight = (y: number) =>
      height - padding - ((y - lightMin) / (lightMax - lightMin)) * (height - 2 * padding)

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

    // Etiquetas del eje Y (temperatura por defecto)
    ctx.fillStyle = "#6b7280"
    ctx.font = "11px sans-serif"
    ctx.textAlign = "right"

    if (showTemperature && tempValues.length > 0) {
      for (let i = 0; i <= 5; i++) {
        const temp = tempMin + (tempMax - tempMin) * (i / 5)
        const yPos = scaleYTemp(temp)
        ctx.fillStyle = "#ef4444"
        ctx.fillText(`${temp.toFixed(1)}°C`, padding - 5, yPos + 4)
      }
    }

    // Etiquetas del eje X (tiempo)
    ctx.fillStyle = "#6b7280"
    ctx.textAlign = "center"
    for (let i = 0; i <= 5; i++) {
      const x = xMin + (xMax - xMin) * (i / 5)
      const xPos = scaleX(x)
      const timeLabel = x < 60 ? `${Math.round(x)}m` : `${Math.round(x / 60)}h`
      ctx.fillText(timeLabel, xPos, height - padding + 20)

      // Líneas de cuadrícula verticales
      ctx.strokeStyle = "#f3f4f6"
      ctx.beginPath()
      ctx.moveTo(xPos, padding)
      ctx.lineTo(xPos, height - padding)
      ctx.stroke()
    }

    // Líneas de cuadrícula horizontales
    ctx.strokeStyle = "#f3f4f6"
    for (let i = 0; i <= 5; i++) {
      const yPos = padding + (height - 2 * padding) * (i / 5)
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
    ) => {
      const validPoints = points.filter((p) => getValue(p) !== null && getValue(p) !== undefined)
      if (validPoints.length < 2) return

      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.4
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
    if (showTemperature) drawTrendLine(chartData, (p) => p.temperature, scaleYTemp, "#ef4444")
    if (showHumidity) drawTrendLine(chartData, (p) => p.humidity, scaleYHum, "#3b82f6")
    if (showLight) drawTrendLine(chartData, (p) => p.lightLevel, scaleYLight, "#f59e0b")

    // Dibujar puntos de dispersión
    chartData.forEach((point, index) => {
      const x = scaleX(point.x)
      const age = chartData.length - index - 1
      const maxAge = Math.min(chartData.length, 20)
      const baseSize = Math.max(3, 7 - (age / maxAge) * 4)

      // Temperatura
      if (showTemperature && point.temperature !== null && point.temperature !== undefined) {
        const y = scaleYTemp(point.temperature)

        ctx.fillStyle = "#ef4444"
        ctx.beginPath()
        ctx.arc(x, y, baseSize, 0, 2 * Math.PI)
        ctx.fill()

        ctx.strokeStyle = "#ffffff"
        ctx.lineWidth = 2
        ctx.stroke()

        // Efecto de brillo para el punto más reciente
        if (index === chartData.length - 1 && isRealTime && !isPaused) {
          ctx.strokeStyle = "#ef4444"
          ctx.lineWidth = 1
          ctx.globalAlpha = 0.6
          ctx.beginPath()
          ctx.arc(x, y, baseSize + 3, 0, 2 * Math.PI)
          ctx.stroke()
          ctx.globalAlpha = 1
        }
      }

      // Humedad
      if (showHumidity && point.humidity !== null && point.humidity !== undefined) {
        const y = scaleYHum(point.humidity)

        ctx.fillStyle = "#3b82f6"
        ctx.beginPath()
        ctx.arc(x - 3, y, baseSize, 0, 2 * Math.PI) // Offset para evitar superposición
        ctx.fill()

        ctx.strokeStyle = "#ffffff"
        ctx.lineWidth = 2
        ctx.stroke()

        if (index === chartData.length - 1 && isRealTime && !isPaused) {
          ctx.strokeStyle = "#3b82f6"
          ctx.lineWidth = 1
          ctx.globalAlpha = 0.6
          ctx.beginPath()
          ctx.arc(x - 3, y, baseSize + 3, 0, 2 * Math.PI)
          ctx.stroke()
          ctx.globalAlpha = 1
        }
      }

      // Nivel de luz
      if (showLight && point.lightLevel !== null && point.lightLevel !== undefined) {
        const y = scaleYLight(point.lightLevel)

        ctx.fillStyle = "#f59e0b"
        ctx.beginPath()
        ctx.arc(x + 3, y, baseSize, 0, 2 * Math.PI) // Offset para evitar superposición
        ctx.fill()

        ctx.strokeStyle = "#ffffff"
        ctx.lineWidth = 2
        ctx.stroke()

        if (index === chartData.length - 1 && isRealTime && !isPaused) {
          ctx.strokeStyle = "#f59e0b"
          ctx.lineWidth = 1
          ctx.globalAlpha = 0.6
          ctx.beginPath()
          ctx.arc(x + 3, y, baseSize + 3, 0, 2 * Math.PI)
          ctx.stroke()
          ctx.globalAlpha = 1
        }
      }
    })

    // Título
    ctx.fillStyle = "#1f2937"
    ctx.font = "bold 14px sans-serif"
    ctx.textAlign = "left"
    ctx.fillText("Sensores ESP32 - Tiempo Real", padding, 25)

    // Estadísticas en tiempo real
    if (chartData.length > 0) {
      const latest = chartData[chartData.length - 1]

      ctx.font = "11px sans-serif"
      ctx.fillStyle = "#6b7280"
      let xOffset = padding

      if (showTemperature && latest.temperature !== null && latest.temperature !== undefined) {
        ctx.fillStyle = "#ef4444"
        ctx.fillText(`🌡️ ${latest.temperature.toFixed(1)}°C`, xOffset, 45)
        xOffset += 80
      }

      if (showHumidity && latest.humidity !== null && latest.humidity !== undefined) {
        ctx.fillStyle = "#3b82f6"
        ctx.fillText(`💧 ${latest.humidity.toFixed(1)}%`, xOffset, 45)
        xOffset += 80
      }

      if (showLight && latest.lightLevel !== null && latest.lightLevel !== undefined) {
        ctx.fillStyle = "#f59e0b"
        ctx.fillText(`💡 ${latest.lightLevel}`, xOffset, 45)
      }
    }
  }, [chartData, isPaused, isRealTime, showTemperature, showHumidity, showLight])

  const resetChart = () => {
    setStartTime(Date.now())
    setChartData([])
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
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
            Gráfico Multi-Sensor Dinámico
          </CardTitle>
          <div className="flex items-center space-x-2 mt-2">
            <Badge variant={getStatusColor()}>{getStatusText()}</Badge>
            <span className="text-sm text-gray-500">{chartData.length} puntos</span>
          </div>
        </div>
        <div className="flex space-x-2">
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
        <div className="flex flex-wrap gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Switch id="show-temperature" checked={showTemperature} onCheckedChange={setShowTemperature} />
            <Label htmlFor="show-temperature" className="flex items-center text-sm">
              <Thermometer className="h-4 w-4 mr-1 text-red-500" />
              Temperatura
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="show-humidity" checked={showHumidity} onCheckedChange={setShowHumidity} />
            <Label htmlFor="show-humidity" className="flex items-center text-sm">
              <Droplets className="h-4 w-4 mr-1 text-blue-500" />
              Humedad
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="show-light" checked={showLight} onCheckedChange={setShowLight} />
            <Label htmlFor="show-light" className="flex items-center text-sm">
              <Sun className="h-4 w-4 mr-1 text-yellow-500" />
              Luz
            </Label>
          </div>
        </div>

        <div className="relative">
          <canvas
            ref={canvasRef}
            className="w-full h-96 border rounded-lg bg-white"
            style={{ width: "100%", height: "384px" }}
          />

          {/* Leyenda */}
          <div className="flex justify-center space-x-6 mt-4 text-sm">
            {showTemperature && (
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span>Temperatura (°C)</span>
              </div>
            )}
            {showHumidity && (
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <span>Humedad (%)</span>
              </div>
            )}
            {showLight && (
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                <span>Luz (0-4095)</span>
              </div>
            )}
          </div>

          {/* Estadísticas */}
          {stats && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {showTemperature && stats.temperature && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center mb-2">
                    <Thermometer className="h-4 w-4 text-red-500 mr-2" />
                    <span className="font-medium text-red-700">Temperatura</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div>
                      Actual: <span className="font-bold">{stats.temperature.current.toFixed(1)}°C</span>
                    </div>
                    <div>
                      Min: {stats.temperature.min.toFixed(1)}°C | Max: {stats.temperature.max.toFixed(1)}°C
                    </div>
                    <div>Promedio: {stats.temperature.avg.toFixed(1)}°C</div>
                  </div>
                </div>
              )}

              {showHumidity && stats.humidity && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center mb-2">
                    <Droplets className="h-4 w-4 text-blue-500 mr-2" />
                    <span className="font-medium text-blue-700">Humedad</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div>
                      Actual: <span className="font-bold">{stats.humidity.current.toFixed(1)}%</span>
                    </div>
                    <div>
                      Min: {stats.humidity.min.toFixed(1)}% | Max: {stats.humidity.max.toFixed(1)}%
                    </div>
                    <div>Promedio: {stats.humidity.avg.toFixed(1)}%</div>
                  </div>
                </div>
              )}

              {showLight && stats.light && (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center mb-2">
                    <Sun className="h-4 w-4 text-yellow-500 mr-2" />
                    <span className="font-medium text-yellow-700">Luz</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div>
                      Actual: <span className="font-bold">{stats.light.current}</span>
                    </div>
                    <div>
                      Min: {stats.light.min} | Max: {stats.light.max}
                    </div>
                    <div>Promedio: {Math.round(stats.light.avg)}</div>
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
