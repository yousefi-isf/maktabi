# Backend Project Structure

این سند ساختار فعلی پوشه‌ها و فایل‌های پروژه‌ی `backend` و محتوای تمام فایل‌های `package.json` موجود در آن را نمایش می‌دهد.

> پوشه‌ی تولیدشده‌ی `node_modules` به‌دلیل حجم بسیار زیاد در این درخت نمایش داده نشده است.

## ساختار کامل پروژه

```text
backend/
├── .vscode/
│   └── settings.json
├── attendance-gateway/
│   └── src/
│       ├── adapters/
│       │   └── .gitkeep
│       ├── ingestion/
│       │   └── .gitkeep
│       ├── reconciler/
│       │   └── .gitkeep
│       └── server.ts
├── packages/
│   ├── db/
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── src/
│   │   │   └── client.ts
│   │   ├── package.json
│   │   └── prisma.config.ts
│   ├── queue/
│   │   └── .gitkeep
│   └── shared/
│       └── .gitkeep
├── src/
│   ├── modules/
│   │   ├── academic-structure/
│   │   │   └── .gitkeep
│   │   ├── announcements/
│   │   │   └── .gitkeep
│   │   ├── attendance/
│   │   │   └── .gitkeep
│   │   ├── audit/
│   │   │   └── .gitkeep
│   │   ├── auth/
│   │   │   └── .gitkeep
│   │   ├── classes/
│   │   │   └── .gitkeep
│   │   ├── curriculum/
│   │   │   └── .gitkeep
│   │   ├── exams-scores/
│   │   │   └── .gitkeep
│   │   ├── people/
│   │   │   └── .gitkeep
│   │   ├── schools/
│   │   │   └── .gitkeep
│   │   └── users/
│   │       └── .gitkeep
│   ├── plugins/
│   │   └── .gitkeep
│   ├── trpc/
│   │   └── .gitkeep
│   └── server.ts
├── .gitignore
├── CLAUDE.md
├── package.json
├── pnpm-lock.yaml
└── PROJECT_STRUCTURE.md
```

## فایل‌های package.json

### `package.json`

```json
{
  "name": "backend",
  "version": "1.0.0",
  "description": "",
  "main": "src/server.ts",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "packageManager": "pnpm@11.18.0",
  "dependencies": {
    "fastify": "^5.11.2"
  }
}
```

### `packages/db/package.json`

```json
{
  "name": "@maktabi/db",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "exports": {
    ".": "./src/client.ts",
    "./client": "./generated/prisma/client.js"
  },
  "scripts": {
    "generate": "prisma generate",
    "migrate:dev": "prisma migrate dev",
    "studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^7.0.0",
    "@prisma/adapter-pg": "^7.0.0",
    "pg": "^8.13.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "prisma": "^7.0.0",
    "@types/pg": "^8.11.0",
    "typescript": "^5.9.0"
  }
}
```
