# Stream Essentials v1

Five static packages: Studio Orbit (general), Voltage Arena (gaming), Prism Sessions (music), Afterhours Deck (DJ) and Slow Brew (coffee/chill). Each package includes three colour variants, 96 PNG exports, nine layered PSD documents, SVG sources, usage terms and OBS setup instructions. The five packages use the existing private R2/D1 product delivery flow. Studio Orbit replaces the former planned product with id `stream`; the other ids are `stream-gaming`, `stream-music`, `stream-dj` and `stream-coffee`.

Scene graphics are native 1920×1080. Webcam exports are 640×360, 512×512 and 360×640; panels are 320×120. Transparent areas are real alpha channels. The gaming camera intentionally overlaps the gameplay area. Camera and game sources must be placed beneath the PNG overlay. Chat services, cameras, music, alerts and animations are not bundled or automatically connected.

Each colour includes three PSDs:

- Scenes: seven mutually exclusive scene groups on a 1920×1080 canvas.
- Panels: eight mutually exclusive panel groups on a 320×120 canvas.
- Elements: three webcam groups and a lower-third group on a 960×640 canvas. Export individual elements with cropping, or use the supplied PNGs.

Texts are native PSD type layers; visual frames, bars and decoration are separate raster layers. Fully scalable form and colour editing is available in the SVG sources. Arial Regular/Bold is used; proprietary font files are not redistributed. A customer using an editor without Arial must select a suitable local substitute or load their own licensed font.

Validation checks original PNG dimensions, transparent window interiors, opaque screen backgrounds, native type layers and group visibility in an independent PSD reader, and rebuilds PSD composites from their layers. A panel type layer was also changed interactively in Photopea from “ÜBER MICH” to “MEIN KANAL”. Pack ZIP integrity and uploaded R2 checksums are verified. These asset checks do not replace a customer's test with their own OBS camera, game source and chat provider.

Production source is in `tools/stream-assets`. Generated private originals and customer ZIP archives are stored outside version control. Public shop galleries contain reduced JPEG previews with clearly labelled demo placeholders. The checkout remains in preview mode; only verified paid orders or the authorized administrator may retrieve private ZIPs.
