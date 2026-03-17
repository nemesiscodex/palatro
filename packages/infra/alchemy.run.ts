import alchemy from "alchemy";
import { TanStackStart } from "alchemy/cloudflare";
import { config } from "dotenv";

config({ path: "./.env.prod" });
config({ path: "../../apps/web/.env.prod" });

const app = await alchemy("palatro");

export const web = await TanStackStart("web", {
  cwd: "../../apps/web",
  bindings: {
    VITE_CONVEX_URL: alchemy.env.VITE_CONVEX_URL!,
    VITE_CONVEX_SITE_URL: alchemy.env.VITE_CONVEX_SITE_URL!,
  },
});

console.log(`Web    -> ${web.url}`);

await app.finalize();
