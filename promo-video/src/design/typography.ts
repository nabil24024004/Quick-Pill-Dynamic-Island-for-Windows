import {loadFont as loadPlayfair} from '@remotion/google-fonts/PlayfairDisplay';
import {loadFont as loadSourceSerif4} from '@remotion/google-fonts/SourceSerif4';
import {loadFont as loadJetBrainsMono} from '@remotion/google-fonts/JetBrainsMono';

const playfairRegular = loadPlayfair('normal', {
  weights: ['600', '700'],
  subsets: ['latin'],
});

const playfairItalic = loadPlayfair('italic', {
  weights: ['600', '700'],
  subsets: ['latin'],
});

const sourceSerif = loadSourceSerif4('normal', {
  weights: ['400', '600'],
  subsets: ['latin'],
});

const jetBrainsMono = loadJetBrainsMono('normal', {
  weights: ['500', '700'],
  subsets: ['latin'],
});

export const FONTS = {
  display: playfairRegular.fontFamily,
  displayItalic: playfairItalic.fontFamily,
  body: sourceSerif.fontFamily,
  mono: jetBrainsMono.fontFamily,
} as const;
