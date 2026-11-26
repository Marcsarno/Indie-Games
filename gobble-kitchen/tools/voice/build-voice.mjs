#!/usr/bin/env node
// Narrator voice build step for Gobble Gobble Kitchen.
//
//   cd tools/voice && npm install && node build-voice.mjs [--force] [--verify-only] [--prune]
//
// Reads   tools/voice/lines.json       { voices: [kokoro voice ids], lines: { id: text } }
//         tools/voice/pronounce.json   optional { id: "text to SPEAK instead" } for words the
//                                      phonemizer gets wrong (the manifest keeps the original text)
// Writes  src/assets/audio/voice/<voice>/<id>.mp3   mono, 24 kHz, 48 kbps CBR MP3
//         src/assets/audio/voice/manifest.json      voices, line ids, text, per-file duration + hash
//
// Speech comes from Kokoro-82M (Apache-2.0) through kokoro-js / ONNX Runtime on the CPU. The
// model is downloaded once from huggingface.co into tools/voice/.cache/ (gitignored); after that
// the script needs no network. Re-running skips every file whose text and settings are unchanged.

import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(HERE, "../../src/assets/audio/voice");
const MANIFEST_PATH = path.join(OUT_DIR, "manifest.json");
const CACHE_DIR = path.join(HERE, ".cache");

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
const SAMPLE_RATE = 24000; // Kokoro's native rate
const BITRATE_KBPS = 48;
const PAD_S = 0.04; // near-silence kept before and after the speech
// Every line is brought to the same speech level (RMS of the spoken part), which is what makes
// them sound equally loud. -18 puts the peakiest lines right at the ceiling; the few whose peaks
// would pass it ("Extra crispy!") are held at the ceiling instead and end up about 2 dB quieter.
const TARGET_RMS_DB = -18;
const PEAK_CEILING_DB = -1.5;
const MIN_DURATION_S = 0.5; // outside these bounds a file is reported as suspicious
const MAX_DURATION_S = 3.0;
const PIPELINE_VERSION = 1; // bump to regenerate everything after changing the audio processing
const FFMPEG = process.env.FFMPEG || "ffmpeg";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const FORCE = flag("force");
const VERIFY_ONLY = flag("verify-only");
const PRUNE = flag("prune");
const DTYPE = option("dtype", "q8");
const SPEED = Number(option("speed", "0.95"));

if (flag("help")) {
  console.log(
    [
      "node build-voice.mjs [options]",
      "  --force        regenerate every file",
      "  --verify-only  only check the files that are already there",
      "  --prune        delete MP3s in the output folder that lines.json no longer asks for",
      "  --dtype=q8     model precision: q8 (default, 92 MB) or fp32 (326 MB)",
      "  --speed=0.95   speaking rate",
    ].join("\n"),
  );
  process.exit(0);
}

// Node's built-in fetch ignores HTTPS_PROXY unless NODE_USE_ENV_PROXY=1 is set at startup
// (Node >= 22.21). Behind a proxy, restart once with it set so the model download works.
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
if (proxyUrl && !process.env.NODE_USE_ENV_PROXY) {
  // --disable-warning hides Node's "EnvHttpProxyAgent is experimental" notice
  const quiet = process.allowedNodeEnvironmentFlags.has("--disable-warning") ? ["--disable-warning=UNDICI-EHPA"] : [];
  const child = spawnSync(process.execPath, [...quiet, fileURLToPath(import.meta.url), ...args], {
    stdio: "inherit",
    env: { ...process.env, NODE_USE_ENV_PROXY: "1" },
  });
  process.exit(child.status ?? 1);
}

const db = (x) => 20 * Math.log10(Math.max(x, 1e-9));
const fromDb = (d) => 10 ** (d / 20);
const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 12);

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

// ---------------------------------------------------------------------------------------------
// Audio helpers
// ---------------------------------------------------------------------------------------------

/** RMS of consecutive windows of `size` samples. */
function windowRms(samples, size) {
  const count = Math.floor(samples.length / size);
  const out = new Float64Array(count);
  for (let w = 0; w < count; w++) {
    let sum = 0;
    for (let i = w * size; i < (w + 1) * size; i++) sum += samples[i] * samples[i];
    out[w] = Math.sqrt(sum / size);
  }
  return out;
}

function measureRms(samples) {
  let sum = 0;
  for (const v of samples) sum += v * v;
  return db(Math.sqrt(sum / Math.max(samples.length, 1)));
}

/** Peak and the RMS of the parts that are actually speech (windows within 30 dB of the loudest). */
function measure(samples) {
  let peak = 0;
  for (const v of samples) if (Math.abs(v) > peak) peak = Math.abs(v);
  const rms = windowRms(samples, Math.round(SAMPLE_RATE * 0.02));
  const loudest = rms.reduce((a, b) => Math.max(a, b), 0);
  let sum = 0;
  let n = 0;
  for (const r of rms) {
    if (r > loudest * fromDb(-30)) {
      sum += r * r;
      n++;
    }
  }
  return { peakDb: db(peak), speechRmsDb: db(n ? Math.sqrt(sum / n) : 0) };
}

/**
 * Find the spoken part of a Kokoro clip. Kokoro pads each clip with 0.2-0.6 s of near-digital
 * silence and now and then leaves a tiny click in that padding, well after the last word.
 * Windows louder than 50 dB below the loudest one count as sound; runs of sound closer together
 * than 120 ms are one segment (so the gap before a final "t" or a comma pause stays inside).
 * Short, quiet segments left at either edge are the clicks and are dropped.
 */
function findSpeech(samples) {
  const size = Math.round(SAMPLE_RATE * 0.01);
  const rms = windowRms(samples, size);
  const loudest = rms.reduce((a, b) => Math.max(a, b), 0);
  const threshold = Math.max(loudest * fromDb(-50), fromDb(-70));
  const maxGap = 12; // windows = 120 ms

  const segments = [];
  let current = null;
  for (let w = 0; w < rms.length; w++) {
    if (rms[w] <= threshold) continue;
    if (current && w - current.end <= maxGap) {
      current.end = w;
      current.peak = Math.max(current.peak, rms[w]);
    } else {
      current = { start: w, end: w, peak: rms[w] };
      segments.push(current);
    }
  }
  if (!segments.length) return null;

  const isClick = (s) => s.end - s.start + 1 <= 10 && s.peak < loudest * fromDb(-25);
  const dropped = [];
  while (segments.length > 1 && isClick(segments[0])) dropped.push(segments.shift());
  while (segments.length > 1 && isClick(segments.at(-1))) dropped.push(segments.pop());

  return {
    start: segments[0].start * size,
    end: Math.min(samples.length, (segments.at(-1).end + 1) * size),
    dropped: dropped.map((s) => ({
      atS: +((s.start * size) / SAMPLE_RATE).toFixed(2),
      ms: (s.end - s.start + 1) * 10,
      levelDb: Math.round(db(s.peak)),
    })),
  };
}

/** Trim to the speech plus PAD_S either side, level it, and fade the two ends. */
function master(raw) {
  const speech = findSpeech(raw);
  if (!speech) throw new Error("the model returned silence");
  const pad = Math.round(SAMPLE_RATE * PAD_S);
  const out = new Float32Array(speech.end - speech.start + 2 * pad);
  for (let i = 0; i < out.length; i++) {
    const src = speech.start - pad + i;
    out[i] = src >= 0 && src < raw.length ? raw[src] : 0;
  }

  const before = measure(out);
  const gainDb = Math.min(TARGET_RMS_DB - before.speechRmsDb, PEAK_CEILING_DB - before.peakDb);
  const gain = fromDb(gainDb);
  const fadeIn = Math.round(SAMPLE_RATE * 0.008);
  const fadeOut = Math.round(SAMPLE_RATE * 0.02);
  for (let i = 0; i < out.length; i++) {
    let g = gain;
    if (i < fadeIn) g *= i / fadeIn;
    if (i >= out.length - fadeOut) g *= (out.length - 1 - i) / fadeOut;
    out[i] *= g;
  }
  return {
    samples: out,
    gainDb,
    peakLimited: PEAK_CEILING_DB - before.peakDb < TARGET_RMS_DB - before.speechRmsDb,
    dropped: speech.dropped,
  };
}

function runFfmpeg(ffArgs, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(FFMPEG, ["-hide_banner", "-loglevel", "error", ...ffArgs], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    const out = [];
    const err = [];
    child.stdout.on("data", (d) => out.push(d));
    child.stderr.on("data", (d) => err.push(d));
    child.on("error", (e) => reject(new Error(`cannot run ${FFMPEG}: ${e.message}`)));
    child.on("close", (code) => {
      if (code === 0) resolve(Buffer.concat(out));
      else reject(new Error(`ffmpeg exited ${code}: ${Buffer.concat(err).toString().trim()}`));
    });
    child.stdin.on("error", () => {}); // ffmpeg's own error is reported through the exit code
    child.stdin.end(input ?? Buffer.alloc(0));
  });
}

async function encodeMp3(samples, file) {
  const tmp = `${file}.tmp`;
  const pcm = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength);
  // -f mp3 because of the .tmp name; no ID3 tags (they are only bytes); the LAME info frame is
  // kept so decoders can skip the encoder's padding.
  await runFfmpeg(
    [
      "-y",
      ...["-f", "f32le", "-ar", String(SAMPLE_RATE), "-ac", "1", "-i", "pipe:0"],
      ...["-c:a", "libmp3lame", "-b:a", `${BITRATE_KBPS}k`, "-ar", String(SAMPLE_RATE), "-ac", "1"],
      ...["-map_metadata", "-1", "-id3v2_version", "0", "-write_id3v1", "0", "-f", "mp3", tmp],
    ],
    pcm,
  );
  fs.renameSync(tmp, file);
}

async function decodeMp3(file) {
  const buf = await runFfmpeg(["-i", file, "-f", "f32le", "-ac", "1", "-ar", String(SAMPLE_RATE), "pipe:1"]);
  return new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 4));
}

// ---------------------------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------------------------

const config = readJson(path.join(HERE, "lines.json"));
if (!config) throw new Error("tools/voice/lines.json is missing");
const pronounce = readJson(path.join(HERE, "pronounce.json"), {});
const lineIds = Object.keys(config.lines);
for (const id of Object.keys(pronounce)) {
  if (!(id in config.lines)) console.warn(`pronounce.json: "${id}" is not a line id in lines.json (ignored)`);
}
for (const id of [...config.voices, ...lineIds]) {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error(`"${id}" cannot be used as a file name`);
}
const spokenText = (id) => pronounce[id] ?? config.lines[id];

const { KokoroTTS } = await import("kokoro-js");
// kokoro-js only exposes its voice table on an instance; the getter does not need a loaded model.
const knownVoices = KokoroTTS.prototype.voices;

// A voice id the model does not have is replaced by the best-graded female voice with the same
// accent (falling back to af_heart). Files still go under the requested id so game paths hold.
const gradeOrder = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F+", "F"];
const substitutions = {};
for (const requested of config.voices) {
  if (requested in knownVoices) continue;
  const females = Object.entries(knownVoices)
    .filter(([, v]) => v.gender === "Female")
    .sort((a, b) => gradeOrder.indexOf(a[1].overallGrade) - gradeOrder.indexOf(b[1].overallGrade));
  const sameAccent = females.find(([id]) => id[0] === requested[0]);
  substitutions[requested] = (sameAccent ?? females[0])[0];
  console.warn(`VOICE SUBSTITUTED: "${requested}" is not a Kokoro voice, using "${substitutions[requested]}"`);
}
const actualVoice = (v) => substitutions[v] ?? v;

const oldManifest = readJson(MANIFEST_PATH, {});
const entryHash = (voice, id) =>
  sha(JSON.stringify([PIPELINE_VERSION, MODEL_ID, DTYPE, SPEED, actualVoice(voice), spokenText(id), BITRATE_KBPS, TARGET_RMS_DB, PEAK_CEILING_DB, PAD_S]));
const relPath = (voice, id) => `${voice}/${id}.mp3`;

const files = {};
const todo = [];
for (const voice of config.voices) {
  files[voice] = {};
  for (const id of lineIds) {
    const file = path.join(OUT_DIR, relPath(voice, id));
    const old = oldManifest.files?.[voice]?.[id];
    const hash = entryHash(voice, id);
    const upToDate = !FORCE && old?.hash === hash && fs.existsSync(file) && fs.statSync(file).size === old.bytes;
    if (upToDate) files[voice][id] = old;
    else todo.push({ voice, id, file, hash });
  }
}

function writeManifest() {
  let totalBytes = 0;
  for (const voice of Object.keys(files)) for (const e of Object.values(files[voice])) totalBytes += e.bytes;
  const manifest = {
    note: "Generated by tools/voice/build-voice.mjs. Do not edit by hand.",
    model: MODEL_ID,
    dtype: DTYPE,
    speed: SPEED,
    format: { codec: "mp3", sampleRate: SAMPLE_RATE, channels: 1, bitrateKbps: BITRATE_KBPS },
    voices: config.voices,
    substitutions,
    lines: config.lines,
    spokenAs: Object.fromEntries(lineIds.filter((id) => id in pronounce).map((id) => [id, pronounce[id]])),
    files,
    totalBytes,
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
}

// ---------------------------------------------------------------------------------------------
// Generate
// ---------------------------------------------------------------------------------------------

const expected = config.voices.length * lineIds.length;
if (VERIFY_ONLY) {
  console.log(`Verify only: ${expected} files expected.`);
} else if (!todo.length) {
  console.log(`All ${expected} voice files are up to date (use --force to regenerate).`);
} else {
  console.log(`Generating ${todo.length} of ${expected} voice files (${DTYPE}, speed ${SPEED})...`);
  const { env } = await import("@huggingface/transformers");
  env.cacheDir = CACHE_DIR;
  const started = Date.now();
  const tts = await KokoroTTS.from_pretrained(MODEL_ID, { dtype: DTYPE, device: "cpu" });
  console.log(`Model ready in ${((Date.now() - started) / 1000).toFixed(1)} s.`);

  let done = 0;
  for (const voice of config.voices) {
    const jobs = todo.filter((t) => t.voice === voice);
    if (!jobs.length) continue;
    fs.mkdirSync(path.join(OUT_DIR, voice), { recursive: true });
    for (const job of jobs) {
      const audio = await tts.generate(spokenText(job.id), { voice: actualVoice(voice), speed: SPEED });
      if (audio.sampling_rate !== SAMPLE_RATE) throw new Error(`unexpected sample rate ${audio.sampling_rate}`);
      const mastered = master(audio.audio);
      await encodeMp3(mastered.samples, job.file);
      files[voice][job.id] = {
        file: relPath(voice, job.id),
        duration: +(mastered.samples.length / SAMPLE_RATE).toFixed(3),
        bytes: fs.statSync(job.file).size,
        hash: job.hash,
      };
      done++;
      const notes = [];
      if (mastered.peakLimited) notes.push("peak-limited");
      for (const d of mastered.dropped) notes.push(`dropped a ${d.ms} ms click at ${d.atS} s (${d.levelDb} dBFS)`);
      console.log(
        `  [${String(done).padStart(3)}/${todo.length}] ${relPath(voice, job.id).padEnd(32)} ` +
          `${files[voice][job.id].duration.toFixed(2)} s  gain ${mastered.gainDb >= 0 ? "+" : ""}${mastered.gainDb.toFixed(1)} dB` +
          (notes.length ? `  (${notes.join("; ")})` : ""),
      );
    }
    // keep line order stable and save after each voice so an interrupted run loses little
    files[voice] = Object.fromEntries(lineIds.filter((id) => files[voice][id]).map((id) => [id, files[voice][id]]));
    writeManifest();
  }
}

// ---------------------------------------------------------------------------------------------
// Verify every expected file by decoding it
// ---------------------------------------------------------------------------------------------

const problems = [];
const warnings = [];
const perVoice = {};
let totalBytes = 0;
let shortest = null;
let longest = null;
const levels = [];
for (const voice of config.voices) {
  perVoice[voice] = { files: 0, bytes: 0 };
  for (const id of lineIds) {
    const rel = relPath(voice, id);
    const file = path.join(OUT_DIR, rel);
    if (!fs.existsSync(file)) {
      problems.push(`${rel}: missing`);
      continue;
    }
    let samples;
    try {
      samples = await decodeMp3(file);
    } catch (e) {
      problems.push(`${rel}: does not decode (${e.message})`);
      continue;
    }
    const bytes = fs.statSync(file).size;
    const duration = samples.length / SAMPLE_RATE;
    const { peakDb, speechRmsDb } = measure(samples);
    perVoice[voice].files++;
    perVoice[voice].bytes += bytes;
    totalBytes += bytes;
    levels.push(speechRmsDb);
    if (!shortest || duration < shortest.duration) shortest = { rel, duration };
    if (!longest || duration > longest.duration) longest = { rel, duration };
    if (peakDb < -20 || speechRmsDb < -35) problems.push(`${rel}: silent or nearly silent (peak ${peakDb.toFixed(1)} dBFS)`);
    else if (peakDb > -0.3) warnings.push(`${rel}: decoded peak ${peakDb.toFixed(1)} dBFS is close to clipping`);
    // The first and last 30 ms should be the quiet padding; if not, the trim cut into a sound.
    const edge = Math.round(SAMPLE_RATE * 0.03);
    const headDb = measureRms(samples.subarray(0, edge));
    const tailDb = measureRms(samples.subarray(samples.length - edge));
    if (headDb > -40) warnings.push(`${rel}: starts abruptly (${headDb.toFixed(0)} dBFS in the first 30 ms)`);
    if (tailDb > -40) warnings.push(`${rel}: ends abruptly (${tailDb.toFixed(0)} dBFS in the last 30 ms)`);
    if (duration < MIN_DURATION_S || duration > MAX_DURATION_S) {
      warnings.push(`${rel}: ${duration.toFixed(2)} s is outside ${MIN_DURATION_S}-${MAX_DURATION_S} s ("${config.lines[id]}")`);
    }
    const entry = files[voice][id];
    if (!entry) {
      problems.push(`${rel}: on disk but not in the manifest (run without --verify-only)`);
    } else if (!VERIFY_ONLY && Math.abs(entry.duration - duration) > 0.001) {
      entry.duration = +duration.toFixed(3); // the manifest always states what the MP3 decodes to
    }
  }
}
if (!VERIFY_ONLY) writeManifest();

// MP3s that lines.json no longer asks for
const wanted = new Set(config.voices.flatMap((v) => lineIds.map((id) => relPath(v, id))));
const orphans = [];
if (fs.existsSync(OUT_DIR)) {
  for (const dir of fs.readdirSync(OUT_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const name of fs.readdirSync(path.join(OUT_DIR, dir.name))) {
      const rel = `${dir.name}/${name}`;
      if (name.endsWith(".mp3") && !wanted.has(rel)) orphans.push(rel);
    }
  }
}
if (orphans.length && PRUNE && !VERIFY_ONLY) {
  for (const rel of orphans) fs.rmSync(path.join(OUT_DIR, rel));
  console.log(`Pruned ${orphans.length} MP3s that lines.json no longer lists.`);
} else if (orphans.length) {
  warnings.push(`${orphans.length} MP3s are no longer in lines.json (run with --prune to delete): ${orphans.join(", ")}`);
}

console.log("");
for (const voice of config.voices) {
  const sub = substitutions[voice] ? ` (spoken by ${substitutions[voice]})` : "";
  console.log(`  ${voice.padEnd(12)} ${perVoice[voice].files}/${lineIds.length} files  ${perVoice[voice].bytes} bytes${sub}`);
}
console.log(`  total        ${Object.values(perVoice).reduce((a, v) => a + v.files, 0)}/${expected} files  ${totalBytes} bytes (${(totalBytes / 1024).toFixed(0)} KiB)`);
if (shortest) {
  console.log(`  durations    ${shortest.duration.toFixed(2)} s (${shortest.rel}) to ${longest.duration.toFixed(2)} s (${longest.rel})`);
  console.log(`  speech level ${Math.min(...levels).toFixed(1)} to ${Math.max(...levels).toFixed(1)} dBFS RMS (target ${TARGET_RMS_DB})`);
}
for (const w of warnings) console.log(`  WARNING  ${w}`);
for (const p of problems) console.log(`  PROBLEM  ${p}`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s).`);
  process.exit(1);
}
console.log(`\nVoice files OK${warnings.length ? ` (${warnings.length} warning(s))` : ""}.`);
