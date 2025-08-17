import { Prisma } from '@prisma/client';

export const autoCreatedAtExtension = Prisma.defineExtension({
  name: 'autoCreatedAt',
  query: {
    $allModels: {
      async create({ args, query }) {
        args.data = {
          ...args.data,
          created_at: Date.now(),
          updated_at: Date.now(),
        };
        return query(args);
      },
      async createMany({ args, query }) {
        // Pastikan data adalah sebuah array
        if (Array.isArray(args.data)) {
          const now = Date.now();
          // Gunakan .map() untuk menambahkan timestamp ke setiap item
          args.data = args.data.map((item) => ({
            ...item, // Salin data asli (seperti nama_role)
            created_at: now,
            updated_at: now,
          }));
        }
        return query(args);
      },
    },
  },
});
