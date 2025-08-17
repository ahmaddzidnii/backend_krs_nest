import { Prisma } from '@prisma/client';

export const timestampExtension = Prisma.defineExtension((client) => {
  const fieldCache = new Map<string, boolean>();

  function modelHasField(modelName: string, fieldName: string): boolean {
    const cacheKey = `${modelName}:${fieldName}`;
    if (fieldCache.has(cacheKey)) {
      return fieldCache.get(cacheKey)!;
    }

    const model = Prisma.dmmf.datamodel.models.find(
      (m) => m.name === modelName,
    );
    const hasField = model?.fields.some((f) => f.name === fieldName) ?? false;
    fieldCache.set(cacheKey, hasField);
    return hasField;
  }

  return client.$extends({
    name: 'timestampExtension',
    query: {
      $allModels: {
        async create({ model, args, query }) {
          const now = Date.now();

          if (modelHasField(model, 'created_at')) {
            (args.data as { [key: string]: any }).created_at = now;
          }
          if (modelHasField(model, 'updated_at')) {
            (args.data as { [key: string]: any }).updated_at = now;
          }

          return query(args);
        },
        async createMany({ model, args, query }) {
          if (Array.isArray(args.data)) {
            const now = Date.now();
            const hasCreatedAt = modelHasField(model, 'created_at');
            const hasUpdatedAt = modelHasField(model, 'updated_at');

            if (hasCreatedAt || hasUpdatedAt) {
              args.data = args.data.map((item) => {
                const newItem = { ...item };
                if (hasCreatedAt) (newItem as any).created_at = now;
                if (hasUpdatedAt) (newItem as any).updated_at = now;
                return newItem;
              });
            }
          }
          return query(args);
        },
        async update({ model, args, query }) {
          if (modelHasField(model, 'updated_at')) {
            (args.data as { [key: string]: any }).updated_at = Date.now();
          }
          return query(args);
        },
        async updateMany({ model, args, query }) {
          if (modelHasField(model, 'updated_at')) {
            (args.data as { [key: string]: any }).updated_at = Date.now();
          }
          return query(args);
        },
        async upsert({ model, args, query }) {
          const now = Date.now();

          if (modelHasField(model, 'created_at')) {
            (args.create as { [key: string]: any }).created_at = now;
          }
          if (modelHasField(model, 'updated_at')) {
            (args.create as { [key: string]: any }).updated_at = now;
            (args.update as { [key: string]: any }).updated_at = now;
          }

          return query(args);
        },
      },
    },
  });
});

// export const timestampExtension = Prisma.defineExtension({
//   name: 'timestampExtension',
//   query: {
//     $allModels: {
//       // Untuk prisma.model.create()
//       async create({ args, query }) {
//         const now = Date.now();
//         args.data = {
//           ...args.data,
//           created_at: now,
//           updated_at: now,
//         };
//         return query(args);
//       },
//       // Untuk prisma.model.createMany()
//       async createMany({ args, query }) {
//         if (Array.isArray(args.data)) {
//           const now = Date.now();
//           args.data = args.data.map((item) => ({
//             ...item,
//             created_at: now,
//             updated_at: now,
//           }));
//         }
//         return query(args);
//       },
//       // Untuk prisma.model.update()
//       async update({ args, query }) {
//         args.data = { ...args.data, updated_at: Date.now() };
//         return query(args);
//       },
//       // Untuk prisma.model.updateMany()
//       async updateMany({ args, query }) {
//         args.data = { ...args.data, updated_at: Date.now() };
//         return query(args);
//       },
//       // Untuk prisma.model.upsert()
//       async upsert({ args, query }) {
//         const now = Date.now();
//         // Saat membuat data baru
//         args.create = { ...args.create, created_at: now, updated_at: now };
//         // Saat memperbarui data yang sudah ada
//         args.update = { ...args.update, updated_at: now };
//         return query(args);
//       },
//     },
//   },
// });
