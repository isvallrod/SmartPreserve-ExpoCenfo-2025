"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import TripleSensorChart from "@/components/triple-sensor-chart"
import {
  Activity,
  Brain,
  RefreshCw,
  Thermometer,
  Droplets,
  Sun,
  Send,
  BarChart3,
  TrendingUp,
  Calculator,
  MessageSquare,
  Wifi,
} from "lucide-react"

interface SensorData {
  id: string
  temperature?: number
  humidity?: number
  lightLevel?: number
  voltage?: number
  timestamp: string
}

interface ChatMessage {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: string
  analysisType?: "statistical" | "ai" | "chart"
  chartData?: any
}

export default function Dashboard() {
  const [sensorData, setSensorData] = useState<SensorData[]>([])
  const [latestData, setLatestData] = useState<SensorData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Fetch sensor data
  const fetchSensorData = async () => {
    try {
      const response = await fetch("/api/sensor-data")
      const data = await response.json()
      setSensorData(data)
      if (data.length > 0) {
        setLatestData(data[0])
      }
    } catch (error) {
      console.error("Error fetching sensor data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Process chat message
  const processChatMessage = async (message: string) => {
    if (!message.trim()) return

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: message,
      timestamp: new Date().toISOString(),
    }

    setChatMessages((prev) => [...prev, userMessage])
    setInputMessage("")
    setIsProcessing(true)

    try {
      const response = await fetch("/api/chat-analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message,
          sensorData: sensorData.slice(0, 50), // Últimos 50 datos
        }),
      })

      const result = await response.json()

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: result.response,
        timestamp: new Date().toISOString(),
        analysisType: result.analysisType,
        chartData: result.chartData,
      }

      setChatMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Error processing message:", error)

      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: "Lo siento, hubo un error procesando tu solicitud. Por favor intenta nuevamente.",
        timestamp: new Date().toISOString(),
      }

      setChatMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }

  // Quick action buttons
  const quickActions = [
    {
      label: "Análisis Completo",
      icon: Calculator,
      message: "Realiza un análisis estadístico completo de temperatura, humedad y luz",
      color: "bg-blue-500",
    },
    {
      label: "Análisis con IA",
      icon: Brain,
      message: "Analiza todos los sensores con IA y dame recomendaciones ambientales",
      color: "bg-purple-500",
    },
    {
      label: "Correlaciones",
      icon: BarChart3,
      message: "Analiza las correlaciones entre temperatura, humedad y luz",
      color: "bg-green-500",
    },
    {
      label: "Confort Ambiental",
      icon: TrendingUp,
      message: "Evalúa las condiciones de confort ambiental basado en todos los sensores",
      color: "bg-orange-500",
    },
  ]

  useEffect(() => {
    fetchSensorData()
    const interval = setInterval(fetchSensorData, 3000) // Actualizar cada 3 segundos
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  // Initialize chat with welcome message
  useEffect(() => {
    if (chatMessages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: "welcome",
        type: "assistant",
        content: `¡Hola! 👋 Soy tu asistente de análisis ambiental ESP32. 

Ahora monitoreo **3 sensores simultáneamente**:

🌡️ **Temperatura DHT11**: Análisis térmico preciso
💧 **Humedad DHT11**: Monitoreo de humedad relativa  
💡 **Sensor de Luz LDR**: Niveles de iluminación ambiente

📊 **Gráfico Triple Sensor**: Visualización simultánea con controles independientes

**Análisis disponibles:**
• "¿Cómo están las condiciones ambientales?"
• "Correlación entre temperatura y humedad"
• "¿La luz afecta la temperatura?"
• "Análisis de confort ambiental"
• "Estadísticas completas de todos los sensores"

¿Qué análisis te interesa?`,
        timestamp: new Date().toISOString(),
      }
      setChatMessages([welcomeMessage])
    }
  }, [])

  const getTemperatureStatus = (temp: number) => {
    if (temp < 15) return { status: "Frío", variant: "secondary" as const }
    if (temp < 25) return { status: "Templado", variant: "default" as const }
    if (temp < 30) return { status: "Cálido", variant: "default" as const }
    return { status: "Caliente", variant: "destructive" as const }
  }

  const getHumidityStatus = (hum: number) => {
    if (hum < 30) return { status: "Seco", variant: "destructive" as const }
    if (hum < 60) return { status: "Confortable", variant: "default" as const }
    if (hum < 70) return { status: "Húmedo", variant: "secondary" as const }
    return { status: "Muy Húmedo", variant: "destructive" as const }
  }

  const getLightStatus = (light: number) => {
    if (light < 500) return { status: "Muy Oscuro", variant: "destructive" as const }
    if (light < 1500) return { status: "Oscuro", variant: "secondary" as const }
    if (light < 3000) return { status: "Medio", variant: "default" as const }
    return { status: "Muy Brillante", variant: "default" as const }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Conectando con ESP32...</p>
          <p className="text-sm text-gray-500 mt-2">DHT11 + LDR</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">ESP32 Estación Ambiental</h1>
            <Badge variant="outline" className="bg-white">
              <Wifi className="h-3 w-3 mr-1" />
              DHT11 + LDR + IA
            </Badge>
          </div>
          <p className="text-gray-600">Monitoreo ambiental completo con análisis inteligente en tiempo real</p>
        </div>

        {/* Status Cards */}
        {latestData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            {/* Temperatura */}
            {latestData.temperature !== null && latestData.temperature !== undefined && (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Temperatura</CardTitle>
                  <Thermometer className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{latestData.temperature.toFixed(1)}°C</div>
                  <div className="text-xs text-muted-foreground mb-2">DHT11</div>
                  <Badge variant={getTemperatureStatus(latestData.temperature).variant}>
                    {getTemperatureStatus(latestData.temperature).status}
                  </Badge>
                </CardContent>
              </Card>
            )}

            {/* Humedad */}
            {latestData.humidity !== null && latestData.humidity !== undefined && (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Humedad</CardTitle>
                  <Droplets className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{latestData.humidity.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground mb-2">DHT11</div>
                  <Badge variant={getHumidityStatus(latestData.humidity).variant}>
                    {getHumidityStatus(latestData.humidity).status}
                  </Badge>
                </CardContent>
              </Card>
            )}

            {/* Luz */}
            {latestData.lightLevel !== null && latestData.lightLevel !== undefined && (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Nivel de Luz</CardTitle>
                  <Sun className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{latestData.lightLevel}</div>
                  <div className="text-xs text-muted-foreground mb-2">LDR</div>
                  <Badge variant={getLightStatus(latestData.lightLevel).variant}>
                    {getLightStatus(latestData.lightLevel).status}
                  </Badge>
                </CardContent>
              </Card>
            )}

            {/* Total Datos */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Datos</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sensorData.length}</div>
                <div className="text-xs text-muted-foreground mb-2">Registros</div>
                <Badge variant="default">Activo</Badge>
              </CardContent>
            </Card>

            {/* Estado */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estado</CardTitle>
                <Activity className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Online</div>
                <div className="text-xs text-muted-foreground mb-2">
                  {latestData ? new Date(latestData.timestamp).toLocaleTimeString("es-ES") : "---"}
                </div>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  3 Sensores
                </Badge>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Triple Sensor Chart */}
        <div className="mb-8">
          <TripleSensorChart data={sensorData} isRealTime={true} maxPoints={150} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Data */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Datos Ambientales</CardTitle>
                <CardDescription>Stream triple sensor</CardDescription>
              </div>
              <Button onClick={fetchSensorData} variant="outline" size="sm" className="bg-white/50">
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80">
                <div className="space-y-3">
                  {sensorData.slice(0, 15).map((data, index) => (
                    <div
                      key={data.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-300 ${
                        index === 0
                          ? "bg-gradient-to-r from-red-50 via-blue-50 to-yellow-50 border-blue-200 shadow-sm"
                          : "bg-gradient-to-r from-gray-50 to-blue-50"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`p-1.5 rounded-full ${index === 0 ? "bg-gradient-to-r from-red-500 to-blue-500" : "bg-gray-100"}`}
                        >
                          <Activity className={`h-3 w-3 ${index === 0 ? "text-white" : "text-gray-600"}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            🌡️ {data.temperature?.toFixed(1) || "N/A"}°C | 💧 {data.humidity?.toFixed(1) || "N/A"}% | 💡{" "}
                            {data.lightLevel || "N/A"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(data.timestamp).toLocaleTimeString("es-ES")}
                          </p>
                        </div>
                      </div>
                      {index === 0 && (
                        <Badge
                          variant="default"
                          className="bg-gradient-to-r from-red-500 to-blue-500 text-white text-xs"
                        >
                          Nuevo
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Interface */}
          <Card className="lg:col-span-2 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
                Asistente Ambiental IA
              </CardTitle>
              <CardDescription>Análisis inteligente de temperatura, humedad y luz</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Actions */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="h-auto p-2 flex flex-col items-center gap-1 bg-white/50 hover:bg-white/80"
                    onClick={() => processChatMessage(action.message)}
                    disabled={isProcessing}
                  >
                    <div className={`p-1.5 rounded-full ${action.color}`}>
                      <action.icon className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-xs text-center">{action.label}</span>
                  </Button>
                ))}
              </div>

              <Separator />

              {/* Chat Messages */}
              <ScrollArea className="h-96 w-full">
                <div className="space-y-4 pr-4">
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          message.type === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                        {message.chartData && (
                          <div className="mt-3 p-3 bg-white rounded border">
                            <div className="text-xs text-gray-500 mb-2">Datos del análisis:</div>
                            <pre className="text-xs overflow-x-auto">{JSON.stringify(message.chartData, null, 2)}</pre>
                          </div>
                        )}
                        <div className="text-xs opacity-70 mt-1">
                          {new Date(message.timestamp).toLocaleTimeString("es-ES")}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isProcessing && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 text-gray-900 p-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Analizando sensores ambientales...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              {/* Chat Input */}
              <div className="flex space-x-2">
                <Input
                  placeholder="Pregunta sobre temperatura, humedad, luz o ambiente..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      processChatMessage(inputMessage)
                    }
                  }}
                  disabled={isProcessing}
                  className="bg-white/50"
                />
                <Button
                  onClick={() => processChatMessage(inputMessage)}
                  disabled={isProcessing || !inputMessage.trim()}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
