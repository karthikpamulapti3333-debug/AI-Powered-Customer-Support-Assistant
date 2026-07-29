# Build stage
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Copy custom nginx conf to proxy /api requests to backend in Docker Compose environment if needed
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
