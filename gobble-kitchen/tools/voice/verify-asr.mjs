#!/usr/bin/env node
// Optional check that the narrator MP3s say the right words: transcribes every file listed in
// src/assets/audio/voice/manifest.json with Whisper (base.en, MIT, ~290 MB download into .cache/)
// and prints the lines where the transcript differs from the text.
//
//   cd tools/voice && node verify-asr.mjs
//
// Speech recognition makes mistakes of its own, mostly on one-word lines, so a mismatch means
// "have a human listen to this one", not "this one is wrong". It always exits 0.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(HERE, "../../src/assets/audio/voice");
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const MODEL = process.argv.find((a) => a.startsWith("--model="))?.slice(8) ?? "Xenova/whisper-base.en";

// Same proxy restart as build-voice.mjs (Node's fetch needs NODE_USE_ENV_PROXY=1 behind a proxy).
if ((process.env.HTTPS_PROXY || process.env.https_proxy) && !process.env.NODE_USE_ENV_PROXY) {
  const child = spawnSync(process.execPath, ["--disable-warning=UNDICI-EHPA", fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    stdio: "inherit",
    env: { ...process.env, NODE_USE_ENV_PROXY: "1" },
  });
  process.exit(child.status ?? 1);
}

const manifest = JSON.parse(fs.readFileSync(path.join(OUT_DIR, "manifest.json"), "utf8"));
const { env, pipeline } = await import("@huggingface/transformers");
env.cacheDir = path.join(HERE, ".cache");
const asr = await pipeline("automatic-speech-recognition", MODEL, {
  device: "cpu",
  dtype: { encoder_model: "fp32", decoder_model_merged: "fp32" },
});

// Words Whisper may write instead that sound the same, so are not a fault in the audio.
const SAME_SOUND = { peak: "peek" };
const words = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => SAME_SOUND[w] ?? w)
    .join(" ");
const LEAD_IN = 4800; // 0.3 s of silence either side at 16 kHz: Whisper mishears clips that start at once
let checked = 0;
const mismatches = [];
for (const voice of manifest.voices) {
  for (const [id, text] of Object.entries(manifest.lines)) {
    const entry = manifest.files[voice]?.[id];
    if (!entry) continue;
    const dec = spawnSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-i", path.join(OUT_DIR, entry.file), "-f", "f32le", "-ac", "1", "-ar", "16000", "pipe:1"], { maxBuffer: 1 << 26 });
    if (dec.status !== 0) {
      mismatches.push({ file: entry.file, wanted: text, heard: "(does not decode)" });
      continue;
    }
    const pcm = new Float32Array(dec.stdout.buffer, dec.stdout.byteOffset, Math.floor(dec.stdout.byteLength / 4));
    const wanted = manifest.spokenAs?.[id] ?? text;
    const padded = new Float32Array(pcm.length + 2 * LEAD_IN);
    padded.set(pcm, LEAD_IN);
    const heard = (await asr(padded)).text.trim();
    checked++;
    if (words(heard) !== words(wanted)) mismatches.push({ file: entry.file, wanted, heard });
  }
}

console.log(`Whisper (${MODEL}) heard the expected words in ${checked - mismatches.length} of ${checked} files.`);
for (const m of mismatches) console.log(`  ${m.file.padEnd(30)} wanted ${JSON.stringify(m.wanted).padEnd(26)} heard ${JSON.stringify(m.heard)}`);
