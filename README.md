БД - https://console.neon.tech/app/projects/holy-water-10779065/branches/br-little-night-a2vu0bs2/tables?database=neondb

npm install -g @nestjs/cli
npm install prisma --save-dev
npm install @prisma/client
npx prisma init

npm run start:dev
npx ts-node scripts/sync.ts

API/parser-mc/parse - Парсит сайт https://mc.ru/

API/parser-mc/data - Выводит спарсенные данные в браузере

API/parser-mc/download - Скачивает excel таблицу с товарами


API/pdf/manual - Выводит данные из pdf в excel
