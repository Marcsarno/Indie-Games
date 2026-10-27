# Better critique/selection and target-fitting for code-drawn pixel-art sprites (2024–2026 evidence)

Scope note: this pass does not repeat what the prior pass already covered (Asset Forge, the jucelinux dev.to post, junyudev/pixel-art, IntroSVG, Render-in-the-Loop, RLRF, arXiv 2604.05839, PlotGen, MatPlotAgent). Every claim below has a source. "Measured" means the source reports numbers. "Anecdotal" means it is a practitioner report or a claim with no numbers.

## Q1. Pairwise vs absolute scoring, position bias, reference-guided judging, juries, best-of-N, and blind spots on small images

### Takeaway
Measured evidence from 2024–2026 consistently says VLM judges agree with humans much better when they compare two images than when they score one image on a scale. Pairwise judging also repeats more reliably across runs. The project's 5-question absolute yes/no rubric therefore works best as a gate. Choosing between candidates should be done pairwise, with each pair judged twice in swapped order. VLMs also have documented blind spots on simple geometric details such as overlaps, intersections and counts, which are exactly the defects that show up in pixel sprites. Numeric lint metrics should own those checks, not the VLM.

### Cited Findings
- **MLLM-as-a-Judge benchmark (ICML 2024), measured.** GPT-4V's average agreement with humans was Pearson 0.454 for absolute scoring, 0.696 for pair comparison with ties, 0.804 for pair comparison without ties, and 0.318 normalized Levenshtein distance for batch ranking (lower is better). Gemini-Pro scored 0.262 / 0.616 / 0.717. LLaVA-1.5-13b scored 0.247 / 0.273 / 0.327. — [MLLM-as-a-Judge project page](https://mllm-judge.github.io/)
  - The arXiv PDF gives slightly different GPT-4V figures (0.636 with ties, 0.773 without ties, scoring about 0.49). Treat the exact values as version-dependent. Pairwise beats scoring in every version. — [arXiv 2402.04788](https://arxiv.org/pdf/2402.04788)
- **Run-to-run consistency (same benchmark), measured.** Over six repeated runs, GPT-4V's consistency was 0.675 for pair comparison, 0.611 for scoring and 0.418 for batch ranking. Asking a judge to rank many images at once is the least stable format. — [MLLM-as-a-Judge project page](https://mllm-judge.github.io/)
- **Biases found (same benchmark), measured.**
  - High-score bias: Gemini, LLaVA and CogVLM mostly gave scores around 4/5 and rarely 1–2.
  - Length bias: GPT-4V and Gemini added 0.6 and 0.75 points to longer answers with the same meaning.
  - Self-preference: GPT-4V slightly favored its own outputs.
  - Position bias: LLaVA and CogVLM favored one position. LLaVA copied the example ordering 88.2% of the time.
  - — [MLLM-as-a-Judge project page](https://mllm-judge.github.io/)
- **GenArena (Feb 2026), measured.**
  - Absolute pointwise VLM scoring is described as showing "stochastic inconsistency and poor agreement with human perception."
  - Switching to pairwise judging raised evaluation accuracy by more than 20%. Spearman correlation with the LMArena human leaderboard was 0.86 for pairwise versus 0.36 for pointwise.
  - With the pairwise protocol, open-source judges outperformed top proprietary models.
  - — [GenArena abstract, arXiv 2602.06013](https://arxiv.org/abs/2602.06013)
  - A secondary summary gives one example: Qwen3-VL-8B's accuracy on GenAI-Bench image generation rose from 49.1% to 60.5% under pairwise judging. This comes from a search snippet and I did not verify it in the PDF, which was too large to fetch. — [GenArena PDF](https://arxiv.org/pdf/2602.06013)
- **GenAI-Arena (NeurIPS 2024), measured.**
  - When MLLMs were asked to imitate human votes on image, edit and video pairs, the best model (GPT-4o) reached only 49.19% average accuracy.
  - The arXiv version reports Pearson 0.22 on the quality sub-score and "random guessing" on the other sub-scores.
  - Off-the-shelf naive VLM voting is weak. Protocol design matters a lot.
  - — [NeurIPS 2024 poster page](https://neurips.cc/virtual/2024/poster/97878); [arXiv 2406.04485](https://arxiv.org/abs/2406.04485v4)
- **Position bias in multi-image VLMs (CVPR 2025), measured.** VLM predictions "significantly" change when the positions of the images are swapped. The paper proposes a mitigation and studies multi-image QA rather than judging. — [Tian et al., CVPR 2025](https://openaccess.thecvf.com/content/CVPR2025/papers/Tian_Identifying_and_Mitigating_Position_Bias_of_Multi-image_Vision-Language_Models_CVPR_2025_paper.pdf)
- **Standard mitigation: swap and check.** Evaluate each pair in both orders. Define position-bias rate as the share of pairs whose preference flips when the order is swapped (an ideal judge scores about 0). This is common practice in 2025–2026 VLM-judge and reward-model papers. — [AesRM, arXiv 2604.28078](https://arxiv.org/pdf/2604.28078); [Systematic Study of Position Bias in LLM-as-a-Judge, IJCNLP 2025](https://aclanthology.org/2025.ijcnlp-long.18.pdf)
- **Swapping does not fix every bias.** A 2026 preprint finds that VLM judges sometimes "judge without seeing": they prefer the more informative-sounding text over what the image actually shows. Position-swap methods are "not designed to handle" this. — [arXiv 2604.17768](https://arxiv.org/pdf/2604.17768)
- **Juries / Panel of LLM evaluators (PoLL; Verga et al., Cohere 2024), measured on text QA.**
  - A panel of three smaller models from different families agreed with humans better than GPT-4 alone. Cohen's kappa was 0.763 vs 0.627 on NQ, 0.906 vs 0.841 on TriviaQA, and 0.867 vs 0.830 on HotpotQA.
  - The paper also reports lower intra-model bias and lower cost.
  - This is text-only. I found no image-sprite replication.
  - — [arXiv 2404.18796](https://arxiv.org/pdf/2404.18796)
- **Learned preference reward models (usable as best-of-N selectors), measured.**
  - HPSv3 (ICCV 2025, Qwen2-VL backbone) reports 76.9% preference accuracy on HPDv3, 85.4% on HPDv2 and 72.8% on the Pick-a-Pic test set.
  - On HPDv3 it reports Spearman 0.94 and Kendall 0.82 against human rankings of generators, ahead of HPSv2, PickScore, ImageReward and CLIP.
  - It drops about 8.5 points going from HPDv2 to HPDv3, versus about 14.2 for PickScore.
  - — [HPSv3, arXiv 2508.03789](https://arxiv.org/pdf/2508.03789); [hpsv3 PyPI](https://pypi.org/project/hpsv3/)
  - Baseline cross-dataset accuracies (HPSv3 README table): the PickScore model scores 61.6 on the ImageReward test set, 70.5 on Pick-a-Pic, 79.8 on HPDv2 and 65.6 on HPDv3. The ImageReward model scores 65.1, 61.1, 74.0 and 58.6. These reward models degrade heavily outside their training distribution. — [hpsv3 PyPI](https://pypi.org/project/hpsv3/)
  - A 2026 study finds HPSv2 and PickScore better as optimization targets than ImageReward, because their gains transfer better to other metrics. — [arXiv 2606.05478](https://arxiv.org/pdf/2606.05478)
- **Best-of-N with a judge, inside a code-to-image pipeline, measured setup.** Chat2SVG (CVPR 2025) has Claude-3.5-Sonnet write an SVG template, then render it and inspect it in two "visual rectification" rounds. The paper says "two iterations of refinement are typically sufficient." This is repeated 5 times per prompt for 15 candidates, and ImageReward picks the best one. The paper reports no ablation number isolating rectification or selection. — [Chat2SVG, arXiv 2411.16602](https://arxiv.org/html/2411.16602v2)
- **Best-of-N in general.** Generating N samples and picking one with a reward or judge model is the "commonly used framework" for test-time scaling of image generators. Several 2025 papers stress that the result "hinges on the verifier" and that the gains plateau. — [Reflect-DiT, arXiv 2503.12271](https://arxiv.org/pdf/2503.12271); [Performance Plateaus in Inference-Time Scaling, arXiv 2506.12633](https://arxiv.org/html/2506.12633v1)
- **Blind spots on simple geometric images ("VLMs are blind", 2024–2025), measured.**
  - The test images are simple 2D primitives: two overlapping circles, line intersections, nested squares and counting.
  - VLMs averaged 58.57% accuracy across 7 tasks. The best model, Claude 3.5 Sonnet, reached 74.01% (v4); later versions report 77.84% for the best model. Humans score about 100%.
  - Models "cannot reliably tell whether two lines (or two circles) are intersecting, especially when close together."
  - The authors suggest the vision encoder holds the information but the language side fails to decode it.
  - — [arXiv 2407.06581](https://arxiv.org/html/2407.06581v4)

### Inferences
- **Replace absolute scoring with a pairwise tournament for selection.** Keep the 5-question yes/no rubric as a pass/fail gate, since binary questions avoid the 1–5 high-score bias. When choosing among variants, run pairwise A-vs-B comparisons in both orders. Count a win only when both orders agree; otherwise record a tie. A small round-robin or Swiss tournament over 3–6 candidates fits within a 3-pass budget. This directly mirrors the evidence (0.80 vs 0.45 agreement; Spearman 0.86 vs 0.36).
- **Report position-flip rate as a health metric for the judge itself.** If more than about 20–30% of pairs flip when swapped, treat the comparison as a tie. This threshold is my own suggestion, not a sourced number.
- **Use the target as a third image (reference-guided pairwise).** When a concept sprite or target exists, show the judge [target, A, B] and ask "which is closer to the target in silhouette, palette, and readability?" No source here measures reference-guided pairwise judging on sprites. The rationale is that it combines pairwise judging with a concrete anchor.
- **Remove the order cue and self-preference cue.** The prior pass found that seeing PNGs matters. A cheap mitigation for self-preference is to render A and B as anonymous side-by-side panels with neutral labels and no code shown.
- **Let lint metrics own the things VLMs miss.** The "blind" results imply the VLM should not be trusted to notice stray single pixels, a 1-px gap in an outline, or two circles that barely touch. Those belong to pixel metrics: orphan-pixel count, outline continuity, palette count and silhouette area. Upscaling the sprite with nearest-neighbor before judging (e.g., 8x) is the obvious complement. I found no paper that measures the effect of upscale factor on judge accuracy for pixel art.
- **Use a jury only if a second model family is cheaply available.** PoLL evidence is text-only. For a single-agent setup, the closer analogue is sampling the same judge several times or with several prompt framings and taking the majority. The run-to-run consistency data above (0.675 pairwise) shows single samples are noisy.
- **Generic reward models are only a weak tie-breaker.** HPSv3, PickScore and ImageReward are trained on photoreal/illustrative text-to-image outputs and degrade off-distribution (see the cross-dataset table). Nothing shows they rank 32–64 px sprites well.

### Gaps
- No study found measures VLM-judge accuracy specifically on pixel art or images at or below 64x64 px, or the effect of nearest-neighbor upscaling on judge accuracy.
- No study found measures reference-guided image judging, where the judge sees a target plus candidates, with numbers against humans in a sprite or icon setting.
- I could not fetch GenArena's per-model tables because the PDF was too large. Only the abstract numbers are verified.
- I did not find VideoScore or VisionArena numbers in this pass.

## Q2. Automatic aesthetic or quality metrics usable for pixel art

### Takeaway
I found no published pixel-art-specific aesthetic or quality metric or classifier. LAION-Aesthetics has documented taste and realism biases. Generic preference reward models generalize poorly off their training distribution. The practical options are:
1. Hand-written pixel-art lint metrics, which the project already has.
2. Similarity-to-target metrics when a reference exists.
3. A small project-specific classifier trained on the project's own blind A/B human votes, possibly using large public sprite datasets for pretraining or embeddings.

### Cited Findings
- **LAION-Aesthetics Predictor audit (2026).**
  - Training choices were made "largely on [Schuhmann's] individual taste."
  - It rates realistic landscapes, cityscapes and portraits by western and Japanese artists most highly. It is also biased by gender and LGBTQ+ terms in captions.
  - It is restricted to images with English captions.
  - These biases suggest stylized low-res art is out of its intended domain. The audit does not test pixel art directly.
  - — [arXiv 2601.09896](https://arxiv.org/html/2601.09896v4)
- **Hugging Face sprite datasets, none with quality labels.**
  - `evilsocket/alucard-sprites`: about 162K pixel-art sprites at 128x128 RGBA, normalized (split, tight-cropped, centered) and captioned with CLIP zero-shot labels for type, color, size and view angle. These are content labels, not quality labels. License listed as "other (fair-1.0.0)". — [HF dataset card](https://huggingface.co/datasets/evilsocket/alucard-sprites/blob/main/README.md)
  - `pawkanarek/spraix_1024_best_96`: hand-curated sprite animations described as "the best imho". This is an informal quality filter. GPL-3.0. — [HF card](https://huggingface.co/datasets/pawkanarek/spraix_1024_best_96/blob/main/README.md)
  - `pawkanarek/spraix_1024_9frames`: 9-frame sprite animations labeled with action and facing direction. — [HF card](https://huggingface.co/datasets/pawkanarek/spraix_1024_9frames)
  - A discussion thread on `jainr3/diffusiondb-pixelart` is titled "Poor quality", which suggests that AI-generated "pixel art" datasets are noisy. This is anecdotal. — [HF discussion](https://huggingface.co/datasets/jainr3/diffusiondb-pixelart/discussions/1)
- **SD-πXL (ETH, 2024) evaluation of pixel-art generators.**
  - Automatic metrics were reported for semantic similarity, fidelity and aesthetics over 150 images (numeric values not retrieved).
  - The perceptual study had 56 participants and 45 images, with % ranked first for semantic / fidelity / aesthetics:
    - Pixelated Image Abstraction (Gerstner 2012): 24.6 / 49.3 / 25.5
    - VectorFusion: 22.0 / 0.8 / 17.5
    - SD-πXL K-means palette: 36.2 / 47.1 / 26.5
    - SD-πXL fixed palette: 17.1 / 2.7 / 30.5
  - The authors note a disagreement: VectorFusion led semantic accuracy in the automatic evaluation, while humans did not favor it. Automatic semantic metrics and human judgments diverge for pixel art.
  - — [arXiv 2410.06236](https://arxiv.org/html/2410.06236v1)
- **Chat2SVG uses Image FID, Path FID and CLIP text alignment** as its automatic metrics for code-drawn vector art. For example, Chat2SVG scores 33.31 / 39.07 / 0.3090, against SVGDreamer at 35.48 / 47.95 / 0.2919. These are distribution-level metrics and need many samples, so they are not usable per sprite. — [arXiv 2411.16602](https://arxiv.org/html/2411.16602v2)
- **SVG benchmark landscape 2025–2026.**
  - SVGenius (2,377 queries, 22 models) treats pixel-art style transfer as its hardest task and finds proprietary models consistently ahead. — [SVGenius](https://zju-real.github.io/SVGenius/)
  - VectorGym (2026) uses a VLM-as-judge for SVG generation and editing and compares Claude 4.5 Sonnet, Gemini 3 Pro and others. — [arXiv 2603.29852](https://arxiv.org/pdf/2603.29852)
  - 2026 work proposes structural, leave-one-out SVG metrics and a vision-grounded perceptual SVG metric. Not read in detail. — [arXiv 2604.08809](https://arxiv.org/pdf/2604.08809); [SVGEval, arXiv 2608.01977](https://arxiv.org/pdf/2608.01977)

### Inferences
- **When a reference exists, use cheap similarity-to-target as a fit metric.** Candidates: palette-quantized per-pixel error in a perceptual color space (e.g., CIELAB ΔE), silhouette IoU on the alpha mask, and edge/outline IoU. Each runs in milliseconds in Node and is directly interpretable at 32–64 px. Chat2SVG's MSE + IoU losses are a precedent for MSE and IoU on rendered shapes.
- **The best long-term pixel-art quality metric is probably the project's own human A/B data.** Fit a tiny preference model, for example logistic regression or Bradley-Terry over lint metrics plus an embedding. This mirrors how HPS, PickScore and ImageReward were built, at miniature scale. It is my inference, not a sourced result.
- **Do not adopt LAION-Aesthetics or HPS as a gate for sprites without first checking them against the project's A/B votes.**

### Gaps
- I found no "Pixel Art Bench" dataset or benchmark on Hugging Face in this pass, and no published pixel-art aesthetics classifier.
- I found no measurements of DreamSim or LPIPS behavior at 32–64 px or on pixel art. These networks are trained on 224 px-scale natural images, so behavior at sprite scale is unverified.
- I did not retrieve SD-πXL's numeric automatic-metric table.

## Q3. Fitting code-drawn primitives to a target reference image (editable, animatable code)

### Takeaway
Three families of methods exist:
1. **Gradient-free hill-climbing / evolutionary fitting** (primitive, Geometrize). This is mature, runs in browser JS or Node today, and needs no GPU.
2. **Differentiable vector rasterization** (DiffVG and its descendants, LIVE, VectorFusion, SVGDreamer, Chat2SVG). Highest quality, but Python/PyTorch and a GPU.
3. **Differentiable palette-constrained pixel generators** (SD-πXL). Pixel-exact output, but slow: 1.5 h on an RTX 4090.

Chat2SVG is the clearest precedent for the hybrid this project wants: an LLM writes semantic primitives as code, an image model produces a detailed target, and then an optimizer tunes only numeric parameters while the code structure stays editable.

### Cited Findings
- **Chat2SVG (CVPR 2025), measured. This is the template for "LLM code, then fit to target."**
  - Stage 1: Claude-3.5-Sonnet writes an SVG made of basic primitives. It is rendered and fed back to the LLM for visual rectification, with two rounds typically enough.
  - The rendered template goes through SDEdit + ControlNet-tile to produce a detailed target image.
  - Stage 2: shape parameters are optimized against that target with a differentiable rasterizer (Li et al. 2020, i.e. DiffVG), first in a learned latent path space and then at the point level. Losses: ℓ = MSE + λ₁·curvature + λ₂·IoU, with λ₁ = 5e-4 and λ₂ = 5e-6. Each stage runs 500 iterations. The page text says about 10 minutes for about 30 shapes on one RTX 4090; the fetched text had garbled digits.
  - Editability is preserved because each path maps to one semantic element. Later edits change only the targeted shapes.
  - Ablation (Image FID / Path FID / CLIP alignment):
    - Full pipeline: 33.31 / 39.07 / 0.3090
    - No LLM template: 47.21 / 70.13 / 0.2968
    - No optimization: 33.45 / 36.12 / 0.3044
  - The LLM template matters most. Optimization mainly adds geometric detail and slightly improves text alignment. Path FID is actually slightly better without optimization.
  - — [arXiv 2411.16602](https://arxiv.org/html/2411.16602v2); [project page](https://chat2svg.github.io)
- **DiffVG (Li et al., SIGGRAPH Asia 2020).** A differentiable rasterizer that bridges the vector and raster domains, with differentiable anti-aliasing. Editing and learning tasks become gradient optimization so that a vector graphic matches a target image. — [DiffVG paper](https://cseweb.ucsd.edu/~tzli/diffvg/diffvg.pdf)
- **General primitive fitting with differentiable rasterization.** An image-space loss between the rasterized primitives and a fixed target gives gradients for the primitive parameters. Examples include Differentiable Drawing and Sketching (2021) and DiffCSG (2024) for CSG shapes. Anti-aliasing is what lets gradients reach shape parameters. — [arXiv 2103.16194](https://arxiv.org/pdf/2103.16194); [DiffCSG, arXiv 2409.01421](https://arxiv.org/html/2409.01421v2)
- **SD-πXL (Binninger & Sorkine-Hornung, ETH, SIGGRAPH Asia 2024), pixel-exact.**
  - Parameterization: a logits tensor H×W×n, one channel per palette color. Gumbel-softmax with τ = 1 is used during optimization, and argmax gives strict palette output.
  - Guidance comes from SDXL score distillation with ControlNet (Canny and depth) from an optional reference image, plus an FFT smoothness loss (w = 20).
  - Initialization uses the downsampled input image. The palette is either user-supplied or from K-means.
  - Tested at 24–192 px.
  - Cost: 1.5 h on an RTX 4090 for 6,000 steps.
  - Stated limits: slow, per-pixel independent sampling, and no frame-to-frame consistency for animation (left as future work).
  - — [arXiv 2410.06236](https://arxiv.org/html/2410.06236v1)
- **Pixelated Image Abstraction (Gerstner et al. 2012).** A classic image-to-pixel-art optimizer that jointly chooses superpixels and a palette. It still scored 49.3% "ranked first for fidelity" in the 2024 SD-πXL user study, roughly tied with SD-πXL K-means at 47.1%. A non-neural downsample-and-palette method stays competitive on fidelity to a target. — [arXiv 2410.06236](https://arxiv.org/html/2410.06236v1)
- **Geometrize and primitive (hill climbing), available in JS.**
  - The method generates many random candidate shapes, hill-climbs each one, keeps the best, and repeats with several random starts to escape local minima.
  - The score is RMSE against the target.
  - `geometrizejs` provides a JS API tested in browser and Node, with a CLI. Fogleman's Go `primitive` has a WebAssembly browser port (primitive-playground).
  - Practitioner guidance (anecdotal) is that about 50–200 shapes give a recognizable but abstract result.
  - — [geometrize-haxe README](https://de.github.com/Tw1ddle/geometrize-haxe); [geometrize.co.uk](https://www.geometrize.co.uk/); [HN-mirror thread on primitive-playground](https://hckrnws-4a10ce9wb-rajatkulkarni.vercel.app/stories/47232339)

### Inferences (feasibility for this project, browser JS/Node)
- **Recommended approach: structure-preserving parameter fitting** (Chat2SVG-style, no GPU).
  1. Claude writes the sprite as named primitives: head circle, torso rect, limb lines, outline pass and palette indices. Each has numeric parameters.
  2. Downsample the AI concept sprite to the target grid (e.g., 32x32) and quantize it to the project palette (Gerstner-style or K-means). This becomes the target.
  3. Run a gradient-free optimizer in Node over the parameters only: positions ±2 px, radii ±2, palette index from a small set, and an on/off flag per detail. Suitable optimizers are coordinate-wise hill climbing, (1+λ) evolution strategy, or CMA-ES.
  4. Loss = palette-space per-pixel error + silhouette IoU penalty + lint penalties.
  - The code structure, names and animation hooks stay untouched, so the result remains editable and animatable.
- **Expected cost.** At 32x32 a full render plus loss is about 1,000 pixels. Even 10,000 evaluations is trivial in Node, seconds at most. I have not benchmarked this.
- **Why not gradients.** DiffVG/PyTorch-style gradients are unnecessary at this scale. They also fit awkwardly with hard-edged, non-anti-aliased pixel rendering, where gradients are zero almost everywhere. That is why DiffVG relies on anti-aliasing and SD-πXL uses softmax relaxation.
- **Hill climbing is the practical choice in JS**, and Geometrize proves the approach in-browser.
- **Expected quality.** The Chat2SVG ablation suggests most of the quality comes from a good LLM-authored structure. Optimization adds detail and alignment rather than rescuing a bad structure. Likely gains: better proportions and silhouette match to the concept, plus palette placement. Unlikely to help: style and readability judgments, so keep the pairwise judge and human A/B for those.
- **Risks.**
  - Over-fitting to the noisy anti-aliasing of AI concept art, which produces jaggies and orphan pixels. Mitigate by quantizing the target first and penalizing lint violations inside the loss.
  - Animation drift. A per-frame fit breaks consistency, which SD-πXL also flags as unsolved. Fit only the rest pose (or shared parameters), and keep the code's animation offsets as hard constraints.
- **Free-form Geometrize or primitive output is not suitable as the final sprite.** It yields hundreds of anonymous overlapping shapes, which destroys editability. It is useful only as a diagnostic, or to propose where the agent should add a named detail.
- **SD-πXL is the quality ceiling for pixel-exact output from a reference.** It needs a CUDA GPU and Python, takes about 1.5 h per image, and outputs a pixel grid, not code. It can generate concept targets offline, but it is not an in-loop tool.

### Gaps
- I found no published project that takes an AI-generated concept sprite as a target and fits the parameters of hand-authored sprite code to it with measured results. The pipeline above is an inference from Chat2SVG, Geometrize and SD-πXL.
- I found no JS port of DiffVG, and no benchmark of hill-climbing parameter fitting at sprite resolution.
- Not re-checked in this pass: LIVE, CLIPDraw/StyleCLIPDraw, SVGDreamer details, and EvoLisa/Genetic Drawing (beyond mentions of SVGDreamer/CLIPDraw/VectorFusion as baselines in the Chat2SVG table).

## Q4. 2025–2026 reports of AI agents producing game sprites via code with measured improvements

### Takeaway
2025–2026 produced many agent skills and blog posts for sprite generation. Nearly all are anecdotal, with no controlled before/after metrics. Most production-quality pipelines route through image or video models plus deterministic post-processing, not code-drawn primitives. The best measured evidence for code-drawn art with an LLM in the loop remains academic SVG work such as Chat2SVG and the SVG benchmarks.

### Cited Findings
- **PlayableIntelligence "game-assets" skill (updated May 2026).** Turns geometric placeholder shapes in browser games into pixel-art sprites as code-only 2D arrays, with no external files. No metrics. Anecdotal. — [Skillselion listing](https://skillselion.com/skills/playableintelligence/game-creator/game-assets)
- **Skillselion pixel-art guide (anecdotal).** By default Claude Code "tends to draw a small, blurry illustration with too many colors." Pixel-art skills help by fixing grid sizes and palettes. — [Skillselion guide](https://skillselion.com/guides/pixel-art-skills-claude-code-guide)
- **agent-sprite-forge (GitHub, anecdotal).** Creates a master still, then an image-to-video clip per action. Deterministic Python tools then gate, key, register, loop, retime and package frames for Godot, Aseprite or the web. No metrics reported in the snippet. — [GitHub 0x0funky/agent-sprite-forge](https://github.com/0x0funky/agent-sprite-forge)
- **AgentBrush blog (Mar 2026, anecdotal).** Sprite generation from inside Claude or Cursor through an image model (gpt-image-2) with a pixel-art preset, using reference images for cross-frame consistency. — [agentbrush.dev](https://agentbrush.dev/blog/2d-game-asset-generation)
- **Sprite Fusion blog (Sept 2026, anecdotal).**
  - Claude Opus 5.5 (Extra High) produced an animated pixel-art Halloween diorama from one prompt in about 10 minutes.
  - The author's only verdict: "not perfect, but much better than what an LLM could have done before."
  - No self-critique steps, no metrics and no tooling details.
  - — [Sprite Fusion blog](https://www.spritefusion.com/blog/opus-5-5-for-pixel-art-scenes)
- **PixelForge MCP skill.** Uses Gemini image generation with style presets (8-bit, SNES 16-bit, Gameboy). No metrics. — [mcpmarket listing](https://mcpmarket.com/tools/skills/pixelforge-game-asset-generator)

### Inferences
- **The project's measured setup is ahead of most public reports.** It already has lint metrics, a rubric and a blind human A/B tool. The most valuable new evidence would come from running its own controlled comparisons, for example absolute rubric selection vs pairwise swap-checked selection vs target-fitted variants, all scored by blind A/B win rate.
- **Many public pipelines hand art generation to image models.** The code-drawn approach's advantages, editability and procedural animation, are rarely measured anywhere.

### Gaps
- I found no 2025–2026 paper or blog with measured before/after improvements for agents drawing sprites via code. Examples would be human preference win rates or lint pass rates.
- I found no procedural character generation quality study (2024–2026) in this pass. The topic was not reached within the tool budget.
