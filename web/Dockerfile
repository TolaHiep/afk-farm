# ---------- Tầng 1: build bản tĩnh tối ưu ----------
FROM node:20-alpine AS build
WORKDIR /app

# Cài dependencies trước (tận dụng cache khi code thay đổi mà package không đổi)
COPY package.json package-lock.json ./
RUN npm ci

# Copy mã nguồn và build
COPY . .
RUN npm run build

# ---------- Tầng 2: phục vụ bằng Nginx ----------
FROM nginx:alpine
# Cấu hình SPA fallback + gzip
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy bản build tĩnh từ tầng 1
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
