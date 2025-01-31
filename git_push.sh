#!/bin/bash

# Pedir el nombre de la rama
read -p "Introduce el nombre de la rama: " branch_name

# Pedir el mensaje de commit
read -p "Introduce el mensaje para el commit: " commit_message

# Pedir la descripción del commit
read -p "Introduce la descripción del commit: " commit_description

# Cambiar a la rama especificada
git checkout $branch_name

# Añadir todos los cambios al área de preparación
git add .

# Hacer el commit con el mensaje y la descripción
git commit -m "$commit_message" -m "$commit_description"

# Subir los cambios a la rama especificada en GitHub
git push origin $branch_name

echo "Cambios subidos a la rama '$branch_name' en GitHub."