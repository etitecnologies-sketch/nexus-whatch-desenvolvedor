import axios from "axios";
import crypto from "crypto";

type OnvifDeviceInfo = {
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  serialNumber?: string;
  hardwareId?: string;
};

type OnvifProbeResult = {
  deviceServiceUrl: string;
  deviceInfo: OnvifDeviceInfo;
  mediaXAddr?: string;
  ptzXAddr?: string;
  profiles: Array<{ token: string; name?: string }>;
  streamUris: Array<{ profileToken: string; uri: string }>;
  ptzSupported: boolean;
};

const soapContentType = 'application/soap+xml; charset=utf-8';

const xmlDecode = (value: string) =>
  value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");

const pickFirst = (xml: string, tagName: string) => {
  const re = new RegExp(`<([A-Za-z0-9_-]+:)?${tagName}\\b[^>]*>([\\s\\S]*?)<\\/([A-Za-z0-9_-]+:)?${tagName}>`, "i");
  const m = xml.match(re);
  if (!m) return undefined;
  return xmlDecode(m[2].trim());
};

const pickAttribute = (xmlFragment: string, attrName: string) => {
  const re = new RegExp(`${attrName}="([^"]+)"`, "i");
  const m = xmlFragment.match(re);
  return m ? xmlDecode(m[1]) : undefined;
};

const makeWsseHeader = (username: string, password: string) => {
  const nonceRaw = crypto.randomBytes(16);
  const created = new Date().toISOString();
  const sha1 = crypto.createHash("sha1");
  sha1.update(Buffer.concat([nonceRaw, Buffer.from(created, "utf8"), Buffer.from(password, "utf8")]));
  const digest = sha1.digest("base64");
  const nonceB64 = nonceRaw.toString("base64");
  return {
    nonceB64,
    created,
    digest,
    username,
  };
};

const wrapSoap = (wsse: ReturnType<typeof makeWsseHeader>, body: string) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
  xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"
  xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
  <s:Header>
    <wsse:Security s:mustUnderstand="1">
      <wsse:UsernameToken>
        <wsse:Username>${wsse.username}</wsse:Username>
        <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">${wsse.digest}</wsse:Password>
        <wsse:Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">${wsse.nonceB64}</wsse:Nonce>
        <wsu:Created>${wsse.created}</wsu:Created>
      </wsse:UsernameToken>
    </wsse:Security>
  </s:Header>
  <s:Body>
    ${body}
  </s:Body>
</s:Envelope>`;
};

const soapPost = async (url: string, xml: string, timeoutMs: number) => {
  const resp = await axios.post(url, xml, {
    timeout: timeoutMs,
    headers: {
      "Content-Type": soapContentType,
    },
    validateStatus: () => true,
  });

  if (typeof resp.data !== "string") {
    return { ok: false as const, status: resp.status, data: "" };
  }

  const ok = resp.status >= 200 && resp.status < 300;
  return { ok, status: resp.status, data: resp.data as string };
};

const candidateDeviceServiceUrls = (host: string, ports: number[]) => {
  const paths = ["/onvif/device_service", "/onvif/Device_service", "/onvif/device_service/"];
  const urls: string[] = [];
  for (const port of ports) {
    for (const path of paths) {
      urls.push(`http://${host}:${port}${path}`);
    }
  }
  return Array.from(new Set(urls));
};

const parseDeviceInfo = (xml: string): OnvifDeviceInfo => {
  return {
    manufacturer: pickFirst(xml, "Manufacturer"),
    model: pickFirst(xml, "Model"),
    firmwareVersion: pickFirst(xml, "FirmwareVersion"),
    serialNumber: pickFirst(xml, "SerialNumber"),
    hardwareId: pickFirst(xml, "HardwareId"),
  };
};

const parseCapabilitiesXAddr = (xml: string, sectionName: "Media" | "PTZ") => {
  const sectionRe = new RegExp(`<([A-Za-z0-9_-]+:)?${sectionName}\\b[\\s\\S]*?<([A-Za-z0-9_-]+:)?XAddr\\b[^>]*>([\\s\\S]*?)<\\/([A-Za-z0-9_-]+:)?XAddr>`, "i");
  const m = xml.match(sectionRe);
  if (!m) return undefined;
  return xmlDecode(m[3].trim());
};

const parseProfiles = (xml: string) => {
  const profiles: Array<{ token: string; name?: string }> = [];
  const re = /<([A-Za-z0-9_-]+:)?Profiles\b([^>]*)>([\s\S]*?)<\/([A-Za-z0-9_-]+:)?Profiles>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml))) {
    const attrs = match[2] || "";
    const token = pickAttribute(attrs, "token");
    if (!token) continue;
    const name = pickFirst(match[3], "Name");
    profiles.push({ token, name });
  }
  return profiles;
};

const parseStreamUri = (xml: string) => {
  const uri = pickFirst(xml, "Uri");
  return uri || undefined;
};

export const probeOnvif = async (opts: {
  host: string;
  ports?: number[];
  username: string;
  password: string;
  timeoutMs?: number;
  maxProfiles?: number;
}): Promise<OnvifProbeResult | null> => {
  const ports = (opts.ports && opts.ports.length > 0 ? opts.ports : [80, 8000]).filter((p) => Number.isFinite(p));
  const timeoutMs = opts.timeoutMs ?? 2500;
  const maxProfiles = opts.maxProfiles ?? 4;

  const wsse = makeWsseHeader(opts.username, opts.password);
  const urls = candidateDeviceServiceUrls(opts.host, ports);

  for (const deviceServiceUrl of urls) {
    const getDeviceInfoBody = `<tds:GetDeviceInformation xmlns:tds="http://www.onvif.org/ver10/device/wsdl"/>`;
    const getDeviceInfoSoap = wrapSoap(wsse, getDeviceInfoBody);
    const infoResp = await soapPost(deviceServiceUrl, getDeviceInfoSoap, timeoutMs);
    if (!infoResp.ok) continue;

    const deviceInfo = parseDeviceInfo(infoResp.data);

    const getCapsBody = `<tds:GetCapabilities xmlns:tds="http://www.onvif.org/ver10/device/wsdl"><tds:Category>All</tds:Category></tds:GetCapabilities>`;
    const getCapsSoap = wrapSoap(wsse, getCapsBody);
    const capsResp = await soapPost(deviceServiceUrl, getCapsSoap, timeoutMs);

    const mediaXAddr = capsResp.ok ? parseCapabilitiesXAddr(capsResp.data, "Media") : undefined;
    const ptzXAddr = capsResp.ok ? parseCapabilitiesXAddr(capsResp.data, "PTZ") : undefined;

    let profiles: Array<{ token: string; name?: string }> = [];
    if (mediaXAddr) {
      const getProfilesBody = `<trt:GetProfiles xmlns:trt="http://www.onvif.org/ver10/media/wsdl"/>`;
      const getProfilesSoap = wrapSoap(wsse, getProfilesBody);
      const profilesResp = await soapPost(mediaXAddr, getProfilesSoap, timeoutMs);
      if (profilesResp.ok) {
        profiles = parseProfiles(profilesResp.data);
      }
    }

    const streamUris: Array<{ profileToken: string; uri: string }> = [];
    if (mediaXAddr && profiles.length > 0) {
      for (const profile of profiles.slice(0, maxProfiles)) {
        const getStreamBody = `<trt:GetStreamUri xmlns:trt="http://www.onvif.org/ver10/media/wsdl">
  <trt:StreamSetup>
    <tt:Stream xmlns:tt="http://www.onvif.org/ver10/schema">RTP-Unicast</tt:Stream>
    <tt:Transport xmlns:tt="http://www.onvif.org/ver10/schema">
      <tt:Protocol>RTSP</tt:Protocol>
    </tt:Transport>
  </trt:StreamSetup>
  <trt:ProfileToken>${profile.token}</trt:ProfileToken>
</trt:GetStreamUri>`;
        const getStreamSoap = wrapSoap(wsse, getStreamBody);
        const streamResp = await soapPost(mediaXAddr, getStreamSoap, timeoutMs);
        if (!streamResp.ok) continue;
        const uri = parseStreamUri(streamResp.data);
        if (uri) streamUris.push({ profileToken: profile.token, uri });
      }
    }

    const ptzSupported = Boolean(ptzXAddr);

    return {
      deviceServiceUrl,
      deviceInfo,
      mediaXAddr,
      ptzXAddr,
      profiles,
      streamUris,
      ptzSupported,
    };
  }

  return null;
};

export const mapOnvifManufacturerToDriverKey = (manufacturer?: string): string | null => {
  if (!manufacturer) return null;
  const m = manufacturer.toLowerCase();
  if (m.includes("intelbras")) return "intelbras";
  if (m.includes("hikvision")) return "hikvision";
  if (m.includes("dahua")) return "dahua";
  if (m.includes("uniview") || m.includes("univiewtech")) return "uniview";
  if (m.includes("axis")) return "axis";
  if (m.includes("bosch")) return "bosch";
  if (m.includes("hanwha") || m.includes("wisenet") || m.includes("samsung")) return "hanwha";
  if (m.includes("tiandy")) return "tiandy";
  if (m.includes("geovision")) return "geovision";
  if (m.includes("milestone")) return "milestone";
  if (m.includes("ppa")) return "ppa";
  if (m.includes("lampttek")) return "lampttek";
  if (m.includes("tecsat")) return "tecsat";
  if (m.includes("tudo forte") || m.includes("tudoforte")) return "tudo-forte";
  if (m.includes("ez-ipc") || m.includes("ezipc")) return "ez-ipc";
  return null;
};
