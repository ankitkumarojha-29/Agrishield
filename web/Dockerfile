# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_API_BASE_URL
ARG VITE_AGMARKNET_API_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_AGMARKNET_API_KEY=$VITE_AGMARKNET_API_KEY
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
