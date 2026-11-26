/** Bytes of an asset URL. Inlined `data:` URLs are decoded by hand (some hosts block fetch() on them). */
export async function fetchBytes(url: string): Promise<ArrayBuffer> {
  if (url.startsWith('data:')) {
    const comma = url.indexOf(',');
    const bin = atob(url.slice(comma + 1));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out.buffer;
  }
  const res = await fetch(url);
  return res.arrayBuffer();
}
