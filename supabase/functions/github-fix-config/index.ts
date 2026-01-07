import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GITHUB_TOKEN = Deno.env.get('GITHUB_PAT');
    const REPO = "adm01-debug/gifts-store";
    
    if (!GITHUB_TOKEN) {
      throw new Error('GITHUB_PAT not configured');
    }

    const headers = {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };

    const results: any[] = [];

    // 1. Fix tsconfig.node.json
    const tsconfigNodeContent = {
      "compilerOptions": {
        "composite": true,
        "target": "ES2022",
        "lib": ["ES2023"],
        "module": "ESNext",
        "skipLibCheck": true,
        "moduleResolution": "bundler",
        "allowImportingTsExtensions": true,
        "isolatedModules": true,
        "moduleDetection": "force",
        "strict": true,
        "noUnusedLocals": false,
        "noUnusedParameters": false,
        "noFallthroughCasesInSwitch": true
      },
      "include": ["vite.config.ts"]
    };

    // Get current SHA for tsconfig.node.json
    const tsconfigNodeRes = await fetch(
      `https://api.github.com/repos/${REPO}/contents/tsconfig.node.json`,
      { headers }
    );
    const tsconfigNodeData = await tsconfigNodeRes.json();
    
    // Update tsconfig.node.json
    const tsconfigNodeUpdate = await fetch(
      `https://api.github.com/repos/${REPO}/contents/tsconfig.node.json`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: "fix: add composite:true and remove noEmit from tsconfig.node.json",
          content: btoa(JSON.stringify(tsconfigNodeContent, null, 2)),
          sha: tsconfigNodeData.sha
        })
      }
    );
    results.push({
      file: 'tsconfig.node.json',
      status: tsconfigNodeUpdate.status,
      response: await tsconfigNodeUpdate.json()
    });

    // 2. Fix package.json - add build:dev script
    const packageRes = await fetch(
      `https://api.github.com/repos/${REPO}/contents/package.json`,
      { headers }
    );
    const packageData = await packageRes.json();
    
    // Decode current package.json
    const currentPackageContent = JSON.parse(atob(packageData.content));
    
    // Add build:dev script if not exists
    if (!currentPackageContent.scripts['build:dev']) {
      currentPackageContent.scripts['build:dev'] = 'vite build --mode development';
      
      const packageUpdate = await fetch(
        `https://api.github.com/repos/${REPO}/contents/package.json`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            message: "fix: add build:dev script to package.json",
            content: btoa(JSON.stringify(currentPackageContent, null, 2)),
            sha: packageData.sha
          })
        }
      );
      results.push({
        file: 'package.json',
        status: packageUpdate.status,
        response: await packageUpdate.json()
      });
    } else {
      results.push({
        file: 'package.json',
        status: 200,
        response: { message: 'build:dev already exists' }
      });
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
