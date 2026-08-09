"use client";

import { FC, useEffect, useRef } from "react";
import rrwebPlayer from "rrweb-player";
import "rrweb-player/dist/style.css";
import { getReplayConsolePlugin } from "@rrweb/rrweb-plugin-console-replay";
import useEvents from "../hooks/useEvents";

interface RRwebPlayerProps {
  sourceId: string;
  replayLayout: {
    width: number;
    height: number;
  };
  getRrwebPlayerInstance: (r: any) => void;
}

const RRwebPlayer: FC<RRwebPlayerProps> = (props) => {
  const { sourceId, replayLayout, getRrwebPlayerInstance } = props;

  const videoRef = useRef<HTMLDivElement>(null);
  const replayInstance = useRef<any>(null);

  const { data: events } = useEvents(sourceId);

  useEffect(() => {
    if (replayInstance.current) {
      replayInstance.current.$set({
        width: replayLayout.width,
        height: replayLayout.height,
      });
      replayInstance.current.triggerResize();
    }
  }, [replayLayout, replayInstance]);

  useEffect(() => {
    if (!events || replayInstance.current) {
      return;
    }

    replayInstance.current = new rrwebPlayer({
      target: videoRef.current,
      props: {
        events,
        maxScale: 0,
        tags: {
          network: "#4A50F6",
        },
        plugins: [
          getReplayConsolePlugin({
            // 覆盖默认打印到控制台的行为
            replayLogger: {},
          }),
        ],

        width: replayLayout.width,
        height: replayLayout.height,
        showController: false,
        UNSAFE_replayCanvas: true,
      },
    });

    // 获取 replayer 实例
    getRrwebPlayerInstance(replayInstance.current);

    return () => {
      replayInstance.current?.pause();
      replayInstance.current?.$destroy();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  return <div ref={videoRef} />;
};

export default RRwebPlayer;
