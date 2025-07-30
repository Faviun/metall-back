
npm install -g @nestjs/cli  
npm install prisma --save-dev  
npm install @prisma/client  
npx prisma init  
npm run start:dev  
npx ts-node scripts/sync.ts  

---
.env  
```js
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza19wSmRSZnQ3YnVxd0JKeDMtRXd1NE4iLCJhcGlfa2V5IjoiMDFLMTAxWENaWVFHQVZTR0UwNFhTUFgxSEIiLCJ0ZW5hbnRfaWQiOiIxNWViMTI0MDYzNjI4M2QzM2YxOGM0ZGM2YzMyY2YxYTY0YzY2ZWRkZTA5ODRlNmFkNDM4NmU4MDBmYWYzZTE3IiwiaW50ZXJuYWxfc2VjcmV0IjoiMWIwNmE3ZWItZTJhOC00MjYxLTljYWItNmJlNDBlZjIxOWZlIn0.opp3o63huF_j60p3QB6K77Y-DlZa1Aadhq7_LlER6LQ"
```

---  
**Металл Сервис**  

**API**/parser-mc/parse - Парсит сайт https://mc.ru/  

**API**/parser-mc/download - Скачивает excel таблицу с товарами  

**API**/parser-mc/data?page=1&limit=10 - Выводит спарсенные данные в виде JSON  
```ts  
{
  "message": "📦 Получены данные из базы",
  "provider": "МЕТАЛЛ СЕРВИС",
  "totalProduct": 10,
  "total": 16801,
  "perPage": 10,
  "products": [
    {
      "id": 86972,
      "provider": "МЕТАЛЛ СЕРВИС",
      "category": "Трубы чугунные SML",
      "name": "Труба чугун SML Ду 250 L=3м б/растр",
      "size": "250",
      "length": "3000",
      "mark": "",
      "weight": null,
      "units1": "Цена, руб от 1 до 5шт",
      "price1": "17030",
      "units2": "Цена, руб от 1 до 5шт",
      "price2": "17030",
      "units3": null,
      "price3": null,
      "location": "Москва",
      "link": "https://mc.ru/metalloprokat/truba_chugunnaya_sml_250_truba_truba_razmer_250_dlina_3000",
      "createdAt": "2025-07-30T07:14:23.165Z",
      "updatedAt": "2025-07-30T07:14:23.165Z",
      "available": true,
      "image": "https://mc.ru/img/prodpict/card1c/mini/truba.jpg"
    },
    ...
    ]
}
```  
---  
**Metallotorg**  

**API**/parser-metallotorg/parse - Парсит сайт https://www.metallotorg.ru/  

**API**/parser-metallotorg/download - Скачивает excel таблицу с товарами Metalltorg  

**API**/parser-metallotorg/data?page=1&limit=100 - Выводит спарсенные данные в виде JSON  

```ts
{
  "message": "📦 Получены данные из базы",
  "totalProduct": 100,
  "total": 4924,
  "perPage": 100,
  "products": [
    {
      "id": 99734,
      "provider": "metallotorg",
      "category": "Шестигранник",
      "name": "Шестигранник сталь 45 36",
      "size": "36",
      "length": "",
      "mark": "",
      "weight": "42.728",
      "units1": "Цена 1 - 5 т.",
      "price1": "88200 руб.",
      "units2": "Цена от 5 т. до 15 т.",
      "price2": "88100 руб.",
      "units3": "Цена \u003E 15 т.",
      "price3": "88000 руб.",
      "location": "Электроугли (Москва)",
      "link": "https://metallotorg.ru/info/metallobaza/elektrougli/shestigrannik/shestigrannik-st45/rzm-36/vs-42-728/",
      "createdAt": "2025-07-30T10:59:38.363Z",
      "updatedAt": "2025-07-30T10:59:38.363Z",
      "available": null,
      "image": null
    },
    ...
    ]
}
```  

---  
**API**/pdf/manual - Выводит данные из pdf в excel
