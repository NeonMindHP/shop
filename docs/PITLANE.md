# NeonMind Pitlane

The approved motorsport design is delivered as a dedicated Streaming product (`pitlane`) using the existing private R2 download flow. The public product gallery uses reduced JPEG previews of the actual exported assets. Demo game, camera and chat regions are explicitly labelled.

The customer package contains 65 PNG files, nine layered PSDs with 66 native text layers, twelve channel panels at 640 × 160 and 320 × 80, webcam frames with 640 × 360 / 512 × 512 / 360 × 640 interior apertures, four static alert cards, a profile banner, namestrips, artwork sources and German setup documentation. Seven individual scene/overlay PSDs accompany grouped panel and element PSDs. Chrome/red gradients and outline styles on the scene headlines are native editable Photoshop effects. The design has one red/black/silver colour scheme.

Scene exports are 1920 × 1080; the generated garage artwork starts at 1672 × 941 and is scaled to the scene canvas. No native 4K resolution is claimed. The supplied personal references are not bundled: no child portrait, portrait ring or Joel name appears in the customer materials. Production materials were generated from the approved design using the built-in image generation tool, then assembled into explicit functional apertures and layered exports.

Checks cover all declared transparent windows, opaque scene backgrounds, independent PSD layer composition and type/effect parsing, ZIP integrity and checksums. The Windows OBS helper creates a scene collection import file beside the unpacked assets without editing the user's OBS configuration. The seven image-source paths and scene structure were checked against the installed OBS collection format. A live OBS session with cameras, gameplay and chat devices remains a user test; no automatic account/device connections or dynamic alert services are included.

Production scripts live under `tools/pitlane-assets`; install their Node dependencies in the sibling `tools/stream-assets` directory. Original generated material files are kept in the private customer package, not the public Git repository. The checkout remains in test mode.
