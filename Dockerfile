# STAGE 1: Build Environment
# Tahap ini digunakan untuk meng-install semua dependensi (termasuk dev) dan membangun aplikasi.
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Salin package.json dan install semua dependensi
COPY package*.json ./
RUN npm install

# Salin sisa kode sumber aplikasi
COPY . .

# Generate Prisma Client untuk memastikan semua tipe data tersedia sebelum build
RUN npx prisma generate

# Bangun aplikasi NestJS
RUN npm run build

# STAGE 2: Production Environment
# Tahap ini hanya akan berisi hasil build dan dependensi yang diperlukan untuk runtime.
FROM node:22-alpine

WORKDIR /usr/src/app

# Salin package.json dan install HANYA dependensi produksi
COPY package*.json ./
RUN npm install --omit=dev

# Salin hasil build dan skema prisma dari tahap 'builder'
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma

# Expose port aplikasi
EXPOSE 3000

# Perintah untuk menjalankan aplikasi yang sudah di-build
CMD ["node", "dist/main"]
