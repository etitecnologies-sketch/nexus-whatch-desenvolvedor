import React, { useEffect, useRef } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import Player from "video.js/dist/video.js";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  autoplay?: boolean;
  controls?: boolean;
  className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  autoplay = true,
  controls = true,
  className = "",
}) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<typeof Player | null>(null);

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current && videoRef.current) {
      const videoElement = document.createElement("video-js");
      videoElement.classList.add("vjs-big-play-centered");
      videoRef.current.appendChild(videoElement);

      const player = (playerRef.current = videojs(videoElement, {
        autoplay,
        controls,
        responsive: true,
        fluid: true,
        poster,
        sources: [
          {
            src,
            type: src.endsWith(".m3u8") ? "application/x-mpegURL" : "video/mp4",
          },
        ],
        html5: {
          vhs: {
            overrideNative: true,
          },
        },
      }));

      // Error handling
      player.on("error", () => {
        const error = player.error();
        console.error("VideoJS Error:", error);
      });
    } else if (playerRef.current) {
      // Update source if it changes
      const player = playerRef.current;
      player.src({
        src,
        type: src.endsWith(".m3u8") ? "application/x-mpegURL" : "video/mp4",
      });
    }
  }, [src, autoplay, controls, poster]);

  // Dispose the player on unmount
  useEffect(() => {
    const player = playerRef.current;
    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [playerRef]);

  return (
    <div data-vjs-player className={className}>
      <div ref={videoRef} />
    </div>
  );
};
