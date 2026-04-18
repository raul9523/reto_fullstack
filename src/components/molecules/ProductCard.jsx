import React from 'react';
import PropTypes from 'prop-types';
import Button from '../atoms/Button';

const ProductCard = ({ product, onAddToCart }) => {
  const { name, price, description, imageUrl, stockQuantity } = product;

  return (
    <div className="card-dna flex flex-col h-full group">
      {/* Product Image */}
      <div className="relative h-64 w-full bg-gray-50 overflow-hidden">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={name} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-300">
            DÚO DREAMS
          </div>
        )}
        
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        {stockQuantity <= 5 && stockQuantity > 0 && (
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-brand-gold px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">
            Últimas {stockQuantity} unidades
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-lg font-bold text-brand-dark mb-1 line-clamp-1 group-hover:text-brand-gold transition-colors" title={name}>
          {name}
        </h3>
        
        <p className="text-slate-400 text-xs mb-4 line-clamp-2 flex-grow font-light" title={description}>
          {description}
        </p>
        
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
          <span className="text-xl font-bold text-brand-dark">
            ${price.toLocaleString('es-CO')}
          </span>
          
          <Button 
            onClick={() => onAddToCart && onAddToCart(product)}
            disabled={stockQuantity === 0}
            className="px-5 py-2 text-xs uppercase tracking-widest font-bold"
          >
            Añadir
          </Button>
        </div>
      </div>
    </div>
  );
};

ProductCard.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
    description: PropTypes.string.isRequired,
    imageUrl: PropTypes.string,
    stockQuantity: PropTypes.number.isRequired,
  }).isRequired,
  onAddToCart: PropTypes.func,
};

export default ProductCard;
