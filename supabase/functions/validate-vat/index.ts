import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const countryMap: Record<string, string> = {
  BE: "Belgique", FR: "France", DE: "Allemagne", NL: "Pays-Bas",
  LU: "Luxembourg", ES: "Espagne", IT: "Italie", PT: "Portugal",
  AT: "Autriche", IE: "Irlande", CH: "Suisse", GB: "Royaume-Uni",
  PL: "Pologne", SE: "Suède", DK: "Danemark", FI: "Finlande",
  GR: "Grèce", EL: "Grèce", RO: "Roumanie", CZ: "République tchèque",
  HU: "Hongrie",
};

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<(?:[^:]+:)?${tag}>([\\s\\S]*?)<\\/(?:[^:]+:)?${tag}>`);
  const m = xml.match(re);
  return m ? m[1].trim() : "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vatNumber } = await req.json();

    if (!vatNumber || typeof vatNumber !== "string") {
      return new Response(JSON.stringify({ valid: false, error: "Numéro de TVA requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleaned = vatNumber.replace(/[\s.\-]/g, "").toUpperCase();
    const countryCode = cleaned.substring(0, 2);
    const number = cleaned.substring(2);

    if (!/^[A-Z]{2}$/.test(countryCode) || !number) {
      return new Response(JSON.stringify({ valid: false, error: "Format invalide. Utilisez le format: BE0123456789" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Validating VAT: ${countryCode} ${number}`);

    const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
  <soapenv:Header/>
  <soapenv:Body>
    <urn:checkVat>
      <urn:countryCode>${countryCode}</urn:countryCode>
      <urn:vatNumber>${number}</urn:vatNumber>
    </urn:checkVat>
  </soapenv:Body>
</soapenv:Envelope>`;

    let xml = "";
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const soapRes = await fetch("https://ec.europa.eu/taxation_customs/vies/services/checkVatService", {
        method: "POST",
        headers: { "Content-Type": "text/xml; charset=utf-8", "SOAPAction": "" },
        body: soapBody,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      xml = await soapRes.text();
      console.log("SOAP status:", soapRes.status, "response length:", xml.length);
    } catch (fetchErr) {
      console.error("SOAP fetch error:", fetchErr);
      // Check for VIES unavailability - return specific error
      return new Response(JSON.stringify({ valid: false, error: "Le service VIES est temporairement indisponible. Réessayez dans quelques secondes." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for SOAP fault
    if (xml.includes("MS_UNAVAILABLE") || xml.includes("MS_MAX_CONCURRENT_REQ") || xml.includes("Fault")) {
      console.log("VIES service busy or unavailable");
      return new Response(JSON.stringify({ valid: false, error: "Le service VIES est surchargé. Réessayez dans quelques secondes." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const valid = extractTag(xml, "valid") === "true";
    const name = extractTag(xml, "name").replace(/---/g, "").trim();
    const rawAddress = extractTag(xml, "address").replace(/---/g, "").trim();

    console.log("Result:", { valid, name, rawAddress });

    let city = "";
    let addressLine = "";
    if (rawAddress) {
      const lines = rawAddress.split("\n").map((l: string) => l.trim()).filter(Boolean);
      if (lines.length >= 2) {
        addressLine = lines.slice(0, -1).join(", ");
        const cityLine = lines[lines.length - 1];
        const cityMatch = cityLine.match(/\d{4,5}\s+(.+)/);
        city = cityMatch ? cityMatch[1] : cityLine;
      } else if (lines.length === 1) {
        addressLine = lines[0];
      }
    }

    const country = countryMap[countryCode] || "";

    return new Response(JSON.stringify({
      valid,
      name,
      address: addressLine,
      city,
      country,
      countryCode,
      rawAddress,
      vatNumber: cleaned,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("VAT validation error:", error);
    return new Response(JSON.stringify({ valid: false, error: "Erreur lors de la vérification" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
