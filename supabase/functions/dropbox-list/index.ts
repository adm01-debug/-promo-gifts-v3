import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
/// <reference lib="deno.ns" />
/**
 * Edge Function: dropbox-list
 * Lista arquivos e pastas do Dropbox
 */


// CORS headers are now dynamic — use getCorsHeaders(req) inside the handler
// See _shared/cors.ts for the centralized configuration

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { path = "", action = "list" } = await req.json();

    const accessToken = Deno.env.get("DROPBOX_ACCESS_TOKEN");

    // Check if Dropbox is configured
    if (action === "check") {
      return new Response(
        JSON.stringify({
          connected: !!accessToken,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!accessToken) {
      return new Response(
        JSON.stringify({
          error: "DROPBOX_ACCESS_TOKEN não configurado",
          entries: [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // List files from Dropbox
    const dropboxResponse = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: path || "",
        recursive: false,
        include_media_info: true,
        include_deleted: false,
        include_has_explicit_shared_members: false,
        include_mounted_folders: true,
        include_non_downloadable_files: false,
      }),
    });

    if (!dropboxResponse.ok) {
      const errorData = await dropboxResponse.json();
      console.error("Dropbox API error:", errorData);
      throw new Error(errorData.error_summary || "Erro na API do Dropbox");
    }

    const data = await dropboxResponse.json();

    // Get thumbnails for images
    const entriesWithThumbnails = await Promise.all(
      data.entries.map(async (entry: any) => {
        if (entry[".tag"] === "file" && /\.(jpg|jpeg|png|gif)$/i.test(entry.name)) {
          try {
            // Get thumbnail
            const thumbnailResponse = await fetch(
              "https://content.dropboxapi.com/2/files/get_thumbnail_v2",
              {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${accessToken}`,
                  "Dropbox-API-Arg": JSON.stringify({
                    resource: { ".tag": "path", path: entry.path_lower },
                    format: "jpeg",
                    size: "w128h128",
                    mode: "strict",
                  }),
                },
              }
            );

            if (thumbnailResponse.ok) {
              const blob = await thumbnailResponse.blob();
              const base64 = await blobToBase64(blob);
              return {
                ...entry,
                thumbnail_url: `data:image/jpeg;base64,${base64}`,
              };
            }
          } catch (err) {
            console.error("Error getting thumbnail:", err);
          }
        }
        return entry;
      })
    );

    return new Response(
      JSON.stringify({
        entries: entriesWithThumbnails,
        cursor: data.cursor,
        has_more: data.has_more,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in dropbox-list:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Erro interno",
        entries: [],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

// Helper to convert blob to base64
async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
