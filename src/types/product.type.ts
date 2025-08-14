export type Product = {
  provider: string;
  category: string;
  name: string;
  size?: string | null; //Размер
  mark?: string | null; //Гост, ТУ, etc.
  markOfSteel?: string | null; //Марка стали
  length?: string | null; //Длина
  width?: string | null; //Ширина, Толщина
  weight?: string | null; //Вес
  location?: string | null; //Город или склад
  price1: number | null;
  units1: string | null;
  price2?: number | null;
  units2?: string | null;
  price3?: number | null;
  units3?: string | null;
  available?: boolean | null;
  image?: string | null;
  link?: string | null;
  description?: string | null;
  uniqueString: string;

  createdAt?: Date;
  updatedAt?: Date;
};
