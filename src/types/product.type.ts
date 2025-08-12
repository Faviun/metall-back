export type Product = {
  provider: string;
  category: string;
  name: string;
  size: string | null;
  mark: string | null;
  length: string | null;
  weight: string | null;
  location: string | null;
  price1: number | null;
  units1: string | null;
  price2: number | null;
  units2: string | null;
  price3: number | null;
  units3: string | null;
  available: boolean | null;
  image: string | null;
  link: string | null;
  description?: string | null;
  uniqueString: string;

  createdAt?: Date;
  updatedAt?: Date;
};
