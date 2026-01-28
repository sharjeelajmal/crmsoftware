"use client";

import React from 'react';
import Image from 'next/image';

const Loader = () => {
  return (
    <div className="loader-overlay">
      <div className="loader-container">
        {/* Logo */}
        <Image
          src="/logo.png"
          alt="Mr. Denum Logo"
          width={80}
          height={80}
          className="rounded-full mb-8 shadow-lg"
          priority={true} 
        />
        {/* Animated Grid */}
        <div className="loader-grid">
          <div className="loader-square"></div>
          <div className="loader-square"></div>
          <div className="loader-square"></div>
          <div className="loader-square"></div>
          <div className="loader-square"></div>
          <div className="loader-square"></div>
          <div className="loader-square"></div>
          <div className="loader-square"></div>
          <div className="loader-square"></div>
        </div>
        {/* Text */}
        <p className="loader-text mt-8">Please Wait...</p>
      </div>
    </div>
  );
};

export default Loader;