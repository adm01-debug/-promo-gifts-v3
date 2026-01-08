import { useState } from "react";
import { Trophy, Gift, Star, TrendingUp, Award, Zap, Crown, Target, ShoppingCart, CheckCircle } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface Reward {
  id: string;
  name: string;
  description: string;
  points: number;
  category: 'discount' | 'freebie' | 'service' | 'exclusive';
  image: string;
  available: boolean;
  stock?: number;
}

interface UserProgress {
  currentPoints: number;
  totalEarned: number;
  level: number;
  nextLevelPoints: number;
  badges: string[];
  recentActivity: Activity[];
}

interface Activity {
  id: string;
  type: 'earn' | 'redeem';
  points: number;
  description: string;
  date: string;
}

export default function RewardsStorePage() {
  const { toast } = useToast();
  
  const [userProgress] = useState<UserProgress>({
    currentPoints: 2450,
    totalEarned: 5800,
    level: 3,
    nextLevelPoints: 3000,
    badges: ['early-adopter', 'big-spender', 'referral-master'],
    recentActivity: [
      { id: '1', type: 'earn', points: 500, description: 'Compra de R$ 5.000', date: '2024-12-28' },
      { id: '2', type: 'earn', points: 200, description: 'Indicação de cliente', date: '2024-12-25' },
      { id: '3', type: 'redeem', points: -1000, description: 'Desconto 10%', date: '2024-12-20' },
    ],
  });

  const rewards: Reward[] = [
    {
      id: '1',
      name: 'Desconto 5%',
      description: 'Desconto de 5% em qualquer pedido',
      points: 500,
      category: 'discount',
      image: '💰',
      available: true,
    },
    {
      id: '2',
      name: 'Desconto 10%',
      description: 'Desconto de 10% em qualquer pedido',
      points: 1000,
      category: 'discount',
      image: '💎',
      available: true,
    },
    {
      id: '3',
      name: 'Brinde Exclusivo',
      description: 'Escolha um brinde premium do catálogo',
      points: 1500,
      category: 'freebie',
      image: '🎁',
      available: true,
      stock: 5,
    },
    {
      id: '4',
      name: 'Frete Grátis',
      description: 'Frete grátis para todo Brasil',
      points: 800,
      category: 'service',
      image: '🚚',
      available: true,
    },
    {
      id: '5',
      name: 'Design Personalizado',
      description: 'Arte exclusiva criada por designer',
      points: 2000,
      category: 'service',
      image: '🎨',
      available: true,
    },
    {
      id: '6',
      name: 'Acesso VIP',
      description: 'Acesso antecipado a novos produtos',
      points: 3000,
      category: 'exclusive',
      image: '👑',
      available: true,
      stock: 2,
    },
  ];

  const badges = [
    { id: 'early-adopter', name: 'Pioneiro', icon: '🌟', description: 'Um dos primeiros usuários' },
    { id: 'big-spender', name: 'Grande Cliente', icon: '💼', description: 'Mais de R$ 10.000 em compras' },
    { id: 'referral-master', name: 'Influenciador', icon: '📣', description: '10+ indicações bem-sucedidas' },
    { id: 'loyal', name: 'Fidelidade', icon: '❤️', description: '1 ano como cliente' },
    { id: 'fast-buyer', name: 'Rápido', icon: '⚡', description: '5 compras em 30 dias' },
  ];

  const handleRedeem = (reward: Reward) => {
    if (userProgress.currentPoints < reward.points) {
      toast({
        title: "Pontos insuficientes",
        description: `Você precisa de ${reward.points - userProgress.currentPoints} pontos a mais`,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Recompensa resgatada!",
      description: `${reward.name} foi adicionado à sua conta`,
    });
  };

  const progressToNextLevel = (userProgress.currentPoints / userProgress.nextLevelPoints) * 100;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold">
            Loja de Recompensas
          </h1>
          <p className="text-muted-foreground mt-1">
            Troque seus pontos por benefícios exclusivos
          </p>
        </div>

        {/* Stats do Usuário */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-interactive">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pontos Disponíveis</p>
                  <p className="text-3xl font-bold text-primary">{userProgress.currentPoints}</p>
                </div>
                <Star className="h-12 w-12 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-interactive">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Nível Atual</p>
                  <p className="text-3xl font-bold">{userProgress.level}</p>
                  <Progress value={progressToNextLevel} className="mt-2" />
                </div>
                <Trophy className="h-12 w-12 text-warning opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-interactive">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Ganho</p>
                  <p className="text-3xl font-bold">{userProgress.totalEarned}</p>
                </div>
                <TrendingUp className="h-12 w-12 text-success opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-interactive">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Badges</p>
                  <p className="text-3xl font-bold">{userProgress.badges.length}</p>
                </div>
                <Award className="h-12 w-12 text-secondary-foreground opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progresso para Próximo Nível */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Progresso para Nível {userProgress.level + 1}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Nível {userProgress.level}</span>
                <span className="font-semibold">
                  {userProgress.currentPoints} / {userProgress.nextLevelPoints} pontos
                </span>
                <span>Nível {userProgress.level + 1}</span>
              </div>
              <Progress value={progressToNextLevel} className="h-3" />
              <p className="text-sm text-muted-foreground">
                Faltam {userProgress.nextLevelPoints - userProgress.currentPoints} pontos para o próximo nível
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo Principal */}
        <Tabs defaultValue="rewards" className="space-y-4">
          <TabsList>
            <TabsTrigger value="rewards">
              <Gift className="h-4 w-4 mr-2" />
              Recompensas
            </TabsTrigger>
            <TabsTrigger value="badges">
              <Award className="h-4 w-4 mr-2" />
              Badges
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Zap className="h-4 w-4 mr-2" />
              Atividade
            </TabsTrigger>
          </TabsList>

          {/* Tab: Recompensas */}
          <TabsContent value="rewards" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rewards.map((reward) => (
                <Card key={reward.id} className="card-interactive">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="text-5xl">{reward.image}</div>
                      <Badge variant={reward.available ? "default" : "secondary"}>
                        {reward.points} pts
                      </Badge>
                    </div>

                    <div>
                      <h3 className="font-semibold text-lg">{reward.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {reward.description}
                      </p>
                    </div>

                    {reward.stock && (
                      <Badge variant="outline">
                        {reward.stock} disponíveis
                      </Badge>
                    )}

                    <Button
                      onClick={() => handleRedeem(reward)}
                      disabled={!reward.available || userProgress.currentPoints < reward.points}
                      className="w-full"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {userProgress.currentPoints >= reward.points ? 'Resgatar' : 'Pontos insuficientes'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Tab: Badges */}
          <TabsContent value="badges" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {badges.map((badge) => {
                const hasBadge = userProgress.badges.includes(badge.id);
                return (
                  <Card key={badge.id} className={hasBadge ? "card-interactive border-primary" : "opacity-50"}>
                    <CardContent className="p-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-4xl">{badge.icon}</div>
                        {hasBadge && (
                          <CheckCircle className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">{badge.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {badge.description}
                        </p>
                      </div>
                      <Badge variant={hasBadge ? "default" : "secondary"}>
                        {hasBadge ? 'Conquistado' : 'Bloqueado'}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Tab: Atividade */}
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Pontos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userProgress.recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          activity.type === 'earn' ? 'bg-success/10' : 'bg-destructive/10'
                        }`}>
                          {activity.type === 'earn' ? (
                            <TrendingUp className={`h-5 w-5 ${activity.type === 'earn' ? 'text-success' : 'text-destructive'}`} />
                          ) : (
                            <ShoppingCart className="h-5 w-5 text-destructive" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{activity.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(activity.date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <Badge variant={activity.type === 'earn' ? 'default' : 'destructive'}>
                        {activity.type === 'earn' ? '+' : ''}{activity.points} pts
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Como Ganhar Pontos */}
            <Card>
              <CardHeader>
                <CardTitle>Como Ganhar Pontos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="font-semibold">Fazer Compras</p>
                      <p className="text-sm text-muted-foreground">R$ 100 = 10 pontos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Star className="h-5 w-5 text-warning" />
                    <div className="flex-1">
                      <p className="font-semibold">Avaliar Produtos</p>
                      <p className="text-sm text-muted-foreground">50 pontos por avaliação</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Award className="h-5 w-5 text-success" />
                    <div className="flex-1">
                      <p className="font-semibold">Indicar Amigos</p>
                      <p className="text-sm text-muted-foreground">200 pontos por indicação</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Crown className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="font-semibold">Compra de Grande Volume</p>
                      <p className="text-sm text-muted-foreground">Bônus de 500 pontos acima de R$ 5.000</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
