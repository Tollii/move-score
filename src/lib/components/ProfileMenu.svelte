<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import { analyticsErrorCode, trackEvent } from '$lib/analytics';
	import { useAuth, type AuthFlow } from '$lib/auth/convex-auth.svelte';

	const auth = useAuth();
	const profile = useQuery(api.profile.current);

	let isOpen = $state(false);
	let flow = $state<AuthFlow>('signIn');
	let name = $state('');
	let email = $state('');
	let password = $state('');
	let error = $state<string | undefined>();
	let isSubmitting = $state(false);

	const currentUser = $derived(profile.data);
	const signedInUser = $derived(auth.isAuthenticated ? currentUser : null);
	const initials = $derived(getInitials(signedInUser?.name ?? signedInUser?.email ?? 'Profil'));
	const isProfileLoading = $derived(auth.isAuthenticated && profile.isLoading);

	async function handleSubmit() {
		error = undefined;
		isSubmitting = true;

		try {
			await auth.signIn('password', {
				email,
				password,
				flow,
				...(flow === 'signUp' ? { name } : {})
			});
			trackEvent({ name: 'auth_completed', properties: { flow, result: 'success' } });
			password = '';
			isOpen = false;
		} catch (err) {
			console.error('Profile authentication failed', err);
			error = getFriendlyAuthError(flow, err);
			trackEvent({
				name: 'auth_completed',
				properties: { flow, result: 'failure', errorCode: analyticsErrorCode(err, 'AUTH_FAILED') }
			});
		} finally {
			isSubmitting = false;
		}
	}

	async function handleSignOut() {
		try {
			await auth.signOut();
			trackEvent({ name: 'auth_completed', properties: { flow: 'signOut', result: 'success' } });
			isOpen = false;
		} catch (err) {
			trackEvent({
				name: 'auth_completed',
				properties: {
					flow: 'signOut',
					result: 'failure',
					errorCode: analyticsErrorCode(err, 'AUTH_FAILED')
				}
			});
		}
	}

	function getInitials(value: string) {
		const parts = value
			.split(/[\s@.]+/)
			.map((part) => part.trim())
			.filter(Boolean);

		return (parts[0]?.[0] ?? 'P').toUpperCase() + (parts[1]?.[0] ?? '').toUpperCase();
	}

	function getFriendlyAuthError(currentFlow: AuthFlow, err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		const normalized = message.toLowerCase();

		if (normalized.includes('invalid') || normalized.includes('credential')) {
			return currentFlow === 'signIn'
				? 'E-post eller passord er feil.'
				: 'Kunne ikke opprette profil med disse opplysningene.';
		}

		if (normalized.includes('already') || normalized.includes('exist')) {
			return 'Det finnes allerede en profil med denne e-postadressen.';
		}

		if (
			normalized.includes('network') ||
			normalized.includes('fetch') ||
			normalized.includes('failed to fetch')
		) {
			return 'Vi fikk ikke kontakt med serveren. Prøv igjen om litt.';
		}

		return currentFlow === 'signIn'
			? 'Innloggingen mislyktes. Sjekk opplysningene og prøv igjen.'
			: 'Profilen kunne ikke opprettes akkurat nå. Prøv igjen om litt.';
	}
</script>

<div class="profile-menu">
	<button
		type="button"
		class="profile-trigger"
		aria-expanded={isOpen}
		aria-label={auth.isAuthenticated ? 'Åpne profil' : 'Logg inn'}
		onclick={() => (isOpen = !isOpen)}
	>
		<span class="avatar">{auth.isAuthenticated ? initials : '+'}</span>
		<span class="trigger-text">
			{#if auth.isLoading || isProfileLoading}
				Laster
			{:else if signedInUser}
				{signedInUser.name ?? signedInUser.email}
			{:else}
				Profil
			{/if}
		</span>
	</button>

	{#if isOpen}
		<div class="profile-popover">
			{#if signedInUser}
				<div class="profile-summary">
					<div class="summary-name">{signedInUser.name ?? 'Profil'}</div>
					{#if signedInUser.email}
						<div class="summary-email">{signedInUser.email}</div>
					{/if}
				</div>
				<button type="button" class="secondary-button" onclick={handleSignOut}>Logg ut</button>
			{:else}
				<div class="mode-switch" role="tablist" aria-label="Profilvalg">
					<button type="button" class:active={flow === 'signIn'} onclick={() => (flow = 'signIn')}>
						Logg inn
					</button>
					<button type="button" class:active={flow === 'signUp'} onclick={() => (flow = 'signUp')}>
						Ny profil
					</button>
				</div>

				<form
					onsubmit={(event) => {
						event.preventDefault();
						void handleSubmit();
					}}
				>
					{#if flow === 'signUp'}
						<label>
							<span>Navn</span>
							<input bind:value={name} name="name" autocomplete="name" required />
						</label>
					{/if}
					<label>
						<span>E-post</span>
						<input bind:value={email} name="email" type="email" autocomplete="email" required />
					</label>
					<label>
						<span>Passord</span>
						<input
							bind:value={password}
							name="password"
							type="password"
							autocomplete={flow === 'signIn' ? 'current-password' : 'new-password'}
							minlength="8"
							required
						/>
					</label>

					{#if error}
						<p class="form-error">{error}</p>
					{/if}

					<button type="submit" class="primary-button" disabled={isSubmitting}>
						{isSubmitting ? 'Jobber' : flow === 'signIn' ? 'Logg inn' : 'Opprett profil'}
					</button>
				</form>
			{/if}
		</div>
	{/if}
</div>

<style>
	.profile-menu {
		position: fixed;
		bottom: 52px;
		right: 20px;
		z-index: 120;
		font-family: 'DM Sans', sans-serif;
	}

	.profile-trigger,
	.profile-popover {
		background: #fffefc;
		border: 1px solid rgba(0, 0, 0, 0.07);
		box-shadow:
			0 2px 12px rgba(0, 0, 0, 0.08),
			0 1px 3px rgba(0, 0, 0, 0.06);
	}

	.profile-trigger {
		display: flex;
		align-items: center;
		gap: 8px;
		max-width: min(260px, calc(100vw - 40px));
		min-height: 42px;
		border-radius: 999px;
		padding: 5px 12px 5px 5px;
		color: #1a1a18;
		cursor: pointer;
	}

	.avatar {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 999px;
		background: #1a1a18;
		color: #f5b800;
		font-size: 12px;
		font-weight: 700;
		flex: 0 0 auto;
	}

	.trigger-text {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 13px;
		font-weight: 700;
	}

	.profile-popover {
		position: absolute;
		bottom: 50px;
		right: 0;
		width: min(320px, calc(100vw - 40px));
		border-radius: 14px;
		padding: 14px;
	}

	.mode-switch {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4px;
		margin-bottom: 12px;
		border-radius: 10px;
		background: #f3f2ec;
		padding: 4px;
	}

	.mode-switch button,
	.primary-button,
	.secondary-button {
		border: 0;
		font-family: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	.mode-switch button {
		border-radius: 8px;
		background: transparent;
		padding: 8px;
		color: #77766e;
	}

	.mode-switch button.active {
		background: #fffefc;
		color: #1a1a18;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
	}

	form {
		display: grid;
		gap: 10px;
	}

	label {
		display: grid;
		gap: 5px;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #8c8b82;
	}

	input {
		min-height: 38px;
		border: 1.5px solid #e5e4de;
		border-radius: 9px;
		background: #fafaf6;
		padding: 8px 10px;
		font: inherit;
		font-size: 13px;
		color: #1a1a18;
	}

	input:focus {
		outline: none;
		border-color: #f5b800;
		background: #fff;
		box-shadow: 0 0 0 3px rgba(245, 184, 0, 0.15);
	}

	.primary-button,
	.secondary-button {
		min-height: 38px;
		border-radius: 9px;
		font-size: 13px;
	}

	.primary-button {
		background: #1a1a18;
		color: #f5b800;
	}

	.primary-button:disabled {
		opacity: 0.6;
		cursor: wait;
	}

	.secondary-button {
		width: 100%;
		margin-top: 12px;
		background: #f3f2ec;
		color: #1a1a18;
	}

	.profile-summary {
		min-width: 0;
	}

	.summary-name {
		overflow-wrap: anywhere;
		font-size: 15px;
		font-weight: 800;
		color: #1a1a18;
	}

	.summary-email,
	.form-error {
		margin: 4px 0 0;
		overflow-wrap: anywhere;
		font-size: 12px;
		line-height: 1.45;
	}

	.summary-email {
		color: #77766e;
	}

	.form-error {
		color: #c0392b;
	}

	@media (max-width: 700px) {
		.profile-menu {
			right: 12px;
			bottom: 48px;
		}

		.trigger-text {
			display: none;
		}

		.profile-trigger {
			padding-right: 5px;
		}
	}

	@media (min-width: 1024px) {
		.profile-menu {
			right: 24px;
			bottom: 56px;
		}
	}
</style>
