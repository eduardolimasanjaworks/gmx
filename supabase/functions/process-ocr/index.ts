import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, documentType } = await req.json();

    console.log("Processing OCR for:", { imageUrl, documentType });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use Lovable AI with vision capabilities
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Prepare prompt based on document type
    let systemPrompt = "";
    if (documentType === "delivery_receipt") {
      systemPrompt = `Extract the following information from this delivery receipt (canhoto de entrega) image:
      - delivery_date: Date of delivery (YYYY-MM-DD format)
      - delivery_time: Time of delivery (HH:MM format)
      - receiver_name: Name of the person who received the delivery
      - receiver_signature: Description of signature if present
      - observations: Any additional notes or observations
      
      Return ONLY a valid JSON object with these fields.`;
    } else if (documentType === "driver_document") {
      systemPrompt = `Extract the following information from this Brazilian identification document image:
      - document_number: The document number
      - issue_date: Date of issue (YYYY-MM-DD format)
      - expiry_date: Expiration date if applicable (YYYY-MM-DD format)
      - issuing_agency: Issuing agency or organization
      
      Return ONLY a valid JSON object with these fields.`;
    } else {
      throw new Error("Invalid document type");
    }

    // Call Lovable AI with vision
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: systemPrompt },
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("AI processing failed");
    }

    const aiData = await aiResponse.json();
    const extractedText = aiData.choices?.[0]?.message?.content;

    console.log("AI extracted text:", extractedText);

    // Parse the JSON response
    let extractedData;
    try {
      extractedData = JSON.parse(extractedText);
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", extractedText);
      throw new Error("Invalid OCR response format");
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData,
        raw_ocr: extractedText,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in process-ocr function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
