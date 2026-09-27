# Build Angular
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve with nginx + runtime env injection
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Angular build output (achte auf deinen dist-Namen!)
COPY --from=build /app/dist/praxis-frontend/browser /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/templates/default.conf.template

# env template
COPY src/assets/env.template.js /usr/share/nginx/html/assets/env.template.js

# entrypoint: generate env.js from env var
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx","-g","daemon off;"]
