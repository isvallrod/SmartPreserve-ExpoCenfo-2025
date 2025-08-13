import type React from "react"
import type { Metadata } from "next"
import { Inter } from 'next/font/google'
import "./globals.css"

// Configuración de la fuente Inter de Google Fonts
const inter = Inter({ subsets: ["latin"] })

// Metadatos de la aplicación que aparecen en el navegador
export const metadata: Metadata = {
  title: "ESP32 Dashboard - Monitoreo IoT",
  description: "Dashboard para monitorear datos de sensores ESP32 con análisis IA",
    generator: 'v0.app'
}

/**
 * Layout principal de la aplicación Next.js
 * Este componente envuelve todas las páginas de la aplicación
 *
 * @param children - Componentes hijos que se renderizan dentro del layout
 * @returns JSX del layout principal con configuración de fuente y estructura HTML
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
