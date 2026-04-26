import { buildPublicTokenSuite } from "../_factories";

buildPublicTokenSuite({
  name: "/lista-publica/:token (favoritos público)",
  buildPath: t => `/lista-publica/${t}`,
  edgeFnName: "favorites-public-react",
  successBody: { list: { name: "Lista", items: [] }, owner: "vendedor@x.com" },
});
