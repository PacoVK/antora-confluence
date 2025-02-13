import { HTMLElement } from "node-html-parser";

export type ConfluencePage = {
  title: string;
  content: string;
  parentPageId?: string;
};

export enum ConfluencePageStatus {
  CURRENT = "current",
  DRAFT = "draft",
}

export type ConfluenceAttachment = {
  pageId: string;
  fileName: string;
  file: Buffer;
  comment: string;
  attachmentId?: string;
};

export type PageRepresentation = {
  fileName: string;
  pageTitle: string;
  parent: string;
  fqfn: string;
  id: string;
  content?: string;
};

export type PageDeltaImage = {
  newOne: PageRepresentation;
  oldOne: PageRepresentation;
};

export type AttachmentRepresentation = {
  fileName: string;
  filePath: string;
  comment: string;
};

export type CaptainConfig = {
  confluenceApi: string;
  confluenceSpace: string;
  editorVersion?: "v1" | "v2";
  ancestorId?: string;
  showBanner?: boolean;
  excludeFiles?: string[];
  mapper?: PathMapper[];
  filter?: PageFilter[];
  captainName?: string;
};

export interface PathMapper {
  path: string;
  target: string;
}

export interface PageFilter {
  ancestorId?: string;
}

export interface PathFilter extends PageFilter {
  path: string;
}

export interface FileFilter extends PageFilter {
  files: string[];
}

export type AntoraPlaybook = {
  site: {
    title: string;
  };
  output: {
    dir?: string;
  };
};

export type IConversionOutput = {
  content: HTMLElement;
};

export interface ITransformerOutput extends IConversionOutput {}
export interface IParserOutput extends IConversionOutput {}
