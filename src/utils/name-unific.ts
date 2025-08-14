type ParsedProduct = {
  name: string;
  size?: string;
  length?: string;
  steel?: string;
  gost?: string;
  raw: string;
};

export function nameUnific(fullName: string): ParsedProduct {
  const raw = fullName.replace(/[x]/gi, '*').replace(/\s+/g, ' ').trim();

  const sizeMatch = raw.match(/\d{1,4}x\d{2,5}x\d{2,5}/);
  const size = sizeMatch ? sizeMatch[0] : undefined;

  let name = '';
  if (sizeMatch) {
    const [thickness] = sizeMatch[0].split('x');
    const sizeIndex = raw.indexOf(sizeMatch[0]);

    // Проверим, что толщина — короткое число (1-2 цифры) и перед этим есть пробел
    const partBeforeSize = raw.substring(0, sizeIndex).trim();
    const possibleName = partBeforeSize.replace(new RegExp(`\\s${thickness}$`), '');

    name = possibleName.trim();
  }

  const lengthMatch = raw.match(/(\d{4,5})(?!.*\d)/);
  const length = lengthMatch ? lengthMatch[1] : undefined;

  const gostMatch = raw.match(/(ГОСТ\s?\d{4,6}(-\d{2})?|ТУ\s?\d{5,}-?\d{2}-?\d{2})/i);
  const gost = gostMatch ? gostMatch[0].toUpperCase().replace(/\s+/, '') : undefined;

  const steelMatch = raw.match(/ст[а-я0-9/.-]+|с\d{2,3}/i); // добавили С355, С245 и т.п.
  const steel = steelMatch ? steelMatch[0].toUpperCase() : undefined;

  return {
    name,
    size,
    length,
    steel,
    gost,
    raw,
  };
}
