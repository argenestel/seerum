import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

interface AnalyzedWallet {
  wallet: string;
  seerscore: number;
  rank_overall: number;
  raw_seer_score: number;
  pnl_usd_approx: number;
  volume_usd: number;
  trade_count: number;
  active_days: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const minSeerScore = searchParams.get("minSeerScore");
    const maxRank = searchParams.get("maxRank");
    const orderBy = searchParams.get("orderBy") || "seerscore"; // seerscore, rank_overall, pnl_usd_approx, volume_usd

    // Read CSV file
    const csvPath = join(process.cwd(), "public", "analyzed_wallets.csv");
    const csvContent = await readFile(csvPath, "utf-8");

    // Parse CSV - handle quoted values
    const lines = csvContent.trim().split("\n");
    const headers = lines[0].split(",");
    
    const wallets: AnalyzedWallet[] = lines.slice(1)
      .filter((line) => line.trim()) // Skip empty lines
      .map((line) => {
        // Simple CSV parsing - split by comma, but handle quoted values
        const values: string[] = [];
        let current = "";
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        values.push(current.trim()); // Push last value
        
        return {
          wallet: values[0] || "",
          seerscore: parseFloat(values[1]) || 0,
          rank_overall: parseInt(values[2]) || 0,
          raw_seer_score: parseFloat(values[3]) || 0,
          pnl_usd_approx: parseFloat(values[4]) || 0,
          volume_usd: parseFloat(values[5]) || 0,
          trade_count: parseInt(values[6]) || 0,
          active_days: parseInt(values[7]) || 0,
        };
      });

    // Apply filters
    let filteredWallets = wallets;

    if (minSeerScore) {
      const minScore = parseFloat(minSeerScore);
      filteredWallets = filteredWallets.filter((w) => w.seerscore >= minScore);
    }

    if (maxRank) {
      const max = parseInt(maxRank);
      filteredWallets = filteredWallets.filter((w) => w.rank_overall <= max);
    }

    // Sort by orderBy
    filteredWallets.sort((a, b) => {
      switch (orderBy) {
        case "seerscore":
          return b.seerscore - a.seerscore;
        case "rank_overall":
          return a.rank_overall - b.rank_overall;
        case "pnl_usd_approx":
          return b.pnl_usd_approx - a.pnl_usd_approx;
        case "volume_usd":
          return b.volume_usd - a.volume_usd;
        default:
          return b.seerscore - a.seerscore;
      }
    });

    // Apply pagination
    const total = filteredWallets.length;
    const paginatedWallets = filteredWallets.slice(offset, offset + limit);

    // Transform to LeaderboardEntry format
    const data = paginatedWallets.map((wallet) => ({
      rank: wallet.rank_overall,
      proxyWallet: wallet.wallet,
      user: wallet.wallet,
      userName: `${wallet.wallet.slice(0, 6)}...${wallet.wallet.slice(-4)}`,
      verifiedBadge: false,
      vol: wallet.volume_usd,
      pnl: wallet.pnl_usd_approx,
      profileImage: undefined,
      roi: wallet.volume_usd > 0 ? (wallet.pnl_usd_approx / wallet.volume_usd) * 100 : 0,
      trades: wallet.trade_count,
      // Custom fields for seer score
      seerscore: wallet.seerscore,
      raw_seer_score: wallet.raw_seer_score,
      active_days: wallet.active_days,
    }));

    return NextResponse.json(
      {
        data,
        total,
        offset,
        limit,
      },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  } catch (error) {
    console.error("Error reading analyzed wallets:", error);
    return NextResponse.json(
      { error: "Failed to fetch analyzed wallets", details: error instanceof Error ? error.message : "Unknown error" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

