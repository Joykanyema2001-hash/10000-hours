import { Linking } from 'react-native';

/** Hosted from /docs on GitHub Pages. */
export const LEGAL_BASE = 'https://joykanyema2001-hash.github.io/10000-hours';
export const PRIVACY_URL = `${LEGAL_BASE}/privacy.html`;
export const TERMS_URL = `${LEGAL_BASE}/terms.html`;

export const openLegal = (url: string) => Linking.openURL(url).catch(() => {});
