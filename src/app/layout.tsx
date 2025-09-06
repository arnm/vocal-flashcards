import "~/styles/globals.css";

import { Github as GithubIcon } from "lucide-react";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ModeToggle } from "~/components/theme/mode-toggle";
import { ThemeProvider } from "~/components/theme/theme-provider";
import { Button } from "~/components/ui/button";

export const metadata: Metadata = {
	title: "Vocal Flashcards",
	description: "Speak, review, and master facts faster with realtime AI.",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" className={`${geist.variable}`} suppressHydrationWarning>
			<body>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<div className="pointer-events-auto absolute top-4 right-4 z-50 flex items-center gap-2">
						<Button
							variant="outline"
							size="icon"
							asChild
							aria-label="GitHub repository"
						>
							<a
								href="https://github.com/arnm/vocal-flashcards"
								target="_blank"
								rel="noopener noreferrer"
								title="Open GitHub repository"
							>
								<GithubIcon className="h-[1.2rem] w-[1.2rem]" />
								<span className="sr-only">Open GitHub repository</span>
							</a>
						</Button>
						<ModeToggle />
					</div>
					<main className="flex min-h-dvh w-full flex-col">{children}</main>
				</ThemeProvider>
			</body>
		</html>
	);
}
