import { mount } from 'svelte';
import { registerSW } from 'virtual:pwa-register';
import App from './App.svelte';
import { install } from './lib/install.svelte.ts';
import { router } from './lib/router.svelte.ts';
import './app.css';

install.listen();
router.start();
// Code and data are precached for offline use. When a new version is deployed it installs in
// the background and the page reloads into it (progress is already saved, so nothing is lost).
registerSW({ immediate: true });

export default mount(App, { target: document.getElementById('app')! });
