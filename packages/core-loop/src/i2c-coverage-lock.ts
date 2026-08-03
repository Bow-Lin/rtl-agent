import { Sha256DigestSchema } from "@rtl-agent/contracts";

import { sha256Jcs } from "./filesystem.js";

export interface I2cCoverageLockedFile {
  readonly logicalPath: string;
  readonly byteLength: number;
  readonly contentDigest: ReturnType<typeof sha256Jcs>;
}

export interface I2cCoverageDatasetLock {
  readonly datasetId: string;
  readonly datasetVersion: string;
  readonly sourceCommit: string;
  readonly split: string;
  readonly caseId: string;
  readonly fixtureId: string;
  readonly adapterVersion: string;
  readonly normalizationVersion: string;
  readonly sourceReference: string;
  readonly files: readonly I2cCoverageLockedFile[];
  readonly datasetSourceDigest: ReturnType<typeof sha256Jcs>;
  readonly providerImplementationDigest: ReturnType<typeof sha256Jcs>;
}

const files = [
  {
    logicalPath: "rtl/verilog/i2c_master_bit_ctrl.v",
    byteLength: 25_978,
    contentDigest: Sha256DigestSchema.parse(
      "sha256:6bafd8ac32abec95e07abcefacc3291e74cf9e620369e4e7c1f1df8036824b88",
    ),
  },
  {
    logicalPath: "rtl/verilog/i2c_master_byte_ctrl.v",
    byteLength: 15_722,
    contentDigest: Sha256DigestSchema.parse(
      "sha256:150ee658fa5985089819c2486e4d7a1940a348b68b6d10d0c3d6c3813ee0bbb6",
    ),
  },
  {
    logicalPath: "rtl/verilog/i2c_master_defines.v",
    byteLength: 3_174,
    contentDigest: Sha256DigestSchema.parse(
      "sha256:2e2974063bd8ad4befd1e4cdd3a3e4f981ec5df02d3411b04b5d88f0294be5e8",
    ),
  },
  {
    logicalPath: "rtl/verilog/i2c_master_top.v",
    byteLength: 11_198,
    contentDigest: Sha256DigestSchema.parse(
      "sha256:c179f381eb8117648de789339153e25fdd5fa1eaad66c25bbf9704bfe84b6431",
    ),
  },
  {
    logicalPath: "bench/verilog/i2c_slave_model.v",
    byteLength: 11_756,
    contentDigest: Sha256DigestSchema.parse(
      "sha256:672266fa67c3e8a0a7149ca226936be74f217da7c18ba87959d72b85ae326f12",
    ),
  },
  {
    logicalPath: "bench/verilog/tst_bench_top.v",
    byteLength: 15_135,
    contentDigest: Sha256DigestSchema.parse(
      "sha256:b3404075faaa761356f72fb62e208c8b53f4e2ba29064d6dd15a9bf5456615e9",
    ),
  },
  {
    logicalPath: "bench/verilog/wb_master_model.v",
    byteLength: 5_747,
    contentDigest: Sha256DigestSchema.parse(
      "sha256:5e5a1040db60d377c38e4b42b2300b0f02624fd91de89c243ba2e6ad0b8779b9",
    ),
  },
] as const satisfies readonly I2cCoverageLockedFile[];

export const I2C_COVERAGE_DATASET_LOCK = Object.freeze({
  datasetId: "freecores-i2c",
  datasetVersion: "1.15-3b067f00",
  sourceCommit: "3b067f00ccced753b0502024766a51f58f3e04bc",
  split: "baseline",
  caseId: "i2c-master",
  fixtureId: "freecores-i2c-master",
  adapterVersion: "v1",
  normalizationVersion: "v1",
  sourceReference: "https://github.com/freecores/i2c/tree/3b067f00ccced753b0502024766a51f58f3e04bc",
  files,
  datasetSourceDigest: sha256Jcs(files),
  providerImplementationDigest: sha256Jcs({
    adapter: "freecores-i2c-coverage-provider",
    adapterVersion: "v1",
    normalizationVersion: "v1",
  }),
} satisfies I2cCoverageDatasetLock);
