"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "~/components/ui/button";

export function ModeToggle() {
	const { setTheme, theme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Stable label on server to avoid hydration mismatch; update after mount.
	const isDark = theme === "dark";
	const label = mounted
		? isDark
			? "Switch to light mode"
			: "Switch to dark mode"
		: "Toggle theme";

	return (
		<Button
			variant="outline"
			size="icon"
			onClick={() => mounted && setTheme(isDark ? "light" : "dark")}
			title={label}
			aria-label={label}
		>
			<Sun className="dark:-rotate-90 h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:scale-0" />
			<Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
			<span className="sr-only">Toggle theme</span>
		</Button>
	);
}
