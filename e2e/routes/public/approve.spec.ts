import { buildPublicTokenSuite } from "../_factories";

buildPublicTokenSuite({
  name: "/approve/:token (aprovação pública de orçamento)",
  buildPath: t => `/approve/${t}`,
  edgeFnName: "quote-public-react",
  successBody: { quote: { id: "q-1", number: "Q-001", total: 1000, items: [], status: "pending" } },
  notFoundCopy: /não encontrado|inválido|expirado/i,
});
