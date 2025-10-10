# Stage 1: Build React app
FROM node:18 AS build
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy all source code
COPY . .

# Build React app
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy build folder to Nginx html
COPY --from=build /app/build /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
