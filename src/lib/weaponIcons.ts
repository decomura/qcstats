/**
 * QCStats Weapon & Item Icon Map
 *
 * Maps weapon names (as used in OCR) and item types
 * to their icon paths in /public/img/
 */

export const WEAPON_ICON_MAP: Record<string, string> = {
  "Gauntlet": "/img/gauntlet.png",
  "Machine Gun": "/img/machine_gun.png",
  "Super Machine Gun": "/img/super_machine_gun.png",
  "Shotgun": "/img/shotgun.png",
  "Super Shotgun": "/img/super_shotgun.png",
  "Nail Gun": "/img/nailgun.png",
  "Super Nailgun": "/img/super_nailgun.png",
  "Rocket Launcher": "/img/rocket_launcher.png",
  "Lightning Gun": "/img/lightinggun.png",
  "Railgun": "/img/railgun.png",
  "Tribolt": "/img/tribolt.png",
};

export const ITEM_ICON_MAP: Record<string, string> = {
  mega_health: "/img/mega_health.png",
  heavy_armor: "/img/heavy_armor.png",
  light_armor: "/img/light_armor.png",
};

/** Short labels for compact display */
export const WEAPON_SHORT_NAMES: Record<string, string> = {
  "Gauntlet": "GTL",
  "Machine Gun": "MG",
  "Super Machine Gun": "HMG",
  "Shotgun": "SG",
  "Super Shotgun": "SSG",
  "Nail Gun": "NG",
  "Super Nailgun": "SNG",
  "Rocket Launcher": "RL",
  "Lightning Gun": "LG",
  "Railgun": "RG",
  "Tribolt": "TRI",
};

export function getWeaponIcon(weaponName: string): string {
  return WEAPON_ICON_MAP[weaponName] || "/img/gauntlet.png";
}

export function getItemIcon(itemType: string): string {
  return ITEM_ICON_MAP[itemType] || "/img/mega_health.png";
}
