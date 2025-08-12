import * as fs from 'fs';
import * as path from 'path';

/**
 * Генерирует Excel-файл и возвращает поток для скачивания.
 *
 * @param exportFn Функция, которая создает Excel-файл по указанному пути.
 * @param provider Название провайдера для имени файла.
 * @param exportDir Папка, куда сохраняется файл (по умолчанию 'exports').
 * @returns Поток для чтения файла
 */
export async function getExcelStreamFromDb(
  exportFn: (filePath: string, provider: string) => Promise<void>,
  provider: string,
  exportDir = 'exports',
): Promise<fs.ReadStream> {
  const fileName = `${provider}.xlsx`;
  const filePath = path.join(process.cwd(), exportDir, fileName);

  await exportFn(filePath, provider);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Файл не найден: ${filePath}`);
  }

  return fs.createReadStream(filePath);
}
