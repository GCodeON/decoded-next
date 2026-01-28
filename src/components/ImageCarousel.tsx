'use client';
import { useState } from 'react';
import Image from 'next/image';

interface ImageCarouselProps {
  images: { url: string }[];
  alt: string;
  className?: string;
}

export default function ImageCarousel({ images, alt, className = '' }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className={`bg-gray-800 flex items-center justify-center ${className}`}>
        <span className="text-gray-500 text-xs">No Image</span>
      </div>
    );
  }

  if (images.length === 1) {
    return (
      <div className={`relative ${className}`}>
        <Image
          src={images[0].url}
          alt={alt}
          fill
          className="object-cover rounded-lg"
          sizes="(max-width: 768px) 100vw, 200px"
        />
      </div>
    );
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className={`relative group ${className}`}>
      {/* Main Image */}
      <Image
        src={images[currentIndex].url}
        alt={`${alt} - Image ${currentIndex + 1}`}
        fill
        className="object-cover rounded-lg transition-opacity duration-300"
        sizes="(max-width: 768px) 100vw, 200px"
      />

      {/* Navigation Arrows */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          goToPrevious();
        }}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Previous image"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          goToNext();
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Next image"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              goToSlide(index);
            }}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentIndex ? 'bg-white' : 'bg-white/50'
            }`}
            aria-label={`Go to image ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
