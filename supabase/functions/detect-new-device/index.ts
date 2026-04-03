import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

// CORS headers are now dynamic — use getCorsHeaders(req) inside the handler
// See _shared/cors.ts for the centralized configuration

interface DeviceInfo {
  fingerprint: string;
  userAgent: string;
  browserName: string;
  osName: string;
  deviceType: string;
}

interface RequestBody {
  userId: string;
  userEmail: string;
  deviceInfo: DeviceInfo;
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get client IP from headers
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";

    const { userId, userEmail, deviceInfo }: RequestBody = await req.json();

    if (!userId || !deviceInfo?.fingerprint) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Checking device for user ${userId}, IP: ${clientIP}, fingerprint: ${deviceInfo.fingerprint}`);

    // Check if device is already known
    const { data: existingDevice, error: fetchError } = await supabase
      .from("user_known_devices")
      .select("*")
      .eq("user_id", userId)
      .eq("device_fingerprint", deviceInfo.fingerprint)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching device:", fetchError);
      throw fetchError;
    }

    let isNewDevice = false;
    let isNewIP = false;
    let deviceId: string | null = null;

    if (existingDevice) {
      // Device exists, update last seen and check if IP changed
      isNewIP = existingDevice.ip_address !== clientIP;
      deviceId = existingDevice.id;

      await supabase
        .from("user_known_devices")
        .update({
          last_seen_at: new Date().toISOString(),
          ip_address: clientIP,
          user_agent: deviceInfo.userAgent,
        })
        .eq("id", existingDevice.id);

      console.log(`Known device updated. IP changed: ${isNewIP}`);
    } else {
      // New device detected
      isNewDevice = true;

      const { data: newDevice, error: insertError } = await supabase
        .from("user_known_devices")
        .insert({
          user_id: userId,
          device_fingerprint: deviceInfo.fingerprint,
          ip_address: clientIP,
          user_agent: deviceInfo.userAgent,
          browser_name: deviceInfo.browserName,
          os_name: deviceInfo.osName,
          device_type: deviceInfo.deviceType,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error inserting device:", insertError);
        throw insertError;
      }

      deviceId = newDevice.id;
      console.log(`New device registered: ${deviceId}`);
    }

    // If new device or new IP, create notification and optionally send email
    if (isNewDevice || isNewIP) {
      // Create notification record
      await supabase
        .from("device_login_notifications")
        .insert({
          user_id: userId,
          device_id: deviceId,
          ip_address: clientIP,
          user_agent: deviceInfo.userAgent,
          email_sent: false,
        });

      // Create in-app notification
      await supabase
        .from("workspace_notifications")
        .insert({
          user_id: userId,
          type: "security",
          title: isNewDevice ? "Novo dispositivo detectado" : "Novo IP detectado",
          message: isNewDevice 
            ? `Login detectado de um novo dispositivo: ${deviceInfo.browserName} no ${deviceInfo.osName}`
            : `Login detectado de um novo endereço IP: ${clientIP}`,
          metadata: {
            device_fingerprint: deviceInfo.fingerprint,
            ip_address: clientIP,
            browser: deviceInfo.browserName,
            os: deviceInfo.osName,
            device_type: deviceInfo.deviceType,
          },
        });

      console.log(`Security notification created for user ${userId}`);

      // TODO: Send email notification using Resend when RESEND_API_KEY is configured
      // For now, we log the intent
      console.log(`Email notification would be sent to ${userEmail} for ${isNewDevice ? 'new device' : 'new IP'}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        isNewDevice,
        isNewIP,
        deviceId,
        message: isNewDevice 
          ? "New device detected and registered" 
          : isNewIP 
            ? "Known device with new IP detected" 
            : "Known device",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in detect-new-device:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
