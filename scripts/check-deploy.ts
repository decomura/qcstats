/**
 * QCStats – Vercel Deployment Status Checker
 *
 * Usage: npx tsx scripts/check-deploy.ts
 *
 * Checks the latest Vercel deployment status for the project.
 * Returns 0 on success, 1 on failure or if no deployment found.
 */

const VERCEL_PROJECT_NAME = "qcstats";

interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  state: string;
  created: number;
  ready?: number;
  source?: string;
  meta?: {
    githubCommitSha?: string;
    githubCommitMessage?: string;
    githubCommitRef?: string;
  };
}

async function checkDeployment() {
  const token = process.env.VERCEL_TOKEN;

  if (!token) {
    console.error("❌ VERCEL_TOKEN environment variable is not set");
    console.log("Set it with: $env:VERCEL_TOKEN = 'your-token-here'");
    process.exit(1);
  }

  try {
    const res = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_NAME}&limit=1&state=BUILDING,READY,ERROR`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      // Try with project name instead of ID
      const res2 = await fetch(
        `https://api.vercel.com/v6/deployments?limit=5`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res2.ok) {
        console.error(`❌ Vercel API error: ${res2.status} ${res2.statusText}`);
        process.exit(1);
      }

      const data2 = await res2.json();
      const deployments: VercelDeployment[] = data2.deployments || [];
      const qcDeploy = deployments.find(
        (d: VercelDeployment) =>
          d.name?.toLowerCase().includes("qcstats") ||
          d.name?.toLowerCase().includes("qc-stats")
      );

      if (!qcDeploy) {
        console.log("⚠️  No QCStats deployment found on Vercel yet.");
        console.log(
          "Available projects:",
          deployments.map((d: VercelDeployment) => d.name).join(", ")
        );
        process.exit(0);
      }

      reportDeployment(qcDeploy);
      return;
    }

    const data = await res.json();
    const deployments: VercelDeployment[] = data.deployments || [];

    if (deployments.length === 0) {
      console.log("⚠️  No deployments found.");
      process.exit(0);
    }

    reportDeployment(deployments[0]);
  } catch (err) {
    console.error("❌ Failed to check deployment:", err);
    process.exit(1);
  }
}

function reportDeployment(deploy: VercelDeployment) {
  const stateEmoji: Record<string, string> = {
    READY: "✅",
    BUILDING: "🔨",
    ERROR: "❌",
    CANCELED: "⚪",
    QUEUED: "⏳",
  };

  const emoji = stateEmoji[deploy.state] || "❓";
  const ago = Math.round((Date.now() - deploy.created) / 1000);

  console.log(`\n${emoji} Deployment Status: ${deploy.state}`);
  console.log(`   URL: https://${deploy.url}`);
  console.log(`   Created: ${ago}s ago`);

  if (deploy.meta?.githubCommitMessage) {
    console.log(`   Commit: ${deploy.meta.githubCommitMessage}`);
    console.log(`   Branch: ${deploy.meta.githubCommitRef}`);
  }

  if (deploy.state === "ERROR") {
    console.error("\n❌ DEPLOYMENT FAILED! Check Vercel dashboard for logs.");
    process.exit(1);
  }

  if (deploy.state === "BUILDING") {
    console.log("\n🔨 Build in progress... Try again in 30-60 seconds.");
  }

  if (deploy.state === "READY") {
    console.log("\n✅ Deployment successful! Application is live.");
  }
}

checkDeployment();
