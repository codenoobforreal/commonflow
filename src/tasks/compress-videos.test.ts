import { describe, expect, test } from "vitest";
// import isInCi from "is-in-ci";

import {
  evaluateCompressOptions,
  // compressVideos,
  buildCompressVideoCommandArgs,
  lsizeStringCapture,
  timeStringCapture,
  sizeReadableOutput,
  durationReadableOutput,
  filterDataFromFFprobeResult,
} from "./compress-video";

/**
index=0
codec_name=av1
codec_long_name=Alliance for Open Media AV1
profile=Main
codec_type=video
codec_tag_string=av01
codec_tag=0x31307661
width=7680
height=4086
coded_width=7680
coded_height=4086
closed_captions=0
film_grain=0
has_b_frames=0
sample_aspect_ratio=N/A
display_aspect_ratio=N/A
pix_fmt=yuv420p
level=16
color_range=tv
color_space=bt709
color_transfer=bt709
color_primaries=bt709
chroma_location=unspecified
field_order=unknown
refs=1
id=0x1
r_frame_rate=25/1
avg_frame_rate=25/1
time_base=1/12800
start_pts=0
start_time=0.000000
duration_ts=75264
duration=5.880000
bit_rate=31789625
max_bit_rate=N/A
bits_per_raw_sample=N/A
nb_frames=147
nb_read_frames=N/A
nb_read_packets=N/A
extradata_size=21
DISPOSITION:default=1
DISPOSITION:dub=0
DISPOSITION:original=0
DISPOSITION:comment=0
DISPOSITION:lyrics=0
DISPOSITION:karaoke=0
DISPOSITION:forced=0
DISPOSITION:hearing_impaired=0
DISPOSITION:visual_impaired=0
DISPOSITION:clean_effects=0
DISPOSITION:attached_pic=0
DISPOSITION:timed_thumbnails=0
DISPOSITION:non_diegetic=0
DISPOSITION:captions=0
DISPOSITION:descriptions=0
DISPOSITION:metadata=0
DISPOSITION:dependent=0
DISPOSITION:still_image=0
DISPOSITION:multilayer=0
TAG:language=und
TAG:handler_name=ISO Media file produced by Google Inc.
TAG:vendor_id=[0][0][0][0]
filename=/Users/panjunyu/Downloads/process/test.mp4
nb_streams=2
nb_programs=0
nb_stream_groups=0
format_name=mov,mp4,m4a,3gp,3g2,mj2
format_long_name=QuickTime / MOV
start_time=0.000000
duration=5.880000
size=23465085
bit_rate=31925285
probe_score=100
TAG:major_brand=isom
TAG:minor_version=512
TAG:compatible_brands=isomav01iso2mp41
TAG:title=Magic of Hong Kong. Mind-blowing cyberpunk drone video of the craziest Asia’s city by Timelab.pro
TAG:encoder=Lavf60.3.100
TAG:comment=www.mediahuman.com
*/

describe("transcode-videos", () => {
  describe("evaluateCompressOptions", () => {
    describe("pixels > FHDPIXELS", () => {
      test("width >= height should set to 1080p", () => {
        expect(
          evaluateCompressOptions({
            width: 2100,
            height: 2000,
            avg_frame_rate: 25,
          }),
        ).toStrictEqual({
          width: 1920,
          height: 1080,
          crf: 24,
          fps: 25,
        });
      });
      test("width < height should set to 1080p", () => {
        expect(
          evaluateCompressOptions({
            width: 2000,
            height: 2100,
            avg_frame_rate: 25,
          }),
        ).toStrictEqual({
          width: 1080,
          height: 1920,
          crf: 24,
          fps: 25,
        });
      });
    });
    describe("HDPIXELS < pixels <= FHDPIXELS", () => {
      test("no change on scale", () => {
        expect(
          evaluateCompressOptions({
            width: 1400,
            height: 1000,
            avg_frame_rate: 25,
          }),
        ).toStrictEqual({
          crf: 24,
          fps: 25,
        });

        expect(
          evaluateCompressOptions({
            width: 1000,
            height: 1400,
            avg_frame_rate: 25,
          }),
        ).toStrictEqual({
          crf: 24,
          fps: 25,
        });
      });
    });
    describe("pixels <= HDPIXELS", () => {
      test("should change crf to 23 and no scale change", () => {
        expect(
          evaluateCompressOptions({
            width: 600,
            height: 900,
            avg_frame_rate: 25,
          }),
        ).toStrictEqual({
          crf: 23,
          fps: 25,
        });
      });
    });
    describe("fps related", () => {
      test("no change on fps when process animate video which fps is higher than default fps", async () => {
        expect(
          evaluateCompressOptions(
            {
              width: 1920,
              height: 1080,
              avg_frame_rate: 60,
            },
            "animate",
          ),
        ).toStrictEqual({
          crf: 24,
        });
      });

      test("change on fps when process common video", async () => {
        expect(
          evaluateCompressOptions({
            width: 1920,
            height: 1080,
            avg_frame_rate: 60,
          }),
        ).toStrictEqual({
          crf: 24,
          fps: 25,
        });
      });

      test("use lower fps when process video which fps is lower than default fps", async () => {
        const lowerFps = 20;

        expect(
          evaluateCompressOptions({
            width: 1920,
            height: 1080,
            avg_frame_rate: lowerFps,
          }),
        ).toStrictEqual({
          crf: 24,
          fps: lowerFps,
        });

        expect(
          evaluateCompressOptions(
            {
              width: 1920,
              height: 1080,
              avg_frame_rate: lowerFps,
            },
            "animate",
          ),
        ).toStrictEqual({
          crf: 24,
          fps: lowerFps,
        });
      });
    });
  });

  describe("buildCompressVideoCommand", () => {
    test("no scale filter when width and height option equals 0", () => {
      expect(
        buildCompressVideoCommandArgs({
          input: "",
          output: "",
          fps: 25,
          crf: 24,
          width: 0,
          height: 0,
        }),
      ).not.toContain("scale=");
    });

    test("no fps filter when fps option equals 0", () => {
      expect(
        buildCompressVideoCommandArgs({
          input: "",
          output: "",
          fps: 0,
          crf: 24,
          width: 0,
          height: 0,
        }),
      ).not.toContain("fps=");
    });
  });

  describe("lsizeStringCapture", () => {
    test("should capture Lsize value", () => {
      expect(
        lsizeStringCapture(
          "[out#0/mp4 @ 0x600002b04240] video:4171KiB audio:92KiB subtitle:0KiB other streams:0KiB global headers:2KiB muxing overhead: 0.204286% frame=  147 fps= 30 q=28.6 Lsize= 34272KiB time=00:00:05.80 bitrate=6033.6kbits/s speed= 1.2x",
        ),
      ).toBe("34272KiB");
      expect(
        lsizeStringCapture(
          "[out#0/mp4 @ 0x600002b04240] video:4171KiB audio:92KiB subtitle:0KiB other streams:0KiB global headers:2KiB muxing overhead: 0.204286% frame=  147 fps= 30 q=28.6 Lsize=34272KiB time=00:00:05.80 bitrate=6033.6kbits/s speed= 1.2x",
        ),
      ).toBe("34272KiB");
    });
  });

  describe("timeStringCapture", () => {
    test("should capture Lsize value", () => {
      expect(
        timeStringCapture(
          "[out#0/mp4 @ 0x600002b04240] video:4171KiB audio:92KiB subtitle:0KiB other streams:0KiB global headers:2KiB muxing overhead: 0.204286% frame=  147 fps= 30 q=28.6 Lsize= 34272KiB time=00:00:05.80 bitrate=6033.6kbits/s speed= 1.2x",
        ),
      ).toBe("00:00:05.80");
    });
  });

  describe("sizeReadableOutput", () => {
    test("show correct unit", () => {
      expect(sizeReadableOutput("100KiB")).toBe("100KB");
      expect(sizeReadableOutput("976.5625KiB")).toBe("1.00MiB");
      expect(sizeReadableOutput("976562.5KiB")).toBe("1.00GiB");
    });
  });

  describe("durationReadableOutput", () => {
    test("should match format hh:mm:ss", () => {
      expect(durationReadableOutput("01:23:55.03")).toBe("01:23:55");
    });
  });

  describe("filterDataFromFFprobeResult", () => {
    test("should return width,height and fps as string", () => {
      const ffprobeOutputStr =
        "avg_frame_rate=25/1\n" + "width=7680\n" + "height=4086";
      expect(
        filterDataFromFFprobeResult(ffprobeOutputStr, [
          "width",
          "height",
          "avg_frame_rate",
        ]),
      ).toStrictEqual({
        width: "7680",
        height: "4086",
        avg_frame_rate: "25/1",
      });
    });
  });

  describe.todo("integration test", () => {});
});
