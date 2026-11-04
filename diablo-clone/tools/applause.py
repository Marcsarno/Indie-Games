import numpy as np
x = np.fromfile('song2w.raw', dtype=np.int16).astype(np.float32) / 32768; sr = 22050
win = 2048; hop = sr // 4   # quarter-second frames
n = (len(x) - win) // hop; hw = np.hanning(win); F = np.fft.rfftfreq(win, 1 / sr)
flat = np.zeros(n); hi = np.zeros(n); tonal = np.zeros(n)
lo_b = (F > 200) & (F < 8000)
for i in range(n):
    s = np.abs(np.fft.rfft(x[i * hop:i * hop + win] * hw)) ** 2 + 1e-12
    b = s[lo_b]
    flat[i] = np.exp(np.mean(np.log(b))) / np.mean(b)          # 1 = white noise, 0 = pure tones
    hi[i] = s[F > 3000].sum() / s[F > 100].sum()                # share of energy above 3 kHz
    # tonality: how peaky the 200-2000 Hz spectrum is (music has harmonics)
    m = s[(F > 200) & (F < 2000)]; tonal[i] = np.log10(m.max() / np.median(m))
np.save('app.npy', np.stack([flat, hi, tonal]))
t = np.arange(n) / 4
def stats(a, b):
    k = (t >= a) & (t < b); return flat[k].mean(), hi[k].mean(), tonal[k].mean()
print('applause 5:25-6:50 flat %.3f hi %.3f tonal %.2f' % stats(325, 410))
for a, b in [(30, 300), (430, 1000), (1050, 1300)]: print('music %d-%d flat %.3f hi %.3f tonal %.2f' % ((a, b) + stats(a, b)))
