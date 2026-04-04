import { useState, useEffect } from "react";
import { useExternalDbInspect } from "@/hooks/useExternalDbInspect";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, RefreshCw, ChevronRight, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminExternalDbPage() {
  const { result, isLoading, listTables, describeTable } = useExternalDbInspect();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  useEffect(() => {
    listTables();
  }, []);

  const handleSelectTable = async (tableName: string) => {
    setSelectedTable(tableName);
    await describeTable(tableName);
  };

  const handleBack = () => {
    setSelectedTable(null);
    listTables();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Database className="h-6 w-6" />
            Inspeção do Banco Externo
          </h1>
          <p className="text-muted-foreground">Visualize a estrutura das tabelas do banco de dados externo (somente leitura)</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => selectedTable ? handleSelectTable(selectedTable) : listTables()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
        </Button>
      </div>

      {selectedTable ? (
        <>
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para lista
          </Button>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                {selectedTable}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : result?.table?.columns ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Coluna</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nullable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.table.columns.map((col, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-sm">{col.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{col.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={col.nullable ? "secondary" : "default"}>
                            {col.nullable ? "Sim" : "Não"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-8">Nenhuma informação disponível</p>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tabelas Disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : result?.tables?.length ? (
              <div className="divide-y">
                {result.tables.map((table) => (
                  <div
                    key={table.name}
                    className="flex items-center justify-between py-3 px-2 hover:bg-muted/50 rounded cursor-pointer transition-colors"
                    onClick={() => handleSelectTable(table.name)}
                  >
                    <div className="flex items-center gap-3">
                      <Database className="h-4 w-4 text-primary" />
                      <span className="font-mono text-sm">{table.name}</span>
                      {table.schema && (
                        <Badge variant="outline" className="text-xs">{table.schema}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {table.rowCount !== undefined && (
                        <span className="text-xs text-muted-foreground">{table.rowCount} rows</span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">Nenhuma tabela encontrada</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
