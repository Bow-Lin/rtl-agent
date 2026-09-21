import { Sha256DigestSchema } from "@rtl-agent/contracts";

import { sha256Jcs } from "./filesystem.js";

export const COVERAGE_PROJECT_IDS = [
  "dpretet",
  "axis",
  "openhmc",
  "ufifo",
  "eth-fifo",
  "versatile-fifo",
  "aes-highthroughput-lowarea",
  "scalable-arbiter",
] as const;

export type CoverageProjectId = (typeof COVERAGE_PROJECT_IDS)[number];

export interface ProjectCoverageLockedFile {
  readonly logicalPath: string;
  readonly byteLength: number;
  readonly contentDigest: ReturnType<typeof sha256Jcs>;
}

export interface ProjectCoverageDatasetLock {
  readonly projectId: CoverageProjectId;
  readonly datasetId: string;
  readonly datasetVersion: string;
  readonly sourceCommit: string;
  readonly sourceDirectoryName: string;
  readonly split: "baseline";
  readonly caseId: string;
  readonly fixtureId: string;
  readonly adapterVersion: string;
  readonly normalizationVersion: string;
  readonly sourceReference: string;
  readonly licenseName: string;
  readonly licenseReference: string;
  readonly files: readonly ProjectCoverageLockedFile[];
  readonly datasetSourceDigest: ReturnType<typeof sha256Jcs>;
  readonly providerImplementationDigest: ReturnType<typeof sha256Jcs>;
  readonly dutSourcePaths: readonly string[];
  readonly includeDirectories: readonly string[];
}

function digest(value: string): ReturnType<typeof sha256Jcs> {
  return Sha256DigestSchema.parse(value);
}

function lock(
  input: Omit<ProjectCoverageDatasetLock, "datasetSourceDigest" | "providerImplementationDigest">,
): ProjectCoverageDatasetLock {
  return Object.freeze({
    ...input,
    datasetSourceDigest: sha256Jcs(input.files),
    providerImplementationDigest: sha256Jcs({
      adapter: "opencores-project-coverage-provider",
      adapterVersion: input.adapterVersion,
      normalizationVersion: input.normalizationVersion,
      projectId: input.projectId,
    }),
  });
}

export const PROJECT_COVERAGE_LOCKS: Readonly<
  Record<CoverageProjectId, ProjectCoverageDatasetLock>
> = Object.freeze({
  dpretet: lock({
    projectId: "dpretet",
    datasetId: "dpretet-fifo-target",
    datasetVersion: "38c22208",
    sourceCommit: "38c22208d3948833f275b917c920e02b1cdadf56",
    sourceDirectoryName: "fifo-transfer/target/dpretet-async",
    split: "baseline",
    caseId: "dpretet-depth8-width8",
    fixtureId: "dpretet-depth8-width8",
    adapterVersion: "v1",
    normalizationVersion: "wrapper-v1",
    sourceReference: "https://github.com/dpretet/async_fifo",
    licenseName: "MIT",
    licenseReference: "https://github.com/dpretet/async_fifo",
    files: [
      {
        logicalPath: "rtl/async_fifo.v",
        byteLength: 2270,
        contentDigest: digest(
          "sha256:be8a1387eabbfcba04ea20d5915ae9dba037081da94147bffc1dde9be0b2b55b",
        ),
      },
      {
        logicalPath: "rtl/fifomem.v",
        byteLength: 1399,
        contentDigest: digest(
          "sha256:fc8faaf8e7331967da47a6d26ed4c5e2012abf119c08bdea1db179f2c15eeb7c",
        ),
      },
      {
        logicalPath: "rtl/rptr_empty.v",
        byteLength: 1854,
        contentDigest: digest(
          "sha256:41ee0e38a5bb73b3a4e4656fcb3fc624152795d4d92eb3d8c86ba5d9a43ebcc3",
        ),
      },
      {
        logicalPath: "rtl/wptr_full.v",
        byteLength: 2004,
        contentDigest: digest(
          "sha256:a8d8cca5ae74ae4ab9016862b568c4c40ef205c57983ca09dd591e958fec9b04",
        ),
      },
      {
        logicalPath: "rtl/sync_r2w.v",
        byteLength: 604,
        contentDigest: digest(
          "sha256:416da6a6d0812e4f2a4413672baf7c3cfd4d28f0459e6f0e3993be705a7b342c",
        ),
      },
      {
        logicalPath: "rtl/sync_w2r.v",
        byteLength: 604,
        contentDigest: digest(
          "sha256:6d6f85b9c3c6d3c66de225f379053e78d1c2e9ab955699def5e0f5473551f823",
        ),
      },
    ],
    dutSourcePaths: [
      "rtl/dut/async_fifo.v",
      "rtl/dut/fifomem.v",
      "rtl/dut/rptr_empty.v",
      "rtl/dut/wptr_full.v",
      "rtl/dut/sync_r2w.v",
      "rtl/dut/sync_w2r.v",
    ],
    includeDirectories: ["rtl/dut"],
  }),
  axis: lock({
    projectId: "axis",
    datasetId: "axis-fifo-target",
    datasetVersion: "48ff7a7e",
    sourceCommit: "48ff7a7e2ef782cf778d47910cf85835c64b1bce",
    sourceDirectoryName: "fifo-transfer/target/verilog-axis",
    split: "baseline",
    caseId: "axis-depth8-width8",
    fixtureId: "axis-depth8-width8",
    adapterVersion: "v1",
    normalizationVersion: "wrapper-v1",
    sourceReference: "https://github.com/alexforencich/verilog-axis",
    licenseName: "MIT",
    licenseReference: "https://github.com/alexforencich/verilog-axis",
    files: [
      {
        logicalPath: "rtl/axis_fifo.v",
        byteLength: 22258,
        contentDigest: digest(
          "sha256:b29a492b29dcb6b060a3d40d77206e490533433b23d2a954d3b84b08985db16e",
        ),
      },
    ],
    dutSourcePaths: ["rtl/dut/axis_fifo.v"],
    includeDirectories: ["rtl/dut"],
  }),

  openhmc: lock({
    projectId: "openhmc",
    datasetId: "openhmc-async-fifo",
    datasetVersion: "0cf58e2f",
    sourceCommit: "0cf58e2f60c79aa64d35650b6e30e4d5c13e4a78",
    sourceDirectoryName: "fifo-transfer/target/openhmc",
    split: "baseline",
    caseId: "openhmc-depth8-width8",
    fixtureId: "openhmc-depth8-width8",
    adapterVersion: "v1",
    normalizationVersion: "wrapper-v1",
    sourceReference:
      "https://github.com/unihd-cag/openhmc/tree/0cf58e2f60c79aa64d35650b6e30e4d5c13e4a78",
    licenseName: "LGPL-3.0-or-later",
    licenseReference: "https://github.com/unihd-cag/openhmc",
    files: [
      {
        logicalPath: "rtl/building_blocks/fifos/async/openhmc_async_fifo.v",
        byteLength: 11146,
        contentDigest: digest(
          "sha256:4365548b7ca8f02012a290b58d0002d5f43bfbd5a983c3574288eb2f856672bb",
        ),
      },
    ],
    dutSourcePaths: ["rtl/dut/openhmc_async_fifo.v"],
    includeDirectories: ["rtl/dut"],
  }),
  ufifo: lock({
    projectId: "ufifo",
    datasetId: "wbuart32-ufifo",
    datasetVersion: "f43a6b83",
    sourceCommit: "f43a6b83c3a70fb2ac0696a45c5545b233fb860b",
    sourceDirectoryName: "fifo-transfer/source/wbuart32",
    split: "baseline",
    caseId: "ufifo-rx-depth16-width8",
    fixtureId: "ufifo-rx-depth16-width8",
    adapterVersion: "v1",
    normalizationVersion: "wrapper-v1",
    sourceReference:
      "https://github.com/ZipCPU/wbuart32/tree/f43a6b83c3a70fb2ac0696a45c5545b233fb860b",
    licenseName: "GPL-3.0-or-later",
    licenseReference: "https://github.com/ZipCPU/wbuart32",
    files: [
      {
        logicalPath: "rtl/ufifo.v",
        byteLength: 12859,
        contentDigest: digest(
          "sha256:43a9a03d00db96bd6e8a956663b01654a5cf0308456eca8c6f4c95787ef46f9d",
        ),
      },
    ],
    dutSourcePaths: ["rtl/dut/ufifo.v"],
    includeDirectories: ["rtl/dut"],
  }),
  "eth-fifo": lock({
    projectId: "eth-fifo",
    datasetId: "freecores-eth-fifo",
    datasetVersion: "dd268990",
    sourceCommit: "dd26899086edf3b797d2775ef9502d204a9a8149",
    sourceDirectoryName: "fifo-transfer/source/ethmac",
    split: "baseline",
    caseId: "eth-fifo-depth8-width32",
    fixtureId: "eth-fifo-depth8-width32",
    adapterVersion: "v1",
    normalizationVersion: "wrapper-v1",
    sourceReference:
      "https://github.com/freecores/ethmac/tree/dd26899086edf3b797d2775ef9502d204a9a8149",
    licenseName: "LGPL-2.1-or-later",
    licenseReference: "https://github.com/freecores/ethmac",
    files: [
      {
        logicalPath: "rtl/verilog/eth_fifo.v",
        byteLength: 6267,
        contentDigest: digest(
          "sha256:4a97114f4b263bce3f4385d2123eafd19fe5e10c89dfd8d16c7fe4e17399773d",
        ),
      },
      {
        logicalPath: "rtl/verilog/ethmac_defines.v",
        byteLength: 13820,
        contentDigest: digest(
          "sha256:88e9096db268711651a088fe318fafc0772842bd300c8ed5658edaabb4fe91c5",
        ),
      },
      {
        logicalPath: "rtl/verilog/timescale.v",
        byteLength: 2979,
        contentDigest: digest(
          "sha256:cc1b144cfb9f34b259f5e2692a912c1d1f8b9d901baf9a99eccf53d448568f08",
        ),
      },
    ],
    dutSourcePaths: ["rtl/dut/eth_fifo.v"],
    includeDirectories: ["rtl/dut"],
  }),
  "versatile-fifo": lock({
    projectId: "versatile-fifo",
    datasetId: "freecores-versatile-fifo",
    datasetVersion: "3c0ea007",
    sourceCommit: "3c0ea00773805b3f697583fb2d1e330d6bfe4220",
    sourceDirectoryName: "versatile-fifo",
    split: "baseline",
    caseId: "versatile-fifo-async-duplex",
    fixtureId: "freecores-versatile-fifo-async-duplex",
    adapterVersion: "v1",
    normalizationVersion: "v1",
    sourceReference:
      "https://github.com/freecores/versatile_fifo/tree/3c0ea00773805b3f697583fb2d1e330d6bfe4220",
    licenseName: "GNU Lesser General Public License 2.1 or later (source header)",
    licenseReference:
      "https://github.com/freecores/versatile_fifo/blob/3c0ea00773805b3f697583fb2d1e330d6bfe4220/rtl/verilog/copyright.v",
    files: [
      {
        logicalPath: "rtl/verilog/async_fifo_dw_simplex_actel.v",
        byteLength: 15_484,
        contentDigest: digest(
          "sha256:beb9219288c307f622c22f4eb40bb067adc7a966a66a6ecee9b614ab47717824",
        ),
      },
    ],
    dutSourcePaths: ["rtl/dut/async_fifo_dw_simplex.v"],
    includeDirectories: ["rtl/dut"],
  }),
  "aes-highthroughput-lowarea": lock({
    projectId: "aes-highthroughput-lowarea",
    datasetId: "freecores-aes-highthroughput-lowarea",
    datasetVersion: "cf0bb8d6",
    sourceCommit: "cf0bb8d68a8f6f3b32818cff0942d89bd4d16233",
    sourceDirectoryName: "aes-highthroughput-lowarea",
    split: "baseline",
    caseId: "aes-128-datapath",
    fixtureId: "freecores-aes-highthroughput-lowarea-aes128",
    adapterVersion: "v1",
    normalizationVersion: "v1",
    sourceReference:
      "https://github.com/freecores/aes_highthroughput_lowarea/tree/cf0bb8d68a8f6f3b32818cff0942d89bd4d16233",
    licenseName: "GNU Lesser General Public License (OpenCores project metadata)",
    licenseReference: "https://opencores.org/projects/aes_highthroughput_lowarea",
    files: [
      {
        logicalPath: "verilog/rtl/aes.v",
        byteLength: 9_150,
        contentDigest: digest(
          "sha256:eaac379ae0cfe4c05a855252826177b9eb949bfbd39bdb607ce410c32d5c911a",
        ),
      },
      {
        logicalPath: "verilog/rtl/key_exp.v",
        byteLength: 10_046,
        contentDigest: digest(
          "sha256:c5102ff69bfd3ca346073ae14af61e29935100ac891bccf288529f160e31b917",
        ),
      },
      {
        logicalPath: "verilog/rtl/sbox.v",
        byteLength: 6_610,
        contentDigest: digest(
          "sha256:2ede201099de26a9d50957359510cde13ef34c1f52cbb2fa077068b418c8656b",
        ),
      },
      {
        logicalPath: "verilog/rtl/shift_rows.v",
        byteLength: 730,
        contentDigest: digest(
          "sha256:643b79f5e45879b35a82d54715b5c3d059bdf65918e0c4b078b1d832fe2d01db",
        ),
      },
      {
        logicalPath: "verilog/rtl/inv_shift_rows.v",
        byteLength: 811,
        contentDigest: digest(
          "sha256:ebf1f7e1b5d67278e7e5778db9b842de9240dadca8c5dca5b9351175fe31fd1a",
        ),
      },
      {
        logicalPath: "verilog/rtl/mix_columns.v",
        byteLength: 5_824,
        contentDigest: digest(
          "sha256:afbfe9d712ada9f97bb750571d0d6a48a573bf28e411706d28971455755f9573",
        ),
      },
      {
        logicalPath: "verilog/rtl/xram_16x64.v",
        byteLength: 1_467,
        contentDigest: digest(
          "sha256:a7735b742a7765a08716430f49a5a4d1df3ea24664fb84fff4a50a7b6d9a1d79",
        ),
      },
    ],
    dutSourcePaths: [
      "rtl/dut/aes.v",
      "rtl/dut/inv_shift_rows.v",
      "rtl/dut/key_exp.v",
      "rtl/dut/mix_columns.v",
      "rtl/dut/sbox.v",
      "rtl/dut/shift_rows.v",
      "rtl/dut/xram_16x64.v",
    ],
    includeDirectories: ["rtl/dut"],
  }),
  "scalable-arbiter": lock({
    projectId: "scalable-arbiter",
    datasetId: "freecores-scalable-arbiter",
    datasetVersion: "8808ce3e",
    sourceCommit: "8808ce3ee762b1fd38a50a87f7acdc5e130f6101",
    sourceDirectoryName: "scalable-arbiter",
    split: "baseline",
    caseId: "scalable-arbiter-x2-width16",
    fixtureId: "freecores-scalable-arbiter-x2-width16",
    adapterVersion: "v3",
    normalizationVersion: "v1",
    sourceReference:
      "https://github.com/freecores/scalable_arbiter/tree/8808ce3ee762b1fd38a50a87f7acdc5e130f6101",
    licenseName: "ISC-style license (source header)",
    licenseReference:
      "https://github.com/freecores/scalable_arbiter/blob/8808ce3ee762b1fd38a50a87f7acdc5e130f6101/rtl/verilog/arbiter.v",
    files: [
      {
        logicalPath: "rtl/verilog/arbiter.v",
        byteLength: 11_517,
        contentDigest: digest(
          "sha256:f1088b2c10d707d24e650b00109cdcc20fbe5664fba3c6a4a9b0b89aaa9a8d4e",
        ),
      },
      {
        logicalPath: "rtl/verilog/functions.v",
        byteLength: 2_206,
        contentDigest: digest(
          "sha256:5a6424a91518c66717718a7be77fe371ae7c7b613a0214192e1a9a61972d890d",
        ),
      },
    ],
    dutSourcePaths: ["rtl/dut/arbiter.v"],
    includeDirectories: ["rtl/dut"],
  }),
});

export function projectCoverageLock(projectId: CoverageProjectId): ProjectCoverageDatasetLock {
  return PROJECT_COVERAGE_LOCKS[projectId];
}
