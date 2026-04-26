import * as Sentry from '@sentry/sveltekit';

Sentry.init({
	dsn: 'https://6a9eedf9b017949e2dbb32c20d45eea7@o4511198613274624.ingest.de.sentry.io/4511287553359952',

	tracesSampleRate: 1.0,

	// Enable logs to be sent to Sentry
	enableLogs: true

	// uncomment the line below to enable Spotlight (https://spotlightjs.com)
	// spotlight: import.meta.env.DEV,
});
