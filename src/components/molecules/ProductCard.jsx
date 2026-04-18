import React from 'react';
import PropTypes from 'prop-types';
import Button from '../atoms/Button';

const ProductCard = ({ product, onAddToCart }) => {
  const { name, price, description, imageUrl, stockQuantity } = product;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full hover:shadow-dna transition-shadow duration-300">
      {/* Product Image */}
      <div className="relative h-48 w-full bg-gray-100">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={name} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            No Image Available
          </div>
        )}
        {stockQuantity <= 5 && stockQuantity > 0 && (
          <div className="absolute top-2 right-2 bg-orange-100 text-orange-600 px-2 py-1 rounded-full text-xs font-semibold">
            Only {stockQuantity} left!
          </div>
        )}
        {stockQuantity === 0 && (
          <div className="absolute top-2 right-2 bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs font-semibold">
            Out of Stock
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-xl font-bold text-slate-800 mb-2 line-clamp-1" title={name}>
          {name}
        </h3>
        
        <p className="text-slate-500 text-sm mb-4 line-clamp-2 flex-grow" title={description}>
          {description}
        </p>
        
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
          <span className="text-2xl font-bold text-brand-blue">
            ${price.toLocaleString('es-MX')}
          </span>
          
          <Button 
            onClick={() => onAddToCart && onAddToCart(product)}
            disabled={stockQuantity === 0}
            className="px-4 py-2 text-sm"
          >
            Add to Cart
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
