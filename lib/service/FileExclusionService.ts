import { minimatch } from "minimatch";

const fileIsExcluded = (filePath: string, excludeFiles: string[]) => {
  return excludeFiles.some((pattern) => {
    return minimatch(filePath, pattern);
  });
};

export { fileIsExcluded };
