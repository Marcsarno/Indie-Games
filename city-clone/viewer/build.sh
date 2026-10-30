#!/usr/bin/env bash
# The Artifact host serves no .glb, so the page loads base64 text copies. Run after re-exporting any model into this folder.
set -e; cd "$(dirname "$0")"
for f in character car_sedan car_taxi veg worlds/chinatown/scene; do base64 -w0 $f.glb > $f.glb.b64.txt; done; ls -la *.b64.txt worlds/*/*.b64.txt | awk '{print $5, $9}'
# On Vercel: stamp a content-hash manifest into index.html so every asset URL carries ?v=<hash> and can be cached for a year (vercel.json)
if [ -n "$VERCEL" ]; then
  node -e '
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const files = [];
for (const d of [".", ...fs.readdirSync("worlds").map(w => "worlds/" + w)]) for (const f of fs.readdirSync(d)) if (/\.(glb|b64\.txt|json|js)$/.test(f) && (d !== "." || !/\.json$/.test(f))) files.push(d === "." ? f : d + "/" + f);
const man = {}; for (const f of files) man[f] = crypto.createHash("md5").update(fs.readFileSync(f)).digest("hex").slice(0, 10);
let s = fs.readFileSync("index.html", "utf8"); s = s.replace("\x27__MANIFEST__\x27.startsWith(\x27__\x27) ? \x27{}\x27 : \x27__MANIFEST__\x27", "\x27" + JSON.stringify(man) + "\x27");
fs.writeFileSync("index.html", s); console.log("manifest stamped", Object.keys(man).length, "files");'
fi
