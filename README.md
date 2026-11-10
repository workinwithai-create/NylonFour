# NylonFour

Four-bar live nylon guitar fingerstyle riff desk for bedroom producers and AI-music finishers.

A stuck loop needs a figure. NylonFour writes four bars of live FluidR3 acoustic nylon guitar locked to your chords and BPM — Travis picking, arpeggio rolls, ostinato, sparse air — so the track finally has a melodic guitar line that drops on the grid.

Distinct from RiffFour (overdriven electric), HardArp (marimba arpeggios), HookLine (singable violin/trumpet), ArpFour, GrooveFour, BassWalk.

## Features
- BPM 60–180, key selector, 4-chord entry (persists in localStorage)
- Live changes apply on next step
- Audio-clock lookahead scheduler
- Export loop-perfect WAV (48 kHz, downbeat at sample 0, exact length, tail folded) + MIDI
- Samples pinned to `gleitz/midi-js-soundfonts@044fab8e1456bfafc5776e86dfd6bb8697149aef`
- Tap-to-start, visibility stop, iOS silent-switch note

## Pricing recommendation
**One-time $19** on Lemon Squeezy (Merchant of Record). Mirror on Gumroad.

This is a finite desk, not a cloud meter. Do not subscribe. Forge Pass stays the recurring bundle for AuraMix / MixForge / etc.

Best place to sell: Gumroad or Lemon Squeezy next to other indie music tools; pin a short X demo.

## Stack
Static HTML/CSS/JS. Deploy on Vercel team `release-forge`.

## License
MIT. Free until checkout opens (empty license gate).

Samples: FluidR3_GM acoustic_guitar_nylon (CC-BY).

## Acceptance
Built to WorkinWithAI Audio Engine Rules 1–9. QA script reports:
1. Export length exact at 92 BPM / 8 bars / 48 kHz
2. Seamless loop in DAW
3. Tab hide stops cleanly
4. Live recipe/BPM changes within one bar
5. Missing sample named in UI
6. Notes sustain with envelopes
7. No @main, no Math.random in export path, voice matches sample
