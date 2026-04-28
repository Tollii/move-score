<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { ConvexClient } from 'convex/browser';
	import { setConvexClientContext } from 'convex-svelte';
	import { ConvexAuthState, setAuthContext } from '$lib/auth/convex-auth.svelte';

	type Props = {
		convexUrl: string;
		children: Snippet;
	};

	const { convexUrl, children }: Props = $props();
	// svelte-ignore state_referenced_locally
	const client = new ConvexClient(convexUrl, { disabled: typeof window === 'undefined' });
	// svelte-ignore state_referenced_locally
	const auth = new ConvexAuthState(client, convexUrl);

	setConvexClientContext(client);
	setAuthContext(auth);

	onMount(() => {
		void auth.initialize();

		return () => {
			client.close();
		};
	});
</script>

{@render children()}
