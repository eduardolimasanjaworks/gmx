# Build Stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the application files
COPY . .

ARG VITE_DIRECTUS_URL
ARG VITE_DIRECTUS_TOKEN
ARG VITE_ERP_PUBLIC_URL
ARG VITE_IAGMX_URL
ARG VITE_CONVERSAS_URL
ARG VITE_IAGMX_ADMIN_KEY
ENV VITE_DIRECTUS_URL=$VITE_DIRECTUS_URL
ENV VITE_DIRECTUS_TOKEN=$VITE_DIRECTUS_TOKEN
ENV VITE_ERP_PUBLIC_URL=$VITE_ERP_PUBLIC_URL
ENV VITE_IAGMX_URL=$VITE_IAGMX_URL
ENV VITE_CONVERSAS_URL=$VITE_CONVERSAS_URL
ENV VITE_IAGMX_ADMIN_KEY=$VITE_IAGMX_ADMIN_KEY

# Build the Vite + React application
RUN npm run build

# Production Stage
FROM nginx:alpine

# Remove default nginx configuration
RUN rm -rf /etc/nginx/conf.d/*

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts from builder stage to nginx server directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
