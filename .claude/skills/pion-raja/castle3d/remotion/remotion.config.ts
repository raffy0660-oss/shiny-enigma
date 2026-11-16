import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setCodec("h264");
Config.setCrf(16);
// cloud sessions: use the preinstalled Chromium (no download)
if (process.env.PION_CHROME) Config.setBrowserExecutable(process.env.PION_CHROME);
