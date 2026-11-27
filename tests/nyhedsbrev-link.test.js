import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

describe('link til nyhedsbrevet', () => {
  it('står mellem navnet og kortene til de sociale medier', () => {
    const link = html.indexOf('href="https://danskfolkeparti.dk/tilmeld-dig-mit-nyhedsbrev/"');
    expect(link).toBeGreaterThan(html.indexOf('<p class="haandtag">@mrmesserschmidt</p>'));
    expect(link).toBeLessThan(html.indexOf('<div class="gitter">'));
  });
  it('har en tydelig tekst', () => {
    expect(html).toContain('Tilmeld dig mit nyhedsbrev');
  });
});
