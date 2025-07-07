БД - https://console.neon.tech/app/projects/holy-water-10779065/branches/br-little-night-a2vu0bs2/tables?database=neondb

npm install -g @nestjs/cli
npm install prisma --save-dev
npm install @prisma/client
npx prisma init

npm run start:dev
npx ts-node scripts/sync.ts

http://localhost:3000/parser-mc/armatura
http://localhost:3000/parser-mc/download
