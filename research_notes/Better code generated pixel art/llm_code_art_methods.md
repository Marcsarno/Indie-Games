# Methods for improving LLM / AI-agent output when drawing pixel art and graphics through code

Scope: programmatic drawing (canvas/JS, Python/Pillow, SVG, pixel grids), not diffusion. Evidence labels: **[MEASURED]** = numbers from a benchmark, paper or controlled comparison; **[ANECDOTAL]** = a practitioner report without controlled measurement; **[AUTHOR-SELF-REPORT]** = measured by the tool's own author on their own benchmark, with no independent replication.

## Q1. Practitioner write-ups and workflows: what people did and what worked or failed

### Takeaway
The best-documented practitioner approaches share four traits. They lock constraints into code (a fixed palette, integer coordinates, an indexed-color raster). They have the model build sprites from primitives or a parameterized generator rather than emit raw per-pixel output for larger sprites. They render a PNG the model can view (a contact sheet) and run a short critique-and-fix loop against a written checklist. And they keep a human in the loop for final visual review. The strongest quantified practitioner result comes from junyudev/pixel-art. It is the author's own measurement: a text-grid route at up to 32 px beat plain Opus 9–1 at 16×16. Asset Forge, from a separate practitioner, has measured evidence that *more prescriptive* system prompts made sprites *worse*.

### Cited Findings
**junyudev/pixel-art ("Pixel Bench") [AUTHOR-SELF-REPORT]**
- The skill picks a route by canvas size. **Grid (≤32 px):** the agent writes a palette plus the pixel grid as text, and a renderer checks it at 1×. **Construct (>32 px):** code builds the figure and its lighting, and the agent hand-places faces and hands at full size. **Concept (≥32 px, optional):** gpt-image designs the sprite and a converter recovers true pixels. It requires Python with pillow, numpy and scipy, and works in Claude Code, Codex and Cursor. — [junyudev/pixel-art README](https://github.com/junyudev/pixel-art)
- Pixel Bench: agents redraw 10 characters from *Eastward* from a 3–5 sentence brief, without ever seeing the original. Two blind judges compare each drawing with the original on 7 criteria, and a Bradley–Terry fit ranks the entries. A second suite covers 16×16 and 32×32 sprites without a reference. — [junyudev/pixel-art README](https://github.com/junyudev/pixel-art)
- Results: pixel-art 1.0 ranked **1st of 11 entries**. It beat the previous best version's drawings **15–5**, and its **grid route beat plain Opus 9–1 at 16×16**. The README does not describe loop counts, palette rules, failures or cost (it says the cost per drawing is on the pixel.jyu.app site). — [junyudev/pixel-art README](https://github.com/junyudev/pixel-art)

**Asset Forge (matthewdeaves) [MEASURED, small-scale, human-graded]**
- The generator (Claude Sonnet) emits structured drawing commands using 6 primitives (rect, circle, ellipse, line, polygon, fill) with a fixed palette and a 32–64 px canvas. A Node server rasterizes them into indexed-color grids with hard edges. The author states that raw pixel arrays "produce incoherent results" because models struggle with per-pixel spatial reasoning. — [Asset Forge](https://matthewdeaves.github.io/assetforge/)
- Human-graded generation prompt versions (1–5 scale): baseline **4.16**, v2 "detail emphasis" **3.97**, v3 "category guidance" **3.69** (a second table lists the baseline as 4.13). Conclusion: "More prescriptive instructions constrain the model and reduce quality", and "adding more constraints in the system prompt consistently makes things worse." — [Asset Forge](https://matthewdeaves.github.io/assetforge/)
- Ceiling: tiles, boulders, potions and crowns scored well (human 4.8–5.0). Complex subjects (dragons, knights, vehicles) "produce recognizable blobs" at 32–64 px with primitives. Examples: pickup truck 2.3, barrel 2.7, dwarf blacksmith 3.0 (human scores). — [Asset Forge](https://matthewdeaves.github.io/assetforge/)

**jucelinux, "I taught Claude Opus 5 to draw with no image model, just code" (dev.to) [ANECDOTAL with some counts]**
- Method: the model describes the scene as ellipsoids and boxes in 3D, and a rasterizer renders it to one palette index per pixel. Fixed rules apply: a locked palette, integer positions, Bayer dithering for gradients, and facings baked per direction rather than rotated at runtime. The author's lesson: a hard constraint "does the drawing", and Claude obeys rules better than it invents. — [dev.to/jucelinux](https://dev.to/jucelinux/i-taught-claude-opus-5-to-draw-with-no-image-model-just-code-then-i-asked-for-a-self-portrait-2894)
- An "oracle ladder" of checks, cheapest first: compiler and types → 290 automated tests that assert on derived numbers → a ~100-token derived summary (e.g., a census of palette ramps) → a PNG the model views (200–1,200 tokens per sheet) → human review. — [dev.to/jucelinux](https://dev.to/jucelinux/i-taught-claude-opus-5-to-draw-with-no-image-model-just-code-then-i-asked-for-a-self-portrait-2894)
- Numbers reported: the whole bench as PNG cost ~29,000 tokens (~5.3 s), versus ~240,000 tokens as an ASCII text dump. The ASCII luminance dump **missed all 11 portrait defects** that the PNG view showed. Tests caught a walk cycle whose frames were nearly identical, but a "vanished eyes" defect **passed all 290 tests** and only visual review caught it. A rotation-pivot bug appeared 4 times, and the human found it each time, not Claude. The 48×64 fighter sprite stayed the weakest asset. The author's verdict: "a high, cheap floor, not a high ceiling", with human review as the bottleneck. — [dev.to/jucelinux](https://dev.to/jucelinux/i-taught-claude-opus-5-to-draw-with-no-image-model-just-code-then-i-asked-for-a-self-portrait-2894)

**Gamezxz/pixel-art-studio (Claude Code + Python/Pillow) [ANECDOTAL]**
- A "see → critique → fix" loop: render a contact-sheet preview, view it, critique it against `references/validations.md`, edit the build script, re-render. **At least 2–3 passes** before delivery. Animation frames come from parameterized functions, not copied pixels. — [Gamezxz/pixel-art-studio](https://github.com/Gamezxz/pixel-art-studio)
- Reference analysis: `study.py` extracts a reference's resolution, palette, ramps, outlines and dithering. Claude writes this up as a style card in `references/learned/` and applies it to later work. Palettes are defined up front with hue-shifted ramps, and `pixelpipe.py` locks images to a shared game palette and recovers the pixel grid. — [Gamezxz/pixel-art-studio](https://github.com/Gamezxz/pixel-art-studio)
- Lessons listed: design the silhouette first; check anatomy explicitly so far-side eyes and arms don't vanish; size attack cells from the full weapon silhouette so swings don't clip. No quantitative before/after is given. — [Gamezxz/pixel-art-studio](https://github.com/Gamezxz/pixel-art-studio)

**dbinky/claude-fairy-pixel-art (Python/Pillow, Flutter game) [ANECDOTAL with counts]**
- Workflow: Claude writes an asset spec (`graphics-assets.md`) of **163 assets in 12 categories**, each with a path, dimensions and description. A human hand-draws one 48×48 style-reference portrait. Claude then writes a single `generate-art.py` that draws every PNG; it produced **163 PNGs with 0 skipped** on the first run, deterministically. — [dbinky/claude-fairy-pixel-art](https://github.com/dbinky/claude-fairy-pixel-art)
- Palette locking: 60+ colors are defined once with names and light/dark variants, and code refers to names, not hex values. Characters share one body template with per-variant colors. Sprites are drawn small and upscaled with nearest-neighbor. There is no formal render-critique loop; iteration means targeted edits to a generator function plus manual touch-ups in a React editor. — [dbinky/claude-fairy-pixel-art](https://github.com/dbinky/claude-fairy-pixel-art)

**Other tooling found [ANECDOTAL / no results reported]**
- pixel-mcp: an MCP server exposing create_canvas, fill_rect and set_pixel to Claude Code, with a browser canvas for visual checks; willibrandon/pixel-plugin connects Claude Code to Aseprite (~152 stars). The opusgamelabs game-creator skill makes sprites as 2D arrays of palette indices rendered to canvas at runtime. — [pixel-mcp](https://github.com/adrianoamaral/pixel-mcp); [pixel-plugin](https://gittrend.io/repo/willibrandon/pixel-plugin); [game-creator skill](https://www.claudepluginhub.com/skills/opusgamelabs-game-creator/game-assets)
- Raymond Camden (May 2025) asked Claude for JavaScript that **converts an existing image** in the DOM into simplified pixel art (CodePen "Claude to Pixel Art V2"). That is image-to-pixel conversion, not drawing a sprite from scratch; I did not read his conclusions. — [raymondcamden.com](https://www.raymondcamden.com/2025/05/02/pixel-art-via-vibe-coding)
- abagames (dev.to) used Claude 3.5 Sonnet with crisp-game-lib for game code. For graphics, Claude wrote prompts for an *image-generation* model, which is outside this scope. The author also argues that regenerating repeatedly until everything fits is futile, and that fine-tuning is better done by hand. — [dev.to/abagames](https://dev.to/abagames/creating-mini-games-in-the-age-of-generative-ai-generating-ideas-code-graphics-and-sound-424k)
- The Rangy blog argues that raw model "pixel art" is a picture *of* pixel art. Its example asked for 12 colors, got tens of thousands, and the pixel widths varied. Its fix is nearest-neighbor downsampling plus palette quantization. This applies mostly to image models but motivates palette and grid checks. — [Rangy blog](https://rangy.ai/blog/ai-pixel-art/)
- "Ralph loop": the official Claude Code plugin uses a stop hook that re-injects the same prompt until a completion phrase appears or an iteration cap is hit. Guides warn it uses tokens quickly. — [Shipyard: Ralph loops in Claude Code](https://shipyard.build/blog/claude-code-ralph-loop/)

### Inferences
- Results converge on three points: (a) constraints belong in **code and data** (a palette table, an indexed raster, integer grid, parameterized frame functions) rather than in ever-longer prose rules; (b) the model must **see a rendered PNG**, because text and ASCII dumps miss defects; (c) the loop should be short (2–3 passes), with deterministic tests in front of it and a human at the end.
- For a Diablo-style isometric game drawn with JS canvas primitives, the fitting patterns are jucelinux's "3D primitives → rasterize to locked palette → bake each facing", which fits 8-direction isometric sprites, and junyudev's split: text grid for tiny sprites (≤32 px), construct-by-code plus hand-placed detail for larger characters.
- Asset Forge's result that "more prescriptive prompts are worse" conflicts in tone with "hard constraints do the drawing". The likely reconciliation: hard *mechanical* constraints enforced by the renderer (palette, grid) help, while long *aesthetic* instruction lists in the prompt hurt. This is my inference, not a tested claim.

### Gaps
- **Piotr Trochim's "Teaching Claude to Create Pixel Art" (Substack) was not found** in two searches. Its content is unverified.
- The YouTube video "How I Used a Ralph Loop to Make Claude Code Draw Pixel Art" was not found, and I found no Ralph-loop pixel-art results.
- No Hacker News or Reddit thread with measured results turned up.
- None of the practitioner sources ran a controlled ablation of "with vs without the critique loop" on sprite quality.

## Q2. Research papers: code-to-graphics with visual feedback, RL with rendering rewards, fine-tuning, and the gains reported

### Takeaway
For **trained** models, visual feedback produces large measured gains. RLRF (RL with rendering rewards) took a Qwen2.5-VL-7B from SSIM 79.4 to 95.1 and MSE 8.60 to 1.03 over SFT. IntroSVG's generate-critique-refine loop cut FID from 29.76 to 26.18 over 3 iterations. Render-in-the-Loop's visual self-feedback cut FID from 148.7 to 128.0. For **untrained, off-the-shelf** models, results are mixed. Naive multi-turn prompting with rendered canvases "brings no consistent gain and often degrades performance" in Render-in-the-Loop. But a structured, rubric-based visual critic gave +4.9% to +8.7% over 3 cycles for frontend code, MatPlotAgent and PlotGen show visual feedback helping plot code, and IntroSVG's loop gave modest gains to zero-shot GPT-4o, GPT-5 and Grok-4.

### Cited Findings
**RLRF, "Rendering-Aware Reinforcement Learning for Vector Graphics Generation" (arXiv 2505.20793) [MEASURED]**
- Method: render the SVG and compare it with the target image for reward. Rewards are normalized pixel L2 (plus an edge-aware Canny variant), DreamSim semantic similarity (CLIP similarity for text-to-SVG), and a code-length penalty, combined as a weighted sum. — [arXiv 2505.20793](https://arxiv.org/html/2505.20793)
- Im2SVG on SVG-Stack-Hard: Qwen2.5-VL-7B goes from base MSE 23.10 / SSIM 61.40 / DINO 78.00 / LPIPS 33.80, to SFT 8.60 / 79.40 / 93.00 / 16.58, to **RLRF 1.03 / 95.10 / 98.70 / 3.08**. For comparison, GPT-4o scored 16.92 / 66.91 / 89.00 / 27.55 and Claude 3.7 Sonnet 17.73 / 69.33 / 79.80 / 28.42. — [arXiv 2505.20793](https://arxiv.org/html/2505.20793)
- Reward ablation (qualitative): L2 plus L2-Canny converges faster than either alone, and adding DreamSim speeds it further. L2-only gives lower MSE but weaker semantics. The best results combine pixel, semantic and length terms. Caveat: Table 2 of the paper reports different numbers for the same 7B setup (e.g., MSE 14.23), so its tables are internally inconsistent. — [arXiv 2505.20793](https://arxiv.org/html/2505.20793)

**IntroSVG (arXiv 2603.09312, CVPR 2026) [MEASURED]**
- A single Qwen2.5-VL-7B acts as both generator and critic. It is SFT-trained on ~200k prompt/SVG pairs, ~50k correction samples and ~50k critique samples (labels from GPT-4o), then trained with DPO. At inference it runs generate → render → self-critique → refine for up to 3 iterations, stopping early when the score is ≥9.5. — [IntroSVG](https://arxiv.org/html/2603.09312); [CVPR 2026 poster](https://cvpr.thecvf.com/virtual/2026/poster/38201)
- Ablation: base zero-shot FID 71.10 → +SFT 30.15 → +DPO 29.76 → **+iterative loop 26.18**. Aesthetic score went 4.32 → 4.81 → 4.84 → 4.89. — [IntroSVG](https://arxiv.org/html/2603.09312)
- By iteration (0→3): FID 29.76 → 28.69 → 27.65 → 26.18, improving at every step. CLIP-T2I dips slightly at iteration 2. Iterations beyond 3 were not tested. — [IntroSVG](https://arxiv.org/html/2603.09312)
- The same loop applied **zero-shot to frontier models** (iteration 0→3): GPT-4o FID 37.80 → 36.34; Grok-4 41.39 → 32.85; GPT-5 35.87 → 32.68. GPT-5's CLIP peaked at iterations 1–2 and then fell at iteration 3 (0.2858 → 0.2779), so the gains are not monotonic. — [IntroSVG](https://arxiv.org/html/2603.09312)
- **Data standardization** (absolute commands, integer coordinates, a fixed 200×200 viewBox) alone, on Qwen2.5-VL-3B, raised the render success rate from 68.41% to 98.62% and cut FID from 121.50 to 32.15. — [IntroSVG](https://arxiv.org/html/2603.09312)
- Baselines in Table 2: Claude 4.5 Sonnet had the best CLIP-T2I (0.2853) and HPS (0.1998) of all systems, including IntroSVG, and a 100% render rate. — [IntroSVG](https://arxiv.org/html/2603.09312)

**Render-in-the-Loop (arXiv 2604.20730) [MEASURED]**
- Generation is broken into steps: intermediate primitives are rendered onto a cumulative canvas, and the model conditions the next primitive on that image (Visual Self-Feedback, VSF). At inference, Render-and-Verify (RaV) filters degenerate or redundant primitives. Latency overhead is 1.50× (43.19 s vs 28.77 s) and token cost 1.46×. — [alphaXiv 2604.20730](https://www.alphaxiv.org/abs/2604.20730.md)
- On MMSVGBench text-to-SVG (Icon), FID went from 148.72 (Qwen3-VL SFT only) to **127.98 with VSF** and 127.64 with VSF+RaV. On Illustration it went 155.84 → 137.86 → 137.79. On image-to-SVG (Illustration), SSIM was 0.928 and LPIPS 0.178, versus GPT-5 at 0.876 and 0.345. — [alphaXiv 2604.20730](https://www.alphaxiv.org/abs/2604.20730.md)
- **Key negative result:** naive multi-turn prompting of untrained models with rendered canvases "brings no consistent gain and often degrades performance." On Icon, CLIP fell 0.311 → 0.294 and HPS 0.219 → 0.185; on Illustration, aesthetic fell 5.195 → 4.807 and HPS 0.210 → 0.167. The authors say pre-trained MLLMs struggle to align intermediate canvases with incremental geometry code. Which backbone those numbers belong to is not clearly separated in the table. — [alphaXiv 2604.20730](https://www.alphaxiv.org/abs/2604.20730.md)

**Vision-Guided Iterative Refinement for Frontend Code (arXiv 2604.05839, Amazon) [MEASURED]**
- A Claude 4.5 Sonnet visual critic reviews rendered pages and gives structured feedback. The judge scores 4 dimensions on a 1–10 scale and agreed with humans 69.5% of the time, versus 48.5% for a single-score judge. — [arXiv 2604.05839](https://arxiv.org/html/2604.05839v1)
- Overall score gains over 3 cycles: Distill-Qwen-14B 5.236 → 5.690 (+8.7%); Claude Haiku 4.5 7.436 → 7.862 (+5.7%); **Sonnet 4.5 with itself as generator and critic 7.584 → 8.048 (+6.1%)**. Gains flatten: the cycle 2→3 gain is 0.3–0.9%. Refining *without* a critic gave only +1.5%. The headline "+17.8%" is a best-per-task selection made with the same judge. Tokens grew from ~2.6k to ~45.8k by cycle 3, and LoRA fine-tuning on the best loop outputs captured ~24.7% of the loop's gain. — [arXiv 2604.05839](https://arxiv.org/html/2604.05839v1)

**Plot and chart code [MEASURED]**
- MatPlotAgent (arXiv 2402.11453): a visual agent inspects the draft plot, without seeing the ground truth, and suggests fixes. Removing visual feedback "would result in significantly poorer outcomes" for GPT-4 and GPT-3.5 on MatPlotBench (100 human-verified cases; the GPT-4V score correlates strongly with human ratings). The table was garbled in the extraction: GPT-4 direct decoding scored 48.86, and the no-feedback agent variant 53.44–61.16. — [MatPlotAgent arXiv 2402.11453](https://arxiv.org/pdf/2402.11453)
- PlotGen (arXiv 2502.00988) reports that removing its visual-feedback agent drops performance **10–15%** across code LLMs on MatPlotBench. — [PlotGen arXiv 2502.00988](https://arxiv.org/pdf/2502.00988) (number via search summary)

**Understanding and generation benchmarks for graphics code**
- SGP-Bench (arXiv 2408.08313) asks LLMs semantic questions about SVG and CAD programs without the rendering. Stronger reasoners do better. Symbolic Instruction Tuning improves both graphics-program understanding and general reasoning, and a symbolic MNIST set exposes limits even in GPT-4o. — [SGP-Bench arXiv 2408.08313](https://arxiv.org/html/2408.08313v1)
- SGP-GenBench (arXiv 2509.05208, NeurIPS 2025): frontier proprietary models substantially outperform open-source ones at generating symbolic graphics programs, and performance correlates with general coding ability. — [arXiv 2509.05208](https://www.arxiv.org/pdf/2509.05208)
- VGBench tests generating SVG, TikZ and Graphviz from captions. — [VGBench arXiv 2407.10972](https://arxiv.org/pdf/2407.10972)

**Pixel-art-specific benchmarks**
- Pixel Art Bench (Hugging Face, small models): output is JSON with a palette and a 24×24 grid of indices 0–9. Phi-3.5-mini scored JSON validity 1.0, render success ~0.74 and quality ~0.42. Llama and SmolLM produced **no successful renders**. Palette validity and color efficiency correlate at −0.47. Performance degrades in order: format, then structure, then semantics. **LoRA fine-tuning on Qwen3-1.7B improved format adherence but not pixel-art quality.** — [HF blog: Pixel Art Bench](https://huggingface.co/blog/AINovice2005/pixel-art-bench)
- Matt Mazur's Pixel Art Bench prompts every OpenRouter model for color grids (Mario, rainbow, Saturn, Mona Lisa, "hope"), with GPT-5.4 judging and computing Elo. I could not see the results. — [Matt Mazur on X](https://x.com/mhmazur/status/2044434288150466919)
- pixel-llm: a local 3B model (Ministral) "doesn't work great" for structured pixel output, while GPT-5.2 did better (anecdotal). — [mxmarchal/pixel-llm](https://github.com/mxmarchal/pixel-llm)

### Inferences
- With a frontier model and no fine-tuning, which is the user's situation, a loop can be **structured** (rubric critique of a full rendered image, 2–3 cycles) or **naive** (just showing canvases turn by turn). The evidence (frontend +5–6% for Sonnet self-critique; IntroSVG zero-shot gains on GPT-4o and GPT-5) favors structured. Render-in-the-Loop's degradation came from feeding *incremental* canvases to untrained models.
- Expect diminishing returns after about 2 cycles, and occasional regressions on some metrics (GPT-5's CLIP fell at iteration 3). Keep the best-scoring version instead of always the latest.
- IntroSVG's standardization result (68% → 99% render success) suggests a practical analogue: force a canonical drawing representation (an integer grid, absolute coordinates, a fixed canvas size, a palette index table) to cut malformed output.

### Gaps
- I found no paper that applies visual feedback or RL specifically to **pixel-art sprites drawn by code** with human-rated outcomes. All rigorous results are for SVG, plots and web UIs.
- I could not get exact ChartMimic or Plot2Code self-reflection numbers, StarVector, LLM4SVG, CTRL-S or SVGenius figures, or the RefineSVG (arXiv 2607.27699) results. They were not fetched within budget.
- RLRF's text-to-SVG numbers and its reward-ablation figures were not shown in the extracted text.

## Q3. How reliable is self-critique? Do VLMs critique their own renders accurately, and what makes critique work?

### Takeaway
VLM critics are useful but unreliable in known directions. They overrate complex subjects and "does it look like X", tend to favor their own output, and naive iteration over rendered images can collapse accuracy (79.6% → 48.7% in one grounding study). Critique improves when the model sees an actual PNG rather than text or ASCII, when the rubric is multi-dimensional with anchored levels, when the critic is calibrated against human grades, when a separate model or a pass against a reference does the critiquing, and when human review stays the final gate.

### Cited Findings
- **Seeing the image matters most for judges.** In Asset Forge's calibration, the Claude Opus judge's mean absolute deviation from human scores went 0.98 (baseline) → 0.86 (rubric tightening) → 0.96 → 0.87 (20 prompts, multi-shot) → **0.61 when given the rendered PNG plus an ASCII grid**. Component Separation MAD fell from 1.40 to 0.50 and Detail Density from 1.00 to 0.39. "The model needs to *see* the output, not just analyze the drawing commands." The page's tables are partly inconsistent with each other. — [Asset Forge](https://matthewdeaves.github.io/assetforge/)
- **Systematic over-rating.** Even after calibration, the judge is more generous than humans on Prompt Adherence (MAD 1.32): pickup truck human 2.3 vs LLM 4.3, barrel 2.7 vs 4.2, tank 2.4–3.0 vs 4.8. Complex multi-part subjects are the ones overrated most. — [Asset Forge](https://matthewdeaves.github.io/assetforge/)
- **Text representations hide defects.** An ASCII luminance dump missed all 11 portrait defects that a PNG view revealed. 290 numeric tests passed a sprite whose eyes had vanished. A pivot bug recurred 4 times and was caught by the human each time. — [dev.to/jucelinux](https://dev.to/jucelinux/i-taught-claude-opus-5-to-draw-with-no-image-model-just-code-then-i-asked-for-a-self-portrait-2894)
- **Naive iteration can be catastrophic.** In "Iterative Visual Thinking" (awesomepapers 2606.13156, seen only as a search summary), prompting a VLM to iterate over rendered visualizations of its own bounding-box predictions dropped referring-expression accuracy from **79.6% to 48.7%**. The authors attribute this to a gap between grounding ability and self-correction ability. — [Iterative Visual Thinking (summary page)](https://awesomepapers.io/multimodal/papers/2606.13156)
- Render-in-the-Loop: multi-turn canvas feedback without training often degraded SVG quality (numbers in Q2). — [alphaXiv 2604.20730](https://www.alphaxiv.org/abs/2604.20730.md)
- **Self-bias.** LLMs tend to favor their own generated output during self-refinement. One design-critique paper counters this by using a separate model for refinement. — [Visual Prompting with Iterative Refinement for Design Critique, arXiv 2412.16829](https://arxiv.org/pdf/2412.16829)
- Naive self-correction often fails without external feedback, as models defensively justify their first outputs (cited in a VLM hallucination survey). — [arXiv 2512.07564](https://arxiv.org/pdf/2512.07564)
- Counter-evidence: if prompted and framed properly, VLMs can correct their own semantic grounding errors even without oracle feedback. — [arXiv 2404.06510](https://arxiv.org/html/2404.06510)
- **What made critique effective in measured work:**
  - A 4-dimension rubric judge agreed with humans 69.5% of the time vs 48.5% for a single score. Critique-driven refinement beat critique-free refinement (+8.7% vs +1.5%). — [arXiv 2604.05839](https://arxiv.org/html/2604.05839v1)
  - Targeted yes/no verification questions about the render (CADCodeVerify) improved CAD shape accuracy. — [search summary of CADCodeVerify via arXiv 2604.05839 search results](https://arxiv.org/pdf/2604.05839)
  - MatPlotAgent's visual critic works *without* the ground-truth figure and still helps. — [MatPlotAgent](https://arxiv.org/pdf/2402.11453)
  - Anchored descriptions at each score level and subject-relative guidance reduced judge disagreement. — [Asset Forge](https://matthewdeaves.github.io/assetforge/)

### Inferences
- For sprite review, Claude-as-critic is most trustworthy on **structural** questions (Is the silhouette readable? Are both eyes present? Do the outline and palette ramps follow the rules?). It is least trustworthy on **"does this look like a skeleton warrior / is this good"**, where it tends to be generous. Structural checks should be explicit checklist items, and likeness should be confirmed by a human, or by comparison with a reference via a separate pass or a numeric metric.
- Always show the critic the actual PNG, upscaled with nearest-neighbor (and possibly zoomed crops), plus the target or reference side by side. Text grids alone miss defects.
- Cap the loop at about 2–3 cycles, keep the best version, and require each critique to name specific pixel or region defects. This guards against drift and against defensive "looks good" verdicts. This is inferred from the plateaus, the non-monotonic results and the self-bias findings above.

### Gaps
- I found no study measuring how well Claude, GPT or Gemini critique **pixel-art sprites specifically** against human artists, beyond Asset Forge's judge calibration.
- Zoomed crops and side-by-side reference images were not isolated as variables in any source I found. Their benefit is plausible but not measured here.
- The "Iterative Visual Thinking" numbers come from a secondary summary page (the fetch hit HTTP 429); verify them against the arXiv paper.

## Q4. Fine-tuning, RL and in-context examples for pixel or sprite generation by code or grid tokens

### Takeaway
There is little and mixed evidence specific to pixel art. LoRA on a small model (Qwen3-1.7B) for 24×24 index grids improved format but not quality. Raw pixel-array generation is reported as incoherent at 32–64 px. Text grids work well for frontier models at ≤16–32 px (the 9–1 author-reported win). For vector graphics, SFT plus RL with rendering rewards gives large measured gains, but that requires training an open model, which is not an option for a Claude-based workflow. For in-context examples, the measured evidence is mostly indirect: a style reference or style card is common practice, and prompt-level "more guidance" hurt in Asset Forge.

### Cited Findings
- LoRA on Qwen3-1.7B improved format adherence but did not meaningfully improve pixel-art quality; the author blames a mismatch between autoregressive modeling and 2D generation. — [HF Pixel Art Bench](https://huggingface.co/blog/AINovice2005/pixel-art-bench)
- Raw pixel arrays "produce incoherent results"; drawing primitives work for tiles and simple objects but hit a ceiling on complex subjects. — [Asset Forge](https://matthewdeaves.github.io/assetforge/)
- A text grid (palette + grid) at ≤32 px, checked at 1×, beat plain Opus 9–1 at 16×16 (author's benchmark). — [junyudev/pixel-art](https://github.com/junyudev/pixel-art)
- RLRF: SFT followed by RL with rendering rewards beats SFT alone by a wide margin on SVG (numbers in Q2). — [arXiv 2505.20793](https://arxiv.org/html/2505.20793)
- IntroSVG: SFT on ~300k samples took FID from 71.10 to 30.15, and DPO plus the loop reached 26.18. — [IntroSVG](https://arxiv.org/html/2603.09312)
- Distilling loop outputs into the generator via LoRA recovered ~24.7% of the loop's gain at a fraction of the tokens (frontend code). — [arXiv 2604.05839](https://arxiv.org/html/2604.05839v1)
- In-context and reference practice (anecdotal):
  - Gamezxz turns a reference image into a style card with `study.py` and reuses it.
  - dbinky uses one hand-drawn 48×48 reference sprite plus a shared body template.
  - Asset Forge tested multi-shot *judging*, which went from MAD 0.96 to 0.87, a small gain.
  - Sources: [Gamezxz](https://github.com/Gamezxz/pixel-art-studio); [dbinky](https://github.com/dbinky/claude-fairy-pixel-art); [Asset Forge](https://matthewdeaves.github.io/assetforge/)

### Inferences
- For a Claude-driven pipeline, the reachable analogue of "training" is: (1) a style card and a few reference sprites in context; (2) reusable, parameterized generator code (body templates, palette ramps, per-direction rigs) that accumulates skill across sprites; (3) automatic checks used as a reward signal for best-of-N selection. This is an inference by analogy to RLRF and IntroSVG, not something tested on pixel art.

### Gaps
- I found no controlled study of few-shot sprite examples (zero-shot vs k-shot) for code-drawn pixel art.
- I found no public dataset of code-drawn or grid-token sprites used to fine-tune frontier-scale models.

## Q5. Quantitative metrics usable as automatic checks

### Takeaway
Image-similarity metrics used in the literature (MSE or pixel L2, SSIM, LPIPS, DINO, DreamSim, CLIP, FID, plus edge-aware Canny-L2) work for comparisons against a reference. Pixel-art-specific checks (palette adherence and validity, color efficiency, edge density, fill balance, render success) appear in Pixel Art Bench. Cheap derived-number tests (palette ramp census, frame-difference checks) catch some defects but miss others, such as missing eyes.

### Cited Findings
- **RLRF rewards:**
  - Normalized pixel L2 and an edge-aware L2 on Canny edge maps.
  - DreamSim, with a Canny variant.
  - CLIP for text prompts.
  - A code-length penalty.
  - L2-only gives good MSE but weak semantics; combining terms works best.
  - Source: [arXiv 2505.20793](https://arxiv.org/html/2505.20793)
- **SVG papers' evaluation metrics:**
  - Image-to-SVG uses DINO, SSIM, LPIPS and MSE.
  - Text-to-SVG uses FID, CLIP-T2I, an aesthetic score and HPS.
  - Sources: [Render-in-the-Loop](https://www.alphaxiv.org/abs/2604.20730.md); [IntroSVG](https://arxiv.org/html/2603.09312)
- **Pixel Art Bench metrics:** JSON validity, palette validity, color efficiency, edge density, fill balance, render success and pixel-art quality. Palette validity vs color efficiency r = −0.47; edge density vs color efficiency 0.42; edge density vs fill balance 0.40. The metrics are "largely orthogonal". — [HF Pixel Art Bench](https://huggingface.co/blog/AINovice2005/pixel-art-bench)
- **jucelinux's derived-number tests:**
  - A palette-ramp census of ~100 tokens.
  - Asserts across animation frames, which caught a near-identical walk cycle.
  - The tests missed vanished eyes, which shows the limits of metric-only checks.
  - Source: [dev.to/jucelinux](https://dev.to/jucelinux/i-taught-claude-opus-5-to-draw-with-no-image-model-just-code-then-i-asked-for-a-self-portrait-2894)
- Code-based heuristics for spatial coverage and detail density were *less* reliable than a vision LLM judge in Asset Forge: Spatial Coverage MAD reached 1.20 in round 2. — [Asset Forge](https://matthewdeaves.github.io/assetforge/)
- Rangy's checks: count distinct colors against the requested palette (12 requested, tens of thousands produced) and check that pixel widths are uniform; fix with nearest-neighbor downsampling and quantization. — [Rangy blog](https://rangy.ai/blog/ai-pixel-art/)

### Inferences
- A practical check suite for code-drawn isometric sprites:
  - **Hard gates:** exact colors are a subset of the locked palette; canvas and anchor dimensions are correct; there is transparent background around the silhouette; no semi-transparent pixels unless allowed.
  - **Lint:** counts of orphan pixels (isolated single pixels) and of outline gaps.
  - **Animation:** frame-to-frame difference within bounds, so frames are neither identical nor wildly different.
  - **Reference comparison** where a reference exists: silhouette IoU against the reference downsampled to the target grid, and SSIM or DINO.
  - Then a vision critique of the upscaled PNG against a checklist, and human sign-off.
  - This composite is my synthesis. Silhouette IoU and orphan-pixel counts were **not** found reported as validated metrics in any source.

### Gaps
- I found no source validating silhouette IoU, orphan-pixel counts or DINO/CLIP similarity against human ratings *for pixel-art sprites*. Correlation with human judgment at 16–64 px resolution is unknown. CLIP and DINO were designed for natural-image resolutions and may be weak at tiny sizes (an untested inference).
