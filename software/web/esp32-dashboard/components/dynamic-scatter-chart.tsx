"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Pause, Play, RotateCcw } from "lucide-react"

interface DataPoint {
  x: number // timestamp en minutos desde el inicio
  y: number // valor del sensor
  timestamp: string
  id: string
}

interface DynamicScatterChartProps {
  data: any[]
  isRealTime?: boolean
  maxPoints?: number
}

export default function DynamicScatterChart({ data, isRealTime = true, maxPoints = 100 }: DynamicScatterChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [chartData, setChartData] = useState<DataPoint[]>([])
  const [startTime, setStartTime] = useState<number>(Date.now())

  // Convertir datos a puntos del gráfico
  useEffect(() => {
    if (!data || data.length === 0) return

    const baseTime = startTime
    const points: DataPoint[] = data
      .filter((d) => d.lightLevel !== null && d.lightLevel !== undefined)
      .slice(0, maxPoints)
      .map((d, index) => ({
        x: (new Date(d.timestamp).getTime() - baseTime) / (1000 * 60), // minutos desde el inicio
        y: d.lightLevel,
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
    const padding = 60

    // Limpiar canvas
    ctx.clearRect(0, 0, width, height)

    // Calcular rangos
    const xValues = chartData.map((d) => d.x)
    const yValues = chartData.map((d) => d.y)

    const xMin = Math.min(...xValues, 0)
    const xMax = Math.max(...xValues, 10)
    const yMin = Math.min(...yValues, 0)
    const yMax = Math.max(...yValues, 4095)

    // Funciones de escala
    const scaleX = (x: number) => padding + ((x - xMin) / (xMax - xMin)) * (width - 2 * padding)
    const scaleY = (y: number) => height - padding - ((y - yMin) / (yMax - yMin)) * (height - 2 * padding)

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

    // Etiquetas del eje Y
    ctx.fillStyle = "#6b7280"
    ctx.font = "12px sans-serif"
    ctx.textAlign = "right"

    for (let i = 0; i <= 5; i++) {
      const y = yMin + (yMax - yMin) * (i / 5)
      const yPos = scaleY(y)
      ctx.fillText(Math.round(y).toString(), padding - 10, yPos + 4)

      // Líneas de cuadrícula horizontales
      ctx.strokeStyle = "#f3f4f6"
      ctx.beginPath()
      ctx.moveTo(padding, yPos)
      ctx.lineTo(width - padding, yPos)
      ctx.stroke()
    }

    // Etiquetas del eje X (tiempo)
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

    // Dibujar línea de tendencia
    if (chartData.length > 1) {
      ctx.strokeStyle = "#3b82f6"
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.3
      ctx.beginPath()

      chartData.forEach((point, index) => {
        const x = scaleX(point.x)
        const y = scaleY(point.y)

        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })

      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // Dibujar puntos de dispersión
    chartData.forEach((point, index) => {
      const x = scaleX(point.x)
      const y = scaleY(point.y)

      // Color basado en el valor
      let color = "#ef4444" // rojo para valores bajos
      if (point.y > 1500) color = "#f59e0b" // amarillo para valores medios
      if (point.y > 3000) color = "#10b981" // verde para valores altos

      // Tamaño basado en qué tan reciente es el punto
      const age = chartData.length - index - 1
      const maxAge = Math.min(chartData.length, 20)
      const size = Math.max(3, 8 - (age / maxAge) * 5)

      // Punto principal
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x, y, size, 0, 2 * Math.PI)
      ctx.fill()

      // Borde del punto
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 2
      ctx.stroke()

      // Efecto de brillo para el punto más reciente
      if (index === chartData.length - 1 && isRealTime && !isPaused) {
        ctx.strokeStyle = color
        ctx.lineWidth = 1
        ctx.globalAlpha = 0.5
        ctx.beginPath()
        ctx.arc(x, y, size + 4, 0, 2 * Math.PI)
        ctx.stroke()
        ctx.globalAlpha = 1
      }
    })

    // Título y estadísticas
    ctx.fillStyle = "#1f2937"
    ctx.font = "bold 14px sans-serif"
    ctx.textAlign = "left"
    ctx.fillText("Nivel de Luz - Tiempo Real", padding, 30)

    // Estadísticas en tiempo real
    if (chartData.length > 0) {
      const latest = chartData[chartData.length - 1]
      const avg = chartData.reduce((sum, p) => sum + p.y, 0) / chartData.length

      ctx.font = "12px sans-serif"
      ctx.fillStyle = "#6b7280"
      ctx.fillText(`Actual: ${latest.y}`, padding, 50)
      ctx.fillText(`Promedio: ${Math.round(avg)}`, padding + 100, 50)
      ctx.fillText(`Puntos: ${chartData.length}`, padding + 200, 50)
    }
  }, [chartData, isPaused, isRealTime])

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

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
            Gráfico de Dispersión Dinámico
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
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="w-full h-80 border rounded-lg bg-white"
            style={{ width: "100%", height: "320px" }}
          />

          {/* Leyenda */}
          <div className="flex justify-center space-x-6 mt-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <span>Oscuro (0-1500)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
              <span>Medio (1500-3000)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span>Brillante (3000+)</span>
            </div>
          </div>

          {/* Información adicional */}
          {chartData.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Último valor:</span>
                  <div className="text-lg font-bold text-blue-600">{chartData[chartData.length - 1]?.y || 0}</div>
                </div>
                <div>
                  <span className="font-medium">Mínimo:</span>
                  <div className="text-lg font-bold text-red-600">{Math.min(...chartData.map((d) => d.y))}</div>
                </div>
                <div>
                  <span className="font-medium">Máximo:</span>
                  <div className="text-lg font-bold text-green-600">{Math.max(...chartData.map((d) => d.y))}</div>
                </div>
                <div>
                  <span className="font-medium">Promedio:</span>
                  <div className="text-lg font-bold text-purple-600">
                    {Math.round(chartData.reduce((sum, d) => sum + d.y, 0) / chartData.length)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
