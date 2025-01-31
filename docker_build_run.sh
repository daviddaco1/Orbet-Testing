#!/bin/bash

# Nombre base de la imagen
IMAGE_NAME="orbet_server"
MODE=$1

# Verificar el modo (test o start) pasado como argumento
if [ -z "$MODE" ]; then
  echo "Modo no especificado. Usa 'test' o 'start'."
  exit 1
fi

# Formato del nombre de la imagen con el modo
IMAGE_TAG="$IMAGE_NAME:$MODE"

# Verificar si la imagen ya existe y eliminarla si es necesario
EXISTING_IMAGE=$(docker images -q $IMAGE_TAG)

if [ -n "$EXISTING_IMAGE" ]; then
  echo "La imagen $IMAGE_TAG ya existe. Eliminando la imagen..."
  docker rmi -f $IMAGE_TAG
fi

# Construir la nueva imagen, sin caché
echo "Construyendo la nueva imagen Docker con el tag $IMAGE_TAG..."
docker build --no-cache -t $IMAGE_TAG .

# Limpiar imágenes no utilizadas (opcional, para mantener limpio el sistema)
docker image prune -f

# Configurar el nombre del contenedor basado en el modo
if [ "$MODE" = "test" ]; then
  CONTAINER_NAME="${IMAGE_NAME}_test"
  echo "Ejecutando en modo TEST con nodemon..."
  
  # Verificar si el contenedor de test ya existe
  if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
    echo "Deteniendo el contenedor TEST existente..."
    docker stop $CONTAINER_NAME
    docker rm $CONTAINER_NAME
  fi
  
  # Montar el directorio local para detectar cambios con nodemon
  docker run -d --name $CONTAINER_NAME -p 52305:52305 -p 3004:3004 \
    -v $(pwd)/Backend:/Backend \
    -v /home/vendaris/Orbet2.0/static/:/app/static/ \
    $IMAGE_TAG npm run test

  # Captura de Ctrl+C para detener los logs y el contenedor en modo test
  trap 'echo "Deteniendo el contenedor en modo TEST..."; docker stop $CONTAINER_NAME; exit 0' SIGINT
else
  CONTAINER_NAME="${IMAGE_NAME}_prod"
  echo "Ejecutando en modo START con forever..."
  
  # Verificar si el contenedor de producción ya existe
  if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
    echo "Deteniendo el contenedor PROD existente..."
    docker stop $CONTAINER_NAME
    docker rm $CONTAINER_NAME
  fi

  # Ejecutar sin montar el directorio local pero montando el volumen del CDN
  docker run -d --name $CONTAINER_NAME -p 52305:52305 -p 3004:3004 \
    -v /home/vendaris/Orbet2.0/static/cdn_storage:/app/static/cdn_storage \
    $IMAGE_TAG npm run start

  # Captura de Ctrl+C para detener solo los logs en modo start
  trap 'kill $!' EXIT
fi

# Mostrar logs del contenedor
echo "Mostrando logs del contenedor (presiona Ctrl+C para salir)..."
docker logs -f $CONTAINER_NAME &

# Mantener el script en ejecución
wait