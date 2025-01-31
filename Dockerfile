# Usar una imagen base de Node.js 22.4.1
FROM node:22.4.1-alpine

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /Backend

# Copiar el archivo package.json y package-lock.json (si existe)
COPY ./Backend/package*.json ./

# Instalar dependencias del proyecto
RUN npm install

# Instalar nodemon y forever globalmente
RUN npm install -g nodemon forever

# Copiar todos los archivos del proyecto en el contenedor
COPY ./Backend .

# No establecer un CMD aquí, el script bash lo controlará