"""
Nexus Watch Desktop Agent — Backend Python para DVRs Intelbras/Dahua
Fornece API REST para o app desktop se conectar aos dispositivos
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import requests
import json
import base64
import subprocess
import threading
import time
import os

from pyintelbras import IntelbrasAPI

app = FastAPI(title="Nexus Watch Desktop Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class DeviceConfig(BaseModel):
    id: str
    name: str
    host: str
    port: int = 80
    username: str = "admin"
    password: str
    channels: int = 4

class StreamRequest(BaseModel):
    device_id: str
    channel: int = 1
    stream_type: str = "main"

connected_devices: dict[str, IntelbrasAPI] = {}
device_configs: dict[str, DeviceConfig] = {}
mediamtx_streams: dict[str, subprocess.Popen] = {}

def get_api(device_id: str) -> IntelbrasAPI:
    if device_id not in connected_devices:
        raise HTTPException(status_code=404, detail="Dispositivo não conectado")
    return connected_devices[device_id]

def build_rtsp_url(config: DeviceConfig, channel: int, stream_type: str) -> str:
    subtype = "0" if stream_type == "main" else "1"
    return f"rtsp://{config.username}:{config.password}@{config.host}:{554}/cam/realmonitor?channel={channel}&subtype={subtype}"

@app.get("/")
def root():
    return {"status": "ok", "service": "Nexus Watch Desktop Agent", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "ok", "devices_connected": len(connected_devices)}

@app.post("/devices/connect")
def connect_device(config: DeviceConfig):
    try:
        api = IntelbrasAPI(f"http://{config.host}:{config.port}")
        api.login(config.username, config.password)
        connected_devices[config.id] = api
        device_configs[config.id] = config
        return {"success": True, "device_id": config.id, "message": f"Conectado ao dispositivo {config.name}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Falha ao conectar: {str(e)}")

@app.delete("/devices/{device_id}/disconnect")
def disconnect_device(device_id: str):
    if device_id in connected_devices:
        del connected_devices[device_id]
    if device_id in device_configs:
        del device_configs[device_id]
    return {"success": True}

@app.get("/devices/{device_id}/status")
def get_device_status(device_id: str):
    api = get_api(device_id)
    try:
        config = device_configs[device_id]
        response = requests.get(
            f"http://{config.host}:{config.port}/cgi-bin/magicBox.cgi?action=getSystemInfo",
            auth=(config.username, config.password),
            timeout=5
        )
        return {"online": response.status_code == 200, "device_id": device_id}
    except:
        return {"online": False, "device_id": device_id}

@app.get("/devices/{device_id}/info")
def get_device_info(device_id: str):
    api = get_api(device_id)
    try:
        config = device_configs[device_id]
        response = requests.get(
            f"http://{config.host}:{config.port}/cgi-bin/magicBox.cgi?action=getSystemInfo",
            auth=(config.username, config.password),
            timeout=5
        )
        return {"success": True, "data": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/devices/{device_id}/channels")
def get_channels(device_id: str):
    api = get_api(device_id)
    config = device_configs[device_id]
    channels = []
    for i in range(1, config.channels + 1):
        channels.append({
            "channel": i,
            "name": f"Canal {i}",
            "rtsp_main": build_rtsp_url(config, i, "main"),
            "rtsp_sub": build_rtsp_url(config, i, "sub"),
            "snapshot_url": f"http://{config.host}:{config.port}/cgi-bin/snapshot.cgi?channel={i}"
        })
    return {"channels": channels}

@app.post("/stream/start")
def start_stream(req: StreamRequest):
    if req.device_id not in device_configs:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")
    config = device_configs[req.device_id]
    rtsp_url = build_rtsp_url(config, req.channel, req.stream_type)
    stream_name = f"dev_{req.device_id}_ch{req.channel}_{req.stream_type}"
    try:
        response = requests.post(
            f"http://localhost:9997/v3/config/paths/add/{stream_name}",
            json={"source": rtsp_url, "sourceOnDemand": True},
            timeout=5
        )
        hls_url = f"http://localhost:8888/{stream_name}/index.m3u8"
        return {"success": True, "stream_name": stream_name, "rtsp_url": rtsp_url, "hls_url": hls_url}
    except Exception as e:
        return {"success": True, "stream_name": stream_name, "rtsp_url": rtsp_url, "hls_url": None, "warning": "MediaMTX não disponível"}

@app.delete("/stream/{stream_name}")
def stop_stream(stream_name: str):
    try:
        requests.delete(f"http://localhost:9997/v3/config/paths/delete/{stream_name}", timeout=5)
    except:
        pass
    return {"success": True}

@app.get("/devices/{device_id}/snapshot/{channel}")
def get_snapshot(device_id: str, channel: int = 1):
    if device_id not in device_configs:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")
    config = device_configs[device_id]
    try:
        response = requests.get(
            f"http://{config.host}:{config.port}/cgi-bin/snapshot.cgi?channel={channel}",
            auth=(config.username, config.password),
            timeout=10,
            stream=True
        )
        return StreamingResponse(response.iter_content(chunk_size=1024), media_type="image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao capturar snapshot: {str(e)}")

PTZ_COMMANDS = {
    "up": 0, "down": 1, "left": 2, "right": 3,
    "zoom_in": 11, "zoom_out": 12, "stop": 255,
}

@app.post("/devices/{device_id}/ptz/{channel}/{direction}")
def ptz_move(device_id: str, channel: int, direction: str, speed: int = 4):
    if device_id not in device_configs:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")
    config = device_configs[device_id]
    cmd = PTZ_COMMANDS.get(direction)
    if cmd is None:
        raise HTTPException(status_code=400, detail=f"Direção inválida: {direction}")
    try:
        url = (
            f"http://{config.host}:{config.port}/cgi-bin/ptz.cgi"
            f"?action=start&channel={channel}&code={direction}&arg1={speed}&arg2={speed}&arg3=0"
        )
        requests.get(url, auth=(config.username, config.password), timeout=5)
        return {"success": True, "direction": direction}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/devices/{device_id}/ptz/{channel}/stop")
def ptz_stop(device_id: str, channel: int):
    if device_id not in device_configs:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")
    config = device_configs[device_id]
    try:
        url = (
            f"http://{config.host}:{config.port}/cgi-bin/ptz.cgi"
            f"?action=stop&channel={channel}&code=stop&arg1=0&arg2=0&arg3=0"
        )
        requests.get(url, auth=(config.username, config.password), timeout=5)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/devices/{device_id}/recordings")
def list_recordings(device_id: str, channel: int = 1, start: str = None, end: str = None):
    api = get_api(device_id)
    try:
        from datetime import datetime, timedelta
        start_time = start or (datetime.now() - timedelta(hours=24)).strftime("%Y-%m-%d %H:%M:%S")
        end_time = end or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        params = {
            "condition.Channel": channel,
            "condition.StartTime": start_time,
            "condition.EndTime": end_time,
        }
        result = api.find_media_files(params)
        return {"success": True, "recordings": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print("🚀 Nexus Watch Desktop Agent iniciando na porta 7000...")
    uvicorn.run(app, host="0.0.0.0", port=7000, log_level="info")
