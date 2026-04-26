import { Device } from "../../drizzle/schema";
import { BaseDriver } from "./base";
import { GenericDriver } from "./generic";
import { IntelbrasDriver } from "./intelbras";
import { HikvisionDriver } from "./hikvision";
import { DahuaDriver } from "./dahua";
import { UniviewDriver } from "./uniview";
import { AxisDriver } from "./axis";
export type { DriverResult } from "./base";

export function getDriver(device: Device): BaseDriver {
  const manufacturer = device.manufacturer?.toLowerCase() || "generic";

  switch (manufacturer) {
    case "intelbras":
      return new IntelbrasDriver(device);
    case "lampttek":
    case "tecsat":
    case "ppa":
    case "tudo-forte":
      return new GenericDriver(device);
    case "hikvision":
      return new HikvisionDriver(device);
    case "dahua":
      return new DahuaDriver(device);
    case "uniview":
      return new UniviewDriver(device);
    case "axis":
      return new AxisDriver(device);
    case "bosch":
    case "hanwha":
    case "tiandy":
    case "ez-ipc":
    case "geovision":
    case "milestone":
      return new GenericDriver(device);
    default:
      return new GenericDriver(device);
  }
}

export * from "./base";
export * from "./generic";
export * from "./intelbras";
export * from "./hikvision";
export * from "./dahua";
export * from "./uniview";
export * from "./axis";
