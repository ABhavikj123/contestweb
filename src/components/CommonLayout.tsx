import React from 'react';
import Navbar from './Navbar';

const CommonLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      <Navbar />
      <main className="pt-16">{children}</main>
    </>
  );
};

export default CommonLayout;