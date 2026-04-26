import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Camera,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Download,
  Filter,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Playback() {
  const { user } = useAuth();
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedTime, setSelectedTime] = useState<string>("00:00");
  const [playbackSpeed, setPlaybackSpeed] = useState<string>("1");
  const [filterType, setFilterType] = useState<"all" | "motion" | "continuous">(
    "all"
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(3600); // 1 hour default

  const { data: devices = [] } = trpc.devices.list.useQuery(undefined, {
    enabled: !!user,
  });

  const speedOptions = [
    { value: "0.125", label: "0.125x" },
    { value: "0.25", label: "0.25x" },
    { value: "0.5", label: "0.5x" },
    { value: "1", label: "1x (Normal)" },
    { value: "2", label: "2x" },
    { value: "4", label: "4x" },
    { value: "8", label: "8x" },
  ];

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="mb-6 bg-card border border-border rounded-lg p-4">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 mb-4">
          <Camera className="w-6 h-6 text-accent" />
          Reprodução (Playback)
        </h1>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Device Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Dispositivo
            </Label>
            <Select value={selectedDevice} onValueChange={setSelectedDevice}>
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue placeholder="Selecione um dispositivo" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {devices.map((device) => (
                  <SelectItem key={device.id} value={String(device.id)}>
                    {device.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Data</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-input border-border text-foreground"
            />
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Hora</Label>
            <Input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="bg-input border-border text-foreground"
            />
          </div>

          {/* Filter Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Filtro
            </Label>
            <Select
              value={filterType}
              onValueChange={(value: any) => setFilterType(value)}
            >
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">Todos os eventos</SelectItem>
                <SelectItem value="motion">Movimento</SelectItem>
                <SelectItem value="continuous">Gravação contínua</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Video Player */}
      <Card className="bg-card border-border mb-6 overflow-hidden">
        <div className="bg-gradient-to-br from-muted to-muted/50 w-full aspect-video flex items-center justify-center relative">
          <div className="text-center">
            <Camera className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">
              Visualização de reprodução de vídeo
            </p>
            <p className="text-sm text-muted-foreground/70 mt-2">
              {selectedDate} {selectedTime}
            </p>
          </div>

          {/* Recording Badge */}
          <Badge className="absolute top-4 left-4 bg-red-500/20 text-red-400 border-red-500/30">
            REC
          </Badge>
        </div>

        {/* Timeline */}
        <CardContent className="p-4 space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {formatTime(currentTime)}
              </span>
              <div className="flex-1 bg-muted rounded-full h-1 cursor-pointer relative group">
                <div
                  className="bg-accent h-1 rounded-full"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-accent rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: `${(currentTime / duration) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentTime(Math.max(0, currentTime - 60))}
              >
                <SkipBack className="w-4 h-4" />
              </Button>

              <Button
                size="sm"
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setCurrentTime(Math.min(duration, currentTime + 60))
                }
              >
                <SkipForward className="w-4 h-4" />
              </Button>

              <Button size="sm" variant="outline">
                <Volume2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {/* Speed Control */}
              <Select value={playbackSpeed} onValueChange={setPlaybackSpeed}>
                <SelectTrigger className="w-32 bg-input border-border text-foreground text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {speedOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button size="sm" variant="outline">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Filter className="w-5 h-5 text-accent" />
            Eventos Registrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { time: "14:30:45", type: "motion", duration: "00:02:15" },
              { time: "14:45:20", type: "motion", duration: "00:01:30" },
              { time: "15:00:00", type: "continuous", duration: "01:00:00" },
              { time: "16:15:30", type: "motion", duration: "00:00:45" },
            ].map((event, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                onClick={() => setSelectedTime(event.time)}
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={
                      event.type === "motion"
                        ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                    }
                  >
                    {event.type === "motion" ? "Movimento" : "Contínua"}
                  </Badge>
                  <span className="text-sm text-foreground font-mono">
                    {event.time}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {event.duration}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
