# ---- Stage 1: Build ----
# Menggunakan base image yang sama
FROM node:22-slim AS builder

# Menetapkan working directory
WORKDIR /usr/src/app

# Membuat user non-root untuk keamanan
# Menjalankan aplikasi sebagai non-root adalah praktik keamanan yang baik.
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 node

# Menyalin file package terlebih dahulu untuk memanfaatkan cache Docker
COPY package*.json ./

# Menginstal semua dependensi yang dibutuhkan untuk build
RUN npm install

# Menyalin sisa kode sumber
# Pastikan Anda memiliki file .dockerignore untuk menghindari penyalinan file yang tidak perlu
COPY . .

# Menjalankan prisma generate dan build
RUN npx prisma generate
RUN npm run build

# Menghapus devDependencies untuk membersihkan node_modules sebelum menyalinnya ke stage berikutnya
RUN npm prune --production

# ---- Stage 2: Production ----
# Menggunakan base image yang sama untuk konsistensi
FROM node:22-slim AS production

WORKDIR /usr/src/app

# Membuat user non-root yang sama seperti di stage builder
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 node

# Menyalin artefak yang diperlukan dari stage builder dengan kepemilikan yang benar
# Ini lebih efisien daripada menjalankan `npm install` lagi
COPY --from=builder --chown=node:nodejs /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=node:nodejs /usr/src/app/dist ./dist
COPY --from=builder --chown=node:nodejs /usr/src/app/prisma ./prisma

# Mengganti user ke non-root
USER node

# Mengekspos port aplikasi
EXPOSE 1001

# Perintah untuk menjalankan aplikasi
CMD ["node", "dist/src/main"]
