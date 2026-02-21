// src/app/layout.js
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  weight: ['400', '500', '600', '700', '800']
});

export const metadata = {
  title: "FleetFlow - Fleet & Logistics Management",
  description: "Modular Fleet & Logistics Management System",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#4A70A9" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}