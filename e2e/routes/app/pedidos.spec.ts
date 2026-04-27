import { buildAuthedRouteSuite } from "../_factories";
buildAuthedRouteSuite({ name: "/pedidos", path: "/pedidos", primary: { kind: "rest", key: "orders", successBody: [] } });
