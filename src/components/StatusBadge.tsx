import { STATUS_LABEL, STATUS_STYLE, type Status } from "@/lib/types";

const DOT: Record<Status, string> = {
  baru: "bg-sky-400",
  diproses: "bg-amber-400",
  revisi: "bg-rose-400",
  selesai: "bg-emerald-400",
  ditolak: "bg-zinc-500",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`badge ${STATUS_STYLE[status]}`}>
      <span className={`size-1.5 rounded-full ${DOT[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}
