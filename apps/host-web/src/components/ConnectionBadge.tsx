import { useVtsStore } from "../features/vts/useVtsStore";

export function ConnectionBadge() {
  const status = useVtsStore((state) => state.status);
  return <span className="status">VTS: {status}</span>;
}
