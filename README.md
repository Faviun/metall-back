
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

**Документация**
```ts
**API**/docs#/
```
---

**API**/data?provider=mc,metallotorg,dipos - Выводит спарсенные данные в виде JSON по различным поставщикам, указанным в provider
```ts
{
  "message": "📦 Получены данные из базы",
  "provider": [
    "mc",
    "metallotorg",
    "dipos"
  ],
  "total": 1770,
  "perPage": 100,
  "products": [
    {
      "id": 102663,
      "provider": "dipos",
      "category": "Полоса",
      "name": "Полоса оцинк.  50х 2,5 ст3, 6000 СП",
      "size": null,
      "length": null,
      "mark": "ГОСТ 6009-74, ВВ СМЦ",
      "weight": null,
      "units1": "т",
      "price1": "69.600",
      "units2": "",
      "price2": "",
      "units3": "",
      "price3": "",
      "location": null,
      "link": null,
      "createdAt": "2025-07-31T06:14:23.479Z",
      "updatedAt": "2025-07-31T06:14:23.479Z",
      "available": true,
      "image": null
    },
    ...
  ]
}
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
**Dipos**  

**API**/parser-dipos/parse - Парсит сайт https://www.dipos.ru/  

**API**/parser-dipos/download - Скачивает excel таблицу с товарами Dipos  

**API**/parser-dipos/data?page=1&limit=100 - Выводит спарсенные данные в виде JSON  

```ts
{
  "message": "📦 Получены данные из базы",
  "provider": "dipos",
  "total": 1770,
  "perPage": 100,
  "products": [
    {
      "id": 102663,
      "provider": "dipos",
      "category": "Полоса",
      "name": "Полоса оцинк.  50х 2,5 ст3, 6000 СП",
      "size": null,
      "length": null,
      "mark": "ГОСТ 6009-74, ВВ СМЦ",
      "weight": null,
      "units1": "т",
      "price1": "69.600",
      "units2": "",
      "price2": "",
      "units3": "",
      "price3": "",
      "location": null,
      "link": null,
      "createdAt": "2025-07-31T06:14:23.479Z",
      "updatedAt": "2025-07-31T06:14:23.479Z",
      "available": true,
      "image": null
    },
    ...
    ]
}
```
---  
**Ktzholding**  

**API**/parser-ktzholding/parse - Парсит сайт https://www.ktzholding.com/  

**API**/parser-ktzholding/download - Скачивает excel таблицу с товарами Ktzholding  

**API**/parser-ktzholding/data?page=1&limit=100 - Выводит спарсенные данные в виде JSON  

```ts
{
  "message": "📦 Получены данные из базы",
  "total": 985,
  "perPage": 100,
  "products": [
    {
      "id": 100893,
      "provider": "ktzholding",
      "category": "Швеллер",
      "name": "Швеллер 30П",
      "size": "30П",
      "length": "12000",
      "mark": "Ст3",
      "weight": "0",
      "units1": "Цена FCA, т. ₽",
      "price1": "133000",
      "units2": "",
      "price2": "",
      "units3": "",
      "price3": "",
      "location": "Дмитров",
      "link": "https://ktzholding.com/category/shveller/669ec1fb-a303-41c8-ab45-d430fc043c6a",
      "createdAt": "2025-07-31T06:14:07.570Z",
      "updatedAt": "2025-07-31T06:14:07.570Z",
      "available": true,
      "image": "https://ktzholding.com/media/subcategory_image/швеллер_2.svg"
    },
    ...
    ]
}
```
---  
**Brokinvest**  

**API**/parser-metallotorg/parse - Парсит сайт https://www.brokinvest.ru/  

**API**/parser-metallotorg/download - Скачивает excel таблицу с товарами Brokinvest  

**API**/parser-metallotorg/data?page=1&limit=100 - Выводит спарсенные данные в виде JSON  

```ts
{
  "message": "📦 Получены данные из базы",
  "provider": "brokinvest",
  "total": 895,
  "perPage": 100,
  "products": [
    {
      "id": 89745,
      "provider": "brokinvest",
      "category": "Уголок",
      "name": "Уголок 75х75х6х12000 ГОСТ 8509 Ст3сп/пс ",
      "size": "",
      "length": "12000",
      "mark": "ГОСТ 8509",
      "weight": "75",
      "units1": "т",
      "price1": "59500",
      "units2": "",
      "price2": "",
      "units3": "",
      "price3": "",
      "location": "22",
      "link": "https://www.brokinvest.ru/product/ugolok-75x75x6x12000-gost-8509-st3spps",
      "createdAt": "2025-07-30T10:09:27.141Z",
      "updatedAt": "2025-07-31T06:21:53.630Z",
      "available": true,
      "image": "https://back.brokinvest.ru/api/v1/files/catalog/32a5073b-89df-469d-980f-cf163d16237e.jpeg"
    },
    ...
    ]
}
```  
---  
**API**/pdf/manual - Выводит данные из pdf в excel
