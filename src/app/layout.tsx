import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
	display: "swap",
});

const spaceGrotesk = Space_Grotesk({
	variable: "--font-space-grotesk",
	subsets: ["latin"],
	weight: ["500", "600", "700"],
	display: "swap",
});

export const metadata: Metadata = {
	title: "CicloActiva",
	description: "Panel entrenador para gestión de atletas",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="es" className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}>
			<body className="min-h-full flex flex-col bg-[#F5F3EE]">{children}</body>
		</html>
	);
}
