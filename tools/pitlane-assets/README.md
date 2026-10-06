# NeonMind Pitlane production

This builds the approved black/red motorsport design from separate generated artwork, metal frame and glass panel textures. These private PNG inputs are supplied in the owner's download package under `Quellen`; do not commit the customer originals to the public repository.

Install the Node dependencies with `npm ci` in `tools/stream-assets` and install this folder's `requirements.txt` in a Python virtual environment. Put the three production PNGs (`Garage.png`, `Metallrahmen.png`, `Glaspanel.png`) under `outputs/NeonMind-Pitlane-v1/Quellen`, or set `NEONMIND_PITLANE_ROOT` to an existing unpacked package directory.

Run `node build.cjs`, then `python finish.py` in this folder. The second step independently composites the PSD layers and native headline effects, refreshes the merged preview caches, checks transparent apertures and dimensions, and builds the customer archive, documentation, OBS import template and reduced shop previews. Use the configured full Node path in `finish.py` on this owner's Windows host, or adjust it for a different host.

Scene PSDs contain separate raster materials and native text layers. Chrome/red headline gradients and strokes are real editable Photoshop layer effects. Panels and elements are grouped in their own PSDs; only one group is initially visible. The OBS helper writes an import file beside the unpacked assets and never edits OBS configuration or connects devices/accounts. The collection is schema-checked using the existing local OBS collection structure; a live OBS session with the customer's devices is a separate check.
