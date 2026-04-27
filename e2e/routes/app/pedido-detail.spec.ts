import { buildAuthedRouteSuite } from "../_factories";
import { SAMPLE_ID } from "../_catalog";
buildAuthedRouteSuite({
  name: "/pedidos/:id",
  path: `/pedidos/${SAMPLE_ID}`,
  primary: { kind: "rest", key: "orders", successBody: { id: SAMPLE_ID, items: [] } },
});
