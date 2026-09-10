import { JENIS_LABEL, JENIS_STYLE, type Jenis } from "@/lib/types";

/**
 * Penanda jenis kiriman. Sengaja selalu ditampilkan, termasuk untuk
 * `video`, supaya admin tidak perlu menebak dari ada-tidaknya badge —
 * kiriman Zoom berarti ada pekerjaan konversi sebelum diunggah.
 */
export function JenisBadge({ jenis }: { jenis: Jenis }) {
  return (
    <span className={`badge ${JENIS_STYLE[jenis]}`}>
      {jenis === "zoom" ? "⏵⏵" : "▶"} {JENIS_LABEL[jenis]}
    </span>
  );
}
