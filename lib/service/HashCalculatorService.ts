import { createHash } from "node:crypto";

const calculateHash = (content: string) => {
  const hash = createHash("MD5");
  hash.update(content.trim());
  return hash.digest("hex");
};

const calculateHashOfStream = (stream: Buffer) => {
  const hash = createHash("sha256");
  hash.update(stream);
  return hash.digest("hex");
};

export { calculateHash, calculateHashOfStream };
