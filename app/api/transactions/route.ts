import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/db/client";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured. Add your API keys to .env.local" }, { status: 500 });
  }

  try {
    let csvText = "";
    const contentType = req.headers.get("content-type") || "";
    
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      if (file) {
        csvText = await file.text();
      }
    } else {
      csvText = await req.text();
    }
    
    if (!csvText) {
      return NextResponse.json({ error: "No CSV data provided" }, { status: 400 });
    }

    // Parse CSV manually
    const lines = csvText.trim().split("\n");
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    
    const transactions = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",");
      const transaction: any = { user_id: userId, source: "csv" };
      
      for (let j = 0; j < headers.length; j++) {
        const key = headers[j];
        let value = values[j]?.trim();
        
        if (key === "date") transaction.date = value;
        else if (key === "description") transaction.description = value;
        else if (key === "amount") transaction.amount = Math.abs(parseFloat(value)) || 0;
        else if (key === "category") transaction.category = value;
        else if (key === "merchant") transaction.merchant = value;
      }
      
      if (!transaction.date) transaction.date = new Date().toISOString().split("T")[0];
      if (!transaction.description) transaction.description = "Unknown";
      if (!transaction.category) transaction.category = "Other";
      if (transaction.amount === undefined) transaction.amount = 0;
      
      transactions.push(transaction);
    }

    if (transactions.length === 0) {
      return NextResponse.json({ error: "No valid transactions found" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("transactions").insert(transactions);
    
    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `✅ Imported ${transactions.length} transactions` 
    });
    
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "Failed to import CSV" }, { status: 500 });
  }
}