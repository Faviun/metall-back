БД - https://console.neon.tech/app/projects/holy-water-10779065/branches/br-little-night-a2vu0bs2/tables?database=neondb

npm install -g @nestjs/cli
npm install prisma --save-dev
npm install @prisma/client
npx prisma init

npm run start:dev
npx ts-node scripts/sync.ts

---

API/parser-mc/parse - Парсит сайт https://mc.ru/

API/parser-mc/data - Выводит спарсенные данные в виду JSON

API/parser-mc/download - Скачивает excel таблицу с товарами


***

**Metallotorg**

API/metallotorg-parser/parse

API/metallotorg-parser/data?page=1&limit=100 - Выводит спарсенные данные в виду JSON  

```ts
products": [  
    {  
      "id": 5384,  
      "provider": "metallotorg",  
      "category": "Арматура гладкая A1",  
      "name": "Арматура гладкая А240С(А1) 20мм.",  
      "size": "20мм.",  
      "length": "(11,7м)_Ст3",  
      "mark": "ГОСТ 34028-2016",  
      "weight": "29.472",  
      "units1": "Цена 1 - 5 т.",  
      "price1": "Цену уточняйте",  
      "units2": "Цена от 5 т. до 15 т.",  
      "price2": "Цену уточняйте",  
      "units3": "Цена \u003E 15 т.",  
      "price3": "Цену уточняйте",  
      "location": "Лобня (Москва)",  
      "link": "https://metallotorg.ru/info/metallobaza/lobnya/v-r/armatura-gladkaya-a240sa1/rzm-20mm-/dl-11-7m_st3/"  
    },  
]```



API/pdf/manual - Выводит данные из pdf в excel
