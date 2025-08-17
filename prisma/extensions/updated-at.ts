import { Prisma } from '@prisma/client';

export const autoUpdatedAtExtension = Prisma.defineExtension({
  name: 'autoUpdatedAt',
  query: {
    $allModels: {
      async update({ args, query }) {
        args.data = { ...args.data, updated_at: Date.now() };
        return query(args);
      },
      async updateMany({ args, query }) {
        args.data = { ...args.data, updated_at: Date.now() };
        return query(args);
      },
      async upsert({ args, query }) {
        args.create = { ...args.create, updated_at: Date.now() };
        args.update = { ...args.update, updated_at: Date.now() };
        return query(args);
      },
    },
  },
});
