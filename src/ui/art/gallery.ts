/** Dev-only art gallery (gallery.html): every card face, back, Wild and icon at play size. */
import '../styles.css';
import { fullDeck } from '../../core/cards';
import { cardBackSvg, cardFaceSvg, wildCardSvg } from './cardArt';
import { catHeadSvg, catPortraitSvg, fishSvg, heartSvg, pawSvg, yarnBallSvg } from './catArt';

function section(title: string, cls: string, items: readonly string[]): string {
  return `<h2>${title}</h2><div class="grid">${items.map((svg) => `<div class="${cls}">${svg}</div>`).join('')}</div>`;
}

document.querySelector<HTMLElement>('#gallery')!.innerHTML =
  section('Faces', 'card', fullDeck().map(cardFaceSvg)) +
  section('Back & Wild', 'card', [cardBackSvg(), cardBackSvg(), wildCardSvg()]) +
  section('Icons', 'icon', [
    catPortraitSvg('kitten'),
    catPortraitSvg('bow'),
    catPortraitSvg('crown'),
    catHeadSvg(),
    pawSvg(),
    yarnBallSvg(),
    heartSvg(),
    fishSvg(),
  ]);
