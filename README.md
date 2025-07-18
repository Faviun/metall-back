БД - https://console.neon.tech/app/projects/holy-water-10779065/branches/br-little-night-a2vu0bs2/tables?database=neondb

npm install -g @nestjs/cli
npm install prisma --save-dev
npm install @prisma/client
npx prisma init

npm run start:dev
npx ts-node scripts/sync.ts

---  
**Металл Сервис**  
API/parser-mc/parse - Парсит сайт https://mc.ru/  
API/parser-mc/data - Выводит спарсенные данные в виду JSON  
API/parser-mc/download - Скачивает excel таблицу с товарами  

---  
**Metallotorg**  
API/parser-metallotorg/parse - Парсит сайт https://www.metallotorg.ru/  
API/parser-metallotorg/data?page=1&limit=100 - Выводит спарсенные данные в виду JSON  
```ts
products": [  
    {  
      "id": 5218,  
      "provider": "metallotorg",  
      "category": "Шестигранник",  
      "name": "Шестигранник сталь 35 12",  
      "size": "12",  
      "length": "",  
      "mark": "",  
      "weight": "4.201",  
      "units1": "Цена 1 - 5 т.",  
      "price1": "94200 руб.",  
      "units2": "Цена от 5 т. до 15 т.",  
      "price2": "94100 руб.",  
      "units3": "Цена \u003E 15 т.",  
      "price3": "94000 руб.",  
      "location": "Электроугли (Москва)",  
      "link": "https://metallotorg.ru/info/metallobaza/elektrougli/shestigrannik/shestigrannik-st35/rzm-12/vs-4-201/"  
    }, 
]
```  
API/parser-metallotorg/download - Скачивает excel таблицу с товарами Metalltorg  

---  
API/pdf/manual - Выводит данные из pdf в excel
