<script lang="ts">
	import './layout.css';
	import { dev } from '$app/environment';
	import { PUBLIC_CONVEX_URL } from '$env/static/public';
	import { injectAnalytics, type BeforeSendEvent } from '@vercel/analytics/sveltekit';
	import AuthProvider from '$lib/components/AuthProvider.svelte';

	const { children } = $props();

	injectAnalytics({
		mode: dev ? 'development' : 'production',
		beforeSend: sanitizeAnalyticsUrl
	});

	function sanitizeAnalyticsUrl(event: BeforeSendEvent) {
		return {
			...event,
			url: stripLocationQueryParams(event.url)
		};
	}

	function stripLocationQueryParams(value: string) {
		const url = new URL(value);
		url.searchParams.delete('address');
		url.searchParams.delete('lat');
		url.searchParams.delete('lon');
		return url.toString();
	}
</script>

<AuthProvider convexUrl={PUBLIC_CONVEX_URL}>
	{@render children()}
</AuthProvider>
