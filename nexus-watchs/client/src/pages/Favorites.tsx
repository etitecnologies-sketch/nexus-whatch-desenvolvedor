import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Star,
  Plus,
  Trash2,
  Edit2,
  Play,
  Store,
  Package,
  DollarSign,
  Warehouse,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

const FAVORITE_ICONS = {
  store: { icon: Store, label: "Loja" },
  package: { icon: Package, label: "Estoque" },
  cash: { icon: DollarSign, label: "Caixa" },
  warehouse: { icon: Warehouse, label: "Depósito" },
};

export default function Favorites() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [newFavoriteName, setNewFavoriteName] = useState("");
  const [newFavoriteIcon, setNewFavoriteIcon] = useState("store");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (location === "/favorites/add") {
      setIsDialogOpen(true);
    }
  }, [location]);

  const { data: favorites = [], isLoading } = trpc.favorites.list.useQuery(undefined, {
    enabled: !!user,
  });

  const createFavoriteMutation = trpc.favorites.create.useMutation({
    onSuccess: () => {
      toast.success("Grupo de favoritos criado");
      utils.favorites.list.invalidate();
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro ao criar grupo: ${error.message}`);
    },
  });

  const deleteFavoriteMutation = trpc.favorites.delete.useMutation({
    onSuccess: () => {
      toast.success("Grupo de favoritos removido");
      utils.favorites.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao remover grupo: ${error.message}`);
    },
  });

  const resetForm = () => {
    setNewFavoriteName("");
    setNewFavoriteIcon("store");
  };

  const handleCreateFavorite = async () => {
    if (!newFavoriteName.trim()) {
      toast.error("Nome do grupo é obrigatório");
      return;
    }

    try {
      await createFavoriteMutation.mutateAsync({
        name: newFavoriteName,
        icon: newFavoriteIcon,
        color: "bg-accent",
      });
    } catch (error) {
      // Handled in mutation
    }
  };

  const handleDeleteFavorite = async (id: number) => {
    if (confirm("Deseja realmente remover este grupo?")) {
      try {
        await deleteFavoriteMutation.mutateAsync({ id });
      } catch (error) {
        // Handled in mutation
      }
    }
  };

  const FavoriteForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-foreground">Nome do Grupo</Label>
        <Input
          placeholder="Ex: Loja, Estoque, Caixa"
          value={newFavoriteName}
          onChange={(e) => setNewFavoriteName(e.target.value)}
          className="bg-input border-border text-foreground"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-foreground">Ícone</Label>
        <Select value={newFavoriteIcon} onValueChange={setNewFavoriteIcon}>
          <SelectTrigger className="bg-input border-border text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {Object.entries(FAVORITE_ICONS).map(([key, value]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <value.icon className="w-4 h-4" />
                  {value.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={handleCreateFavorite}
        disabled={createFavoriteMutation.isPending}
        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
      >
        {createFavoriteMutation.isPending ? "Criando..." : "Criar Grupo"}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="mb-6 bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Star className="w-6 h-6 text-accent" />
            Grupos de Favoritos
          </h1>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Novo Grupo
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  Criar Novo Grupo de Favoritos
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Organize suas câmeras em grupos para acesso rápido
                </DialogDescription>
              </DialogHeader>
              <FavoriteForm />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Favorites Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Star className="w-8 h-8 text-accent animate-spin" />
        </div>
      ) : favorites.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-4">
              Nenhum grupo de favoritos criado
            </p>
            <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
              Criar Primeiro Grupo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((favorite) => {
            const iconData = FAVORITE_ICONS[favorite.icon as keyof typeof FAVORITE_ICONS];
            const IconComponent = iconData?.icon || Star;

            return (
              <Card
                key={favorite.id}
                className="bg-card border-border hover:border-accent/50 transition-colors cursor-pointer group"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-accent/10 rounded-lg text-accent group-hover:bg-accent/20 transition-colors">
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div>
                        <CardTitle className="text-foreground">
                          {favorite.name}
                        </CardTitle>
                        {favorite.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {favorite.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Visualizar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="px-2"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="px-2 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFavorite(favorite.id);
                      }}
                      disabled={deleteFavoriteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
