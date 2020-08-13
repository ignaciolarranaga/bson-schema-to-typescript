import fs from "fs";
import { Options as CompileJSONOptions } from "json-schema-to-typescript";
import prettier from "prettier";
import { JsonValue } from "./types";

export async function prettierOptions(path: string): Promise<prettier.Options> {
  const options = await prettier.resolveConfig(path);

  return {
    ...options,
    parser: "typescript",
  };
}

export type Options = {
  bannerComment: string[];
  enableConstEnums: CompileJSONOptions["enableConstEnums"];
  ignoreMinAndMaxItems: CompileJSONOptions["ignoreMinAndMaxItems"];
  strictIndexSignatures: CompileJSONOptions["strictIndexSignatures"];
  unknownAny: CompileJSONOptions["unknownAny"];
  path: string;
  env: {
    MONGODB_URI: string;
    MONGODB_DATABASE: string;
  };
};

const defaultOptions: Options = {
  bannerComment: [
    "/* eslint-disable */",
    "/* tslint:disable */",
    "/**",
    "* This file was automatically generated by bson-schema-to-typescript.",
    "* DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,",
    "* and run bson-schema-to-typescript to regenerate this file.",
    "*/",
  ],
  enableConstEnums: true,
  ignoreMinAndMaxItems: false,
  strictIndexSignatures: false,
  unknownAny: true,
  path: "src/__generated__",
  env: {
    MONGODB_URI: "MONGODB_URI",
    MONGODB_DATABASE: "MONGODB_DATABASE",
  },
};

function readConfig() {
  const configPath = "./bson2ts.json";

  return fs.existsSync(configPath)
    ? fs.readFileSync(configPath).toString()
    : JSON.stringify({});
}

export function parseConfig(config: string): Options {
  try {
    const options = JSON.parse(config) as JsonValue;

    if (
      typeof options !== "object" ||
      options === null ||
      Array.isArray(options)
    ) {
      throw new Error("config must be a plain object");
    }

    const bannerComment = (Array.isArray(options.bannerComment) &&
    options.bannerComment.every((e) => typeof e === "string")
      ? options.bannerComment
      : defaultOptions.bannerComment) as string[];

    const enableConstEnums =
      typeof options.enableConstEnums === "boolean"
        ? options.enableConstEnums
        : defaultOptions.enableConstEnums;

    const ignoreMinAndMaxItems =
      typeof options.ignoreMinAndMaxItems === "boolean"
        ? options.ignoreMinAndMaxItems
        : defaultOptions.ignoreMinAndMaxItems;

    const strictIndexSignatures =
      typeof options.strictIndexSignatures === "boolean"
        ? options.strictIndexSignatures
        : defaultOptions.strictIndexSignatures;

    const unknownAny =
      typeof options.unknownAny === "boolean"
        ? options.unknownAny
        : defaultOptions.unknownAny;

    const path =
      typeof options.path === "string" ? options.path : defaultOptions.path;

    const env =
      typeof options.env === "object" &&
      options.env !== null &&
      !Array.isArray(options.env)
        ? {
            MONGODB_URI:
              typeof options.env.MONGODB_URI === "string"
                ? options.env.MONGODB_URI
                : defaultOptions.env.MONGODB_URI,
            MONGODB_DATABASE:
              typeof options.env.MONGODB_DATABASE === "string"
                ? options.env.MONGODB_DATABASE
                : defaultOptions.env.MONGODB_DATABASE,
          }
        : defaultOptions.env;

    return {
      bannerComment,
      enableConstEnums,
      ignoreMinAndMaxItems,
      strictIndexSignatures,
      unknownAny,
      path,
      env,
    };
  } catch (error) {
    return defaultOptions;
  }
}

export function loadConfig(): Options {
  const config = readConfig();

  return parseConfig(config);
}
