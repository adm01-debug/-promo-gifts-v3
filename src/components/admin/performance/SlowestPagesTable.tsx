/**
 * SlowestPagesTable — Top URLs ranked by p75 of LCP/INP/CLS.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatVital, rateValue, ratingClasses } from "./vitals-thresholds";
import type { VitalsSlowestPage } from "@/hooks/useWebVitalsSummary";

interface Props {
  pages: VitalsSlowestPage[];
}

export function SlowestPagesTable({ pages }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-display">Páginas mais lentas (p75)</CardTitle>
      </CardHeader>
      <CardContent>
        {pages.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Sem dados suficientes (mínimo 3 amostras por página).</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Página</TableHead>
                <TableHead className="text-xs">Métrica</TableHead>
                <TableHead className="text-xs text-right">p75</TableHead>
                <TableHead className="text-xs text-right">Amostras</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((p, i) => {
                const rating = rateValue(p.metric_name, p.p75);
                const cls = ratingClasses(rating);
                return (
                  <TableRow key={`${p.page_url}-${p.metric_name}-${i}`}>
                    <TableCell className="font-mono text-xs max-w-[300px] truncate" title={p.page_url}>
                      {p.page_url || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{p.metric_name}</Badge>
                    </TableCell>
                    <TableCell className={`text-right font-semibold text-xs ${cls.text}`}>
                      {formatVital(p.metric_name, p.p75)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{p.samples}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
