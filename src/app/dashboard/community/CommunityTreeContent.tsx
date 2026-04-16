"use client";

import styles from "./community.module.css";

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  game_nickname: string | null;
  invited_by: string | null;
  role: string;
  created_at: string;
}

interface TreeNode extends Profile {
  children: TreeNode[];
  depth: number;
}

interface Props {
  profiles: Profile[];
  currentUserId: string;
}

function buildTree(profiles: Profile[]): TreeNode[] {
  const profileMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // Create nodes
  profiles.forEach((p) => {
    profileMap.set(p.id, { ...p, children: [], depth: 0 });
  });

  // Build tree
  profiles.forEach((p) => {
    const node = profileMap.get(p.id)!;
    if (p.invited_by && profileMap.has(p.invited_by)) {
      const parent = profileMap.get(p.invited_by)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function TreeNodeComponent({ node, isLast, currentUserId }: { node: TreeNode; isLast: boolean; currentUserId: string }) {
  const isCurrentUser = node.id === currentUserId;
  const isAdmin = node.role === "admin";
  const isSeed = !node.invited_by;
  const displayName = node.display_name || node.username;
  const joinDate = new Date(node.created_at).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const roleIcon = isAdmin ? "🛡️" : isSeed ? "🌱" : "";
  
  return (
    <div className={styles.treeNode}>
      <div className={styles.treeBranch}>
        <span className={styles.branchLine}>
          {isLast ? "└── " : "├── "}
        </span>
      </div>
      <div className={`${styles.nodeCard} ${isCurrentUser ? styles.nodeCardSelf : ""} ${isAdmin ? styles.nodeCardAdmin : ""}`}>
        <div className={styles.nodeHeader}>
          <span className={styles.nodeIcon}>
            {roleIcon || "👤"}
          </span>
          <span className={styles.nodeName}>
            {displayName}
            {node.game_nickname && node.game_nickname !== displayName && (
              <span className={styles.gameNick}> ({node.game_nickname})</span>
            )}
          </span>
          {isCurrentUser && <span className={styles.youBadge}>Ty</span>}
          {isAdmin && <span className={styles.adminBadge}>Admin</span>}
          {isSeed && !isAdmin && <span className={styles.seedBadge}>Seed</span>}
        </div>
        <div className={styles.nodeInfo}>
          <span className={styles.joinDate}>Dołączył: {joinDate}</span>
          {node.children.length > 0 && (
            <span className={styles.childCount}>
              🌳 {node.children.length} zaproszony{node.children.length > 1 ? "ch" : ""}
            </span>
          )}
        </div>
      </div>
      {node.children.length > 0 && (
        <div className={styles.childrenContainer}>
          {node.children.map((child, i) => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              isLast={i === node.children.length - 1}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommunityTreeContent({ profiles, currentUserId }: Props) {
  const tree = buildTree(profiles);
  const totalUsers = profiles.length;
  const usersWithInviters = profiles.filter((p) => p.invited_by).length;

  return (
    <div className={styles.page}>
      <h1>
        🌳 <span className={styles.accent}>Drzewko</span> społeczności
      </h1>
      <p className={styles.subtitle}>
        Drzewko zaproszeń — kto kogo zaprosił do QCStats
      </p>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{totalUsers}</span>
          <span className={styles.statLabel}>Graczy</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{tree.length}</span>
          <span className={styles.statLabel}>Seedów</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{usersWithInviters}</span>
          <span className={styles.statLabel}>Zaproszonych</span>
        </div>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <span>🛡️ Admin</span>
        <span>🌱 Seed (założyciel)</span>
        <span>👤 Gracz</span>
      </div>

      {/* Tree */}
      <div className={styles.treeContainer}>
        {tree.map((root, i) => (
          <TreeNodeComponent
            key={root.id}
            node={root}
            isLast={i === tree.length - 1}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  );
}
