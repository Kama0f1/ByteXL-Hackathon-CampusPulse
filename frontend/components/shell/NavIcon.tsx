import {
  BellIcon,
  DatabaseIcon,
  HandshakeIcon,
  SquaresFourIcon,
  UsersThreeIcon,
  UserListIcon,
  WarningDiamondIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { NavKey } from "@/components/shell/nav";

const ICONS = {
  dashboard: SquaresFourIcon,
  alerts: BellIcon,
  students: UserListIcon,
  risks: WarningDiamondIcon,
  segments: UsersThreeIcon,
  interventions: HandshakeIcon,
  data: DatabaseIcon,
} satisfies Record<NavKey, unknown>;

export function NavIcon({ name, active = false, className = "h-[18px] w-[18px]" }: { name: NavKey; active?: boolean; className?: string }) {
  const Icon = ICONS[name];
  return <Icon aria-hidden="true" weight={active ? "fill" : "regular"} className={className} />;
}
