# Etapa de construcción
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Limpiar el caché de npm y reinstalar dependencias
RUN npm cache clean --force && npm install

# Copiar el resto de la aplicación
COPY . .

# Eliminar la carpeta dist si existe
RUN rm -rf dist

# Construir la aplicación
RUN npm run build

# Etapa de producción
FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# Copiar los archivos construidos desde la etapa de construcción
COPY --from=builder /app/dist .

# Copiar la configuración de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]