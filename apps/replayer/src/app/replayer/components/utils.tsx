import { Badge, Space } from "antd";
import { PresetStatusColorType } from "antd/es/_util/colors";

export const getUrlPath = (url: string) => {
  const regex = /(?:https?:\/\/[^\/]+)?(\/[^?#]*)/i;
  const match = url.match(regex);
  return match?.[1] ? match[1] : url;
};

export const renderStatus = (status: number) => {
  let color: PresetStatusColorType = "default";

  switch (true) {
    case status >= 200 && status < 300:
      color = "success";
      break;
    case status >= 400 && status < 500:
      color = "error";
      break;
    case status >= 500:
      color = "error";
      break;
    default:
      color = "default";
  }

  return (
    <Space>
      <Badge status={color} />
      {status}
    </Space>
  );
};

export const CONSOLE_TAG = "rrweb/console@1";

export const safeParseJson = (s: string) => {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
};

export const toShowJson = (v: unknown) => {
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
};
