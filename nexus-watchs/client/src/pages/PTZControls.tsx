import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  Save,
  Trash2,
  Crosshair,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

export default function PTZControls() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [presetName, setPresetName] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1);

  const { data: devices = [], isLoading: loadingDevices } = trpc.devices.list.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: presets = [], isLoading: loadingPresets } = trpc.ptz.listPresets.useQuery(
    { cameraId: selectedDevice ? parseInt(selectedDevice) : 0 },
    {
      enabled: !!user && !!selectedDevice,
    }
  );

  const createPresetMutation = trpc.ptz.createPreset.useMutation({
    onSuccess: () => {
      toast.success("Preset salvo com sucesso");
      utils.ptz.listPresets.invalidate();
      setPresetName("");
    },
    onError: (error) => {
      toast.error(`Erro ao salvar preset: ${error.message}`);
    },
  });

  const deletePresetMutation = trpc.ptz.deletePreset.useMutation({
    onSuccess: () => {
      toast.success("Preset removido");
      utils.ptz.listPresets.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao remover preset: ${error.message}`);
    },
  });

  const moveMutation = trpc.ptz.move.useMutation({
    onError: (error) => {
      toast.error(`Erro ao mover câmera: ${error.message}`);
    },
  });

  const handleSavePreset = async () => {
    if (!presetName.trim() || !selectedDevice) {
      toast.error("Nome do preset e câmera são obrigatórios");
      return;
    }

    try {
      await createPresetMutation.mutateAsync({
        cameraId: parseInt(selectedDevice),
        name: presetName,
        panPosition: 0,
        tiltPosition: 0,
        zoomLevel: zoomLevel,
      });
    } catch (error) {
      // Handled in mutation
    }
  };

  const handleDeletePreset = async (id: number) => {
    if (confirm("Deseja realmente remover este preset?")) {
      try {
        await deletePresetMutation.mutateAsync({ id });
      } catch (error) {
        // Handled in mutation
      }
    }
  };

  const handleMovement = async (direction: "up" | "down" | "left" | "right" | "zoomIn" | "zoomOut") => {
    if (!selectedDevice) {
      toast.error("Selecione uma câmera primeiro");
      return;
    }

    try {
      await moveMutation.mutateAsync({
        cameraId: parseInt(selectedDevice),
        direction,
        speed: 1,
      });
    } catch (error) {
      // Handled in mutation
    }
  };

  const handleZoom = (type: "in" | "out") => {
    if (type === "in") {
      const newZoom = Math.min(10, zoomLevel + 0.1);
      setZoomLevel(newZoom);
      handleMovement("zoomIn");
    } else {
      const newZoom = Math.max(1, zoomLevel - 0.1);
      setZoomLevel(newZoom);
      handleMovement("zoomOut");
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2 mb-4">
          <Crosshair className="w-8 h-8 text-accent" />
          Controles PTZ
        </h1>
        <p className="text-muted-foreground">
          Controle câmeras móveis com pan, tilt, zoom e presets
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device Selection */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Selecionar Câmera</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                <SelectTrigger className="bg-input border-border text-foreground">
                  <SelectValue placeholder="Selecione uma câmera PTZ" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {loadingDevices ? (
                    <div className="p-2 text-center text-muted-foreground">Carregando...</div>
                  ) : devices.length === 0 ? (
                    <div className="p-2 text-center text-muted-foreground">Nenhuma câmera encontrada</div>
                  ) : (
                    devices.map((device) => (
                      <SelectItem key={device.id} value={String(device.id)}>
                        {device.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedDevice && (
            <>
              {/* PTZ Controls */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">
                    Controles de Movimento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Pan/Tilt Joystick */}
                    <div className="flex flex-col items-center gap-4">
                      <div className="bg-muted rounded-lg p-8 w-full max-w-xs">
                        <div className="grid grid-cols-3 gap-2">
                          {/* Top */}
                          <div />
                          <Button
                            size="lg"
                            variant="outline"
                            className="h-16"
                            onClick={() => handleMovement("up")}
                            disabled={moveMutation.isPending}
                          >
                            <ArrowUp className="w-6 h-6" />
                          </Button>
                          <div />

                          {/* Left, Center, Right */}
                          <Button
                            size="lg"
                            variant="outline"
                            className="h-16"
                            onClick={() => handleMovement("left")}
                            disabled={moveMutation.isPending}
                          >
                            <ArrowLeft className="w-6 h-6" />
                          </Button>
                          <Button
                            size="lg"
                            variant="outline"
                            className="h-16 bg-accent/10"
                            disabled
                          >
                            <Crosshair className="w-6 h-6 text-accent" />
                          </Button>
                          <Button
                            size="lg"
                            variant="outline"
                            className="h-16"
                            onClick={() => handleMovement("right")}
                            disabled={moveMutation.isPending}
                          >
                            <ArrowRight className="w-6 h-6" />
                          </Button>

                          {/* Bottom */}
                          <div />
                          <Button
                            size="lg"
                            variant="outline"
                            className="h-16"
                            onClick={() => handleMovement("down")}
                            disabled={moveMutation.isPending}
                          >
                            <ArrowDown className="w-6 h-6" />
                          </Button>
                          <div />
                        </div>
                      </div>
                    </div>

                    {/* Zoom Control */}
                    <div className="space-y-3">
                      <Label className="text-foreground">Zoom</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleZoom("out")}
                          disabled={moveMutation.isPending}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <div className="flex-1 bg-muted rounded-lg p-3 text-center">
                          <p className="text-sm font-mono text-foreground">
                            {zoomLevel.toFixed(1)}x
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleZoom("in")}
                          disabled={moveMutation.isPending}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Save Preset */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">
                    Salvar Posição Atual
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-foreground">Nome da Posição</Label>
                    <Input
                      placeholder="Ex: Entrada, Caixa, Estoque"
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      className="bg-input border-border text-foreground"
                    />
                  </div>
                  <Button
                    onClick={handleSavePreset}
                    disabled={createPresetMutation.isPending}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    {createPresetMutation.isPending ? (
                      "Salvando..."
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Preset
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Presets Sidebar */}
        <div>
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Presets Salvos</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDevice ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Selecione uma câmera para ver os presets
                </p>
              ) : loadingPresets ? (
                <div className="flex justify-center py-4">
                  <Crosshair className="w-6 h-6 text-accent animate-spin" />
                </div>
              ) : presets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum preset salvo
                </p>
              ) : (
                <div className="space-y-2">
                  {presets.map((preset: any) => (
                    <div
                      key={preset.id}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors group"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {preset.name}
                        </p>
                        {preset.zoomLevel && (
                          <p className="text-xs text-muted-foreground">
                            Zoom: {preset.zoomLevel.toFixed(1)}x
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeletePreset(preset.id)}
                        disabled={deletePresetMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info */}
          <Card className="bg-card border-border mt-4">
            <CardHeader>
              <CardTitle className="text-sm text-foreground">Dicas</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>
                • Use os controles direcionais para mover a câmera
              </p>
              <p>
                • Ajuste o zoom com os botões + e -
              </p>
              <p>
                • Salve posições frequentes como presets
              </p>
              <p>
                • Clique em um preset para retornar à posição salva
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
