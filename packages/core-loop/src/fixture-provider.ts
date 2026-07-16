import type {
  DatasetDescriptor,
  DatasetSelection,
  FixtureCaseRef,
  FixtureMaterialization,
} from "./contracts.js";

declare const hostDirectoryBrand: unique symbol;

/** Opaque host path passed only at the provider/filesystem boundary. Never serialize it. */
export type HostDirectory = string & { readonly [hostDirectoryBrand]: true };

export interface FixtureProvider {
  describe(): Promise<DatasetDescriptor>;
  listCases(selection: DatasetSelection): AsyncIterable<FixtureCaseRef>;
  materialize(caseRef: FixtureCaseRef, destination: HostDirectory): Promise<FixtureMaterialization>;
}

export function asHostDirectoryForProvider(hostPath: string): HostDirectory {
  return hostPath as HostDirectory;
}
