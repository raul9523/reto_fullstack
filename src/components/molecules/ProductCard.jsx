import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Button from '../atoms/Button';
import { GENDERS, getSizesForGenderType, getSizeStockKey } from '../../constants/sizes';

const ProductCard = ({ product, onAddToCart }) => {
  const { name, price, description, imageUrl, images, stockQuantity, discount, isPromo, handlesSizes, genders, sizeType, sizeStock } = product;
  const finalPrice = discount > 0 ? price - (price * discount / 100) : price;

  const allImages = [imageUrl, ...(images || [])].filter(Boolean);
  const [imgIndex, setImgIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [sizeModal, setSizeModal] = useState(false);
  const [selectedGender, setSelectedGender] = useState(genders?.[0] || '');
  const [selectedSize, setSelectedSize] = useState('');

  const activeGenders = (genders || []).filter(g => GENDERS.includes(g));
  const availableSizes = handlesSizes && selectedGender && sizeType
    ? getSizesForGenderType(selectedGender, sizeType)
    : [];

  const getSizeStock = (size) => {
    if (!sizeStock) return 0;
    if (activeGenders.length > 1) return sizeStock[getSizeStockKey(selectedGender, size)] ?? 0;
    return sizeStock[size] ?? sizeStock[getSizeStockKey(selectedGender, size)] ?? 0;
  };

  const handleAddClick = () => {
    if (handlesSizes && activeGenders.length > 0) {
      setSizeModal(true);
    } else {
      onAddToCart && onAddToCart(product, null);
    }
  };

  const handleConfirmSize = () => {
    if (!selectedSize) return;
    onAddToCart && onAddToCart(product, { size: selectedSize, gender: activeGenders.length > 1 ? selectedGender : undefined });
    setSizeModal(false);
    setSelectedSize('');
  };

  const prevImg = (e) => { e.stopPropagation(); setImgIndex(i => (i - 1 + allImages.length) % allImages.length); };
  const nextImg = (e) => { e.stopPropagation(); setImgIndex(i => (i + 1) % allImages.length); };

  return (
    <>
      <div className="card-dna flex flex-col h-full group">
        {/* Image area */}
        <div className="relative h-64 w-full bg-gray-50 overflow-hidden cursor-pointer" onClick={() => allImages.length && setLightbox(true)}>
          {allImages[imgIndex] ? (
            <img
              src={allImages[imgIndex]}
              alt={name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-300">DÚO DREAMS</div>
          )}

          <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Gallery arrows */}
          {allImages.length > 1 && (
            <>
              <button
                onClick={prevImg}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-full p-1.5 shadow opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <svg className="w-3 h-3 text-brand-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={nextImg}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-full p-1.5 shadow opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <svg className="w-3 h-3 text-brand-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {/* Dots */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                {allImages.map((_, i) => (
                  <button key={i} onClick={e => { e.stopPropagation(); setImgIndex(i); }}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIndex ? 'bg-white w-3' : 'bg-white/50'}`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Labels */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {isPromo && <div className="bg-brand-dark text-white px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase shadow-lg">Destacado</div>}
            {discount > 0 && <div className="bg-brand-gold text-white px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase shadow-lg">-{discount}%</div>}
            {stockQuantity <= 5 && stockQuantity > 0 && (
              <div className="bg-white/90 backdrop-blur-sm text-brand-gold px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase shadow-sm">
                Últimas {stockQuantity}
              </div>
            )}
            {stockQuantity === 0 && (
              <div className="bg-brand-gold text-white px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase shadow-lg">Por Encargo</div>
            )}
          </div>

          {/* Zoom hint */}
          <div className="absolute bottom-2 right-2 bg-black/30 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </div>
        </div>

        {/* Details */}
        <div className="p-6 flex flex-col flex-grow">
          <h3 className="text-lg font-bold text-brand-dark mb-1 line-clamp-1 group-hover:text-brand-gold transition-colors" title={name}>{name}</h3>
          <p className="text-slate-400 text-xs mb-4 line-clamp-2 flex-grow font-light" title={description}>{description}</p>

          {/* Gender/size pills preview */}
          {handlesSizes && activeGenders.length > 0 && (
            <div className="flex gap-1 mb-3 flex-wrap">
              {activeGenders.map(g => (
                <span key={g} className="bg-brand-gold/10 text-brand-gold text-[9px] font-black uppercase px-2 py-0.5 rounded-full">{g}</span>
              ))}
              <span className="bg-gray-100 text-slate-400 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full">{sizeType}</span>
            </div>
          )}

          <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
            <div className="flex flex-col">
              {discount > 0 && <span className="text-[10px] text-slate-400 line-through font-bold">${price.toLocaleString('es-CO')}</span>}
              <span className="text-xl font-black text-brand-dark">${finalPrice.toLocaleString('es-CO')}</span>
            </div>
            <div className="flex flex-col w-full">
              <Button
                onClick={handleAddClick}
                className={`w-full py-2 text-[10px] uppercase tracking-widest font-bold ${stockQuantity === 0 ? 'bg-brand-gold hover:bg-brand-dark' : ''}`}
              >
                {stockQuantity === 0 ? 'Solicitar Encargo' : handlesSizes ? 'Elegir Talla' : 'Añadir'}
              </Button>
              {stockQuantity === 0 && (
                <p className="text-[8px] text-slate-400 mt-2 leading-tight italic">
                  * Sujeto a validación (15-30 días). Sin compromiso de venta inicial.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && allImages.length > 0 && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4" onClick={() => setLightbox(false)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white p-2" onClick={() => setLightbox(false)}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {allImages.length > 1 && (
            <>
              <button onClick={prevImg} className="absolute left-4 text-white/70 hover:text-white p-3 bg-black/30 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button onClick={nextImg} className="absolute right-4 text-white/70 hover:text-white p-3 bg-black/30 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
              </button>
            </>
          )}
          <img
            src={allImages[imgIndex]}
            alt={name}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          {allImages.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {allImages.map((_, i) => (
                <button key={i} onClick={e => { e.stopPropagation(); setImgIndex(i); }}
                  className={`w-2 h-2 rounded-full transition-all ${i === imgIndex ? 'bg-white w-4' : 'bg-white/40'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Size selection modal */}
      {sizeModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-4" onClick={() => setSizeModal(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-brand-dark mb-1">{name}</h3>
            <p className="text-xs text-slate-400 mb-4">Selecciona {activeGenders.length > 1 ? 'género y ' : ''}talla</p>

            {/* Gender selector */}
            {activeGenders.length > 1 && (
              <div className="mb-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Género</p>
                <div className="flex gap-2 flex-wrap">
                  {activeGenders.map(g => (
                    <button
                      key={g}
                      onClick={() => { setSelectedGender(g); setSelectedSize(''); }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedGender === g ? 'bg-brand-dark text-white' : 'bg-gray-100 text-slate-600 hover:bg-gray-200'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size grid */}
            {availableSizes.length > 0 && (
              <div className="mb-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Talla — {sizeType}</p>
                <div className="grid grid-cols-4 gap-2">
                  {availableSizes.map(size => {
                    const stock = getSizeStock(size);
                    const isOutOfStock = stock === 0;
                    const isSelected = selectedSize === size;
                    return (
                      <button
                        key={size}
                        onClick={() => !isSelected && setSelectedSize(size)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                          isSelected
                            ? 'bg-brand-dark text-white border-brand-dark'
                            : isOutOfStock
                              ? 'bg-gray-50 text-slate-300 border-gray-100 line-through cursor-default'
                              : 'bg-white text-slate-700 border-gray-200 hover:border-brand-gold hover:text-brand-gold'
                        }`}
                      >
                        {size}
                        {isOutOfStock && <span className="block text-[8px] normal-case no-underline">Encargo</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setSizeModal(false)} className="flex-1 py-3 rounded-2xl border border-gray-200 text-slate-500 font-bold text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={handleConfirmSize}
                disabled={!selectedSize}
                className="flex-1 py-3 rounded-2xl bg-brand-dark text-white font-black text-sm uppercase hover:bg-brand-gold transition-all disabled:opacity-40"
              >
                Añadir al Carrito
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

ProductCard.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
    description: PropTypes.string.isRequired,
    imageUrl: PropTypes.string,
    images: PropTypes.arrayOf(PropTypes.string),
    stockQuantity: PropTypes.number.isRequired,
    handlesSizes: PropTypes.bool,
    genders: PropTypes.arrayOf(PropTypes.string),
    sizeType: PropTypes.string,
    sizeStock: PropTypes.object,
  }).isRequired,
  onAddToCart: PropTypes.func,
};

export default ProductCard;
