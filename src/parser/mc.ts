import axios from 'axios';
import AdmZip from 'adm-zip';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path'; // ⬅️ ОБЯЗАТЕЛЕН

async function parseExcelFromMcZip() {
  const zipUrl = 'https://mc.ru/price/msk/prices/metserv.zip';
  const zipPath = path.resolve(__dirname, 'temp.zip');
  const extractPath = path.resolve(__dirname, 'extracted');

  const response = await axios.get(zipUrl, { responseType: 'arraybuffer' });
  fs.writeFileSync(zipPath, response.data);

  const zip = new AdmZip(zipPath);
  zip.extractAllTo(extractPath, true);

  const files = fs.readdirSync(extractPath);
  const excelFile = files.find(f => f.endsWith('.xlsx'));
  if (!excelFile) throw new Error('Excel файл не найден');

  const workbook = XLSX.readFile(path.join(extractPath, excelFile));
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const data = XLSX.utils.sheet_to_json(sheet, { defval: null });

  console.log('📦 Найдено строк:', data.length);
  console.log(data.slice(0, 3));
}

parseExcelFromMcZip();
