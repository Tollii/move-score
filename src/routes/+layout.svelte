<script lang="ts">
	import './layout.css';
	import { PUBLIC_CONVEX_URL } from '$env/static/public';
	import AuthProvider from '$lib/components/AuthProvider.svelte';

	const { children } = $props();
</script>

<AuthProvider convexUrl={PUBLIC_CONVEX_URL}>
	{@render children()}
</AuthProvider>
