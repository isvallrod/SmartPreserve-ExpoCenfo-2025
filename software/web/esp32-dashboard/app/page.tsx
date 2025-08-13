"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import TripleSensorChart from "@/components/triple-sensor-chart"
import FoodMonitoringDashboard from "@/components/food-monitoring-dashboard"
import { Activity, Brain, RefreshCw, Thermometer, Droplets, Sun, Send, BarChart3, TrendingUp, Calculator, MessageSquare, Wifi, Snowflake, ShieldCheck, AlertTriangle, CheckCircle } from 'lucide-react'

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
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "error">("disconnected")
  const [lastDataTime, setLastDataTime] = useState<Date | null>(null)
  const [selectedFood, setSelectedFood] = useState<string>("");

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
      
      if (Array.isArray(data) && data.length > 0) {
        setSensorData(data)
        setLatestData(data[0])
        setLastDataTime(new Date(data[0].timestamp))
        setConnectionStatus("connected")
      } else {
        // Si no hay datos, mantener el estado anterior pero marcar como desconectado si es muy antiguo
        if (lastDataTime && (Date.now() - lastDataTime.getTime()) > 30000) { // 30 segundos
          setConnectionStatus("disconnected")
        }
      }
    } catch (error) {
      console.error("Error fetching sensor data:", error)
      setConnectionStatus("error")
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

      setChatMessages((prev) => [...prev, assistantMessage]);

      // Check for actionData to update selected food
      if (result.actionData && result.actionData.selectedFood) {
        setSelectedFood(result.actionData.selectedFood); // Update the selected food state
      }
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

  // Quick action buttons for food monitoring
  const quickActions = [
    {
      label: "Seleccionar Alimento",
      icon: ShieldCheck,
      message: "Quiero seleccionar un tipo de alimento para monitorear en la cámara frigorífica",
      color: "bg-blue-500",
    },
    {
      label: "Análisis Temperatura",
      icon: Thermometer,
      message: "Analizar la temperatura actual y su impacto en la conservación de alimentos",
      color: "bg-red-500",
    },
    {
      label: "Estado LEDs",
      icon: Brain,
      message: "¿Cuál es el estado actual de los LEDs y qué significan?",
      color: "bg-green-500",
    },
    {
      label: "Configurar Sistema",
      icon: Calculator,
      message: "Quiero configurar el sistema de monitoreo y alertas",
      color: "bg-purple-500",
    },
  ]

  // Check connection status based on last data received
  useEffect(() => {
    const checkConnection = () => {
      if (lastDataTime) {
        const timeDiff = Date.now() - lastDataTime.getTime()
        if (timeDiff > 15000) { // 15 segundos sin datos
          setConnectionStatus("disconnected")
        } else if (timeDiff > 30000) { // 30 segundos sin datos
          setConnectionStatus("error")
        }
      }
    }

    const interval = setInterval(checkConnection, 5000)
    return () => clearInterval(interval)
  }, [lastDataTime])

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
        content: `🧊 **¡Bienvenido al Sistema Inteligente de Conservación de Alimentos!**

**🎯 Soy tu Asistente IA Especializado en:**
• 🍖 Selección y configuración de tipos de alimentos
• 🌡️ Análisis de temperatura y condiciones de conservación
• 🚦 Control automático de LEDs de alerta
• 📊 Monitoreo en tiempo real de cámara frigorífica
• 🛡️ Evaluación de seguridad alimentaria

**🚀 COMANDOS PRINCIPALES:**

**1. Seleccionar Alimento:**
• "Quiero monitorear carnes rojas"
• "Seleccionar pollo para conservación"
• "Configurar para quesos duros"

**2. Consultas de Análisis:**
• "¿Cómo está la temperatura actual?"
• "Analizar seguridad alimentaria"
• "¿Por qué está encendido el LED rojo?"

**3. Configuración del Sistema:**
• "Configurar alertas"
• "Estado del sistema"
• "Cambiar tipo de alimento"

**🚦 Sistema de LEDs Automático:**
• 🟢 **Verde**: Temperatura óptima
• 🟡 **Amarillo**: Advertencia (revisar)
• 🔴 **Rojo**: CRÍTICO (acción inmediata)

**📋 Tipos de Alimentos Disponibles:**
🥩 Carnes Rojas • 🐔 Pollo • 🐟 Pescados • 🥛 Lácteos
🧀 Quesos • 🥓 Embutidos • 🥬 Verduras • 🍎 Frutas

**💬 ¿Qué tipo de alimento quieres monitorear?**
*Ejemplo: "Seleccionar carnes rojas" o "Monitorear pescado fresco"*`,
      timestamp: new Date().toISOString(),
    }
    setChatMessages([welcomeMessage])
  }
}, [])

  const getTemperatureStatus = (temp: number) => {
    if (temp < -5) return { status: "Congelación", variant: "secondary" as const, icon: "🧊" }
    if (temp < 0) return { status: "Muy Frío", variant: "default" as const, icon: "❄️" }
    if (temp < 4) return { status: "Refrigeración", variant: "default" as const, icon: "🧊" }
    if (temp < 8) return { status: "Fresco", variant: "secondary" as const, icon: "🌡️" }
    return { status: "Riesgo", variant: "destructive" as const, icon: "🚨" }
  }

  const getHumidityStatus = (hum: number) => {
    if (hum < 70) return { status: "Seco", variant: "secondary" as const, icon: "🏜️" }
    if (hum < 85) return { status: "Óptimo", variant: "default" as const, icon: "💧" }
    if (hum < 95) return { status: "Húmedo", variant: "secondary" as const, icon: "💦" }
    return { status: "Exceso", variant: "destructive" as const, icon: "🌊" }
  }

  const getLightStatus = (light: number) => {
    if (light < 100) return { status: "Oscuro", variant: "default" as const, icon: "🌙" }
    if (light < 500) return { status: "Tenue", variant: "secondary" as const, icon: "🕯️" }
    if (light < 1500) return { status: "Medio", variant: "secondary" as const, icon: "💡" }
    return { status: "Brillante", variant: "destructive" as const, icon: "☀️" }
  }

  const getConnectionStatusInfo = () => {
    switch (connectionStatus) {
      case "connected":
        return {
          icon: <CheckCircle className="h-4 w-4 text-green-500" />,
          text: "ESP32 Conectado",
          variant: "default" as const,
          color: "bg-green-100 text-green-800"
        }
      case "disconnected":
        return {
          icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
          text: "ESP32 Desconectado",
          variant: "secondary" as const,
          color: "bg-yellow-100 text-yellow-800"
        }
      case "error":
        return {
          icon: <RefreshCw className="h-4 w-4 text-red-500" />,
          text: "Error de Conexión",
          variant: "destructive" as const,
          color: "bg-red-100 text-red-800"
        }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Conectando con Cámara Frigorífica...</p>
          <p className="text-sm text-gray-500 mt-2">Sistema de Conservación de Alimentos</p>
          <div className="mt-4 flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse delay-100"></div>
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse delay-200"></div>
          </div>
        </div>
      </div>
    )
  }

  const connectionInfo = getConnectionStatusInfo()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
              <Snowflake className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Sistema de Conservación de Alimentos</h1>
            <Badge variant="outline" className="bg-white">
              <ShieldCheck className="h-3 w-3 mr-1" />
              Cámara Frigorífica + IA
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-gray-600">Monitoreo inteligente para conservación segura de carnes, quesos y alimentos</p>
            <div className="flex items-center space-x-2">
              <Badge variant={connectionInfo.variant} className={connectionInfo.color}>
                {connectionInfo.icon}
                {connectionInfo.text}
              </Badge>
              {lastDataTime && (
                <span className="text-xs text-gray-500">
                  Última actualización: {lastDataTime.toLocaleTimeString("es-ES")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Connection Alert */}
        {connectionStatus !== "connected" && (
          <div className="mb-6">
            <div className={`p-4 rounded-lg border ${
              connectionStatus === "error" 
                ? "bg-red-50 border-red-200 text-red-800" 
                : "bg-yellow-50 border-yellow-200 text-yellow-800"
            }`}>
              <div className="flex items-center">
                {connectionInfo.icon}
                <div className="ml-3">
                  <h3 className="text-sm font-medium">
                    {connectionStatus === "error" ? "Error de Conexión ESP32" : "ESP32 Desconectado"}
                  </h3>
                  <p className="text-sm mt-1">
                    {connectionStatus === "error" 
                      ? "No se pueden recibir datos del ESP32. Verifica la conexión WiFi y la configuración."
                      : "No se han recibido datos recientes del ESP32. Los LEDs pueden no funcionar correctamente."
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

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
                  <div className="text-xs text-muted-foreground mb-2">Cámara Frigorífica</div>
                  <Badge variant={getTemperatureStatus(latestData.temperature).variant}>
                    {getTemperatureStatus(latestData.temperature).icon}
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
                  <div className="text-xs text-muted-foreground mb-2">Humedad Relativa</div>
                  <Badge variant={getHumidityStatus(latestData.humidity).variant}>
                    {getHumidityStatus(latestData.humidity).icon}
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
                  <div className="text-xs text-muted-foreground mb-2">Ambiente</div>
                  <Badge variant={getLightStatus(latestData.lightLevel).variant}>
                    {getLightStatus(latestData.lightLevel).icon}
                    {getLightStatus(latestData.lightLevel).status}
                  </Badge>
                </CardContent>
              </Card>
            )}

            {/* Total Datos */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Registros</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sensorData.length}</div>
                <div className="text-xs text-muted-foreground mb-2">Datos Históricos</div>
                <Badge variant="default">
                  {sensorData.length > 0 ? "Con Datos" : "Sin Datos"}
                </Badge>
              </CardContent>
            </Card>

            {/* Estado del Sistema */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sistema</CardTitle>
                <Activity className={`h-4 w-4 ${connectionStatus === "connected" ? "text-green-500" : "text-red-500"}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${connectionStatus === "connected" ? "text-green-600" : "text-red-600"}`}>
                  {connectionStatus === "connected" ? "Online" : "Offline"}
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  {latestData ? new Date(latestData.timestamp).toLocaleTimeString("es-ES") : "---"}
                </div>
                <Badge variant={connectionInfo.variant} className={connectionInfo.color}>
                  {connectionInfo.text}
                </Badge>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Food Monitoring Dashboard */}
        {latestData && (
          <div className="mb-8">
            <FoodMonitoringDashboard
              currentTemp={latestData.temperature || 0}
              currentHumidity={latestData.humidity}
              isConnected={connectionStatus === "connected"}
              selectedFood={selectedFood} // Pass selectedFood
              onSelectedFoodChange={setSelectedFood} // Pass setter
            />
          </div>
        )}

        {/* Triple Sensor Chart */}
        <div className="mb-8">
          <TripleSensorChart data={sensorData} isRealTime={connectionStatus === "connected"} maxPoints={150} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Data */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Datos de Conservación</CardTitle>
                <CardDescription>Monitoreo continuo ESP32</CardDescription>
              </div>
              <Button onClick={fetchSensorData} variant="outline" size="sm" className="bg-white/50">
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80">
                <div className="space-y-3">
                  {sensorData.length === 0 ? (
                    <div className="text-center py-8">
                      <Wifi className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-500">Esperando datos del ESP32...</p>
                      <p className="text-xs text-gray-400 mt-1">Verifica la conexión WiFi</p>
                    </div>
                  ) : (
                    sensorData.slice(0, 15).map((data, index) => (
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
                            className={`p-1.5 rounded-full ${
                              index === 0 ? "bg-gradient-to-r from-red-500 to-blue-500" : "bg-gray-100"
                            }`}
                          >
                            <Snowflake className={`h-3 w-3 ${index === 0 ? "text-white" : "text-gray-600"}`} />
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
                            Actual
                          </Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Interface */}
          <Card className="lg:col-span-2 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
                Asistente de Seguridad Alimentaria IA
              </CardTitle>
              <CardDescription>Análisis especializado en conservación de alimentos con control de LEDs</CardDescription>
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
                          <span className="text-sm">Analizando seguridad alimentaria...</span>
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
                  placeholder="Pregunta sobre conservación, seguridad alimentaria, LEDs o condiciones..."
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

              {/* ESP32 Connection Status */}
              <div className="text-xs text-center text-gray-500 border-t pt-2">
                <div className="flex items-center justify-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus === "connected" ? "bg-green-500 animate-pulse" : 
                    connectionStatus === "disconnected" ? "bg-yellow-500" : "bg-red-500"
                  }`}></div>
                  <span>
                    ESP32 {connectionStatus === "connected" ? "conectado" : "desconectado"} • 
                    LEDs {connectionStatus === "connected" ? "activos" : "inactivos"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
