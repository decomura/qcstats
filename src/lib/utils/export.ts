/**
 * Export match data as CSV
 */

interface ExportMatch {
  date: string;
  player1: string;
  player2: string;
  score: string;
  map: string;
  p1Accuracy: number;
  p2Accuracy: number;
  p1Damage: number;
  p2Damage: number;
  winner: string;
}

export function generateCSV(matches: ExportMatch[]): string {
  const headers = [
    "Date",
    "Player 1",
    "Player 2",
    "Score",
    "Map",
    "P1 Accuracy",
    "P2 Accuracy",
    "P1 Damage",
    "P2 Damage",
    "Winner",
  ];

  const rows = matches.map((m) =>
    [
      m.date,
      m.player1,
      m.player2,
      m.score,
      m.map,
      `${m.p1Accuracy}%`,
      `${m.p2Accuracy}%`,
      m.p1Damage,
      m.p2Damage,
      m.winner,
    ].join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

export function downloadCSV(csv: string, filename = "qcstats_export.csv") {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
