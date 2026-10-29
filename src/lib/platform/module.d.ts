// `#platform` is a Vite alias chosen per build (see vite.config.ts); both sides export this
declare module '#platform' {
	export const platform: import('./types').Platform;
}
