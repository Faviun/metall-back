
npm install -g @nestjs/cli  
npm install prisma --save-dev  
npm install @prisma/client  
npx prisma init  
npm run start:dev  
npx ts-node scripts/sync.ts  

---
.env  
```js
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza19fMDFLd2tLY2FPdkxOTzVRRENNOVEiLCJhcGlfa2V5IjoiMDFLMDU0VDBYNE5SUlJSSkNZUEg5RDFBRTQiLCJ0ZW5hbnRfaWQiOiIzNmQzNjlhYjQ2YTgzNjYwNzQxNDEwZGZhMmEzMDI5MzMzN2YwMDc5MjM2ZjYwMjNjNmQwNDNmN2NhNmFkZTA5IiwiaW50ZXJuYWxfc2VjcmV0IjoiMGJiNGYyMzEtZGQ1NC00MzhiLTg4NDgtN2U4ZTQ3MDg0YTJlIn0.7XrS0p-H2B8vlT8SROh-lBzHd46oUhIZIJ7tYnOMmeg"
```

---  
**Металл Сервис**  

**API**/parser-mc/parse - Парсит сайт https://mc.ru/  

**API**/parser-mc/download - Скачивает excel таблицу с товарами  

**API**/parser-mc/data?page=1&limit=10 - Выводит спарсенные данные в виде JSON  
```ts  
"products": [  
    {  
      "id": 8251,  
      "provider": "МЕТАЛЛ СЕРВИС",  
      "category": "Дуплексная сталь",  
      "name": "Лист нержавеющий DUPLEX 50х1500х6000 \u003Cbr\u003E2507 (S32750)",  
      "size": "50",  
      "length": "No1",  
      "mark": "2507 (S32750)",  
      "weight": null,  
      "units1": "Цена, руб до 0,1т",  
      "price1": "639423",  
      "units2": "Цена, руб от 0,1 до 1т",  
      "price2": "639423",  
      "units3": null,  
      "price3": null,  
      "location": "Москва",  
      "link": "https://mc.ru/metalloprokat/list_nerzhaveyushiy_duplex_50x1500x6000_2507_(s32750)_razmer_50_marka_2507_(s32750)_dlina_no1",  
      "image": "https://mc.ru/img/prodpict/gal/mini/stal_listovaya_duplex.jpg",  
      "available": true,  
    },
]  
```  
---  
**Metallotorg**  

**API**/parser-metallotorg/parse - Парсит сайт https://www.metallotorg.ru/  

**API**/parser-metallotorg/download - Скачивает excel таблицу с товарами Metalltorg  

**API**/parser-metallotorg/data?page=1&limit=100 - Выводит спарсенные данные в виде JSON  

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

---  
**API**/pdf/manual - Выводит данные из pdf в excel
