import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
	variable: "--font-manrope",
	subsets: ["latin"],
	display: "swap",
	weight: ["400", "500", "600", "700"],
});

const playfair = Playfair_Display({
	variable: "--font-playfair",
	subsets: ["latin"],
	display: "swap",
	weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
	title: "CicloActiva",
	description: "Herramienta para informes iniciales de riesgo y contexto menstrual en mujer deportista",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="es" className={`${manrope.variable} ${playfair.variable} h-full antialiased`}>
			<body className="min-h-full flex flex-col">{children}</body>
		</html>
	);
}
