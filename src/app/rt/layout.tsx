export default function RtLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<main className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-2xl flex-col justify-center px-4 pt-20 pb-8">
			{children}
		</main>
	);
}
