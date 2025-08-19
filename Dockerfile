# ---- Stage 1: Build ----
# Menggunakan base image yang sama
FROM node:22-slim AS builder

# Memperbarui paket OS untuk menambal kerentanan keamanan
RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*

# Menetapkan working directory
WORKDIR /usr/src/app

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

# Memperbarui paket OS untuk menambal kerentanan keamanan di image production
RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Menyalin artefak yang diperlukan dari stage builder
# Menggunakan user 'node' yang sudah ada di base image
COPY --from=builder --chown=node:node /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=node:node /usr/src/app/dist ./dist
COPY --from=builder --chown=node:node /usr/src/app/prisma ./prisma

# Mengganti user ke non-root 'node' yang sudah ada
USER node

# Mengekspos port aplikasi
EXPOSE 1001

# Perintah untuk menjalankan aplikasi
CMD ["node", "dist/src/main"]
