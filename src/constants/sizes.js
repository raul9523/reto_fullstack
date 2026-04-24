export const GENDERS = ['Hombre', 'Mujer', 'Niño', 'Niña'];

export const SIZE_TYPES_BY_GENDER = {
  Hombre: ['Tallas', 'Calzado', 'Pantalón', 'Camisa'],
  Mujer:  ['Tallas', 'Calzado', 'Pantalón', 'Blusa'],
  Niño:   ['Tallas', 'Calzado'],
  Niña:   ['Tallas', 'Calzado'],
};

export const SIZES_BY_GENDER_TYPE = {
  Hombre: {
    Tallas:   ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
    Calzado:  ['38', '39', '40', '41', '42', '43', '44', '45', '46'],
    Pantalón: ['28', '30', '32', '34', '36', '38', '40'],
    Camisa:   ['S', 'M', 'L', 'XL', 'XXL'],
  },
  Mujer: {
    Tallas:   ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    Calzado:  ['34', '35', '36', '37', '38', '39', '40'],
    Pantalón: ['24', '26', '28', '30', '32', '34'],
    Blusa:    ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  },
  Niño: {
    Tallas:  ['2', '4', '6', '8', '10', '12', '14', '16'],
    Calzado: ['20', '22', '24', '26', '28', '30', '32', '34'],
  },
  Niña: {
    Tallas:  ['2', '4', '6', '8', '10', '12', '14', '16'],
    Calzado: ['20', '22', '24', '26', '28', '30', '32', '34'],
  },
};

export const getSizesForGenderType = (gender, sizeType) =>
  SIZES_BY_GENDER_TYPE[gender]?.[sizeType] ?? [];

export const getSizeStockKey = (gender, size) => `${gender}__${size}`;
