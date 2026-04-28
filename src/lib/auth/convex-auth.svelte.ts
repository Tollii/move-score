import { getContext, setContext } from 'svelte';
import type { ConvexClient } from 'convex/browser';

const AUTH_CONTEXT_KEY = '$$_moveScoreAuth';
const JWT_STORAGE_KEY = '__convexAuthJWT';
const REFRESH_TOKEN_STORAGE_KEY = '__convexAuthRefreshToken';

type Tokens = {
	token: string;
	refreshToken?: string;
};

type SignInResult = {
	tokens?: Tokens | null;
};

export type AuthFlow = 'signIn' | 'signUp';

export class ConvexAuthState {
	#client: ConvexClient;
	#storageNamespace: string;

	isLoading = $state(true);
	isAuthenticated = $state(false);
	token = $state<string | null>(null);

	constructor(client: ConvexClient, storageNamespace: string) {
		this.#client = client;
		this.#storageNamespace = storageNamespace;
	}

	async initialize() {
		if (typeof window === 'undefined') {
			this.isLoading = false;
			return;
		}

		this.token = this.#getStored(JWT_STORAGE_KEY);
		this.isAuthenticated = this.token !== null;
		this.#configureClientAuth();

		this.isLoading = false;
	}

	async signIn(provider: string, params: Record<string, string>) {
		const result = (await this.#client.action(
			'auth:signIn' as never,
			{
				provider,
				params
			} as never
		)) as unknown;

		if (isSignInResult(result) && result.tokens !== undefined) {
			this.#setTokens(result.tokens);
			this.#configureClientAuth();
			return result.tokens !== null;
		}

		return false;
	}

	async signOut() {
		try {
			await this.#client.action('auth:signOut' as never, {} as never);
		} catch {
			// Already-signed-out sessions can fail server-side; local cleanup still matters.
		}

		this.#setTokens(null);
		this.#configureClientAuth();
	}

	#configureClientAuth() {
		this.#client.setAuth(
			async ({ forceRefreshToken }) => {
				if (forceRefreshToken) {
					try {
						return await this.#refreshToken();
					} catch (err) {
						console.warn('Could not refresh Convex auth token; clearing local session.', err);
						this.#setTokens(null);
						return null;
					}
				}

				return this.token;
			},
			(isAuthenticated) => {
				this.isAuthenticated = isAuthenticated;
			}
		);
	}

	async #refreshToken() {
		const refreshToken = this.#getStored(REFRESH_TOKEN_STORAGE_KEY);

		if (!refreshToken) {
			this.#setTokens(null);
			return null;
		}

		const result = (await this.#client.action(
			'auth:signIn' as never,
			{
				refreshToken
			} as never
		)) as unknown;

		if (isSignInResult(result) && result.tokens !== undefined) {
			this.#setTokens(result.tokens);
			return this.token;
		}

		this.#setTokens(null);
		return null;
	}

	#setTokens(tokens: Tokens | null) {
		this.token = tokens?.token ?? null;
		this.isAuthenticated = this.token !== null;

		if (!tokens) {
			this.#removeStored(JWT_STORAGE_KEY);
			this.#removeStored(REFRESH_TOKEN_STORAGE_KEY);
			return;
		}

		this.#setStored(JWT_STORAGE_KEY, tokens.token);
		if (tokens.refreshToken) {
			this.#setStored(REFRESH_TOKEN_STORAGE_KEY, tokens.refreshToken);
		}
	}

	#storageKey(key: string) {
		return `${key}_${this.#storageNamespace.replace(/[^a-zA-Z0-9]/g, '')}`;
	}

	#getStored(key: string) {
		return window.localStorage.getItem(this.#storageKey(key));
	}

	#setStored(key: string, value: string) {
		window.localStorage.setItem(this.#storageKey(key), value);
	}

	#removeStored(key: string) {
		window.localStorage.removeItem(this.#storageKey(key));
	}
}

export function setAuthContext(auth: ConvexAuthState) {
	setContext(AUTH_CONTEXT_KEY, auth);
}

export function useAuth() {
	const auth = getContext<ConvexAuthState>(AUTH_CONTEXT_KEY);

	if (!auth) {
		throw new Error('No Convex auth context was found.');
	}

	return auth;
}

function isSignInResult(value: unknown): value is SignInResult {
	return value !== null && typeof value === 'object';
}
