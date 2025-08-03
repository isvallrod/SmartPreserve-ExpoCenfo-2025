-- Script para crear tabla de datos de sensores (opcional, para base de datos real)
CREATE TABLE IF NOT EXISTS sensor_data (
    id SERIAL PRIMARY KEY,
    temperature DECIMAL(5,2) NOT NULL,
    humidity DECIMAL(5,2) NOT NULL,
    voltage DECIMAL(4,2) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para consultas por timestamp
CREATE INDEX IF NOT EXISTS idx_sensor_data_timestamp ON sensor_data(timestamp DESC);

-- Insertar datos de ejemplo
INSERT INTO sensor_data (temperature, humidity, voltage) VALUES
(23.5, 55.2, 3.3),
(24.1, 58.7, 3.2),
(22.8, 52.1, 3.4),
(25.2, 61.3, 3.1),
(23.9, 56.8, 3.3);
