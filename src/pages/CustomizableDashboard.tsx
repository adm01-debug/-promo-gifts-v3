import { useState } from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, LayoutDashboard, TrendingUp, Users, ShoppingCart, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageSEO } from "@/components/seo/PageSEO";
import { UpcomingDatesWidget } from '@/components/dashboard/UpcomingDatesWidget';
import { QuickActionsPanel } from '@/components/dashboard/QuickActionsPanel';
import { RecentKitsWidget } from '@/components/dashboard/RecentKitsWidget';

interface DashboardWidget {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  colSpan?: number;
}

function SortableWidget({ widget }: { widget: DashboardWidget }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className={`relative ${widget.colSpan === 2 ? 'md:col-span-2' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {widget.icon}
          {widget.title}
        </CardTitle>
        <Button variant="ghost" size="sm" className="cursor-grab" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>{widget.content}</CardContent>
    </Card>
  );
}

export function CustomizableDashboard() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([
    {
      id: 'vendas',
      title: 'Vendas do Mês',
      icon: <TrendingUp className="h-4 w-4 text-green-500" />,
      content: <div className="text-2xl font-bold">R$ 45.231,89</div>,
    },
    {
      id: 'clientes',
      title: 'Clientes Ativos',
      icon: <Users className="h-4 w-4 text-blue-500" />,
      content: <div className="text-2xl font-bold">1.234</div>,
    },
    {
      id: 'pedidos',
      title: 'Pedidos Pendentes',
      icon: <ShoppingCart className="h-4 w-4 text-orange-500" />,
      content: <div className="text-2xl font-bold">23</div>,
    },
    {
      id: 'produtos',
      title: 'Produtos em Estoque',
      icon: <Package className="h-4 w-4 text-purple-500" />,
      content: <div className="text-2xl font-bold">5.678</div>,
    },
  ]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <MainLayout>
      <PageSEO title="Dashboard" description="Painel personalizado com métricas, ações rápidas e widgets." path="/dashboard" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <LayoutDashboard className="h-6 w-6" />
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Arraste os widgets para reorganizar seu dashboard
            </p>
          </div>
        </div>

        {/* Quick Actions & Metrics — Sempre no topo */}
        <QuickActionsPanel />

        {/* Widget de Próximas Datas Comemorativas */}
        <UpcomingDatesWidget variant="compact" daysAhead={60} maxItems={6} />

        {/* Kits Recentes */}
        <RecentKitsWidget />

        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={widgets.map(w => w.id)} strategy={verticalListSortingStrategy}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {widgets.map((widget) => (
                <SortableWidget key={widget.id} widget={widget} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </MainLayout>
  );
}

export default CustomizableDashboard;
