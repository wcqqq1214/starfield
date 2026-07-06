# TODO

## Positioning

- [ ] Keep Starfield focused as a lightweight web sky explorer, not a full
  browser clone of Stellarium.
- [ ] Make the core promise clear: choose a place on Earth, then explore the
  bright stars, planets, Moon, and deep-sky highlights visible from that local
  sky.
- [ ] Keep accuracy claims conservative until precession, proper motion, and
  current-sky validation are implemented.

## Near Term

- [ ] Improve the GitHub landing page with a strong README screenshot, short
  demo GIF, feature list, roadmap, data-source notes, and accuracy limits.
- [ ] Add sky time controls: now, date/time picker, step forward/back, and
  faster playback.
- [ ] Add Sun, Moon, and planet visibility using the existing astronomy engine,
  including altitude, azimuth, rise/set context, and object details.
- [ ] Add object search for bright stars, deep-sky objects, cities, and manual
  coordinates.
- [ ] Add optional sky labels and overlays, starting with bright-star labels,
  horizon/cardinal directions, and deep-sky object names.
- [ ] Add shareable URLs that preserve location, time, stage, and selected
  object.

## Accuracy And Data

- [ ] Add a validation page or script that compares computed sky positions
  against trusted astronomy references for several locations and times.
- [ ] Include horizon-edge checks in validation, because near-horizon objects
  are the easiest place for visible/hidden mismatches.
- [ ] Decide whether to apply precession and proper-motion correction or keep
  the current approximation with explicit labeling.
- [ ] Expand object metadata so selected stars and deep-sky objects show useful
  facts beyond name, constellation, magnitude, and rough distance.

## Longer Term

- [ ] Add a guided "tonight's sky" mode that surfaces the most interesting
  visible objects for the selected location.
- [ ] Add current-sky content hooks such as moon phase, upcoming conjunctions,
  meteor-shower context, or NASA APOD links.
- [ ] Consider a more continuous space-exploration mode inspired by Celestia and
  OpenSpace, but only if it strengthens the local-sky experience.
