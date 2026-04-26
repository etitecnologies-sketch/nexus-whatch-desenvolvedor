import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Grid2x2, 
  Grid3x3, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX,
  Camera,
  Download,
  Maximize,
  RefreshCw,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { VideoPlayer } from "@/components/VideoPlayer";

interface CameraStreamProps {
  deviceId: number;
  channel: number;
  streamType: "main" | "sub";
  deviceName: string;
  cameraName: string;
  status: string;
}

const CameraStream = ({ deviceId, channel, streamType, deviceName, cameraName, status }: CameraStreamProps) => { 
   const { data: streamInfo, isLoading, error, refetch } = trpc.devices.getStreamUrl.useQuery({ 
     deviceId, 
     channel, 
     streamType 
   }, { 
     enabled: status === "online", 
     refetchOnWindowFocus: false, 
     retry: 1 
   }); 
 
   if (status !== "online") { 
     return ( 
       <div className="flex flex-col items-center justify-center h-full bg-muted/20 text-muted-foreground p-4 text-center"> 
         <AlertCircle className="w-8 h-8 mb-2 opacity-50" /> 
         <p className="text-xs font-medium">Dispositivo Offline</p> 
         <p className="text-[10px] opacity-70">{deviceName}</p> 
       </div> 
     ); 
   } 
 
   if (isLoading) { 
     return ( 
       <div className="flex flex-col items-center justify-center h-full bg-muted/10 text-muted-foreground animate-pulse"> 
         <RefreshCw className="w-6 h-6 mb-2 animate-spin opacity-50" /> 
         <p className="text-[10px]">Verificando dispositivo...</p> 
       </div> 
     ); 
   } 
 
   // Se tem P2P URL (Intelbras P2P), mostra player P2P 
   if (streamInfo?.p2pUrl) { 
     return ( 
       <div className="relative w-full h-full bg-black flex flex-col items-center justify-center gap-3"> 
         <Camera className="w-10 h-10 text-accent opacity-60" /> 
         <p className="text-xs text-muted-foreground text-center px-4"> 
           Câmera P2P — Acesse o portal Intelbras para visualizar ao vivo 
         </p> 
         <Button 
           size="sm" 
           className="bg-accent hover:bg-accent/90 text-white text-xs" 
           onClick={() => window.open("https://remotizze.intelbras.com.br", "_blank")} 
         > 
           <ExternalLink className="w-3 h-3 mr-1" /> 
           Abrir Portal Intelbras 
         </Button> 
         <div className="absolute top-2 right-2 flex gap-1"> 
           <Button 
             size="sm" 
             variant="outline" 
             className="h-6 bg-black/40 text-[10px] text-white border-none backdrop-blur-md hover:bg-black/60" 
             onClick={(e) => { 
               e.stopPropagation(); 
               window.open("https://remotizze.intelbras.com.br", "_blank"); 
             }} 
           > 
             <ExternalLink className="w-3 h-3 mr-1" /> 
             P2P Cloud 
           </Button> 
           <Badge variant="outline" className="bg-black/40 text-[10px] text-white border-none backdrop-blur-md"> 
             {streamType.toUpperCase()} 
           </Badge> 
         </div> 
       </div> 
     ); 
   } 
 
   // Se tem webStreamUrl (HLS via MediaMTX), mostra player de vídeo 
   if (streamInfo?.webStreamUrl) { 
     return ( 
       <div className="relative w-full h-full bg-black"> 
         <VideoPlayer 
           src={streamInfo.webStreamUrl} 
           className="w-full h-full" 
           autoplay={true} 
           controls={false} 
         /> 
         <div className="absolute top-2 right-2"> 
           <Badge variant="outline" className="bg-black/40 text-[10px] text-white border-none backdrop-blur-md"> 
             {streamType.toUpperCase()} 
           </Badge> 
         </div> 
       </div> 
     ); 
   } 
 
   // Fallback de erro 
   return ( 
     <div className="flex flex-col items-center justify-center h-full bg-destructive/5 text-destructive p-4 text-center"> 
       <AlertCircle className="w-6 h-6 mb-2" /> 
       <p className="text-[10px] font-medium">Stream não disponível</p> 
       <Button variant="ghost" size="sm" className="mt-2 h-7 text-[10px]" onClick={() => refetch()}> 
         Tentar Novamente 
       </Button> 
     </div> 
   ); 
 };

export default function LiveView() {
  const { user } = useAuth();
  const [layout, setLayout] = useState<"1" | "4" | "9" | "16">("4");
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [quality, setQuality] = useState<"sd" | "hd">("hd");
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data: devices = [] } = trpc.devices.list.useQuery(undefined, {
    enabled: !!user,
  });

  const allCameras = devices.flatMap((device) => 
    Array.from({ length: 4 }, (_, i) => ({
      id: `${device.id}-${i}`,
      deviceId: device.id,
      deviceName: device.name,
      name: `Câmera ${i + 1}`,
      channelNumber: i + 1,
      status: device.status,
    }))
  );

  const getGridClass = () => {
    switch (layout) {
      case "1":
        return "grid-cols-1 grid-rows-1";
      case "4":
        return "grid-cols-2 grid-rows-2";
      case "9":
        return "grid-cols-3 grid-rows-3";
      case "16":
        return "grid-cols-4 grid-rows-4";
      default:
        return "grid-cols-2 grid-rows-2";
    }
  };

  const displayCameras = allCameras.slice(0, parseInt(layout));

  return (
    <div className={`min-h-screen bg-background ${isFullscreen ? "p-0" : "p-4"}`}>
      {/* Header */}
      {!isFullscreen && (
        <div className="mb-4 bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Camera className="w-6 h-6 text-accent" />
              Visualização ao Vivo
            </h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(true)}
            >
              <Maximize className="w-4 h-4" />
            </Button>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Layout Selection */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Layout:
              </span>
              <div className="flex gap-2">
                <Button
                  variant={layout === "1" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLayout("1")}
                  className={layout === "1" ? "bg-accent text-accent-foreground" : ""}
                >
                  1
                </Button>
                <Button
                  variant={layout === "4" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLayout("4")}
                  className={layout === "4" ? "bg-accent text-accent-foreground" : ""}
                >
                  <Grid2x2 className="w-4 h-4" />
                </Button>
                <Button
                  variant={layout === "9" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLayout("9")}
                  className={layout === "9" ? "bg-accent text-accent-foreground" : ""}
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={layout === "16" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLayout("16")}
                  className={layout === "16" ? "bg-accent text-accent-foreground" : ""}
                >
                  16
                </Button>
              </div>
            </div>

            {/* Quality and Audio */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Qualidade:
                </span>
                <Badge
                  variant={quality === "hd" ? "default" : "outline"}
                  className={quality === "hd" ? "bg-accent text-accent-foreground" : ""}
                  onClick={() => setQuality("hd")}
                >
                  HD
                </Badge>
                <Badge
                  variant={quality === "sd" ? "default" : "outline"}
                  className={quality === "sd" ? "bg-accent text-accent-foreground" : ""}
                  onClick={() => setQuality("sd")}
                >
                  SD
                </Badge>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Video Grid */}
      <div className={`grid gap-2 ${getGridClass()}`}>
        {displayCameras.map((camera) => (
          <Card
            key={camera.id}
            className="bg-card border border-border overflow-hidden cursor-pointer hover:border-accent/50 transition-colors"
            onClick={() => setSelectedCamera(camera.id)}
          >
            {/* Video Placeholder */}
            <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 relative overflow-hidden aspect-video">
              <CameraStream 
                deviceId={camera.deviceId}
                channel={camera.channelNumber}
                streamType={quality === "hd" ? "main" : "sub"}
                deviceName={camera.deviceName}
                cameraName={camera.name}
                status={camera.status}
              />

              {/* Status Badge (Overlay if needed, but CameraStream handles status) */}
              {camera.status !== "online" && (
                <div className="absolute top-2 left-2">
                  <Badge
                    className="bg-red-500/20 text-red-400 border-red-500/30"
                  >
                    Offline
                  </Badge>
                </div>
              )}

              {/* Camera Info */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pointer-events-none">
                <p className="text-[10px] font-medium text-white truncate">
                  {camera.name} - {camera.deviceName}
                </p>
              </div>

              {/* Controls on Hover */}
              <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <Download className="w-3 h-3 text-white" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Fullscreen Mode */}
      {isFullscreen && selectedCamera && (
        <div className="fixed inset-0 bg-background z-50">
          <div className="w-full h-full flex flex-col">
            {/* Fullscreen Header */}
            <div className="bg-card border-b border-border p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                {displayCameras.find((c) => c.id === selectedCamera)?.name}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(false)}
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Fullscreen Video */}
            <div className="flex-1 bg-black flex items-center justify-center relative">
              {(() => {
                const cam = displayCameras.find((c) => c.id === selectedCamera);
                if (!cam) return null;
                return (
                  <CameraStream 
                    deviceId={cam.deviceId}
                    channel={cam.channelNumber}
                    streamType={quality === "hd" ? "main" : "sub"}
                    deviceName={cam.deviceName}
                    cameraName={cam.name}
                    status={cam.status}
                  />
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
