import type { Dictionary, PokemonEntry } from '../lib/game-data.ts';
import { en, type UiKey, type UiStrings } from './ui/en.ts';
import { DEFAULT_LOCALE, LOCALES } from './locales.ts';
import { loadDictionary } from '../lib/data.ts';

export type Params = Record<string, string | number>;

export function format(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in params ? String(params[key]) : match));
}

/** Lowercase, accent-free form used for searching. */
export const normalize = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

class I18n {
  locale = $state(DEFAULT_LOCALE);
  #ui = $state.raw<UiStrings>(en);
  #names = $state.raw<Dictionary>({});

  /** UI string, falling back to English, with `{param}` substitution. */
  t = (key: UiKey, params?: Params): string => format(this.#ui[key] ?? en[key], params);

  /** Display name of any content id, e.g. name('dungeon', 'mt-steel'). Falls back to the id. */
  name = (kind: string, id: string): string => this.#names[`${kind}.${id}`] ?? id;

  entryName = (entry: PokemonEntry): string => {
    const own = this.#names[`pokemon.${entry.id}`];
    if (own) return own;
    const species = this.name('species', entry.species);
    return entry.form ? `${species} (${this.name('form', entry.form)})` : species;
  };

  collator = $derived(new Intl.Collator(this.locale));

  async load(locale: string, gameId: string): Promise<void> {
    const info = LOCALES.find((l) => l.code === locale) ?? LOCALES[0]!;
    const [ui, names] = await Promise.all([info.load(), loadDictionary(gameId, info.code, DEFAULT_LOCALE)]);
    this.#ui = ui;
    this.#names = names;
    this.locale = info.code;
    document.documentElement.lang = info.code;
  }
}

export const i18n = new I18n();
export const t = i18n.t;
