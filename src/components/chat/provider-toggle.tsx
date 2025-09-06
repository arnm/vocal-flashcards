"use client";
import { Button } from "~/components/ui/button";
import type { RealtimeProvider } from "~/lib/realtime/types";
import { cn } from "~/lib/utils";

function OpenAILogo(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
			<path
				fill="currentColor"
				d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"
			/>
		</svg>
	);
}

function GeminiLogo(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
			<path
				fill="currentColor"
				d="M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81"
			/>
		</svg>
	);
}

export function ProviderToggle(props: {
	provider: RealtimeProvider;
	onChangeAction: (p: RealtimeProvider) => void;
	className?: string;
}) {
	const { provider, onChangeAction: onChange, className } = props;
	const isOpenAI = provider === "openai";
	return (
		<div className={className}>
			<div
				className="inline-flex items-center gap-1 rounded-full bg-muted p-1 text-xs"
				role="group"
				aria-label="Model provider"
			>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => onChange("openai")}
					className={cn(
						"h-7 rounded-full px-2 font-medium text-xs transition-colors focus-visible:ring-2 focus-visible:ring-offset-1",
						isOpenAI
							? "bg-[#10A37F] text-white hover:bg-[#0d8c6d] focus-visible:ring-[#10A37F]"
							: "text-foreground/70 hover:bg-muted/70",
					)}
					aria-pressed={isOpenAI}
					data-active={isOpenAI || undefined}
					title="OpenAI"
					type="button"
				>
					<OpenAILogo className="h-4 w-4" />
					<span className="sr-only">OpenAI</span>
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => onChange("gemini")}
					className={cn(
						"h-7 rounded-full px-2 font-medium text-xs transition-colors focus-visible:ring-2 focus-visible:ring-offset-1",
						!isOpenAI
							? "text-white focus-visible:ring-[#4285F4]"
							: "text-foreground/70 hover:bg-muted/70",
					)}
					style={
						!isOpenAI
							? {
									background:
										"linear-gradient(135deg,#4285F4 0%,#6F50FF 35%,#A142F4 55%,#FF7361 100%)",
								}
							: undefined
					}
					aria-pressed={!isOpenAI}
					data-active={!isOpenAI || undefined}
					title="Gemini"
					type="button"
				>
					<GeminiLogo className="h-4 w-4" />
					<span className="sr-only">Gemini</span>
				</Button>
			</div>
		</div>
	);
}
