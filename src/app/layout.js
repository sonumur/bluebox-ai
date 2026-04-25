import { Outfit } from 'next/font/google';
import "./globals.css";

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
});

export const metadata = {
  title: "Bluebox AI - Your AI Assistant",
  description: "Chat with Bluebox, your intelligent AI assistant powered by advanced language models",
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${outfit.variable}`}>
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}