import * as fs from 'fs';
import * as path from 'path';
import * as pdfParse from 'pdf-parse';
import * as XLSX from 'xlsx';

export class PdfParserService {
  async parseManualFile(): Promise<{ name: string; price: number }[]> {
    const pdfPath = path.resolve(__dirname, 'test.pdf');
    const buffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(buffer);
    const lines = data.text.split('\n').map((line) => line.trim()).filter(Boolean);

    const products: { name: string; price: number }[] = [];

    for (let i = 0; i < lines.length - 1; i++) {
      const nameLine = lines[i];
      const priceLine = lines[i + 1];

      const priceMatch = priceLine.match(/\d[\d\s]*,\d{1,2}/);

      if (priceMatch) {
        const price = parseFloat(priceMatch[0].replace(/\s/g, '').replace(',', '.'));

        if (!isNaN(price)) {
          products.push({
            name: nameLine,
            price,
          });
          i++; // Пропускаем строку с ценой
        }
      }
    }

    // Экспорт в Excel
    const worksheet = XLSX.utils.json_to_sheet(products);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

    const excelPath = path.resolve(__dirname, 'products.xlsx');
    XLSX.writeFile(workbook, excelPath);

    return products;
  }
}