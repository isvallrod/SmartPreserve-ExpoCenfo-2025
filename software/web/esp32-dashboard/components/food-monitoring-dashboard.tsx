"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import LedControlPanel from "@/components/led-control-panel"
import { Thermometer, Droplets, AlertTriangle, CheckCircle, XCircle, Clock, Beef, RefreshCw, Shield } from 'lucide-react'

interface FoodMonitorProps {
  currentTemp: number
  currentHumidity?: number
  isConnected: boolean
  selectedFood: string // Add this prop
  onSelectedFoodChange: (foodType: string) => void // Add this prop
}

const FOOD_TYPES = {
  carnes: { name: "Carnes Rojas", icon: "🥩" },
  pollo: { name: "Pollo y Aves", icon: "🐔" },
  pescado: { name: "Pescados y Mariscos", icon: "🐟" },
  lacteos: { name: "Productos Lácteos", icon: "🥛" },
  quesos_duros: { name: "Quesos Duros", icon: "🧀" },
  quesos_blandos: { name: "Quesos Blandos", icon: "🧀" },
  embutidos: { name: "Embutidos", icon: "🥓" },
  verduras: { name: "Verduras Frescas", icon: "🥬" },
  frutas: { name: "Frutas Frescas", icon: "🍎" },
}

export default function FoodMonitoringDashboard({ currentTemp, currentHumidity, isConnected, selectedFood, onSelectedFoodChange }: FoodMonitorProps) {
  // const [selectedFood, setSelectedFood] = useState<string>("")
  const [analysis, setAnalysis] = useState<any>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Auto-análisis cuando cambia la temperatura o el alimento seleccionado
  useEffect(() => {
    if (selectedFood && currentTemp !== undefined) {
      analyzeFood()
    }
  }, [selectedFood, currentTemp, currentHumidity])

  const analyzeFood = async () => {
    if (!selectedFood) return

    setIsAnalyzing(true)
    try {
      const response = await fetch("/api/food-monitor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          foodType: selectedFood,
          currentTemp: currentTemp,
          currentHumidity: currentHumidity,
          duration: "current",
        }),
      })

      const result = await response.json()
      setAnalysis(result)
      setLastUpdate(new Date())
    } catch (error) {
      console.error("Error en análisis:", error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive"
      case "danger":
        return "destructive"
      case "warning":
        return "secondary"
      case "safe":
        return "default"
      default:
        return "outline"
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircle className="h-4 w-4" />
      case "danger":
        return <AlertTriangle className="h-4 w-4" />
      case "warning":
        return <AlertTriangle className="h-4 w-4" />
      case "safe":
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "CRÍTICO":
        return "bg-red-100 text-red-800 border-red-200"
      case "ALTO":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "MEDIO":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "BAJO":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <div className="space-y-6">
      {/* Selector de Alimento */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Beef className="h-5 w-5 mr-2 text-blue-600" />
            Seleccionar Tipo de Alimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Select value={selectedFood} onValueChange={onSelectedFoodChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona el tipo de alimento a monitorear" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FOOD_TYPES).map(([key, food]) => (
                  <SelectItem key={key} value={key}>
                    {food.icon} {food.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={analyzeFood} disabled={!selectedFood || isAnalyzing} className="bg-blue-600">
              {isAnalyzing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              {isAnalyzing ? "Analizando..." : "Analizar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Panel de Control de LEDs */}
      {selectedFood && (
        <LedControlPanel
          selectedFood={selectedFood}
          currentTemp={currentTemp}
          isConnected={isConnected} // <-- PASS THE PROP DOWN
        />
      )}

      {/* Alertas Críticas */}
      {analysis?.alerts && analysis.alerts.length > 0 && (
        <div className="space-y-3">
          {analysis.alerts.map((alert: any, index: number) => (
            <Alert
              key={index}
              className={`${
                alert.type === "CRITICAL"
                  ? "border-red-500 bg-red-50"
                  : alert.type === "WARNING"
                    ? "border-yellow-500 bg-yellow-50"
                    : "border-blue-500 bg-blue-50"
              }`}
            >
              {alert.type === "CRITICAL" ? (
                <XCircle className="h-4 w-4 text-red-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              )}
              <AlertTitle className="text-sm font-semibold">{alert.message}</AlertTitle>
              <AlertDescription className="text-sm">
                <strong>Acción requerida:</strong> {alert.action}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Estado Actual */}
      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Condiciones Actuales */}
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Condiciones Actuales</CardTitle>
              <p className="text-sm text-gray-600">
                {FOOD_TYPES[selectedFood as keyof typeof FOOD_TYPES]?.icon}{" "}
                {FOOD_TYPES[selectedFood as keyof typeof FOOD_TYPES]?.name}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Thermometer className="h-4 w-4 mr-2 text-red-500" />
                  <span className="text-sm font-medium">Temperatura</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold">{currentTemp}°C</span>
                  <Badge variant={getSeverityColor(analysis.status.severity)}>
                    {getSeverityIcon(analysis.status.severity)}
                    {analysis.status.status}
                  </Badge>
                </div>
              </div>

              {currentHumidity && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Droplets className="h-4 w-4 mr-2 text-blue-500" />
                    <span className="text-sm font-medium">Humedad</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold">{currentHumidity}%</span>
                    {analysis.humidityStatus && (
                      <Badge variant={getSeverityColor(analysis.humidityStatus.severity)}>
                        {getSeverityIcon(analysis.humidityStatus.severity)}
                        {analysis.humidityStatus.status}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-500 text-center">
                Última actualización: {lastUpdate.toLocaleTimeString("es-ES")}
              </div>
            </CardContent>
          </Card>

          {/* Condiciones Recomendadas */}
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Condiciones Recomendadas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-800">Temperatura Óptima</span>
                  <Thermometer className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-lg font-bold text-green-700">{analysis.recommendedConditions.temperatureRange}</div>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-800">Humedad Óptima</span>
                  <Droplets className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-lg font-bold text-blue-700">{analysis.recommendedConditions.humidityRange}</div>
              </div>

              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-800">Vida Útil Esperada</span>
                  <Clock className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-lg font-bold text-purple-700">{analysis.recommendedConditions.shelfLife}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Análisis IA */}
      {analysis?.aiAnalysis && (
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-purple-600" />
              Análisis de Seguridad Alimentaria con IA
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge className={getRiskLevelColor(analysis.aiAnalysis.riskLevel)}>
                Nivel de Riesgo: {analysis.aiAnalysis.riskLevel}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">🔍 Evaluación de Seguridad</h4>
                <p className="text-sm text-gray-700">{analysis.aiAnalysis.safetyAssessment}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">📊 Impacto en Calidad</h4>
                <p className="text-sm text-gray-700">{analysis.aiAnalysis.qualityImpact}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">⏰ Tiempo Estimado</h4>
                <p className="text-sm text-gray-700">{analysis.aiAnalysis.timeToDeterioration}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">⚠️ Consecuencias</h4>
                <p className="text-sm text-gray-700">{analysis.aiAnalysis.consequences}</p>
              </div>
            </div>

            {analysis.aiAnalysis.recommendations && analysis.aiAnalysis.recommendations.length > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-sm mb-3 text-blue-800">💡 Recomendaciones Específicas</h4>
                <ul className="space-y-2">
                  {analysis.aiAnalysis.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="flex items-start text-sm text-blue-700">
                      <span className="mr-2">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
